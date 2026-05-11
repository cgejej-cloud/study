import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendUpcomingReservationReminders } from "@/lib/reminders";

export async function GET(req: NextRequest) {
  // lazy-cron: 60초 쿨다운으로 1시간 이내 예약 리마인더 발송
  sendUpcomingReservationReminders().catch(() => {});

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") || new Date().toISOString().split("T")[0];

  const tables = await prisma.table.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  const reservations = await prisma.reservation.findMany({
    where: { date, status: "confirmed" },
  });

  const blocked = await prisma.blockedSlot.findMany({
    where: { date },
  });

  const result = tables.map((table) => ({
    ...table,
    bookedSlots: [
      ...reservations
        .filter((r) => r.tableId === table.id)
        .map((r) => ({ startTime: r.startTime, endTime: r.endTime, type: "reserved" as const })),
      ...blocked
        .filter((b) => b.tableId === table.id)
        .map((b) => ({ startTime: b.startTime, endTime: b.endTime, type: "blocked" as const, reason: b.reason })),
    ],
  }));

  return NextResponse.json(result);
}
