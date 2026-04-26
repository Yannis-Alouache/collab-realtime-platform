import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("call.js blocks call when mode is empty and reads callMode value", () => {
  const source = fs.readFileSync(path.resolve(process.cwd(), "public", "js", "call.js"), "utf8");
  assert.equal(source.includes('document.getElementById("callMode")'), true);
  assert.equal(source.includes("if (!selectedMode)"), true);
  assert.equal(source.includes("await ensureMedia(selectedMode)"), true);
  assert.equal(source.includes('modeSelect.value || "audio-video"'), false);
  assert.equal(source.includes('socket.emit("webrtc:hangup", { targetPseudo: from, sessionId })'), true);
  assert.equal(source.includes("track.stop()"), true);
  assert.equal(source.includes("if (pc) {"), true);
  assert.equal(source.includes("Incoming call setup failed"), true);
});
