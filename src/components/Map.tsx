import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import './Map.css';
import "@maplibre/maplibre-gl-leaflet";
import "leaflet.markercluster";
import axios from 'axios';

interface Props {

}

interface Stop {
  stop_code: number,
  stop_name: string,
  stop_desc: string,
  stop_lat: number,
  stop_lon: number,
  zone_id: string,
  stop_url: string,
  location_type: number,
  parent_station: number,
  stop_timezone: string,
  wheelchair_boarding: number
}

export const Map: React.FC<Props> = () => {
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
      style: "http://localhost:8080/styles/basic-preview/style.json"
    }).addTo(map.current);
    
    //Stops
    const markers = L.markerClusterGroup({
      disableClusteringAtZoom: 16
    });

    axios.get("http://data.foli.fi/gtfs/stops").then((response) => {
      Object.entries(response.data).forEach(([key, value]) => {
        const stop:Stop = value;

        if(map.current){
          const marker = L.marker([stop.stop_lat, stop.stop_lon]);
          marker.bindPopup(`<p>${stop.stop_name} - ${stop.stop_code}</p>`).openPopup()
          markers.addLayer(marker);
        }
        
      }); 
    })
    map.current.addLayer(markers);

    //
  }, [])
 
  

  return(
    <div>

    </div>
  );
  
}