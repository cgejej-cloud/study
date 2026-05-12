import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { message, stack, url } = await req.json();
  const session = await getSession();
  const userId = session?.id ?? null;

  await prisma.errorLog.create({
    data: {
      message: String(message ?? "").slice(0, 500),
      stack: stack ? String(stack).slice(0, 2000) : null,
      url: url ? String(url).slice(0, 500) : null,
      userId,
    },
  });

  return new NextResponse(null, { status: 204 });
}
