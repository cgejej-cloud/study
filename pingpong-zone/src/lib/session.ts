import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

function getSecret() {
  const raw = process.env.SESSION_SECRET;
  if (!raw || raw.length < 32) {
    console.warn("[session] SESSION_SECRET 미설정 또는 32자 미만 — 기본값 사용 (보안 취약, 프로덕션에서는 반드시 설정 필요)");
    return new TextEncoder().encode("pingpong-zone-secret-key-minimum-32-chars-dev-only");
  }
  return new TextEncoder().encode(raw);
}
const COOKIE_NAME = "session";

export type SessionPayload = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
