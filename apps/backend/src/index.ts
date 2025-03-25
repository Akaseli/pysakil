import express from 'express';
import axios from 'axios';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from "cors";

const app = express();
const server = createServer(app);
const io = new Server(server, {cors: {origin: "*"}})

app.use(cors())

app.get('/api', (req, res) => {
  res.send('Hello world.');
});

io.on('connection', (socket) => {
  console.log("Connection received.");

  socket.on("startVehicle", (vehicle) => {
    console.log("Vehicleee")
    
    const rooms = Array.from(socket.rooms).slice(1);
    rooms.forEach((room) => socket.leave(room));

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


//Vehicle updating
const previousVehicles = new Map([]);


setInterval(async () => {
  //TODO add correct metadata
  axios.get("https://data.foli.fi/siri/vm").then((response) => {
    const vehicles = response.data["result"]["vehicles"];

    Object.keys(vehicles).forEach((vehicle: string) => {
      const pVec:any = previousVehicles.get(vehicle);

      if(pVec != undefined){
        if(pVec["recordedattime"] != vehicles[vehicle]["recordedattime"]){
          io.to('vehicle-'+ vehicles[vehicle]["blockref"]).emit("update", {lat: vehicles[vehicle]["latitude"], lon: vehicles[vehicle]["longitude"] })
        }
      }

      previousVehicles.set(vehicle, vehicles[vehicle]);
    });
  })
}, 5000)