import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const DISPUTE_TIMEOUT_DAYS = 7;

export async function POST() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const cutoff = new Date(Date.now() - DISPUTE_TIMEOUT_DAYS * 24 * 60 * 60 * 1000);

  const result = await prisma.match.updateMany({
    where: {
      status: "disputed",
      createdAt: { lt: cutoff },
    },
    data: { status: "voided" },
  });

  return NextResponse.json({
    voided: result.count,
    message: `${result.count}건의 오래된 분쟁 경기를 자동 무효 처리했습니다.`,
  });
}

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const cutoff = new Date(Date.now() - DISPUTE_TIMEOUT_DAYS * 24 * 60 * 60 * 1000);
  const count = await prisma.match.count({
    where: { status: "disputed", createdAt: { lt: cutoff } },
  });

  return NextResponse.json({
    expiredCount: count,
    timeoutDays: DISPUTE_TIMEOUT_DAYS,
    cutoffDate: cutoff.toISOString(),
  });
}
