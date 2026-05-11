import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const notices = await prisma.notice.findMany({
    where: { isActive: true },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    take: 10,
  });
  return NextResponse.json(notices, {
    headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=120" },
  });
}
