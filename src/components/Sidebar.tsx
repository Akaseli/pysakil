import React, { useEffect, useState } from 'react'
import "./Sidebar.css"
import axios from 'axios';
import { VehicleData } from '../types/vehicleData';

interface Props {
  stop: number
}

export const Sidebar: React.FC<Props> = ({stop}) => {
  const [vehicles, setVehicles] = useState<VehicleData[]>([]);  

  useEffect(() => {
    axios.get("https://data.foli.fi/siri/sm/" + stop).then((response) => {
      if(!response.data) return;

      setVehicles(response.data["result"]);
    })
  }, [stop])

  const vehicleCards = vehicles.map((vehicle) => {
    const timeToArrival = Math.abs(Math.round((vehicle.aimedarrivaltime - Date.now()/1000) / 60));


    return <div className='vehicleCard'>
      <p>{vehicle.lineref + " - " + vehicle.destinationdisplay}<span className="estimate">{timeToArrival + "min"}</span></p>
    </div>
  })

  return(
    <div className="sidebar">
      <h2>{"Pysäkki " + stop}</h2>
      <div className='vehicleCards'>
        {vehicleCards}
      </div>
      
    </div>
  );
}