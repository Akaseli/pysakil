import express from 'express';
import axios from 'axios';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from "cors";
import { RouteData, VehicleData } from "@repo/types";
import NodeCache from "node-cache"

const app = express();
const server = createServer(app);
const io = new Server(server, {cors: {origin: "*"}, path: "/api/socket/"})

const cache = new NodeCache()

//1 hour, route paths etc
const ttlLong = 3600;
//30 s, bus stop info etc
const ttlShort = 30;
app.use(cors())

//VehicleData
const previousVehicles:Map<string, VehicleData> = new Map([]);

app.get('/api', (req, res) => {
  res.send('Hello world.');
});

app.get("/api/stops/", async (req, res) => {
  const cacheKey = "stops"

  if(cache.has(cacheKey)){
    res.json(cache.get(cacheKey))
  }
  else{
    const response = await axios.get(`http://data.foli.fi/gtfs/stops`)
    cache.set(cacheKey, response.data, ttlLong)

    res.json(response.data)
  }
})

app.get("/api/stops/:stopNumber", async (req, res) => { 
  const { stopNumber } = req.params

  const cacheKey = "stop-" + stopNumber

  if(cache.has(cacheKey)){
    res.json(cache.get(cacheKey))
  }
  else{
    const response = await axios.get(`https://data.foli.fi/siri/sm/${stopNumber}`)
    cache.set(cacheKey, response.data, ttlShort)

    res.json(response.data)
  }

});

app.get("/api/routes", async (req, res) => {
  const cacheKey = "routes"

  if(cache.has(cacheKey)){
    res.json(cache.get(cacheKey))
  }
  else{
    const response = await axios.get(`https://data.foli.fi/gtfs/routes`)

    cache.set(cacheKey, response.data, ttlLong)

    res.json(response.data)
  }
})

app.get("/api/trips/trip/:tripId", async (req, res) => {
  const { tripId } = req.params;

  const cacheKey = "trip-" + tripId;

  if(cache.has(cacheKey)){
    res.json(cache.get(cacheKey))
  }
  else{
    const response = await axios.get(`http://data.foli.fi/gtfs/trips/trip/${tripId}`)

    cache.set(cacheKey, response.data, ttlLong)

    res.json(response.data)
  }
})

app.get("/api/shapes/:shapeId", async (req, res) => {
  const { shapeId } = req.params;
  
  const cacheKey = "shape-" + shapeId

  if(cache.has(cacheKey)){
    res.json(cache.get(cacheKey))
  }
  else{
    const response = await axios.get(`https://data.foli.fi/gtfs/shapes/${shapeId}`)

    cache.set(cacheKey, response.data, ttlLong)

    res.json(response.data)
  }
})

//Socket stuff
io.on('connection', (socket) => {
  console.log("Connection received.");

  socket.on("startVehicle", (vehicle) => {
    console.log("Vehicleee")
    
    const rooms = Array.from(socket.rooms).slice(1);
    rooms.forEach((room) => socket.leave(room));

    
    const data:VehicleData|undefined = previousVehicles.get(vehicle);

    if(vehicle){
      socket.emit("startUpdate", {lat: data?.latitude, lon: data?.longitude,  t: data?.recordedattime})
    }
    else{
      socket.emit("startUpdate", {lat: 0, lon: 0})
    }
    

    socket.join("vehicle-" + vehicle);
    console.log(socket.rooms)
  })

  socket.on("stopVehicle", (vehicle) => {
    socket.leave("vehicle-" + vehicle)
  })
});

server.listen(3000, () => {
  console.log('Backend up on port 3000');
});

setInterval(async () => {
  //TODO add correct metadata
  axios.get("https://data.foli.fi/siri/vm").then((response) => {
    const vehicles:VehicleData[] = response.data["result"]["vehicles"];

    Object.keys(vehicles).forEach((vehicle: string) => {
      const pVec:VehicleData|undefined = previousVehicles.get(vehicle);
      const nVec:VehicleData = vehicles[vehicle];

      if(pVec != undefined){
        if(pVec.recordedattime != nVec.recordedattime){
          io.to('vehicle-'+ nVec.vehicleref).emit("update", {lat: nVec.latitude, lon: nVec.longitude, t: nVec.recordedattime })
        }
      }

      previousVehicles.set(vehicle, vehicles[vehicle]);
    });
  })
}, 5000)