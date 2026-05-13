import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || "pingpong-zone-secret-key-minimum-32-chars-dev-only"
);

async function getRole(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get("session")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return (payload as { role?: string }).role ?? "user";
  } catch {
    return null;
  }
}

function isValidOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // same-origin 요청은 origin 헤더 없음

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  const vercelUrl = process.env.VERCEL_URL;
  const allowedOrigins = [
    baseUrl,
    vercelUrl ? `https://${vercelUrl}` : null,
    "http://localhost:3000",
    "http://localhost:3001",
  ].filter(Boolean) as string[];

  try {
    const requestOrigin = new URL(origin).origin;
    return allowedOrigins.some((allowed) => new URL(allowed).origin === requestOrigin);
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const { method } = req;

  // CSRF 보호: 상태 변경 API 요청에서 Origin 검증
  if (
    pathname.startsWith("/api/") &&
    ["POST", "PATCH", "PUT", "DELETE"].includes(method) &&
    !isValidOrigin(req)
  ) {
    return NextResponse.json({ error: "CSRF 검증 실패" }, { status: 403 });
  }

  const role = await getRole(req);

  // /mypage: 로그인 필요
  if (pathname.startsWith("/mypage")) {
    if (!role) {
      const url = new URL("/login", req.url);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  // /admin: 어드민 필요
  if (pathname.startsWith("/admin")) {
    if (!role) return NextResponse.redirect(new URL("/login", req.url));
    if (role !== "admin") return NextResponse.redirect(new URL("/", req.url));
  }

  // /tournament: 로그인 확인은 개별 API에서 처리 (공개 페이지)
  return NextResponse.next();
}

export const config = {
  matcher: ["/mypage/:path*", "/admin/:path*", "/api/:path*"],
};
