import express from 'express';
import axios from 'axios';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const server = createServer(app);
const io = new Server(server)



app.get('/api', (req, res) => {
  res.send('Hello world.');
});

io.on('connection', (socket) => {
  console.log("Connection received.");
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
          io.to('vehicle-'+vehicle).emit("update", vehicles[vehicle])
        }
      }

      previousVehicles.set(vehicle, vehicles[vehicle]);
    });
  })
}, 3000)