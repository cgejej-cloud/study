import { prisma } from "@/lib/prisma";
import { sendMatchPendingNotice } from "@/lib/email";
import { ELO_FLOOR } from "@/lib/elo";
import { grantMatchRewards, type GrantedReward } from "@/lib/rewards";

export const AUTO_CONFIRM_HOURS = 24;

export async function autoConfirmExpired() {
  const cutoff = new Date(Date.now() - AUTO_CONFIRM_HOURS * 60 * 60 * 1000);
  const expired = await prisma.match.findMany({
    where: { status: "pending", createdAt: { lt: cutoff } },
  });

  for (const match of expired) {
    if (match.p1EloChange === null || match.p2EloChange === null) continue;
    await applyElo(match.id, match.player1Id, match.p1EloChange, match.player2Id, match.p2EloChange);
  }
}

export async function applyElo(
  matchId: string,
  p1Id: string, p1Change: number,
  p2Id: string, p2Change: number,
): Promise<{ rewards: { p1: GrantedReward[]; p2: GrantedReward[] } } | null> {
  const activeSeason = await prisma.season.findFirst({ where: { isActive: true } });
  // updateMany with status filter is the idempotency gate — prevents double-apply in race conditions
  const updated = await prisma.match.updateMany({
    where: { id: matchId, status: { in: ["pending", "disputed"] } },
    data:  { status: "confirmed", confirmedAt: new Date(), seasonId: activeSeason?.id ?? null },
  });
  if (updated.count === 0) return null;

  // 하한선 적용: ELO_FLOOR 미만으로 내려가지 않도록
  const [p1, p2] = await prisma.$transaction([
    prisma.user.findUnique({ where: { id: p1Id }, select: { eloRating: true } }),
    prisma.user.findUnique({ where: { id: p2Id }, select: { eloRating: true } }),
  ]);
  const safeP1Change = p1 ? Math.max(p1Change, ELO_FLOOR - p1.eloRating) : p1Change;
  const safeP2Change = p2 ? Math.max(p2Change, ELO_FLOOR - p2.eloRating) : p2Change;

  await prisma.$transaction([
    prisma.user.update({ where: { id: p1Id }, data: { eloRating: { increment: safeP1Change } } }),
    prisma.user.update({ where: { id: p2Id }, data: { eloRating: { increment: safeP2Change } } }),
  ]);

  // 리워드 적립 — 매치 확정과 같은 라이프사이클에서 발생, 단 별도 트랜잭션
  // (실패해도 ELO 반영은 유지 — 리워드는 backfill 가능)
  const match = await prisma.match.findUnique({ where: { id: matchId }, select: { winnerId: true } });
  const winnerId = match?.winnerId;
  const p1Rewards = await grantMatchRewards(matchId, p1Id, winnerId === p1Id).catch((e) => {
    console.error("[reward p1 failed]", matchId, p1Id, e);
    return [];
  });
  const p2Rewards = await grantMatchRewards(matchId, p2Id, winnerId === p2Id).catch((e) => {
    console.error("[reward p2 failed]", matchId, p2Id, e);
    return [];
  });

  return { rewards: { p1: p1Rewards, p2: p2Rewards } };
}

export async function notifyOpponent(opts: {
  opponentEmail: string;
  opponentEmailNotify: boolean;
  opponentName: string;
  recorderName: string;
  iWon: boolean;
}) {
  if (!opts.opponentEmailNotify) return;
  await sendMatchPendingNotice({
    to: opts.opponentEmail,
    opponentName: opts.recorderName,
    result: opts.iWon ? "loss" : "win",
  }).catch(() => {});
}
