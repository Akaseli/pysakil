import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import './Map.css';
import "@maplibre/maplibre-gl-leaflet";
import "leaflet.markercluster";
import axios from 'axios';
import { Stop } from '../types/stop';

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