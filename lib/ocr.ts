export type OcrResult = { text: string; confidence: number };
export async function extractTextFromImage(image: string | Blob, onProgress?: (progress: number) => void): Promise<OcrResult> {
  const { recognize } = await import("tesseract.js");
  const result = await recognize(image, "eng", { logger: (m) => { if (m.status === "recognizing text") onProgress?.(Math.round(m.progress * 100)); } });
  return { text: result.data.text, confidence: result.data.confidence };
}
