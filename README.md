# Client-side KYC prototype

A mobile-first Next.js prototype for scanning Aadhaar front/back images and a selfie. It is not an official Aadhaar-verification system and has no backend or upload API.

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000/kyc` and allow camera access.

## Required local face model

The MediaPipe BlazeFace short-range `.tflite` model is included at `public/models/blaze_face_short_range.tflite` and loads from the local application origin. (MediaPipe's WASM runtime is loaded from its CDN.)

## How it works

- The document scanner uses `getUserMedia`, lightweight brightness/sharpness/stability checks, then captures a candidate frame automatically.
- Tesseract.js OCR runs only after that candidate capture; it does not scan every video frame.
- Aadhaar-like OCR text is parsed locally. Full Aadhaar numbers are never logged and are masked in the review UI.
- MediaPipe Face Detector checks the front-camera feed at roughly 11 FPS. A single, centered, sufficiently large face that remains stable is captured automatically.
- Images, OCR text, and fields live only in React state for the current browser session.

## Camera requirements and limitations

Camera access requires permission and a secure origin: HTTPS in production (or `localhost` while developing). OCR quality varies with camera resolution, glare, blur, language, and document condition. This intentionally simple prototype does not validate document authenticity, perform liveness checks, or send data to an official Aadhaar service.
