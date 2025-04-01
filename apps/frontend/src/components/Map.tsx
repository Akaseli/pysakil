import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import './Map.css';
import "@maplibre/maplibre-gl-leaflet";
import "leaflet.markercluster";
import axios from 'axios';
import { Stop, VehicleData, TripData, Shape, RouteData } from '@repo/types';
import { io } from "socket.io-client";

interface Props {
  setActive: (arg: number|null) => void,
  vehicle: VehicleData|null
}

interface wsData {
  lon: number,
  lat: number
}

//Probably wise to change to something else
const socket = io(window.location.href, {path: "/api/socket/"})

export const Map: React.FC<Props> = ({setActive, vehicle}) => {
  const icon = L.icon({ 
    iconUrl: "/stop.svg",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })

  const map = useRef<L.Map>()
  const markerCluster = useRef<L.MarkerClusterGroup>()
  const polyLines = useRef<L.LayerGroup>()

  const activeMarker:L.Marker = new L.Marker([0, 0], {icon: icon});
  const vehicleMarker: L.Marker = new L.Marker([0, 0], {icon: icon});

  const [currentStop, setCurrentStop] = useState<number|null>(null)


  const handleCurrent = (stop: number|null) => {
    if(stop){
      setActive(stop)
      setCurrentStop(stop)
      map.current?.addLayer(activeMarker);
    }
    else{
      setActive(null)
      setCurrentStop(null)
      map.current?.removeLayer(activeMarker);
    }
  }

  const createClusterIcon = (cluster: L.MarkerCluster) => {
    let number:number|string = cluster.getChildCount();
    
    if(number > 99){
      number = "99+";
    }

    const html = '<div>' + number + '</div>';
    return L.divIcon({html: html, className: "markerCluster", iconSize: L.point(36, 36)})
  }

  //Create map
  useEffect(() => {
    if(map.current) return;
    

    const bounds = L.latLngBounds(L.latLng(60.002419, 20.516968), L.latLng(60.899724, 24.009247))

    map.current = L.map("map", {
      center: [60.45, 22.26],
      zoom: 13,
      minZoom: 10,
      maxZoom: 18,
      maxBounds: bounds,
      maxBoundsViscosity: 1.0,
      attributionControl: false
    })

    map.current.on("click", () => {
      handleCurrent(null)
    })


    L.maplibreGL({
      //@ts-expect-error no types
      style: "/map/styles/basic-preview/style.json"
    }).addTo(map.current);
  });

  //Create markerCluster
  useEffect(() => {
    if(markerCluster.current || !map.current) return;

    markerCluster.current = L.markerClusterGroup({
      disableClusteringAtZoom: 16,
      spiderfyOnMaxZoom: false,
      polygonOptions: {
        color: "#e3b945"
      },
      iconCreateFunction: createClusterIcon
    });

    map.current.on("click", () => {
      if(markerCluster.current){
        console.log("Re-adding markercluster")
        map.current?.addLayer(markerCluster.current);
      }
    })
  
  });

  //Create polylines
  useEffect(() => {
    if(polyLines.current ||!map.current) return;

    polyLines.current = new L.LayerGroup();

    map.current.on("click", () => {
      if(polyLines.current){
        map.current?.removeLayer(polyLines.current)
      }
    })
  });



  const updateActiveVehicle = (message: wsData) => {
    console.log(message)

    vehicleMarker.setLatLng([message.lat, message.lon])
  }

  const fetchVehiclePosition = () => {
    if(vehicle){
      axios.get("/api/vehicle/" + vehicle.vehicleref).then((response) => {
        vehicleMarker.setLatLng([response.data.lat, response.data.lon])
      })
    }
  }

  useEffect(() => {
    if(vehicle){
      polyLines.current?.clearLayers();
      getVehiclePolyline(vehicle)

      fetchVehiclePosition()

      console.log("Now displaying " + vehicle.vehicleref + " on the map!");

      socket.emit("startVehicle", vehicle.vehicleref)
      socket.on("update", updateActiveVehicle)

      map.current?.addLayer(vehicleMarker)
    }
    else if(currentStop){
      getPolylines(currentStop)
    }

    return () => {
      socket.emit("stopVehicle", vehicle?.vehicleref)
      socket.off("update");

      map.current?.removeLayer(vehicleMarker)
    }

  }, [vehicle])

  const handleMarkerClick = (stop_id: number, marker: L.Marker) => {
    activeMarker.setLatLng(marker.getLatLng())
    
    //Clear map
    if(markerCluster.current){
      map.current?.removeLayer(markerCluster.current);
    }
    polyLines.current?.clearLayers();

    //Update polylines
    getPolylines(stop_id);

    //Update sidebar
    handleCurrent(stop_id);
  }

  const getVehiclePolyline = (vehicle: VehicleData) => {
    const lineName = vehicle.lineref;

    axios.get("/api/routes").then((response) => {
      if(!response.data) return;

      const routeData = response.data as RouteData[];

      routeData.forEach((route) => {
        if(route.route_short_name == lineName){
          //Correct route found.
          axios.get("/api/routes/" + route.route_id + "/trips").then((response) => {
            if(!response.data) return;

            const tripData = response.data as TripData[];
            
            let found = false;

            tripData.forEach((trip) => {
              if(vehicle.blockref == trip.block_id){
                
                let shape: Shape[] = []

                if(!found){
                  found = true
                  axios.get("/api/shapes/" + trip.shape_id).then((response) => {
                    if(!response.data) return;

                    shape = response.data as Shape[];
                  })
                  .then(() =>  {
                    const points:L.LatLng[] = []

                    shape.forEach((point) => {
                      points.push(new L.LatLng(point.lat, point.lon))
                    });
                    
                    const polyline = L.polyline(points, {color: "#" + route.route_color});
                    polyline.bringToBack()
                    polyLines.current?.addLayer(polyline);
                  })
                }
              }
            })

          });

          return;
        }
      })
    })

    if(polyLines.current){
      console.log("Adding polylines.")
      map.current?.addLayer(polyLines.current);
    }
  }

  const getPolylines = (stop_id: number) => {
    //Polylines
    axios.get("/api/stops/" + stop_id).then((response) => {
      if(!response.data) return;

      const data = response.data["result"] as VehicleData[];
      //pick different route refs
      const lifeRefs:string[] = [];
      const destinations: string[] = [];
      const shapeIds: string[] = [];

      data.forEach((vehicle) => {
        if(!lifeRefs.includes(vehicle.lineref)){
          lifeRefs.push(vehicle.lineref);
          destinations.push(vehicle.destinationdisplay);
        }
      })

      axios.get("/api/routes").then((response) => {
        if(!response.data) return;

        const routeData = response.data as RouteData[];

        const routeIds:string[] = [];

        routeData.forEach((route) => {
          if(lifeRefs.includes(route.route_short_name)){
            routeIds.push(route.route_id);
          }
        })

        routeIds.forEach((id) => {
          axios.get("/api/routes/" + id + "/trips").then((response) => {
            if(!response.data) return;

            const tripData = response.data as TripData[];
            
            tripData.forEach((trip) => {
              if(!shapeIds.includes(trip.shape_id) && destinations.includes(trip.trip_headsign)){
                shapeIds.push(trip.shape_id);
                
                let shape: Shape[] = [];

                axios.get("/api/shapes/" + trip.shape_id).then((response) => {
                  if(!response.data) return;

                  shape = response.data as Shape[];
                })
                .then(() =>  {
                  const points:L.LatLng[] = []

                  shape.forEach((point) => {
                    points.push(new L.LatLng(point.lat, point.lon))
                  });

                  const polyline = L.polyline(points, {color: "#" + routeData.find((r) => {return r.route_id == id})?.route_color});
                  polyline.bringToBack()
                  polyLines.current?.addLayer(polyline);
                })
              }
            })
          })
        })
      })
    });
    
    if(polyLines.current){
      console.log("Adding polylines.")
      map.current?.addLayer(polyLines.current);
    }
  }

  useEffect(() => {
    if(!map.current || !markerCluster.current || map.current.hasLayer(markerCluster.current)) return;

    axios.get("/api/stops").then((response) => {
      Object.entries(response.data).forEach(([key, value]) => {
        const stop = value as Stop;

        if(map.current){
          const marker = L.marker([stop.stop_lat, stop.stop_lon], {icon: icon});
          //On marker open
          marker.on("click", () => handleMarkerClick(stop.stop_code, marker))
          markerCluster.current?.addLayer(marker);
        }
        
      }); 
    })

    console.log("Adding marker cluster.")
    map.current.addLayer(markerCluster.current);
  }, [])

  return(
    <div> 
      <div id="map"></div>
    </div>
  );
  
}