import { NextRequest, NextResponse } from "next/server";
import { autoConfirmExpired } from "@/lib/matchHelpers";

// Vercel Cron: 매시간 정각 실행
// vercel.json: { "path": "/api/cron/auto-confirm", "schedule": "0 * * * *" }
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await autoConfirmExpired();
  return NextResponse.json({ ok: true, ts: new Date().toISOString() });
}
