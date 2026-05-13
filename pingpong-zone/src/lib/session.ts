import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SECRET_RAW = process.env.SESSION_SECRET || "pingpong-zone-secret-key-minimum-32-chars-dev-only";
if (
  process.env.NODE_ENV === "production" &&
  process.env.NEXT_PHASE !== "phase-production-build" &&
  !process.env.SESSION_SECRET
) {
  throw new Error("[FATAL] SESSION_SECRET 환경변수가 설정되지 않았습니다.");
}
const SECRET = new TextEncoder().encode(SECRET_RAW);
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
    .sign(SECRET);

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
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
