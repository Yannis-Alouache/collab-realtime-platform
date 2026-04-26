import path from "node:path";
import express from "express";
import { Server } from "socket.io";
import {
  createVideoSession,
  endVideoSession,
  getLeaderboard,
  getMessages,
  getNotifications,
  insertMessage,
  insertMetric,
  insertNotification,
  listOnlineUsers,
  recordNotificationReceive,
  upsertUser
} from "./db/client.js";
import { config } from "./config.js";
import { createPresenceRegistry } from "./modules/presence-registry.js";

const metricsClients = new Set();
const presenceRegistry = createPresenceRegistry();

function validPseudo(pseudo) {
  const value = String(pseudo ?? "").trim();
  if (!value || value.length > 24) return null;
  return value;
}

function broadcastPresence(io) {
  io.emit("presence:update", { users: listOnlineUsers() });
}

function broadcastLeaderboard(io) {
  io.emit("stats:leaderboard", { users: getLeaderboard(20) });
}

function simulateMetric() {
  const cpu = Math.floor(20 + Math.random() * 75);
  const ram = Math.floor(25 + Math.random() * 70);
  const payload = { cpu, ram, ts: new Date().toISOString() };
  insertMetric(cpu, ram);
  for (const res of metricsClients) {
    res.write(`event: metrics\ndata: ${JSON.stringify(payload)}\n\n`);
    if (cpu >= config.cpuAlertThreshold || ram >= config.ramAlertThreshold) {
      res.write(
        `event: threshold-alert\ndata: ${JSON.stringify({ cpu, ram, cpuThreshold: config.cpuAlertThreshold, ramThreshold: config.ramAlertThreshold })}\n\n`
      );
    }
  }
}

export function createApp() {
  const app = express();
  app.use(express.json());
  app.use(express.static(path.resolve(process.cwd(), "public")));

  app.post("/api/auth/login", (req, res) => {
    const pseudo = validPseudo(req.body?.pseudo);
    const area = String(req.body?.area ?? "chat");
    if (!pseudo) return res.status(400).json({ error: "INVALID_PSEUDO" });
    if (area === "chat" && pseudo.toLowerCase() === "admin") {
      return res.status(403).json({ error: "RESERVED_PSEUDO" });
    }
    upsertUser(pseudo, true);
    return res.json({ pseudo });
  });

  app.post("/api/auth/logout", (req, res) => {
    const pseudo = validPseudo(req.body?.pseudo);
    if (!pseudo) return res.status(400).json({ error: "INVALID_PSEUDO" });
    upsertUser(pseudo, false);
    return res.json({ ok: true });
  });

  app.get("/api/users/online", (_req, res) => res.json({ users: listOnlineUsers() }));
  app.get("/api/messages/history", (_req, res) => res.json({ messages: getMessages(100) }));
  app.get("/api/notifications/history", (_req, res) => res.json({ notifications: getNotifications(100) }));
  app.get("/api/stats/leaderboard", (_req, res) => res.json({ users: getLeaderboard(20) }));

  app.post("/api/notifications/send", (req, res) => {
    const senderPseudo = String(req.body?.senderPseudo ?? "").trim().toLowerCase();
    if (senderPseudo !== "admin") {
      return res.status(403).json({ error: "ADMIN_ONLY" });
    }
    const level = String(req.body?.level ?? "info");
    const title = String(req.body?.title ?? "").trim();
    const body = String(req.body?.body ?? "").trim();
    if (!["info", "warning", "critical"].includes(level) || !title || !body) {
      return res.status(400).json({ error: "INVALID_NOTIFICATION" });
    }
    const notification = insertNotification(level, title, body, "admin");
    return res.status(201).json({ notification });
  });

  app.get("/api/dashboard/stream", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();
    metricsClients.add(res);
    req.on("close", () => metricsClients.delete(res));
  });

  app.post("/api/webrtc/call-session", (req, res) => {
    const initiatorPseudo = validPseudo(req.body?.initiatorPseudo);
    const targetPseudo = validPseudo(req.body?.targetPseudo);
    if (!initiatorPseudo || !targetPseudo) {
      return res.status(400).json({ error: "INVALID_CALL_PARTICIPANTS" });
    }
    if (initiatorPseudo === targetPseudo) {
      return res.status(400).json({ error: "SELF_CALL_NOT_ALLOWED" });
    }
    const session = createVideoSession(initiatorPseudo, targetPseudo);
    return res.status(201).json({ sessionId: session.id });
  });

  return app;
}

export function attachSocket(server) {
  const io = new Server(server);

  io.on("connection", (socket) => {
    const pseudo = validPseudo(socket.handshake.query?.pseudo);
    if (!pseudo) {
      socket.emit("error:event", { error: "INVALID_PSEUDO" });
      socket.disconnect(true);
      return;
    }

    socket.data.pseudo = pseudo;
    presenceRegistry.connect(pseudo, socket.id);
    upsertUser(pseudo, true);
    broadcastPresence(io);
    socket.emit("chat:history", { messages: getMessages(100) });
    socket.emit("notify:history", { notifications: getNotifications(100) });
    socket.emit("stats:leaderboard", { users: getLeaderboard(20) });

    socket.on("chat:send", ({ content }) => {
      const text = String(content ?? "").trim();
      if (!text) return;
      const message = insertMessage(pseudo, text);
      io.emit("chat:new", message);
      broadcastLeaderboard(io);
    });

    socket.on("notify:send", ({ level, title, body }) => {
      if (pseudo.toLowerCase() !== "admin") {
        socket.emit("error:event", { error: "ADMIN_ONLY" });
        return;
      }
      if (!["info", "warning", "critical"].includes(level)) {
        socket.emit("error:event", { error: "INVALID_LEVEL" });
        return;
      }
      const notification = insertNotification(level, String(title ?? "").trim(), String(body ?? "").trim(), "admin");
      io.emit("notify:new", notification);
    });

    socket.on("notify:ack", () => {
      recordNotificationReceive(pseudo);
      broadcastLeaderboard(io);
    });

    socket.on("webrtc:call-request", ({ targetPseudo }) => {
      const targetSocketId = presenceRegistry.getAnySocketId(String(targetPseudo ?? ""));
      if (!targetSocketId) {
        socket.emit("error:event", { error: "TARGET_OFFLINE" });
        return;
      }
      const session = createVideoSession(pseudo, targetPseudo);
      io.to(targetSocketId).emit("webrtc:incoming-call", { from: pseudo, sessionId: session.id });
      broadcastLeaderboard(io);
    });

    socket.on("webrtc:offer", ({ targetPseudo, offer, sessionId }) => {
      const targetSocketId = presenceRegistry.getAnySocketId(String(targetPseudo ?? ""));
      if (targetSocketId) io.to(targetSocketId).emit("webrtc:offer", { from: pseudo, offer, sessionId });
    });
    socket.on("webrtc:answer", ({ targetPseudo, answer, sessionId }) => {
      const targetSocketId = presenceRegistry.getAnySocketId(String(targetPseudo ?? ""));
      if (targetSocketId) io.to(targetSocketId).emit("webrtc:answer", { from: pseudo, answer, sessionId });
    });
    socket.on("webrtc:ice", ({ targetPseudo, candidate, sessionId }) => {
      const targetSocketId = presenceRegistry.getAnySocketId(String(targetPseudo ?? ""));
      if (targetSocketId) io.to(targetSocketId).emit("webrtc:ice", { from: pseudo, candidate, sessionId });
    });
    socket.on("webrtc:hangup", ({ targetPseudo, sessionId }) => {
      if (sessionId) endVideoSession(sessionId);
      const targetSocketId = presenceRegistry.getAnySocketId(String(targetPseudo ?? ""));
      if (targetSocketId) io.to(targetSocketId).emit("webrtc:hangup", { from: pseudo, sessionId });
    });

    socket.on("disconnect", () => {
      presenceRegistry.disconnect(pseudo, socket.id);
      if (!presenceRegistry.isOnline(pseudo)) {
        upsertUser(pseudo, false);
      }
      broadcastPresence(io);
    });
  });

  setInterval(simulateMetric, config.metricsIntervalMs);
  return io;
}

