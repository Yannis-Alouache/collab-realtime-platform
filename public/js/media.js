export async function acquireUserMediaForMode(mediaDevices, mode) {
  if (mode === "audio-only") {
    return mediaDevices.getUserMedia({ audio: true, video: false });
  }
  try {
    return await mediaDevices.getUserMedia({ audio: true, video: true });
  } catch {
    return mediaDevices.getUserMedia({ audio: true, video: false });
  }
}

export async function acquireUserMedia(mediaDevices) {
  return acquireUserMediaForMode(mediaDevices, "audio-video");
}

