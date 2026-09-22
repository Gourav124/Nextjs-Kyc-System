"use client";
import { useCallback, useState } from "react";
import { extractAadhaarNumber, extractAddress, extractDateOfBirth, extractGender, extractName } from "@/lib/aadhaarParser";
import { DocumentScanner } from "./DocumentScanner";
import { SelfieScanner } from "./SelfieScanner";
import { KycReview, type KycData } from "./KycReview";
import { StepIndicator } from "./StepIndicator";
type KycStep = "front" | "back" | "selfie" | "review" | "completed";
const empty: KycData = { frontImage: null, backImage: null, selfieImage: null, frontText: "", backText: "", name: null, dob: null, gender: null, aadhaarNumber: null, address: null };
export function KycFlow() { const [step, setStep] = useState<KycStep>("front"), [data, setData] = useState<KycData>(empty);
  const saveDocument = useCallback((side: "front" | "back", image: string, text: string) => { setData((old) => { const both = side === "front" ? `${text}\n${old.backText}` : `${old.frontText}\n${text}`; return { ...old, [side === "front" ? "frontImage" : "backImage"]: image, [side === "front" ? "frontText" : "backText"]: text, name: extractName(both) ?? old.name, dob: extractDateOfBirth(both) ?? old.dob, gender: extractGender(both) ?? old.gender, aadhaarNumber: extractAadhaarNumber(both) ?? old.aadhaarNumber, address: extractAddress(both) ?? old.address }; }); setStep(side === "front" ? "back" : "selfie"); }, []);
  const retake = (target: "front" | "back" | "selfie") => { setStep(target); };
  const active = step === "front" ? 1 : step === "back" ? 2 : 3;
  if (step === "completed") return <main className="kyc-shell"><div className="success"><div>✓</div><h1>KYC verification completed successfully.</h1><p>Your document scan was completed in this browser. No images were uploaded.</p><button className="button" onClick={() => { setData(empty); setStep("front"); }}>Start new scan</button></div></main>;
  return <main className="kyc-shell"><header className="kyc-header"><a href="/" aria-label="Back to home" className="back">←</a><div><span className="eyebrow">IDENTITY VERIFICATION</span><h1>{step === "review" ? "Review your information" : "Identity Verification"}</h1></div><span className="secure">⌁ Private</span></header>{step !== "review" && <><div className="step-head"><b>Step {active} of 3</b><span>{active === 1 ? "Aadhaar front" : active === 2 ? "Aadhaar back" : "Selfie"}</span></div><StepIndicator active={active} /></>}<div className="content">{step === "front" && <DocumentScanner side="front" onComplete={(image, text) => saveDocument("front", image, text)} />}{step === "back" && <DocumentScanner side="back" onComplete={(image, text) => saveDocument("back", image, text)} />}{step === "selfie" && <SelfieScanner onComplete={(image) => { setData((old) => ({ ...old, selfieImage: image })); setStep("review"); }} />}{step === "review" && <KycReview data={data} onRetake={retake} onComplete={() => setStep("completed")} />}</div></main>; }
