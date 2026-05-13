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

export function validateNickname(v: unknown): v is string {
  if (v === null || v === undefined || v === "") return true; // optional
  return typeof v === "string" && v.trim().length >= 2 && v.trim().length <= 20;
}

export function validateBio(v: unknown): v is string {
  if (v === null || v === undefined || v === "") return true; // optional
  return typeof v === "string" && v.length <= 140;
}

const PROFILE_COLORS = [
  "#22c55e","#16a34a","#15803d",
  "#3b82f6","#2563eb","#1d4ed8",
  "#8b5cf6","#7c3aed","#6d28d9",
  "#f59e0b","#d97706","#b45309",
  "#ef4444","#dc2626","#b91c1c",
  "#ec4899","#db2777","#be185d",
  "#06b6d4","#0891b2","#0e7490",
  "#64748b","#475569","#334155",
];

export function validateProfileColor(v: unknown): v is string {
  if (v === null || v === undefined || v === "") return true; // optional
  return typeof v === "string" && PROFILE_COLORS.includes(v);
}

export { PROFILE_COLORS };

export function validateTime(v: unknown): v is string {
  return typeof v === "string" && TIME_RE.test(v);
}

// HH:MM 비교 (문자열 비교로 충분 — zero-padded 24h)
export function isTimeBefore(a: string, b: string) {
  return a < b;
}
