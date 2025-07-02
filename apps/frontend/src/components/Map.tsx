import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import './Map.css';
import "@maplibre/maplibre-gl-leaflet";
import "leaflet.markercluster";
import axios from 'axios';
import { Stop, VehicleData, TripData, Shape, RouteData, StopTime } from '@repo/types';
import { io } from "socket.io-client";

interface Props {
  setActive: (arg: Stop|null) => void,
  vehicle: VehicleData|null,
}

interface wsData {
  lon: number,
  lat: number,
  t: number
}

//Probably wise to change to something else
const socket = io(window.location.href, {path: "/api/socket/"})

export const Map: React.FC<Props> = ({setActive, vehicle}) => {
  const stopIcon = L.icon({ 
    iconUrl: "/stop.svg",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })

  const vehicleIcon = L.icon({ 
    iconUrl: "/vehicle.svg",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })

  const map = useRef<L.Map>()
  const markerCluster = useRef<L.MarkerClusterGroup>()
  const polyLines = useRef<L.LayerGroup>()

  const activeMarker= useRef<L.Marker | null>(null); 
  const vehicleMarker= useRef<L.Marker | null>(null); 

  const [currentStop, setCurrentStop] = useState<Stop|null>(null)

  const [updatedAt, setUpdatedAt] = useState<number|null>(null);
  const [formattedTime, setFormattedTime] = useState<string>("")


  const handleCurrent = (stop: Stop|null) => {
    if(stop){
      setActive(stop)
      setCurrentStop(stop)
      if(activeMarker.current){
        map.current?.addLayer(activeMarker.current);
      }
    }
    else{
      setActive(null)
      setCurrentStop(null)
      if(activeMarker.current){
        map.current?.removeLayer(activeMarker.current);
      }
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
    

    const bounds = L.latLngBounds(L.latLng(59.8, 21.1), L.latLng(60.9, 24.1))

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


    const mapUrl = import.meta.env.VITE_MAP_URL || '/map';

    L.maplibreGL({
      //@ts-expect-error no types
      style: `${mapUrl}/styles/basic/style.json`,
      attribution: "<a href=https://openmaptiles.org/ target=_blank>&copy; OpenMapTiles</a> <span aria-hidden=true>|</span> <a href=https://www.openstreetmap.org/copyright target=_blank>&copy; OpenStreetMap contributors</a>"

    }).addTo(map.current);

    L.control.attribution({
      position: "topright"
    }).addTo(map.current)

    //Change leaflet link target to be _blank
    map.current.whenReady(() => {
      const leafletLink = document.querySelector('.leaflet-control-attribution a[href="https://leafletjs.com"]');
      if (leafletLink) leafletLink.setAttribute('target', '_blank');
    })
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
    vehicleMarker.current?.setLatLng([message.lat, message.lon])
    setUpdatedAt(message.t);
  }

  const setupVehicle = (message: wsData) => {
    if(vehicleMarker.current){
      vehicleMarker.current.setLatLng([message.lat, message.lon])
    }
    else{
      vehicleMarker.current = new L.Marker([message.lat, message.lon], {icon: vehicleIcon})
    }

    setUpdatedAt(message.t);

    map.current?.addLayer(vehicleMarker.current);

    if(activeMarker.current && vehicleMarker.current){
      map.current?.flyTo(vehicleMarker.current.getLatLng(), map.current.getZoom(), {duration: 1})
    }
  }

  useEffect(() => {
    if(vehicle){
      polyLines.current?.clearLayers();
      getVehiclePolyline(vehicle)
      socket.emit("startVehicle", vehicle.vehicleref)
      socket.on("startUpdate", setupVehicle)
      socket.on("update", updateActiveVehicle)
  
    }
    else if(currentStop){
      getPolylines(currentStop.stop_code)
    }

    return () => {
      socket.emit("stopVehicle", vehicle?.vehicleref)
      socket.off("update");

      if(vehicleMarker.current){
        map.current?.removeLayer(vehicleMarker.current)
        setUpdatedAt(null);
      }
    }

  }, [vehicle])


  useEffect(() => {
    let intervalUpdate: NodeJS.Timeout | undefined;

    if(updatedAt){
      setFormattedTime(formatTime(updatedAt));

      intervalUpdate = setInterval(() => {
        setFormattedTime(formatTime(updatedAt));
      }, 1000)
    }

    return () => {
      if(intervalUpdate){
        clearInterval(intervalUpdate);
      }
    }

  }, [updatedAt])

  const handleMarkerClick = (stop: Stop, marker: L.Marker) => {
    if(activeMarker.current){
      activeMarker.current.setLatLng(marker.getLatLng())
    }
    else{
      activeMarker.current = new L.Marker(marker.getLatLng(), {icon: stopIcon});
    }
    
    
    //Clear map
    if(markerCluster.current){
      map.current?.removeLayer(markerCluster.current);
    }
    polyLines.current?.clearLayers();

    //Update polylines
    getPolylines(stop.stop_code);

    //Update sidebar
    handleCurrent(stop);
  }

  const getVehiclePolyline = async (vehicle: VehicleData) => {
    if(!currentStop) return;

    const routeData: RouteData[] = (await axios.get("/api/routes")).data;
    const timedata = (await axios.get("/api/stops/" + currentStop.stop_code + "/times" )).data as StopTime[];
    
    let tripRef: string|null = null;
    const validData = timedata.filter(time => time.trip_id.includes(vehicle.blockref))
    
    if(validData.length > 0){
      tripRef = validData[0].trip_id;
    }

    if(!tripRef) return;
      
    const tripData = await (await axios.get("/api/trips/trip/" + tripRef)).data[0] as TripData;

    let shape: Shape[] = [];

      shape = (await axios.get("/api/shapes/" + tripData.shape_id)).data as Shape[];

      const points:L.LatLng[] = []

      shape.forEach((point) => {
        points.push(new L.LatLng(point.lat, point.lon))
      });

      let color = "FFFFFF";
      
      routeData.forEach(route => {
        if(route.route_id == tripData.route_id){
          color = route.route_color;
          return;
        }
      });

      const polyline = L.polyline(points, {color: "#" + color});
      polyline.bringToBack()
      polyLines.current?.addLayer(polyline);
  }

  const getPolylines = async (stop_id: number) => {
    const routeData: RouteData[] = (await axios.get("/api/routes")).data;
    
    //siri sm
    const data = (await axios.get("/api/stops/" + stop_id)).data["result"] as VehicleData[];

    //gfts data
    const timedata = (await axios.get("/api/stops/" + stop_id + "/times" )).data as StopTime[];

    const lineToBlock: Record<string, string> = {};

    data.forEach((vehicle) => {
      if(!lineToBlock[vehicle.lineref]){
        lineToBlock[vehicle.lineref] = vehicle.blockref;
      }
    })

    const tripRefs: string[] = [];

    for(const val of Object.values(lineToBlock)){
      const validData = timedata.filter(time => time.trip_id.includes(val))
      
      if(validData.length > 0){
        tripRefs.push(validData[0].trip_id);
      }
    }

    tripRefs.forEach(async (ref) => {
      const tripData = await (await axios.get("/api/trips/trip/" + ref)).data[0] as TripData

      let shape: Shape[] = [];

      shape = (await axios.get("/api/shapes/" + tripData.shape_id)).data as Shape[];

      const points:L.LatLng[] = []

      shape.forEach((point) => {
        points.push(new L.LatLng(point.lat, point.lon))
      });

      let color = "FFFFFF";
      
      routeData.forEach(route => {
        if(route.route_id == tripData.route_id){
          color = route.route_color;
          return;
        }
      });

      const polyline = L.polyline(points, {color: "#" + color});
      polyline.bringToBack()
      polyLines.current?.addLayer(polyline);
    });
    
    if(polyLines.current){
      map.current?.addLayer(polyLines.current);
    }
  }

  const formatTime = (epochTime: number) => {
    const timeNow = new Date().getTime() / 1000;

    const between = Math.floor(timeNow - epochTime);


    if (between < 60) {
      return `Sijainti päivitetty ${between}s sitten.`;
    } 
    else if (between < 3600) {
      const minutes = Math.floor(between / 60);
      return `Sijainti päivitetty ${minutes}min sitten.`;
    } 
    else{
      return `Sijainti päivitetty yli tunti sitten.`
    }
    

  }

  useEffect(() => {
    if(!map.current || !markerCluster.current || map.current.hasLayer(markerCluster.current)) return;

    axios.get("/api/stops").then((response) => {
      Object.entries(response.data).forEach(([, value]) => {
        const stop = value as Stop;

        if(map.current){
          const marker = L.marker([stop.stop_lat, stop.stop_lon], {icon: stopIcon});
          //On marker open
          marker.on("click", () => handleMarkerClick(stop, marker))
          markerCluster.current?.addLayer(marker);
        }
        
      }); 
    })

    map.current.addLayer(markerCluster.current);
  }, [])

  return(
    <div> 
      <div id="map"></div>
      {
        updatedAt ? <p className='updatedAt'>{formattedTime}</p> : <div/>
      }
    </div>
  );
  
}