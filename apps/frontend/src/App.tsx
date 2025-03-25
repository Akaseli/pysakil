import { useEffect, useState } from 'react'
import './App.css'
import { Map } from './components/Map'
import { Sidebar } from './components/Sidebar'

function App() {
  const [activeStop, setStop] = useState<number|null>(null);
  const [vehicle, setVehicle] = useState<string|null>(null);


  useEffect(() => {
    const mapElement = document.getElementById("map");

    if(mapElement){
      mapElement.toggleAttribute("active", true);
      /*
      if(activeStop){
        mapElement.toggleAttribute("active", true);
      }
      else{
        mapElement.toggleAttribute("active", false);
      }
      */
    }
    
  }, [activeStop])

  const setActiveStop = (value: number|null) => {
    setStop(value);
    setVehicle(null);
  }

  const setActiveVehicle = (value: string|null) => {
    setVehicle(value);
  }

  return (
    <>
      <div>
        {activeStop ? <Sidebar stop={activeStop} setVehicle={setActiveVehicle}/> : <div className='sidebar'></div>}

        <Map setActive={setActiveStop} vehicle={vehicle}/>
      </div>
    </>
  )
}

export default App
