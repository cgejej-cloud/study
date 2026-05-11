import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const matches = await prisma.match.findMany({
    where: { OR: [{ player1Id: session.id }, { player2Id: session.id }] },
    include: {
      player1: { select: { id: true, name: true } },
      player2: { select: { id: true, name: true } },
      season:  { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const header = ["날짜", "상대", "결과", "내 포인트 변동", "상태", "시즌"];
  const rows = matches.map((m) => {
    const iAmP1 = m.player1Id === session.id;
    const opponent = iAmP1 ? m.player2.name : m.player1.name;
    const myChange = iAmP1 ? m.p1EloChange : m.p2EloChange;
    const result = m.status === "confirmed" ? (m.winnerId === session.id ? "승" : "패") : m.status;
    const date = new Date(m.createdAt).toISOString().slice(0, 10);
    return [
      date,
      opponent,
      result,
      myChange ?? "",
      m.status,
      m.season?.name ?? "",
    ];
  });

  const csv = [header, ...rows]
    .map((r) => r.map((v) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(","))
    .join("\n");

  // UTF-8 BOM 으로 엑셀에서 한글 깨지지 않게
  const bom = "﻿";
  return new NextResponse(bom + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="match-history-${session.id.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
