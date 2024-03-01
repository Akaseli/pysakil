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
      disableClusteringAtZoom: 16
    });

    axios.get("http://data.foli.fi/gtfs/stops").then((response) => {
      Object.entries(response.data).forEach(([key, value]) => {
        const stop = value as Stop;

        if(map.current){
          const marker = L.marker([stop.stop_lat, stop.stop_lon]);
          marker.bindPopup(`<p>${stop.stop_name} - ${stop.stop_code}</p>`).openPopup()
          //On marker open
          marker.on("click", () => {
            setActive(stop.stop_code);

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

              routeRefts.forEach((ref) => {
                axios.get("https://data.foli.fi/gtfs/v0/trips/route/" + ref).then((response) => {
                  if(!response.data) return;

                  const tripData = response.data as TripData[];

                  tripData.forEach((trip) => {
                    if(!tripIds.includes(trip.trip_id)){
                      if(!shapeIds.includes(trip.shape_id)){
                        shapeIds.push(trip.shape_id)

                        //Render polyline
                        axios.get("https://data.foli.fi/gtfs/shapes/"+ trip.shape_id).then((response) => {
                          if(!response.data) return;

                          const shape = response.data as Shape[];
                          const points:L.LatLng[] = [];


                          shape.forEach((point) => {
                            points.push(new L.LatLng(point.lat, point.lon))
                          })

                          const polyline = L.polyline(points);

                          map.current?.addLayer(polyline);
                        })
                      }
                    }
                  })
                })
              });
            });
          })
          //On popup close
          marker.getPopup()?.on("remove", () => {
            setActive(null);
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