import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

// 비슷한 실력 매칭의 ELO 허용 범위
const ELO_BAND = 100;
const PER_CATEGORY_LIMIT = 5;

type SuggestionPlayer = {
  id: string;
  name: string;
  nickname: string | null;
  avatar: string | null;
  profileColor: string | null;
  eloRating: number;
};

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const me = await prisma.user.findUnique({
    where: { id: session.id },
    select: { id: true, eloRating: true },
  });
  if (!me) return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });

  // 내가 한 적 있는 상대 ID 목록 (양쪽 포지션 모두)
  const playedMatches = await prisma.match.findMany({
    where: {
      OR: [{ player1Id: me.id }, { player2Id: me.id }],
      status: "confirmed",
    },
    select: { player1Id: true, player2Id: true, createdAt: true },
  });
  const playedWith = new Set<string>();
  const matchCountByOpp: Record<string, { count: number; latest: Date }> = {};
  for (const m of playedMatches) {
    const oppId = m.player1Id === me.id ? m.player2Id : m.player1Id;
    playedWith.add(oppId);
    if (!matchCountByOpp[oppId]) matchCountByOpp[oppId] = { count: 0, latest: m.createdAt };
    matchCountByOpp[oppId].count++;
    if (m.createdAt > matchCountByOpp[oppId].latest) matchCountByOpp[oppId].latest = m.createdAt;
  }

  // 비슷한 실력 (ELO ±BAND, 본인 제외) — 가까운 순
  const similarRaw = await prisma.user.findMany({
    where: {
      id: { not: me.id },
      role: "user",
      eloRating: { gte: me.eloRating - ELO_BAND, lte: me.eloRating + ELO_BAND },
      NOT: { name: "(탈퇴한 회원)" },
    },
    select: { id: true, name: true, nickname: true, avatar: true, profileColor: true, eloRating: true },
    take: 30,
  });
  const similar = similarRaw
    .map((p) => ({ p, dist: Math.abs(p.eloRating - me.eloRating) }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, PER_CATEGORY_LIMIT)
    .map(({ p }) => p);

  // 한 번도 안 친 상대 (활동 중인 user 중 ELO ±2*BAND)
  const newOpponents = await prisma.user.findMany({
    where: {
      id: { notIn: [me.id, ...playedWith] },
      role: "user",
      eloRating: { gte: me.eloRating - ELO_BAND * 2, lte: me.eloRating + ELO_BAND * 2 },
      NOT: { name: "(탈퇴한 회원)" },
    },
    select: { id: true, name: true, nickname: true, avatar: true, profileColor: true, eloRating: true },
    orderBy: { totalMatches: "desc" }, // 활발한 사람 우선
    take: PER_CATEGORY_LIMIT,
  });

  // 라이벌 (가장 자주 만난 상대 Top N)
  const rivalIds = Object.entries(matchCountByOpp)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, PER_CATEGORY_LIMIT)
    .map(([id]) => id);
  const rivalsRaw = rivalIds.length
    ? await prisma.user.findMany({
        where: { id: { in: rivalIds } },
        select: { id: true, name: true, nickname: true, avatar: true, profileColor: true, eloRating: true },
      })
    : [];
  // 매치 수 순으로 다시 정렬
  const rivals = rivalsRaw
    .map((p) => ({ p, count: matchCountByOpp[p.id]?.count ?? 0 }))
    .sort((a, b) => b.count - a.count)
    .map(({ p, count }) => ({ ...p, _meta: { matches: count } as Record<string, number> }));

  // 오늘 / 내일 예약한 사람 (본인 제외, ELO ±2*BAND)
  const today = kstToday();
  const tomorrow = addDays(today, 1);
  const upcoming = await prisma.reservation.findMany({
    where: {
      date: { in: [today, tomorrow] },
      status: "confirmed",
      userId: { not: me.id },
    },
    include: {
      user: { select: { id: true, name: true, nickname: true, avatar: true, profileColor: true, eloRating: true } },
      table: { select: { name: true } },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
    take: 20,
  });
  const seenIds = new Set<string>();
  const todayPlayers: Array<SuggestionPlayer & { _meta: { reservation: string } }> = [];
  for (const r of upcoming) {
    if (seenIds.has(r.user.id)) continue;
    if (Math.abs(r.user.eloRating - me.eloRating) > ELO_BAND * 2) continue;
    seenIds.add(r.user.id);
    todayPlayers.push({
      ...r.user,
      _meta: { reservation: `${r.date === today ? "오늘" : "내일"} ${r.startTime} · ${r.table.name}` },
    });
    if (todayPlayers.length >= PER_CATEGORY_LIMIT) break;
  }

  return NextResponse.json({
    me: { eloRating: me.eloRating },
    similar,
    newOpponents,
    rivals,
    todayPlayers,
  });
}

function kstToday(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
