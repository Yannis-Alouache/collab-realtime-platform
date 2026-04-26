import { getPseudoFromStorage } from "./session.js";

const pseudo = getPseudoFromStorage(window.sessionStorage);
if (!pseudo) location.href = "/index.html";
document.getElementById("me").textContent = pseudo;

const socket = io({ query: { pseudo } });

const messagesEl = document.getElementById("messages");
const onlineEl = document.getElementById("onlineUsers");
const notificationsEl = document.getElementById("notifications");
const leaderboardEl = document.getElementById("leaderboard");

function appendLine(el, text) {
  const div = document.createElement("div");
  div.textContent = text;
  el.appendChild(div);
  el.scrollTop = el.scrollHeight;
}

document.getElementById("sendBtn").onclick = () => {
  const input = document.getElementById("messageInput");
  const content = input.value.trim();
  if (!content) return;
  socket.emit("chat:send", { content });
  input.value = "";
};

socket.on("chat:history", ({ messages }) => {
  messagesEl.innerHTML = "";
  for (const m of messages) appendLine(messagesEl, `[${new Date(m.createdAt).toLocaleTimeString()}] ${m.userPseudo}: ${m.content}`);
});

socket.on("chat:new", (m) => appendLine(messagesEl, `[${new Date(m.createdAt).toLocaleTimeString()}] ${m.userPseudo}: ${m.content}`));

socket.on("presence:update", ({ users }) => {
  onlineEl.innerHTML = "";
  for (const u of users) {
    const li = document.createElement("li");
    li.textContent = u.pseudo;
    onlineEl.appendChild(li);
  }
});

socket.on("notify:history", ({ notifications }) => {
  notificationsEl.innerHTML = "";
  for (const n of notifications) appendLine(notificationsEl, `[${n.level}] ${n.title} - ${n.body}`);
});

socket.on("notify:new", (n) => {
  appendLine(notificationsEl, `[${n.level}] ${n.title} - ${n.body}`);
  socket.emit("notify:ack");
});

socket.on("stats:leaderboard", ({ users }) => {
  leaderboardEl.innerHTML = "";
  for (const u of users) {
    const li = document.createElement("li");
    li.textContent = `${u.pseudo}: ${u.totalScore}`;
    leaderboardEl.appendChild(li);
  }
});

socket.on("error:event", ({ error }) => alert(error));

