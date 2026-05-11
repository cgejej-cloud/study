import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const [active, all] = await Promise.all([
    prisma.season.findFirst({ where: { isActive: true } }),
    prisma.season.findMany({ orderBy: { startDate: "desc" } }),
  ]);
  return NextResponse.json({ active, all });
}
