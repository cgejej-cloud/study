import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateEmail } from "@/lib/validation";
import { rateLimit } from "@/lib/rateLimit";

export async function GET(req: NextRequest) {
  // 이메일 자동완성 도구 남용 방지 (60회/분)
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const limit = rateLimit(`check-email:${ip}`, 60, 60 * 1000);
  if (!limit.ok) return NextResponse.json({ taken: null }, { status: 429 });

  const email = (req.nextUrl.searchParams.get("email") || "").trim().toLowerCase();
  if (!validateEmail(email)) return NextResponse.json({ taken: null, valid: false });

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  return NextResponse.json({ taken: !!existing, valid: true });
}
