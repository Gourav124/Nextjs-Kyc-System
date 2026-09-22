const compact = (value: string) => value.replace(/[^A-Z0-9\s/.-]/gi, " ").replace(/\s+/g, " ").trim();
export function extractAadhaarNumber(text: string) { const m = text.replace(/[Oo]/g, "0").match(/(?:\d{4}\s?){2}\d{4}|\d{12}/); return m ? m[0].replace(/\s/g, "") : null; }
export function maskAadhaar(value: string | null) { return value ? `XXXX XXXX ${value.slice(-4)}` : "Not detected"; }
export function extractDateOfBirth(text: string) { const m = text.match(/(?:DOB|Date\s*of\s*Birth|Year\s*of\s*Birth)\D{0,12}(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4})/i) || text.match(/\b\d{2}[/-]\d{2}[/-]\d{4}\b/); return m?.[1] ?? m?.[0] ?? null; }
export function extractGender(text: string) { const m = text.match(/\b(Male|Female|Transgender)\b/i); return m ? m[1][0].toUpperCase() + m[1].slice(1).toLowerCase() : null; }
export function extractName(text: string) {
  const lines = text.split(/\r?\n/).map(compact).filter(Boolean);
  // Prefer an explicit field when OCR has read a Name label.
  const labelled = lines.map((line) => line.match(/^(?:name|nam[e]?\s*[:.-]?)\s*([A-Za-z][A-Za-z .'-]{2,50})$/i)?.[1]).find(Boolean);
  if (labelled) return labelled.replace(/\s+/g, " ").trim();
  const bad = /aadhaar|government|india|uidai|dob|birth|male|female|address|enrol|vid|year|issued|help|\d/i;
  const candidates = lines.filter((line) => !bad.test(line) && /^[A-Za-z][A-Za-z .'-]{2,50}$/.test(line));
  // Aadhaar names normally contain at least two words; prefer this over stray OCR labels.
  return candidates.find((line) => line.trim().split(/\s+/).length >= 2) ?? candidates[0] ?? null;
}
export function extractAddress(text: string) { const lines = text.split(/\r?\n/).map(compact).filter(Boolean); const at = lines.findIndex((line) => /address|s\/o|d\/o|c\/o|w\/o/i.test(line)); return at >= 0 ? lines.slice(at, at + 4).join(", ").replace(/^address\s*:?/i, "").trim() || null : null; }
export function isLikelyAadhaar(text: string) { return /aadhaar|uidai|government\s+of\s+india|unique\s+identification/i.test(text) && (!!extractAadhaarNumber(text) || /dob|date\s+of\s+birth|address/i.test(text)); }

export type AadhaarSide = "front" | "back" | "unknown";

/** A local OCR heuristic; it prevents accidental side swaps but is not official verification. */
export function classifyAadhaarSide(text: string): AadhaarSide {
  const value = text.toLowerCase().replace(/\s+/g, " ");
  const hasNumber = Boolean(extractAadhaarNumber(text));
  const frontScore =
    Number(/\b(dob|date of birth|year of birth)\b/.test(value)) +
    Number(/\b(male|female|transgender)\b/.test(value)) +
    Number(/government of india|unique identification authority|uidai/.test(value)) +
    Number(hasNumber);
  const backScore =
    Number(/\baddress\b/.test(value)) +
    Number(/\b[sdcw]\s*\/\s*o\b/.test(value)) +
    Number(/\b(pin|pincode|postal code)\b/.test(value)) +
    Number(/\b\d{6}\b/.test(value));

  if (frontScore >= 2 && frontScore > backScore) return "front";
  if (backScore >= 2 && backScore >= frontScore) return "back";
  return "unknown";
}
