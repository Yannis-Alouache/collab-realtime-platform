// Registers all REST endpoints while preserving existing payload and validation rules.
export function registerHttpRoutes(app, dependencies) {
  const {
    validPseudo,
    upsertUser,
    listOnlineUsers,
    getMessages,
    getNotifications,
    getLeaderboard,
    insertNotification,
    createVideoSession
  } = dependencies;

  // Authenticates a pseudo for a target area and reserves the admin pseudo for chat.
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

  // Marks the pseudo as offline during explicit logout.
  app.post("/api/auth/logout", (req, res) => {
    const pseudo = validPseudo(req.body?.pseudo);
    if (!pseudo) return res.status(400).json({ error: "INVALID_PSEUDO" });
    upsertUser(pseudo, false);
    return res.json({ ok: true });
  });

  // Returns the current list of online users.
  app.get("/api/users/online", (_req, res) => res.json({ users: listOnlineUsers() }));

  // Returns recent chat history in ascending chronological order.
  app.get("/api/messages/history", (_req, res) => res.json({ messages: getMessages(100) }));

  // Returns recent notification history in ascending chronological order.
  app.get("/api/notifications/history", (_req, res) => res.json({ notifications: getNotifications(100) }));

  // Returns the top users ranked by total activity score.
  app.get("/api/stats/leaderboard", (_req, res) => res.json({ users: getLeaderboard(20) }));

  // Allows admin to create and persist a notification broadcast.
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

  // Creates a WebRTC call session identifier for valid, distinct participants.
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
}

