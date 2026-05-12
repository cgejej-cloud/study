import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";
import { checkIpRateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) {
    return NextResponse.json({ error: "이메일을 입력해주세요." }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const ipCheck = checkIpRateLimit(ip, { max: 3, windowMs: 5 * 60 * 1000 });
  if (!ipCheck.allowed) {
    return NextResponse.json({ error: "잠시 후 다시 시도해주세요." }, { status: 429 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ message: "이메일을 확인해주세요." });
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.$transaction([
    prisma.passwordResetToken.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true },
    }),
    prisma.passwordResetToken.create({
      data: { token, userId: user.id, expiresAt },
    }),
  ]);

  await sendPasswordResetEmail(user.email!, user.name, token);

  return NextResponse.json({ message: "이메일을 확인해주세요." });
}
