import React, { useEffect, useState } from 'react'
import "./Sidebar.css"
import axios from 'axios';
import { VehicleData } from '../types/vehicleData';
import { Stop } from '../types/stop';

interface Props {
  stop: number,
  setVehicle: (arg: string|null) => void,
}

export const Sidebar: React.FC<Props> = ({stop, setVehicle}) => {
  const [vehicles, setVehicles] = useState<VehicleData[]>([]);
  const [stopData ,setStopData] = useState<Stop>();

  useEffect(() => {
    axios.get("https://data.foli.fi/siri/sm/" + stop).then((response) => {
      if(!response.data) return;

      setVehicles(response.data["result"]);
    })

    axios.get("http://data.foli.fi/gtfs/stops").then((response) => {
      if(!response.data) return;

      setStopData(response.data[stop]);
    });
  }, [stop])

  const vehicleCards = vehicles.map((vehicle) => {
    const timeToArrival = Math.abs(Math.round((vehicle.aimedarrivaltime - Date.now()/1000) / 60));


    return <div className='vehicleCard' onClick={() => {setVehicle(vehicle.blockref)}}>
      <p>{vehicle.lineref + " - " + vehicle.destinationdisplay}<span className="estimate">{timeToArrival + "min"}</span></p>
    </div>
  })

  return(
    <div className="sidebar">
      <h2>{stopData?.stop_code + " - " + stopData?.stop_name}</h2>
      <div className='vehicleCards'>
        {vehicleCards}
      </div>
      
    </div>
  );
}