import test from "node:test";
import assert from "node:assert/strict";
import { acquireUserMediaForMode } from "../public/js/media.js";

test("acquireUserMediaForMode uses strict audio-only constraints", async () => {
  const calls = [];
  const stream = { id: "stream-audio-only", getTracks: () => [] };
  const mediaDevices = {
    async getUserMedia(constraints) {
      calls.push(constraints);
      if (constraints.audio === true && constraints.video === false) {
        return stream;
      }
      throw new Error("Unexpected constraints");
    }
  };

  const result = await acquireUserMediaForMode(mediaDevices, "audio-only");
  assert.equal(result, stream);
  assert.deepEqual(calls, [{ audio: true, video: false }]);
});

test("acquireUserMediaForMode falls back to audio-only when audio-video is unavailable", async () => {
  const calls = [];
  const stream = { id: "stream-fallback-audio", getTracks: () => [] };
  const mediaDevices = {
    async getUserMedia(constraints) {
      calls.push(constraints);
      if (constraints.audio === true && constraints.video === true) {
        const err = new Error("Camera unavailable");
        err.name = "NotFoundError";
        throw err;
      }
      if (constraints.audio === true && constraints.video === false) {
        return stream;
      }
      throw new Error("Unexpected constraints");
    }
  };

  const result = await acquireUserMediaForMode(mediaDevices, "audio-video");
  assert.equal(result, stream);
  assert.deepEqual(calls, [
    { audio: true, video: true },
    { audio: true, video: false }
  ]);
});

