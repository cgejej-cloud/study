import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DISPUTE_TIMEOUT_DAYS = 7;

// Vercel Cron: 매일 새벽 1시 실행
// vercel.json: { "path": "/api/cron/auto-void", "schedule": "0 1 * * *" }
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - DISPUTE_TIMEOUT_DAYS * 24 * 60 * 60 * 1000);

  const result = await prisma.match.updateMany({
    where: { status: "disputed", createdAt: { lt: cutoff } },
    data: { status: "voided" },
  });

  return NextResponse.json({ ok: true, voided: result.count, cutoff: cutoff.toISOString() });
}
