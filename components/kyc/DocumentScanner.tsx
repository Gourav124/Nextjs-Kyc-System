"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { asCameraError, captureFrame, frameMetrics, isImageBrightEnough, isImageSharpEnough, openCamera, stopCamera, type CameraError } from "@/lib/camera";
import { classifyAadhaarSide, isLikelyAadhaar } from "@/lib/aadhaarParser";
import { extractTextFromImage } from "@/lib/ocr";
import { OcrResult } from "./OcrResult";
import { ScannerOverlay } from "./ScannerOverlay";

type Props = { side: "front" | "back"; onComplete: (image: string, text: string) => void };
const errorCopy: Record<CameraError, [string, string]> = {
  permission: ["Camera permission is required", "Please allow camera access in browser settings and try again."],
  unavailable: ["Camera unavailable", "We couldn't access a camera on this device."],
  insecure: ["Secure connection required", "Camera access requires HTTPS outside localhost."],
  unsupported: ["Browser unsupported", "Your browser does not support camera access."],
};

export function DocumentScanner({ side, onComplete }: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [error, setError] = useState<CameraError | null>(null);
  const [hint, setHint] = useState("Position the card inside the frame");
  const [scanError, setScanError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);

  const start = useCallback(async () => {
    stopCamera(stream.current); setError(null);
    try {
      stream.current = await openCamera("environment");
      if (video.current) { video.current.srcObject = stream.current; await video.current.play(); }
    } catch (caught) { setError(asCameraError(caught)); }
  }, []);
  const retry = useCallback((message: string) => {
    setScanError(message); setProgress(null);
    // Let the video element remount after the OCR screen before attaching a stream.
    window.setTimeout(() => { start(); }, 80);
  }, [start]);

  useEffect(() => { start(); return () => stopCamera(stream.current); }, [start]);
  useEffect(() => {
    if (error || progress !== null) return;
    let raf = 0;
    const inspect = () => {
      const currentVideo = video.current;
      if (currentVideo && currentVideo.readyState >= 3) {
        const metrics = frameMetrics(currentVideo);
        setHint(!isImageBrightEnough(metrics.brightness) ? "Too dark - move to a brighter area" : !isImageSharpEnough(metrics.sharpness) ? "Image may be blurry - hold steady" : "Ready to capture");
      }
      raf = requestAnimationFrame(inspect);
    };
    raf = requestAnimationFrame(inspect); return () => cancelAnimationFrame(raf);
  }, [error, progress]);

  const capture = async () => {
    const currentVideo = video.current;
    if (!currentVideo || currentVideo.readyState < 3 || progress !== null) return;
    setScanError(null);
    const cropWidth = Math.round(currentVideo.videoWidth * .9);
    const cropHeight = Math.round(Math.min(currentVideo.videoHeight * .72, cropWidth / 1.586));
    const image = captureFrame(currentVideo, { x: Math.round((currentVideo.videoWidth - cropWidth) / 2), y: Math.round((currentVideo.videoHeight - cropHeight) / 2), width: cropWidth, height: cropHeight });
    stopCamera(stream.current); setProgress(1);
    try {
      const { text, confidence } = await extractTextFromImage(image, setProgress);
      if (confidence < 12 || !isLikelyAadhaar(text)) { retry("We couldn't read a valid Aadhaar card. Ensure the whole card is clear, well lit, and inside the frame."); return; }
      const detectedSide = classifyAadhaarSide(text);
      if (detectedSide === "unknown") { retry(`We couldn't confirm this is the Aadhaar ${side}. Make sure the ${side === "front" ? "DOB, gender, and Aadhaar number" : "address and PIN code"} are visible.`); return; }
      if (detectedSide !== side) { retry(`This looks like the Aadhaar ${detectedSide}. Please scan the ${side} side.`); return; }
      onComplete(image, text);
    } catch { retry("We couldn't process this image. Please capture the Aadhaar again in good lighting."); }
  };

  if (progress !== null) return <OcrResult progress={progress} />;
  if (error) { const [title, body] = errorCopy[error] ?? errorCopy.unavailable; return <div className="camera-error"><div className="error-icon">!</div><h2>{title}</h2><p>{body}</p><button className="button" onClick={() => { setScanError(null); start(); }}>Try Again</button></div>; }
  return <section className="scanner"><video ref={video} muted playsInline className="camera-video" /><ScannerOverlay kind="document" message={side === "front" ? "Place the front side inside the frame" : "Turn your card over and place the back inside the frame"} />{scanError && <div role="alert" style={{ position: "absolute", top: 82, left: 16, right: 16, zIndex: 3, padding: "12px", background: "#fff1f0", color: "#a32920", borderRadius: 12, fontSize: 13, lineHeight: 1.35 }}>{scanError}</div>}<div className="scanner-status"><span className="pulse" />{hint}</div><div style={{ position: "absolute", zIndex: 4, bottom: 62, left: 0, right: 0, display: "flex", justifyContent: "center" }}><button onClick={capture} style={{ background: "white", color: "#14213d", border: 0, borderRadius: 999, padding: "13px 24px", fontWeight: 800, boxShadow: "0 5px 20px #0006" }}>Capture Aadhaar</button></div><p className="privacy-note">Images stay on this device.</p></section>;
}
