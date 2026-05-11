import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const fromParam = req.nextUrl.searchParams.get("from");
  const toParam   = req.nextUrl.searchParams.get("to");
  const where: { date?: { gte?: string; lte?: string } } = {};
  if (fromParam || toParam) {
    where.date = {};
    if (fromParam) where.date.gte = fromParam;
    if (toParam)   where.date.lte = toParam;
  }

  const reservations = await prisma.reservation.findMany({
    where,
    include: {
      user:  { select: { name: true, email: true, phone: true } },
      table: { select: { name: true } },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  const header = ["날짜", "시간", "탁구대", "회원명", "이메일", "연락처", "상태", "반복", "생성일"];
  const rows = reservations.map((r) => [
    r.date,
    `${r.startTime} ~ ${r.endTime}`,
    r.table.name,
    r.user.name,
    r.user.email,
    r.user.phone ?? "",
    r.status,
    r.isRecurring ? "Y" : "N",
    r.createdAt.toISOString().slice(0, 19).replace("T", " "),
  ]);

  const csv = [header, ...rows]
    .map((r) => r.map((v) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(","))
    .join("\n");

  const bom = "﻿";
  const filename = `reservations-${new Date().toISOString().slice(0, 10)}.csv`;
  return new NextResponse(bom + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
