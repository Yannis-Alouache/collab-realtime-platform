import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { createApp } from "../server/app.js";

async function withServer(run) {
  const app = createApp();
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  try {
    await run(baseUrl);
  } finally {
    await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  }
}

test("POST /api/webrtc/call-session rejects self calls", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/webrtc/call-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initiatorPseudo: "alice", targetPseudo: "alice" })
    });
    const body = await response.json();
    assert.equal(response.status, 400);
    assert.equal(body.error, "SELF_CALL_NOT_ALLOWED");
  });
});

