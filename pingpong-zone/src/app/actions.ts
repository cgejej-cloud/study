"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";
import { rateLimit, resetRateLimit } from "@/lib/rateLimit";

export async function login(formData: FormData) {
  const emailRaw = (formData.get("email") as string) || "";
  const password = (formData.get("password") as string) || "";
  const email = emailRaw.trim().toLowerCase();

  if (!email || !password) {
    return { error: "이메일과 비밀번호를 입력해주세요." };
  }

  // 레이트 리밋: IP + 이메일 기준 (5회/15분)
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "unknown";
  const limitKey = `login:${ip}:${email}`;
  const limit = rateLimit(limitKey, 5, 15 * 60 * 1000);
  if (!limit.ok) {
    return { error: `로그인 시도가 너무 많습니다. ${Math.ceil(limit.retryAfter / 60)}분 후 다시 시도해주세요.` };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.password) {
    return { error: "이메일 또는 비밀번호가 올바르지 않습니다." };
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return { error: "이메일 또는 비밀번호가 올바르지 않습니다." };
  }

  // 성공 시 레이트 리밋 카운트 초기화
  resetRateLimit(limitKey);

  await createSession({ id: user.id, name: user.name, email: user.email, role: user.role });
  redirect("/");
}
