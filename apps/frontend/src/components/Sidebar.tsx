import React, { useEffect, useState } from 'react'
import "./Sidebar.css"
import axios from 'axios';
import { VehicleData, Stop } from '@repo/types';
interface Props {
  stop: number,
  setVehicle: (arg: string|null) => void,
}

export const Sidebar: React.FC<Props> = ({stop, setVehicle}) => {
  const [vehicles, setVehicles] = useState<VehicleData[]>([]);
  const [stopData ,setStopData] = useState<Stop>();
  const [visibleVehicle, setVisibleVehicle] = useState<string|null>(null);

  useEffect(() => {
    axios.get("/api/stops/" + stop).then((response) => {
      if(!response.data) return;

      setVehicles(response.data["result"]);
    })

    axios.get("/api/stops").then((response) => {
      if(!response.data) return;

      setStopData(response.data[stop]);
    });
  }, [stop])

  const handleVehicle = (vehicle: VehicleData) => {
    setVehicle(vehicle.vehicleref)
    setVisibleVehicle(vehicle.vehicleref + "-" + vehicle.datedvehiclejourneyref)
  }

  const vehicleCards = vehicles.map((vehicle) => {
    const timeToArrival = Math.abs(Math.round((vehicle.aimedarrivaltime - Date.now()/1000) / 60));


    return <div className='vehicleCard' onClick={() => {handleVehicle(vehicle)}}>
      <p>{vehicle.lineref + " - " + vehicle.destinationdisplay}<span className="estimate">{timeToArrival + "min"}</span></p>
      {
        vehicle.monitored ? ( 
          (vehicle.vehicleref + "-" + vehicle.datedvehiclejourneyref == visibleVehicle) ? <div className='tracked active'/> : <div className='tracked'/> 
      ) : <div />
      }
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