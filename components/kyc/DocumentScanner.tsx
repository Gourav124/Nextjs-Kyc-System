"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { asCameraError, captureFrame, frameMetrics, isImageBrightEnough, isImageSharpEnough, isImageStable, openCamera, stopCamera, type CameraError } from "@/lib/camera";
import { extractTextFromImage } from "@/lib/ocr";
import { isLikelyAadhaar } from "@/lib/aadhaarParser";
import { ScannerOverlay } from "./ScannerOverlay";
import { OcrResult } from "./OcrResult";

type Props = { side: "front" | "back"; onComplete: (image: string, text: string) => void };
const errorCopy: Record<CameraError, [string, string]> = { permission: ["Camera permission is required", "Please allow camera access in browser settings and try again."], unavailable: ["Camera unavailable", "We couldn't access a camera on this device."], insecure: ["Secure connection required", "Camera access requires HTTPS outside localhost."], unsupported: ["Browser unsupported", "Your browser does not support camera access."] };

export function DocumentScanner({ side, onComplete }: Props) {
  const video = useRef<HTMLVideoElement>(null), stream = useRef<MediaStream | null>(null), raf = useRef<number | undefined>(undefined), last = useRef(0), stable = useRef(0), locked = useRef(false);
  const [error, setError] = useState<CameraError | null>(null), [hint, setHint] = useState("Finding a clear, steady frame..."), [progress, setProgress] = useState<number | null>(null);
  const start = useCallback(async () => { stopCamera(stream.current); locked.current = false; stable.current = 0; setError(null); setProgress(null); try { stream.current = await openCamera("environment"); if (video.current) { video.current.srcObject = stream.current; await video.current.play(); } } catch (caught) { setError(asCameraError(caught)); } }, []);
  useEffect(() => { start(); return () => { if (raf.current) cancelAnimationFrame(raf.current); stopCamera(stream.current); }; }, [start]);
  useEffect(() => {
    if (error || progress !== null) return;
    let lastCheck = 0;
    const check = () => {
      const currentVideo = video.current;
      if (!currentVideo || currentVideo.readyState < 3 || locked.current) { raf.current = requestAnimationFrame(check); return; }
      const now = performance.now();
      if (now - lastCheck < 110) { raf.current = requestAnimationFrame(check); return; }
      lastCheck = now;
      const metrics = frameMetrics(currentVideo);
      if (!isImageBrightEnough(metrics.brightness)) { stable.current = 0; setHint("Too dark - move to a brighter area"); }
      else if (!isImageSharpEnough(metrics.sharpness)) { stable.current = 0; setHint("Hold your phone steady"); }
      else if (isImageStable(last.current, metrics.signature)) { stable.current += 1; setHint(stable.current > 4 ? "Keep card still - capturing shortly" : "Card detected - checking quality"); }
      else { stable.current = 0; setHint("Hold the Aadhaar card inside the frame"); }
      last.current = metrics.signature;
      if (stable.current >= 8) {
        locked.current = true;
        const cropWidth = Math.round(currentVideo.videoWidth * .9);
        const cropHeight = Math.round(Math.min(currentVideo.videoHeight * .72, cropWidth / 1.586));
        const image = captureFrame(currentVideo, { x: Math.round((currentVideo.videoWidth - cropWidth) / 2), y: Math.round((currentVideo.videoHeight - cropHeight) / 2), width: cropWidth, height: cropHeight });
        stopCamera(stream.current); setProgress(1);
        extractTextFromImage(image, setProgress).then(({ text, confidence }) => {
          const enoughText = text.replace(/\s/g, "").length >= 16;
          if (confidence >= 12 && (isLikelyAadhaar(text) || side === "back" && enoughText)) onComplete(image, text);
          else { locked.current = false; stable.current = 0; setProgress(null); setHint("Couldn't recognize the card - reposition it"); start(); }
        }).catch(() => { locked.current = false; setProgress(null); setHint("We couldn't read the document. Try again."); start(); });
        return;
      }
      raf.current = requestAnimationFrame(check);
    };
    raf.current = requestAnimationFrame(check);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [error, progress, side, onComplete, start]);
  if (progress !== null) return <OcrResult progress={progress} />;
  if (error) { const [title, body] = errorCopy[error] ?? errorCopy.unavailable; return <div className="camera-error"><div className="error-icon">!</div><h2>{title}</h2><p>{body}</p><button className="button" onClick={start}>Try Again</button></div>; }
  return <section className="scanner"><video ref={video} muted playsInline className="camera-video" /><ScannerOverlay kind="document" message={side === "front" ? "Place the front side inside the frame" : "Turn your card over and place the back inside the frame"} /><div className="scanner-status"><span className="pulse" />{hint}</div><p className="privacy-note">Auto-capture is on. Nothing leaves your device.</p></section>;
}
