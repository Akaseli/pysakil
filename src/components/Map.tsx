import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import './Map.css';
import "@maplibre/maplibre-gl-leaflet";
import "leaflet.markercluster";
import axios from 'axios';
import { Stop } from '../types/stop';
import { VehicleData } from '../types/vehicleData';
import { TripData } from '../types/tripData';
import { Shape } from '../types/shape';

interface Props {
  setActive: (arg: number|null) => void
}

export const Map: React.FC<Props> = ({setActive}) => {
  const map = useRef<L.Map>()

  useEffect(() => {
    if(map.current) return;
    

    map.current = L.map("map", {
      center: [60.45, 22.26],
      zoom: 13,
      minZoom: 9,
      maxZoom: 18
    })

    L.maplibreGL({
      //@ts-expect-error no types
      style: "http://localhost:8080/styles/basic-preview/style.json"
    }).addTo(map.current);
    
    //Stops
    const markers = L.markerClusterGroup({
      disableClusteringAtZoom: 16,
      spiderfyOnMaxZoom: false
    });

    const pLines = new L.LayerGroup();

    const colors = ["#fc0303", "#fc6f03", "#fcd303", "#a1fc03", "#03fc41", "#03fcd7", "#0390fc", "#0320fc", "#0320fc", "#fc03e8", "#fc037f"]

    

    const icon = L.icon({ 
      iconUrl: "/stop.svg",
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    })

    const activeMarker = new L.Marker([0, 0], {icon: icon});
    
    map.current.on("click", () => {
      setActive(null);
      map.current?.addLayer(markers);
      map.current?.removeLayer(activeMarker);
      map.current?.removeLayer(pLines);
    })

    axios.get("http://data.foli.fi/gtfs/stops").then((response) => {
      Object.entries(response.data).forEach(([key, value]) => {
        const stop = value as Stop;

        if(map.current){
          const marker = L.marker([stop.stop_lat, stop.stop_lon], {icon: icon});
          //On marker open
          marker.on("click", () => {
            activeMarker.setLatLng(marker.getLatLng());
            map.current?.addLayer(activeMarker);
            map.current?.removeLayer(markers);

            setActive(stop.stop_code);
            pLines.clearLayers();

            //Polylines
            axios.get("https://data.foli.fi/siri/sm/" + stop.stop_code).then((response) => {
              if(!response.data) return;

              const data = response.data["result"] as VehicleData[];
              //pick different route refs
              const routeRefts:string[] = [];
              const tripIds: string[] = [];
              const shapeIds: string[] = [];

              data.forEach((vehicle) => {
                if(!routeRefts.includes(vehicle.__routeref)){
                  routeRefts.push(vehicle.__routeref);
                }

                tripIds.push(vehicle.__tripref)
              })

              let tripData: TripData[] = [];

              routeRefts.forEach((ref) => {
                //Get trip data
                axios.get("https://data.foli.fi/gtfs/v0/trips/route/" + ref).then((response) => {
                  if(!response.data) return;

                  tripData = response.data as TripData[];
                }).then(() => {
                  tripData.forEach((trip) => {
                    if(!tripIds.includes(trip.trip_id)){
                      if(!shapeIds.includes(trip.shape_id)){
                        shapeIds.push(trip.shape_id)

                        //Get polyline shape
                        let shape: Shape[] = [];

                        axios.get("https://data.foli.fi/gtfs/shapes/"+ trip.shape_id).then((response) => {
                          if(!response.data) return;

                          shape = response.data as Shape[];
                        })
                        .then(() => {
                          
                          const points:L.LatLng[] = [];

                          shape.forEach((point) => {
                            points.push(new L.LatLng(point.lat, point.lon))
                          });

                          const polyline = L.polyline(points, {color: colors[shape[shape.length - 1].traveled % colors.length]});
                          
                          pLines.addLayer(polyline);

                        })
                      }
                    }
                  })
                })
              });
            });

            map.current?.addLayer(pLines);
          })
          markers.addLayer(marker);
        }
        
      }); 
    })
    map.current.addLayer(markers);
  }, [])
 
  

  return(
    <div>

    </div>
  );
  
}