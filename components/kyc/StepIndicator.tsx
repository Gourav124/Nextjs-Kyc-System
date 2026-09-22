export function StepIndicator({ active }: { active: 1 | 2 | 3 }) {
  const labels = ["Aadhaar front", "Aadhaar back", "Selfie"];
  return <div className="steps" aria-label={`Step ${active} of 3`}>{labels.map((label, i) => {
    const step = (i + 1) as 1 | 2 | 3, reached = step <= active, completed = step < active;
    return <div className="step" key={label}>{i < 2 && completed && <i aria-hidden="true" style={{ position: "absolute", zIndex: 2, top: 12, left: "calc(50% + 19px)", width: "calc(100% - 38px)", height: 2, background: "#1769e8" }} />}{<span style={reached ? { borderColor: "#1769e8", background: "#1769e8", color: "#fff" } : undefined}>{i + 1}</span>}<small style={reached ? { color: "#1769e8", fontWeight: 700 } : undefined}>{label}</small></div>;
  })}</div>;
}
