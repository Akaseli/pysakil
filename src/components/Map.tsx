import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './Map.css';

interface Props {

}

export const Map: React.FC<Props> = () => {
  const mapContainer = useRef(null);
  const map = useRef<maplibregl.Map>();
  
  useEffect(() => {
    if(map.current || !mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: "http://localhost:8080/styles/basic-preview/style.json",
      center: [22.26, 60.45],
      zoom: 13,
      maxZoom: 16,
      minZoom: 8,
      minPitch: 0,
      maxPitch: 0
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right')
  }, [])

  

  return(
    <div className="map-wrap">
      <div ref={mapContainer} className="map"/>
    </div>
  );
  
}