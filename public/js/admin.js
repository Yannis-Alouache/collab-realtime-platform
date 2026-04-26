const pseudo = "admin";
const socket = io({ query: { pseudo } });
const log = document.getElementById("log");

function append(text) {
  const div = document.createElement("div");
  div.textContent = text;
  log.appendChild(div);
}

document.getElementById("send").onclick = () => {
  const level = document.getElementById("level").value;
  const title = document.getElementById("title").value.trim();
  const body = document.getElementById("body").value.trim();
  socket.emit("notify:send", { level, title, body });
};

socket.on("notify:new", (n) => append(`[${n.level}] ${n.title} - ${n.body}`));
socket.on("error:event", ({ error }) => append(`ERROR: ${error}`));

