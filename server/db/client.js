import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const dbDir = path.resolve(process.cwd(), "data");
const dbPath = path.join(dbDir, "app.sqlite");

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new DatabaseSync(dbPath);
const schema = fs.readFileSync(path.resolve(process.cwd(), "server", "db", "schema.sql"), "utf8");
db.exec(schema);

// Produces a stable ISO timestamp used across all persisted records.
function nowIso() {
  return new Date().toISOString();
}

// Creates or updates a user record and its current online status.
export function upsertUser(pseudo, online) {
  db.prepare(
    `INSERT INTO users (pseudo, is_online, last_seen_at, created_at)
     VALUES (@pseudo, @online, @seen, @created)
     ON CONFLICT(pseudo) DO UPDATE SET
       is_online = excluded.is_online,
       last_seen_at = excluded.last_seen_at`
  ).run({ pseudo, online: online ? 1 : 0, seen: nowIso(), created: nowIso() });
}

// Returns all users currently flagged online, sorted by pseudo.
export function listOnlineUsers() {
  return db.prepare("SELECT pseudo FROM users WHERE is_online = 1 ORDER BY pseudo ASC").all();
}

// Persists one chat message and increments the sender activity counter.
export function insertMessage(userPseudo, content) {
  const createdAt = nowIso();
  const result = db.prepare("INSERT INTO messages (user_pseudo, content, created_at) VALUES (?, ?, ?)").run(userPseudo, content, createdAt);
  incrementCounter(userPseudo, "messages_sent");
  return { id: result.lastInsertRowid, userPseudo, content, createdAt };
}

// Fetches latest messages and reorders them from oldest to newest for clients.
export function getMessages(limit = 100) {
  return db
    .prepare("SELECT id, user_pseudo as userPseudo, content, created_at as createdAt FROM messages ORDER BY id DESC LIMIT ?")
    .all(limit)
    .reverse();
}

// Persists a notification authored by a pseudo and returns API-shaped payload.
export function insertNotification(level, title, body, createdByPseudo) {
  const createdAt = nowIso();
  const result = db
    .prepare("INSERT INTO notifications (level, title, body, created_by_pseudo, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(level, title, body, createdByPseudo, createdAt);
  return { id: result.lastInsertRowid, level, title, body, createdByPseudo, createdAt };
}

// Fetches latest notifications and reorders them from oldest to newest for clients.
export function getNotifications(limit = 100) {
  return db
    .prepare(
      "SELECT id, level, title, body, created_by_pseudo as createdByPseudo, created_at as createdAt FROM notifications ORDER BY id DESC LIMIT ?"
    )
    .all(limit)
    .reverse();
}

// Increments the notification acknowledgment counter for a pseudo.
export function recordNotificationReceive(pseudo) {
  incrementCounter(pseudo, "alerts_received");
}

// Creates a video session row and increments the initiator activity counter.
export function createVideoSession(initiatorPseudo, targetPseudo) {
  const startedAt = nowIso();
  const result = db
    .prepare("INSERT INTO video_sessions (initiator_pseudo, target_pseudo, started_at, status) VALUES (?, ?, ?, ?)")
    .run(initiatorPseudo, targetPseudo, startedAt, "started");
  incrementCounter(initiatorPseudo, "video_sessions_started");
  return { id: result.lastInsertRowid, initiatorPseudo, targetPseudo, startedAt, status: "started" };
}

// Marks an existing video session as ended with an end timestamp.
export function endVideoSession(sessionId) {
  db.prepare("UPDATE video_sessions SET ended_at = ?, status = ? WHERE id = ?").run(nowIso(), "ended", sessionId);
}

// Persists one synthetic system metric sample used by dashboard monitoring.
export function insertMetric(cpuPercent, ramPercent) {
  db.prepare("INSERT INTO system_metrics (cpu_percent, ram_percent, created_at) VALUES (?, ?, ?)").run(
    cpuPercent,
    ramPercent,
    nowIso()
  );
}

// Returns ranked activity counters as leaderboard rows.
export function getLeaderboard(limit = 20) {
  return db
    .prepare(
      `SELECT pseudo, messages_sent as messagesSent, alerts_received as alertsReceived, video_sessions_started as videoSessionsStarted,
              (messages_sent + alerts_received + video_sessions_started) as totalScore
       FROM activity_counters
       ORDER BY totalScore DESC, pseudo ASC
       LIMIT ?`
    )
    .all(limit);
}

// Lazily creates and increments one supported activity counter column for a pseudo.
function incrementCounter(pseudo, column) {
  if (!["messages_sent", "alerts_received", "video_sessions_started"].includes(column)) {
    throw new Error(`Unsupported counter: ${column}`);
  }
  db.prepare(
    `INSERT INTO activity_counters (pseudo, messages_sent, alerts_received, video_sessions_started, updated_at)
     VALUES (?, 0, 0, 0, ?)
     ON CONFLICT(pseudo) DO NOTHING`
  ).run(pseudo, nowIso());
  db.prepare(`UPDATE activity_counters SET ${column} = ${column} + 1, updated_at = ? WHERE pseudo = ?`).run(nowIso(), pseudo);
}

