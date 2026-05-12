import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const now = new Date();

  const [active, upcoming] = await Promise.all([
    prisma.event.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      orderBy: { startDate: "asc" },
    }),
    prisma.event.findMany({
      where: {
        isActive: true,
        startDate: { gt: now },
      },
      orderBy: { startDate: "asc" },
    }),
  ]);

  return NextResponse.json({ active, upcoming });
}
