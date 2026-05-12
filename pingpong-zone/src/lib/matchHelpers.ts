import { prisma } from "@/lib/prisma";
import { sendMatchPendingNotice } from "@/lib/email";
import { ELO_FLOOR } from "@/lib/elo";

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
) {
  const activeSeason = await prisma.season.findFirst({ where: { isActive: true } });
  // updateMany with status filter is the idempotency gate — prevents double-apply in race conditions
  const updated = await prisma.match.updateMany({
    where: { id: matchId, status: { in: ["pending", "disputed"] } },
    data:  { status: "confirmed", confirmedAt: new Date(), seasonId: activeSeason?.id ?? null },
  });
  if (updated.count === 0) return;

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
