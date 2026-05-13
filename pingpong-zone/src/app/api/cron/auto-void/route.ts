import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCronSecret } from "@/lib/cronAuth";

const DISPUTE_TIMEOUT_DAYS = 7;

export async function GET(req: NextRequest) {
  const err = verifyCronSecret(req);
  if (err) return err;

  const cutoff = new Date(Date.now() - DISPUTE_TIMEOUT_DAYS * 24 * 60 * 60 * 1000);

  const result = await prisma.match.updateMany({
    where: { status: "disputed", createdAt: { lt: cutoff } },
    data: { status: "voided" },
  });

  return NextResponse.json({ ok: true, voided: result.count, cutoff: cutoff.toISOString() });
}
