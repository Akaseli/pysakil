import express from "express";
import axios from "axios";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { VehicleData } from "@repo/types";
import NodeCache from "node-cache";
import dotenv from "dotenv";
import path from "path";
import compression from "compression";

const envPath = path.join(path.resolve() + "/.env");
dotenv.config({ path: envPath });

const port = process.env.PORT || 3000;

const app = express();
const server = createServer(app);

app.use(compression());

let origin = "*";

if (process.env.PRODUCTION) {
  origin = "https://pysakil.akaseli.dev";
}

const io = new Server(server, {
  cors: { origin: origin },
  path: "/api/socket/",
});

if (process.env.PRODUCTION) {
  console.log("Serving frontend");
  app.use(express.static(path.join(__dirname, "../frontend")));
}

const cache = new NodeCache();

//1 hour, route paths etc
const ttlLong = 3600;
//60 s, bus stop info etc
const ttlShort = 60;

if (process.env.PRODUCTION) {
  app.use(cors({ origin: "https://pysakil.akaseli.dev" }));
} else {
  app.use(cors());
}

//VehicleData
const previousVehicles: Map<string, VehicleData> = new Map([]);

const headers: Record<string, string> = {};

if (process.env.REQ_UA) {
  headers["User-Agent"] = process.env.REQ_UA;
} else {
  console.warn("Read https://data.foli.fi/doc/linjaukset-en");
}

app.get("/api", (req, res) => {
  res.send("Hello world.");
});

app.get("/api/stops/", async (req, res) => {
  const cacheKey = "stops";

  if (cache.has(cacheKey)) {
    res.json(cache.get(cacheKey));
  } else {
    try {
      const response = await axios.get(`http://data.foli.fi/gtfs/stops`, {
        headers,
      });
      cache.set(cacheKey, response.data, ttlLong);

      res.json(response.data);
    } catch {
      res.sendStatus(500);
    }
  }
});

app.get("/api/stops/:stopNumber", async (req, res) => {
  const { stopNumber } = req.params;

  const cacheKey = "stop-" + stopNumber;

  if (cache.has(cacheKey)) {
    res.json(cache.get(cacheKey));
  } else {
    try {
      const response = await axios.get(
        `https://data.foli.fi/siri/sm/${stopNumber}`,
        { headers }
      );
      cache.set(cacheKey, response.data, ttlShort);

      res.json(response.data);
    } catch (error) {
      res.sendStatus(500);
    }
  }
});

app.get("/api/stops/:stopNumber/times", async (req, res) => {
  const { stopNumber } = req.params;

  const cacheKey = "stoptimes-" + stopNumber;

  if (cache.has(cacheKey)) {
    res.json(cache.get(cacheKey));
  } else {
    try {
      const response = await axios.get(
        `https://data.foli.fi/gtfs/stop_times/stop/${stopNumber}`,
        { headers }
      );
      cache.set(cacheKey, response.data, ttlLong);

      res.json(response.data);
    } catch (error) {
      res.sendStatus(500);
    }
  }
});

app.get("/api/routes", async (req, res) => {
  const cacheKey = "routes";

  if (cache.has(cacheKey)) {
    res.json(cache.get(cacheKey));
  } else {
    try {
      const response = await axios.get(`https://data.foli.fi/gtfs/routes`, {
        headers,
      });

      cache.set(cacheKey, response.data, ttlLong);

      res.json(response.data);
    } catch {
      res.sendStatus(500);
    }
  }
});

app.get("/api/trips/trip/:tripId", async (req, res) => {
  const { tripId } = req.params;

  const cacheKey = "trip-" + tripId;

  if (cache.has(cacheKey)) {
    res.json(cache.get(cacheKey));
  } else {
    try {
      const response = await axios.get(
        `http://data.foli.fi/gtfs/trips/trip/${tripId}`,
        { headers }
      );

      cache.set(cacheKey, response.data, ttlLong);

      res.json(response.data);
    } catch (error) {
      res.sendStatus(500);
    }
  }
});

app.get("/api/shapes/:shapeId", async (req, res) => {
  const { shapeId } = req.params;

  const cacheKey = "shape-" + shapeId;

  if (cache.has(cacheKey)) {
    res.json(cache.get(cacheKey));
  } else {
    try {
      const response = await axios.get(
        `https://data.foli.fi/gtfs/shapes/${shapeId}`,
        { headers }
      );

      cache.set(cacheKey, response.data, ttlLong);

      res.json(response.data);
    } catch {
      res.sendStatus(500);
    }
  }
});

//Socket stuff
io.on("connection", (socket) => {
  socket.on("startVehicle", (vehicle) => {
    const rooms = Array.from(socket.rooms).slice(1);
    rooms.forEach((room) => socket.leave(room));

    const data: VehicleData | undefined = previousVehicles.get(vehicle);

    if (vehicle) {
      socket.emit("startUpdate", {
        lat: data?.latitude,
        lon: data?.longitude,
        t: data?.recordedattime,
      });
    } else {
      socket.emit("startUpdate", { lat: 0, lon: 0, t: 0 });
    }

    socket.join("vehicle-" + vehicle);
  });

  socket.on("stopVehicle", (vehicle) => {
    socket.leave("vehicle-" + vehicle);
  });
});

server.listen(port, () => {
  console.log(`Backend up on port ${port}`);
});

setInterval(async () => {
  try {
    const response = await axios.get("https://data.foli.fi/siri/vm", { headers });
    const vehicles = response.data?.result?.vehicles;

    if (response.status === 200 && vehicles) {
      for (const vehicle in vehicles) {
        const pVec: VehicleData | undefined = previousVehicles.get(vehicle);
        const nVec: VehicleData = vehicles[vehicle];

        if (pVec && pVec.recordedattime !== nVec.recordedattime) {
          io.to("vehicle-" + nVec.vehicleref).emit("update", {
            lat: nVec.latitude,
            lon: nVec.longitude,
            t: nVec.recordedattime,
          });
        }
        previousVehicles.set(vehicle, nVec);
      }
    }
  } catch (e) {
    console.error("Polling request failed:", e.message);
  }
}, 5000);