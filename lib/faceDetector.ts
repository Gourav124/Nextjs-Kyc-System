export type FaceCheck = { count: number; centered: boolean; closeEnough: boolean };
export async function createFaceDetector() {
  const { FaceDetector, FilesetResolver } = await import("@mediapipe/tasks-vision");
  const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm");
  return FaceDetector.createFromOptions(vision, { baseOptions: { modelAssetPath: "/models/blaze_face_short_range.tflite" }, runningMode: "VIDEO", minDetectionConfidence: 0.55 });
}
export function inspectFace(result: { detections: Array<{ boundingBox?: { originX: number; originY: number; width: number; height: number } }> }, width: number, height: number): FaceCheck {
  const face = result.detections[0]; if (!face?.boundingBox) return { count: result.detections.length, centered: false, closeEnough: false };
  const b = face.boundingBox, cx = (b.originX + b.width / 2) / width, cy = (b.originY + b.height / 2) / height;
  return { count: result.detections.length, centered: Math.abs(cx - .5) < .16 && Math.abs(cy - .48) < .19, closeEnough: b.width / width > .19 && b.height / height > .19 };
}
