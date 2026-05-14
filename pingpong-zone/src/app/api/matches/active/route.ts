import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json(null);

  const now = new Date();
  const todayDate = now.toISOString().split("T")[0];
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const challenge = await prisma.matchChallenge.findFirst({
    where: {
      status: "accepted",
      OR: [{ challengerId: session.id }, { challengedId: session.id }],
      reservation: {
        date: todayDate,
        startTime: { lte: currentTime },
        endTime: { gt: currentTime },
        status: "confirmed",
      },
    },
    include: {
      challenger: { select: { id: true, name: true, nickname: true } },
      challenged: { select: { id: true, name: true, nickname: true } },
      reservation: {
        select: {
          id: true,
          date: true,
          startTime: true,
          endTime: true,
          table: { select: { name: true } },
        },
      },
    },
  });

  if (!challenge) return NextResponse.json(null);

  const opponent =
    challenge.challengerId === session.id ? challenge.challenged : challenge.challenger;

  return NextResponse.json({
    challengeId: challenge.id,
    opponent: {
      id: opponent.id,
      name: opponent.nickname ?? opponent.name,
    },
    reservation: challenge.reservation,
  });
}
