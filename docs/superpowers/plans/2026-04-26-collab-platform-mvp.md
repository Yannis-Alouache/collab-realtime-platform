# Plateforme collaborative temps réel (MVP) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Livrer une application web collaborative temps réel (chat, dashboard SSE, notifications, WebRTC 1-à-1, leaderboard) avec persistance SQLite sur une seule machine.

**Architecture:** Un backend Express modulaire pilote HTTP, Socket.IO et SSE. SQLite persiste les entités métier (users/messages/notifications/activity/video sessions). Un frontend vanilla multi-pages consomme API REST + événements temps réel.

**Tech Stack:** Node.js, Express, Socket.IO, SQLite (`better-sqlite3`), Chart.js, WebRTC navigateur, `node --test` + Supertest.

---

## File structure (cible)

- `package.json` — scripts npm, dépendances runtime/test.
- `server/app.js` — bootstrap Express/HTTP/Socket.IO/SSE.
- `server/config.js` — constantes (port, intervalle métriques, seuils).
- `server/db/schema.sql` — schéma SQLite.
- `server/db/client.js` — ouverture DB + helpers requêtes.
- `server/modules/auth.js` — login/logout pseudo, règle admin.
- `server/modules/presence.js` — état online/offline + diffusion.
- `server/modules/chat.js` — historique + émission chat.
- `server/modules/notifications.js` — notifications admin + historique.
- `server/modules/dashboard.js` — simulation CPU/RAM + push SSE.
- `server/modules/webrtc.js` — signalisation WebRTC.
- `server/modules/stats.js` — incréments activité + leaderboard.
- `public/index.html` — login pseudo.
- `public/chat.html` + `public/js/chat.js` — chat, présence, leaderboard.
- `public/dashboard.html` + `public/js/dashboard.js` — dashboard SSE + Chart.js.
- `public/admin.html` + `public/js/admin.js` — envoi notifications admin.
- `public/call.html` + `public/js/call.js` — appel WebRTC 1-à-1.
- `public/css/app.css` — styles communs.
- `tests/auth.test.js` — test login + pseudo réservé.
- `tests/chat.test.js` — test API historique chat.
- `tests/notifications.test.js` — test garde admin.
- `tests/leaderboard.test.js` — test classement activité.
- `README.md` — installation, lancement, démonstration.

---

### Task 1: Initialiser le socle projet (server + DB + tests)

**Files:**
- Create: `package.json`
- Create: `server/config.js`
- Create: `server/db/schema.sql`
- Create: `server/db/client.js`
- Create: `server/app.js`
- Create: `tests/auth.test.js`

- [ ] **Step 1: Write the failing test**

```js
// tests/auth.test.js
import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../server/app.js";

test("POST /api/auth/login rejects empty pseudo", async () => {
  const app = createApp();
  const res = await request(app).post("/api/auth/login").send({ pseudo: "" });
  assert.equal(res.status, 400);
  assert.equal(res.body.error, "INVALID_PSEUDO");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/auth.test.js`  
Expected: FAIL with module import error or missing route.

- [ ] **Step 3: Write minimal implementation**

```js
// server/app.js
import express from "express";

export function createApp() {
  const app = express();
  app.use(express.json());
  app.post("/api/auth/login", (req, res) => {
    const pseudo = String(req.body?.pseudo ?? "").trim();
    if (!pseudo) return res.status(400).json({ error: "INVALID_PSEUDO" });
    return res.json({ ok: true, pseudo });
  });
  return app;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/auth.test.js`  
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add package.json server tests
git commit -m "chore: bootstrap express app with sqlite and test harness"
```

---

### Task 2: Auth + présence utilisateurs en ligne

**Files:**
- Modify: `server/app.js`
- Create: `server/modules/auth.js`
- Create: `server/modules/presence.js`
- Create: `public/index.html`
- Create: `public/chat.html`
- Create: `public/js/chat.js`
- Modify: `tests/auth.test.js`

- [ ] **Step 1: Write the failing test**

```js
test("POST /api/auth/login rejects reserved admin pseudo on chat pages", async () => {
  const app = createApp();
  const res = await request(app).post("/api/auth/login").send({ pseudo: "admin", area: "chat" });
  assert.equal(res.status, 403);
  assert.equal(res.body.error, "RESERVED_PSEUDO");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/auth.test.js`  
Expected: FAIL (returns 200 or route ignores `area`).

- [ ] **Step 3: Write minimal implementation**

```js
// server/modules/auth.js
export function validatePseudo(pseudo, area) {
  const value = String(pseudo ?? "").trim();
  if (!value) return { ok: false, code: "INVALID_PSEUDO" };
  if (value.toLowerCase() === "admin" && area === "chat") {
    return { ok: false, code: "RESERVED_PSEUDO" };
  }
  return { ok: true, pseudo: value };
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/auth.test.js`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/modules/auth.js server/modules/presence.js server/app.js public/index.html public/chat.html public/js/chat.js tests/auth.test.js
git commit -m "feat: add pseudo auth and online presence list"
```

---

### Task 3: Chat temps réel + historique persistant

**Files:**
- Create: `server/modules/chat.js`
- Modify: `server/app.js`
- Modify: `public/chat.html`
- Modify: `public/js/chat.js`
- Create: `tests/chat.test.js`

- [ ] **Step 1: Write the failing test**

```js
// tests/chat.test.js
import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../server/app.js";

test("GET /api/messages/history returns array", async () => {
  const app = createApp();
  const res = await request(app).get("/api/messages/history");
  assert.equal(res.status, 200);
  assert.equal(Array.isArray(res.body.messages), true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/chat.test.js`  
Expected: FAIL (route not found).

- [ ] **Step 3: Write minimal implementation**

```js
// server/modules/chat.js
export function registerChatRoutes(app, chatRepo) {
  app.get("/api/messages/history", (_req, res) => {
    res.json({ messages: chatRepo.listRecent(100) });
  });
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/chat.test.js`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/modules/chat.js server/app.js public/chat.html public/js/chat.js tests/chat.test.js
git commit -m "feat: implement realtime chat and message history endpoint"
```

---

### Task 4: Dashboard SSE + Chart.js + seuils visuels

**Files:**
- Create: `server/modules/dashboard.js`
- Modify: `server/app.js`
- Create: `public/dashboard.html`
- Create: `public/js/dashboard.js`
- Create: `public/css/app.css`

- [ ] **Step 1: Write the failing test**

```js
test("GET /api/dashboard/stream responds with SSE headers", async () => {
  const app = createApp();
  const res = await request(app).get("/api/dashboard/stream");
  assert.equal(res.status, 200);
  assert.match(res.headers["content-type"], /text\/event-stream/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/chat.test.js`  
Expected: FAIL (missing SSE route).

- [ ] **Step 3: Write minimal implementation**

```js
// server/modules/dashboard.js
export function registerDashboardStream(app, metricsSource) {
  app.get("/api/dashboard/stream", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.flushHeaders();
    const send = () => res.write(`event: metrics\ndata: ${JSON.stringify(metricsSource.next())}\n\n`);
    send();
    const id = setInterval(send, 2000);
    req.on("close", () => clearInterval(id));
  });
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/chat.test.js`  
Expected: PASS for SSE assertion.

- [ ] **Step 5: Commit**

```bash
git add server/modules/dashboard.js server/app.js public/dashboard.html public/js/dashboard.js public/css/app.css
git commit -m "feat: add live dashboard via sse with chart rendering"
```

---

### Task 5: Notifications live + panneau admin

**Files:**
- Create: `server/modules/notifications.js`
- Modify: `server/app.js`
- Create: `public/admin.html`
- Create: `public/js/admin.js`
- Create: `tests/notifications.test.js`

- [ ] **Step 1: Write the failing test**

```js
// tests/notifications.test.js
test("POST /api/notifications/send rejects non-admin", async () => {
  const app = createApp();
  const res = await request(app)
    .post("/api/notifications/send")
    .send({ senderPseudo: "alice", level: "info", title: "x", body: "y" });
  assert.equal(res.status, 403);
  assert.equal(res.body.error, "ADMIN_ONLY");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/notifications.test.js`  
Expected: FAIL (missing route or no guard).

- [ ] **Step 3: Write minimal implementation**

```js
// server/modules/notifications.js
export function registerNotificationRoutes(app, notificationRepo) {
  app.post("/api/notifications/send", (req, res) => {
    if (String(req.body?.senderPseudo ?? "").toLowerCase() !== "admin") {
      return res.status(403).json({ error: "ADMIN_ONLY" });
    }
    const notification = notificationRepo.create(req.body);
    return res.json({ notification });
  });
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/notifications.test.js`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/modules/notifications.js server/app.js public/admin.html public/js/admin.js tests/notifications.test.js
git commit -m "feat: implement admin notifications with live delivery"
```

---

### Task 6: WebRTC 1-à-1 + signalisation Socket.IO

**Files:**
- Create: `server/modules/webrtc.js`
- Modify: `server/app.js`
- Create: `public/call.html`
- Create: `public/js/call.js`

- [ ] **Step 1: Write the failing test**

```js
// tests/auth.test.js (new case)
test("POST /api/webrtc/call-session creates session row", async () => {
  const app = createApp();
  const res = await request(app).post("/api/webrtc/call-session").send({ initiatorPseudo: "alice", targetPseudo: "bob" });
  assert.equal(res.status, 201);
  assert.ok(res.body.sessionId);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/auth.test.js`  
Expected: FAIL (route absent).

- [ ] **Step 3: Write minimal implementation**

```js
// server/modules/webrtc.js
export function registerWebrtcRoutes(app, webrtcRepo) {
  app.post("/api/webrtc/call-session", (req, res) => {
    const row = webrtcRepo.createSession(req.body.initiatorPseudo, req.body.targetPseudo);
    res.status(201).json({ sessionId: row.id });
  });
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/auth.test.js`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/modules/webrtc.js server/app.js public/call.html public/js/call.js tests/auth.test.js
git commit -m "feat: add one-to-one webrtc signaling and call session tracking"
```

---

### Task 7: Activités, leaderboard et documentation finale

**Files:**
- Create: `server/modules/stats.js`
- Modify: `server/modules/chat.js`
- Modify: `server/modules/notifications.js`
- Modify: `server/modules/webrtc.js`
- Create: `tests/leaderboard.test.js`
- Create: `README.md`

- [ ] **Step 1: Write the failing test**

```js
// tests/leaderboard.test.js
test("GET /api/stats/leaderboard returns ranked users", async () => {
  const app = createApp();
  const res = await request(app).get("/api/stats/leaderboard");
  assert.equal(res.status, 200);
  assert.equal(Array.isArray(res.body.users), true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/leaderboard.test.js`  
Expected: FAIL (route absent).

- [ ] **Step 3: Write minimal implementation**

```js
// server/modules/stats.js
export function registerStatsRoutes(app, statsRepo) {
  app.get("/api/stats/leaderboard", (_req, res) => {
    res.json({ users: statsRepo.getLeaderboard(20) });
  });
}
```

- [ ] **Step 4: Run full tests**

Run: `npm test`  
Expected: PASS for auth/chat/notifications/leaderboard suites.

- [ ] **Step 5: Commit**

```bash
git add server tests README.md
git commit -m "feat: add activity leaderboard and final project documentation"
```

---

## Spec coverage check

- Auth + présence online: **Task 2**
- Chat + historique: **Task 3**
- Dashboard SSE + graphes + alertes visuelles: **Task 4**
- Notifications push + admin + persistance: **Task 5**
- WebRTC 1-à-1 + signalisation: **Task 6**
- Suivi activité + classement: **Task 7**
- Documentation installation/lancement/modules: **Task 7 (README)**

Aucun besoin du spec n’est laissé sans task.

