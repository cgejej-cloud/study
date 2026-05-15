import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { validateEmail, validateName, validatePassword, validatePhone } from "@/lib/validation";
import { checkIpRateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim()
          ?? req.headers.get("x-real-ip")
          ?? "unknown";
  const userAgent = req.headers.get("user-agent") ?? null;

  const ipCheck = checkIpRateLimit(ip, { max: 3, windowMs: 10 * 60 * 1000 });
  if (!ipCheck.allowed) {
    return NextResponse.json({ error: "잠시 후 다시 시도해주세요." }, { status: 429 });
  }

  const body = await req.json();
  const {
    name,
    email: emailRaw,
    password,
    phone,
    agreedTerms,
    agreedPrivacy,
    ageOver14,
    agreedMarketing,
  } = body;
  const email = typeof emailRaw === "string" ? emailRaw.trim().toLowerCase() : "";

  if (!validateName(name)) {
    return NextResponse.json({ error: "이름은 2~30자로 입력해주세요." }, { status: 400 });
  }
  if (!validateEmail(email)) {
    return NextResponse.json({ error: "올바른 이메일 형식이 아닙니다." }, { status: 400 });
  }
  if (!validatePassword(password)) {
    return NextResponse.json({ error: "비밀번호는 8자 이상이어야 합니다." }, { status: 400 });
  }
  if (phone && !validatePhone(phone)) {
    return NextResponse.json({ error: "올바른 전화번호 형식이 아닙니다." }, { status: 400 });
  }

  // 법적 동의 검증 (필수 3종)
  if (ageOver14 !== true) {
    return NextResponse.json({ error: "만 14세 이상 확인이 필요합니다." }, { status: 400 });
  }
  if (agreedTerms !== true) {
    return NextResponse.json({ error: "이용약관 동의가 필요합니다." }, { status: 400 });
  }
  if (agreedPrivacy !== true) {
    return NextResponse.json({ error: "개인정보 수집·이용 동의가 필요합니다." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "이미 사용 중인 이메일입니다." }, { status: 400 });
  }

  const hashed = await bcrypt.hash(password, 10);
  const now = new Date();
  const marketingOn = agreedMarketing === true;

  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email,
      password: hashed,
      phone: phone || null,
      ageOver14: true,
      agreedTermsAt: now,
      agreedPrivacyAt: now,
      agreedMarketing: marketingOn,
      agreedMarketingAt: marketingOn ? now : null,
      consentIp: ip,
      consentUserAgent: userAgent ? userAgent.slice(0, 500) : null,
      // 마케팅 동의는 이메일 알림 옵트인과 별개로 관리하지만, 미동의 시 알림도 끔
      emailNotify: marketingOn,
    },
  });

  return NextResponse.json({ id: user.id, name: user.name, email: user.email });
}
