import { getPseudoFromStorage } from "./session.js";
import { acquireUserMediaForMode } from "./media.js";

const pseudo = getPseudoFromStorage(window.sessionStorage);
if (!pseudo) location.href = "/index.html";

const socket = io({ query: { pseudo } });
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const targetInput = document.getElementById("targetPseudo");
const modeSelect = document.getElementById("callMode");
const callBtn = document.getElementById("callBtn");

let pc;
let localStream;
let currentTarget = "";
let currentSessionId = null;

function cleanupCallState() {
  if (pc) {
    pc.close();
    pc = null;
  }
  if (localStream) {
    localStream.getTracks().forEach((track) => track.stop());
    localStream = null;
  }
  localVideo.srcObject = null;
  remoteVideo.srcObject = null;
}

async function ensureMedia(mode = "audio-video") {
  if (!localStream) {
    localStream = await acquireUserMediaForMode(navigator.mediaDevices, mode);
    localVideo.srcObject = localStream;
  }
}

function buildPc() {
  const peer = new RTCPeerConnection();
  peer.onicecandidate = (event) => {
    if (event.candidate && currentTarget) {
      socket.emit("webrtc:ice", { targetPseudo: currentTarget, candidate: event.candidate, sessionId: currentSessionId });
    }
  };
  peer.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
  };
  return peer;
}

async function startCall() {
  const selectedMode = modeSelect.value;
  if (!selectedMode) return alert("Choisis un mode d'appel.");
  currentTarget = targetInput.value.trim();
  if (!currentTarget) return alert("Pseudo cible requis");
  if (currentTarget === pseudo) return alert("Tu ne peux pas t'appeler toi-meme.");

  try {
    const createSession = await fetch("/api/webrtc/call-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initiatorPseudo: pseudo, targetPseudo: currentTarget })
    });
    const session = await createSession.json();
    if (!createSession.ok) return alert(session.error || "Erreur session");
    currentSessionId = session.sessionId;

    await ensureMedia(selectedMode);
    pc = buildPc();
    for (const track of localStream.getTracks()) {
      pc.addTrack(track, localStream);
    }
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit("webrtc:offer", { targetPseudo: currentTarget, offer, sessionId: currentSessionId });
  } catch (error) {
    console.error("Call start failed:", error);
    alert(`Impossible de lancer l'appel: ${error.message ?? "Erreur inconnue"}`);
  }
}

modeSelect.addEventListener("change", () => {
  callBtn.disabled = !modeSelect.value;
});

callBtn.disabled = !modeSelect.value;
callBtn.onclick = startCall;
document.getElementById("hangupBtn").onclick = () => {
  cleanupCallState();
  socket.emit("webrtc:hangup", { targetPseudo: currentTarget, sessionId: currentSessionId });
};

socket.on("webrtc:offer", async ({ from, offer, sessionId }) => {
  if (pc) {
    socket.emit("webrtc:hangup", { targetPseudo: from, sessionId });
    return;
  }
  currentTarget = from;
  currentSessionId = sessionId;
  const selectedMode = modeSelect.value;
  if (!selectedMode) {
    alert("Selectionne d'abord un mode d'appel pour repondre.");
    socket.emit("webrtc:hangup", { targetPseudo: from, sessionId });
    return;
  }
  try {
    await ensureMedia(selectedMode);
    pc = buildPc();
    for (const track of localStream.getTracks()) {
      pc.addTrack(track, localStream);
    }
    await pc.setRemoteDescription(offer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit("webrtc:answer", { targetPseudo: from, answer, sessionId });
  } catch (error) {
    console.error("Incoming call setup failed:", error);
    socket.emit("webrtc:hangup", { targetPseudo: from, sessionId });
    alert(`Impossible de repondre a l'appel: ${error.message ?? "Erreur inconnue"}`);
    cleanupCallState();
  }
});

socket.on("webrtc:answer", async ({ answer }) => {
  if (pc) await pc.setRemoteDescription(answer);
});

socket.on("webrtc:ice", async ({ candidate }) => {
  if (pc) await pc.addIceCandidate(candidate);
});

socket.on("webrtc:hangup", () => {
  cleanupCallState();
});

socket.on("error:event", ({ error }) => {
  alert(error);
});

