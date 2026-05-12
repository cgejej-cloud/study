import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "ok",
      db: "connected",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
    });
  } catch {
    return NextResponse.json(
      {
        status: "degraded",
        db: "error",
        timestamp: new Date().toISOString(),
        version: "1.0.0",
      },
      { status: 503 }
    );
  }
}
