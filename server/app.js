import path from "node:path";
import express from "express";
import { Server } from "socket.io";
import {
  insertMetric,
  createVideoSession,
  getLeaderboard,
  getMessages,
  getNotifications,
  insertNotification,
  listOnlineUsers,
  upsertUser,
  endVideoSession,
  insertMessage,
  recordNotificationReceive
} from "./db/client.js";
import { config } from "./config.js";
import { registerHttpRoutes } from "./routes/http-routes.js";
import { registerSocketHandlers } from "./realtime/socket-handlers.js";
import { createMetricsStream } from "./dashboard/metrics-stream.js";
import { createPresenceRegistry } from "./modules/presence-registry.js";

const presenceRegistry = createPresenceRegistry();
const metricsStream = createMetricsStream({ insertMetric, config });

// Normalizes and validates pseudo values shared by HTTP and Socket handlers.
function validPseudo(pseudo) {
  const value = String(pseudo ?? "").trim();
  if (!value || value.length > 24) return null;
  return value;
}

// Creates and configures the Express app, then delegates route registration to backend modules.
export function createApp() {
  const app = express();
  app.use(express.json());
  app.use(express.static(path.resolve(process.cwd(), "public")));

  registerHttpRoutes(app, {
    validPseudo,
    upsertUser,
    listOnlineUsers,
    getMessages,
    getNotifications,
    getLeaderboard,
    insertNotification,
    createVideoSession
  });
  metricsStream.registerDashboardStreamRoute(app);

  return app;
}

// Boots Socket.IO and delegates all realtime behavior to a focused module.
export function attachSocket(server) {
  const io = new Server(server);
  registerSocketHandlers(io, {
    validPseudo,
    presenceRegistry,
    upsertUser,
    listOnlineUsers,
    getMessages,
    getNotifications,
    getLeaderboard,
    insertMessage,
    insertNotification,
    recordNotificationReceive,
    createVideoSession,
    endVideoSession
  });
  metricsStream.startMetricSimulation();
  // Stops metric simulation when the HTTP server shuts down to avoid orphan intervals.
  server.once("close", () => metricsStream.stopMetricSimulation());
  return io;
}

