// Broadcasts the current online user list to all connected socket clients.
function broadcastPresence(io, listOnlineUsers) {
  io.emit("presence:update", { users: listOnlineUsers() });
}

// Broadcasts the latest activity leaderboard to all connected socket clients.
function broadcastLeaderboard(io, getLeaderboard) {
  io.emit("stats:leaderboard", { users: getLeaderboard(20) });
}

// Forwards signaling payloads to the target pseudo when online.
function relaySignal(io, presenceRegistry, eventName, fromPseudo, targetPseudo, payload) {
  const targetSocketId = presenceRegistry.getAnySocketId(String(targetPseudo ?? ""));
  if (targetSocketId) {
    io.to(targetSocketId).emit(eventName, { from: fromPseudo, ...payload });
  }
}

// Registers all Socket.IO handlers for chat, notifications, presence, and WebRTC signaling.
export function registerSocketHandlers(io, dependencies) {
  const {
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
  } = dependencies;

  // Authenticates socket connection, seeds initial state, and wires event handlers.
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
    broadcastPresence(io, listOnlineUsers);
    socket.emit("chat:history", { messages: getMessages(100) });
    socket.emit("notify:history", { notifications: getNotifications(100) });
    socket.emit("stats:leaderboard", { users: getLeaderboard(20) });

    // Persists and broadcasts non-empty chat messages.
    socket.on("chat:send", ({ content }) => {
      const text = String(content ?? "").trim();
      if (!text) return;
      const message = insertMessage(pseudo, text);
      io.emit("chat:new", message);
      broadcastLeaderboard(io, getLeaderboard);
    });

    // Restricts notification creation to admin sockets and broadcasts valid notifications.
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

    // Tracks when a user acknowledges notifications to feed the leaderboard.
    socket.on("notify:ack", () => {
      recordNotificationReceive(pseudo);
      broadcastLeaderboard(io, getLeaderboard);
    });

    // Starts a call session and notifies the callee when the target is online.
    socket.on("webrtc:call-request", ({ targetPseudo }) => {
      const targetSocketId = presenceRegistry.getAnySocketId(String(targetPseudo ?? ""));
      if (!targetSocketId) {
        socket.emit("error:event", { error: "TARGET_OFFLINE" });
        return;
      }
      const session = createVideoSession(pseudo, targetPseudo);
      io.to(targetSocketId).emit("webrtc:incoming-call", { from: pseudo, sessionId: session.id });
      broadcastLeaderboard(io, getLeaderboard);
    });

    // Relays WebRTC offer payload to the target client.
    socket.on("webrtc:offer", ({ targetPseudo, offer, sessionId }) => {
      relaySignal(io, presenceRegistry, "webrtc:offer", pseudo, targetPseudo, { offer, sessionId });
    });

    // Relays WebRTC answer payload to the target client.
    socket.on("webrtc:answer", ({ targetPseudo, answer, sessionId }) => {
      relaySignal(io, presenceRegistry, "webrtc:answer", pseudo, targetPseudo, { answer, sessionId });
    });

    // Relays ICE candidates between peers for ongoing sessions.
    socket.on("webrtc:ice", ({ targetPseudo, candidate, sessionId }) => {
      relaySignal(io, presenceRegistry, "webrtc:ice", pseudo, targetPseudo, { candidate, sessionId });
    });

    // Ends an existing call session and notifies the remote peer.
    socket.on("webrtc:hangup", ({ targetPseudo, sessionId }) => {
      if (sessionId) endVideoSession(sessionId);
      relaySignal(io, presenceRegistry, "webrtc:hangup", pseudo, targetPseudo, { sessionId });
    });

    // Cleans presence state when a socket disconnects and updates connected clients.
    socket.on("disconnect", () => {
      presenceRegistry.disconnect(pseudo, socket.id);
      if (!presenceRegistry.isOnline(pseudo)) {
        upsertUser(pseudo, false);
      }
      broadcastPresence(io, listOnlineUsers);
    });
  });
}

