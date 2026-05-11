const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[\d\-\s()+]{7,20}$/;
const TIME_RE  = /^([01]\d|2[0-3]):[0-5]\d$/;

export function validateEmail(v: unknown): v is string {
  return typeof v === "string" && v.length <= 254 && EMAIL_RE.test(v);
}

export function validatePassword(v: unknown): v is string {
  return typeof v === "string" && v.length >= 8 && v.length <= 128;
}

export function validateName(v: unknown): v is string {
  return typeof v === "string" && v.trim().length >= 2 && v.trim().length <= 30;
}

export function validatePhone(v: unknown): v is string {
  if (typeof v !== "string" || v.length === 0) return false;
  return PHONE_RE.test(v);
}

export function validateTime(v: unknown): v is string {
  return typeof v === "string" && TIME_RE.test(v);
}

// HH:MM 비교 (문자열 비교로 충분 — zero-padded 24h)
export function isTimeBefore(a: string, b: string) {
  return a < b;
}
