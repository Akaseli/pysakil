import React, { useCallback, useEffect, useRef, useState } from 'react'
import "./Sidebar.css"
import axios from 'axios';
import { VehicleData, Stop } from '@repo/types';
interface Props {
  stop: Stop|null,
  setVehicle: (arg: VehicleData|null) => void,
}

export const Sidebar: React.FC<Props> = ({stop, setVehicle}) => {
  const [vehicles, setVehicles] = useState<VehicleData[]>([]);
  const [visibleVehicle, setVisibleVehicle] = useState<string|null>(null);

  const [mobileHeight, setMobileHeight] = useState(80);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ prevY: 0, previousHeight: 80 });

  const sidebarRef = useRef<HTMLDivElement>(null); 

  useEffect(() => {
    let intervalUpdate: NodeJS.Timeout | undefined;

    if(stop){
      axios.get("/api/stops/" + stop.stop_code).then((response) => {
        if(!response.data) return;
  
        let data:VehicleData[] = response.data["result"];
  
        data = data.sort((a, b) => a.expectedarrivaltime - b.expectedarrivaltime)
  
        setVehicles(data);
      })
  
      intervalUpdate = setInterval(() => {
        axios.get("/api/stops/" + stop.stop_code).then((response) => {
          if(!response.data) return;
    
          let data:VehicleData[] = response.data["result"];
    
          data = data.sort((a, b) => a.expectedarrivaltime - b.expectedarrivaltime)
    
          setVehicles(data);
        })
      }, 15000)
    }
    
    return () => {
      setVisibleVehicle(null)

      if(intervalUpdate){
        clearInterval(intervalUpdate);
      }
    }
  }, [stop])

  const handleVehicle = (vehicle: VehicleData) => {
    if(vehicle.monitored){
      setVehicle(vehicle)
      setVisibleVehicle(vehicle.vehicleref + "-" + vehicle.datedvehiclejourneyref)
    }
    else{
      setVehicle(null)
      setVisibleVehicle(null)
    }
  }

  const vehicleCards = vehicles.map((vehicle) => {
    const timeToArrival = Math.max(0 , (Math.round((vehicle.expectedarrivaltime - Date.now()/1000) / 60)));

    return <div className='vehicleCard' key={vehicle.datedvehiclejourneyref} onClick={() => {handleVehicle(vehicle)}}>
      <p className='route'>{vehicle.lineref + " - " + vehicle.destinationdisplay}</p>

      <div className='extra-info'>
        {
          vehicle.monitored ? ( 
            (vehicle.vehicleref + "-" + vehicle.datedvehiclejourneyref == visibleVehicle) ? <div className='tracked active'/> : <div className='tracked'/> 
          ) : <div />
        }
        <span className="estimate">{timeToArrival + "min"}</span>
      </div>

    </div>
  })

  const handleDragMove = useCallback((newY: number) => {
    if(dragging){
      const { prevY, previousHeight } = dragStart.current; 
    
      const change = newY - prevY;

      const vhChange = (change / window.innerHeight) * 100;

      let newHeight = previousHeight + vhChange;

      //LImit to 20-90vh
      newHeight = Math.max(20, Math.min(90, newHeight));

      setMobileHeight(newHeight);
    }
  }, [dragging])

  const handleMouseDrag = useCallback((e: MouseEvent) => {
    handleDragMove(e.clientY);
  }, [handleDragMove]);

  const handleTouchDrag = useCallback((e: TouchEvent) => {
    if (e.touches.length == 1){
      handleDragMove(e.touches[0].clientY)
    }
  }, [handleDragMove])

  const startDragging = (startLevel: number) => {
    setDragging(true)

    dragStart.current = {
      prevY: startLevel,
      previousHeight: mobileHeight
    }
  }
  
  const stopDragging = useCallback(() => {
    if(dragging){
      setDragging(false)
      document.body.style.userSelect = '';
    }
  }, [dragging])

  const handleMouse = (e: React.MouseEvent<HTMLDivElement>) => {
    startDragging(e.clientY)
  }

  const handleTouch = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();

    if(e.touches.length == 1){
      startDragging(e.touches[0].clientY)
    }
  }

  //Rezise stuff
  useEffect(() => {
    if(dragging){
      window.addEventListener("mousemove", handleMouseDrag);
      window.addEventListener("touchmove", handleTouchDrag)

      window.addEventListener("mouseup", stopDragging);
      window.addEventListener("touchend", stopDragging);
      window.addEventListener("mouseleave", stopDragging);

      document.body.style.userSelect = 'none';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseDrag);
      window.removeEventListener('touchmove', handleTouchDrag);

      window.removeEventListener('mouseup', stopDragging);
      window.removeEventListener('touchend', stopDragging);
      window.removeEventListener('mouseleave', stopDragging);

      if (document.body.style.userSelect === 'none') {
        document.body.style.userSelect = '';
    }
    }

  }, [dragging, handleMouseDrag, handleTouchDrag, stopDragging])

  return(
    <div className="sidebar" ref={sidebarRef} style={{top: mobileHeight + "vh"}}>
      <div className='dragarea' onMouseDown={handleMouse} onTouchStart={handleTouch}></div>
      {
        stop ? (
          <div className='sidebar-content'> 
            <div className='stopinfo'>
              <h2>{stop?.stop_code + " - " + stop?.stop_name}</h2>
              <div className='vehicleCards'>
                {vehicleCards}
              </div>
            </div>
            <p className='attribution'>
              Tietojen lähde: Turun seudun joukkoliikenteen liikennöinti- ja aikatauludata. Aineiston ylläpitäjä on Turun kaupungin joukkoliikennetoimisto. Aineisto on ladattu palvelusta <a href='http://data.foli.fi/' target='_blank'>http://data.foli.fi/</a> lisenssillä Creative Commons Nimeä 4.0 Kansainvälinen (CC BY 4.0).
            </p>
          </div>
        ) : (
        <div className='sidebar-content'> 
            <div className='project-info'>
              <h2>Pysäkil</h2>
              <p>Fölin pysäkkien ja bussien tiedot kartalla. </p>
              <div className='sourcecode'>
                <p>Lähdekoodi: </p>
                <a href='https://github.com/Akaseli/pysakil' target='_blank'>
                  <img width="30px" height="30px" alt="Github logo" src='/github.svg'></img>
                </a>
              </div>
            </div>
            <p className='attribution'>
              Tietojen lähde: Turun seudun joukkoliikenteen liikennöinti- ja aikatauludata. Aineiston ylläpitäjä on Turun kaupungin joukkoliikennetoimisto. Aineisto on ladattu palvelusta <a href='http://data.foli.fi/' target='_blank'>http://data.foli.fi/</a> lisenssillä Creative Commons Nimeä 4.0 Kansainvälinen (CC BY 4.0).
            </p>
        </div>
      )
      }

      
    </div>
  );
}