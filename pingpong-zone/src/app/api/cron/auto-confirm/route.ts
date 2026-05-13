import { NextRequest, NextResponse } from "next/server";
import { autoConfirmExpired } from "@/lib/matchHelpers";
import { verifyCronSecret } from "@/lib/cronAuth";

export async function GET(req: NextRequest) {
  const err = verifyCronSecret(req);
  if (err) return err;

  await autoConfirmExpired();
  return NextResponse.json({ ok: true, ts: new Date().toISOString() });
}
