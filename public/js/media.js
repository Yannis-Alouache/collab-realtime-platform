export async function acquireUserMediaForMode(mediaDevices, mode) {
  if (mode === "audio-only") {
    return await mediaDevices.getUserMedia({ audio: true, video: false });
  }
  if (mode !== "audio-video") {
    throw new Error(`Unsupported call mode: ${mode}`);
  }

  try {
    return await mediaDevices.getUserMedia({ audio: true, video: true });
  } catch {
    return await mediaDevices.getUserMedia({ audio: true, video: false });
  }
}

export async function acquireUserMedia(mediaDevices) {
  return acquireUserMediaForMode(mediaDevices, "audio-video");
}

