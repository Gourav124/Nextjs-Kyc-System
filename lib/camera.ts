export type CameraError = "permission" | "unavailable" | "insecure" | "unsupported";

export function asCameraError(error: unknown): CameraError {
  const message = error instanceof Error ? error.message : "";
  return message === "permission" || message === "insecure" || message === "unsupported" || message === "unavailable"
    ? message
    : "unavailable";
}

export async function openCamera(facingMode: "user" | "environment"): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error("unsupported");
  if (!window.isSecureContext && location.hostname !== "localhost") throw new Error("insecure");
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: facingMode }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false,
    });
  } catch (error) {
    const name = error instanceof DOMException ? error.name : "";
    throw new Error(name === "NotAllowedError" || name === "SecurityError" ? "permission" : "unavailable");
  }
}

export function stopCamera(stream: MediaStream | null) { stream?.getTracks().forEach((track) => track.stop()); }

export function captureFrame(video: HTMLVideoElement, crop?: { x: number; y: number; width: number; height: number }) {
  const canvas = document.createElement("canvas");
  const sourceWidth = video.videoWidth, sourceHeight = video.videoHeight;
  const region = crop ?? { x: 0, y: 0, width: sourceWidth, height: sourceHeight };
  canvas.width = region.width; canvas.height = region.height;
  canvas.getContext("2d")?.drawImage(video, region.x, region.y, region.width, region.height, 0, 0, region.width, region.height);
  return canvas.toDataURL("image/jpeg", 0.9);
}

export function frameMetrics(video: HTMLVideoElement) {
  const canvas = document.createElement("canvas"); canvas.width = 96; canvas.height = 60;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { brightness: 0, sharpness: 0, signature: 0 };
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let lum = 0, edges = 0;
  for (let i = 0; i < data.length; i += 4) { const v = data[i] * .299 + data[i + 1] * .587 + data[i + 2] * .114; lum += v; if (i >= 4) edges += Math.abs(v - (data[i - 4] * .299 + data[i - 3] * .587 + data[i - 2] * .114)); }
  return { brightness: lum / (data.length / 4), sharpness: edges / (data.length / 4), signature: lum / 1000 + edges / 100 };
}
export const isImageBrightEnough = (brightness: number) => brightness > 32 && brightness < 248;
export const isImageSharpEnough = (sharpness: number) => sharpness > 2.2;
export const isImageStable = (previous: number, current: number) => Math.abs(previous - current) < .55;
