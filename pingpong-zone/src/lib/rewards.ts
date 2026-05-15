import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";

// 적립 규칙
export const REWARD_AMOUNTS = {
  match_played: 10,        // 참여 (모든 양 선수)
  match_won:    15,        // 승리 보너스
  first_of_day: 20,        // 그날 첫 경기
  daily_streak_per_day: 5, // 연속 출석일 * N (상한 7일 = +35pt)
  milestone_10:  100,
  milestone_50:  300,
  milestone_100: 500,
} as const;

export const DAILY_STREAK_CAP_DAYS = 7;

export type RewardType =
  | "match_played"
  | "match_won"
  | "first_of_day"
  | "daily_streak"
  | "milestone_10"
  | "milestone_50"
  | "milestone_100";

export type GrantedReward = {
  type: RewardType;
  amount: number;
  note: string;
};

// KST(UTC+9) 기준 'YYYY-MM-DD'
export function kstDateString(d: Date = new Date()): string {
  const ms = d.getTime() + 9 * 60 * 60 * 1000;
  return new Date(ms).toISOString().slice(0, 10);
}

// 두 KST 날짜 문자열의 일수 차 (today - last)
export function daysBetween(last: string, today: string): number {
  const lastMs  = Date.parse(last  + "T00:00:00Z");
  const todayMs = Date.parse(today + "T00:00:00Z");
  return Math.round((todayMs - lastMs) / (24 * 60 * 60 * 1000));
}

// 연속 출석일 계산 — 어제이면 streak+1, 그 외(오늘 동일 / 비연속)는 1로 리셋
export function nextStreak(prevStreak: number, lastDate: string | null, today: string): number {
  if (!lastDate || lastDate === today) return prevStreak || 1;
  return daysBetween(lastDate, today) === 1 ? prevStreak + 1 : 1;
}

// 단일 사용자에게 매치 1건의 보상 적립 — 트랜잭션 내에서 idempotent
export async function grantMatchRewards(
  matchId: string,
  userId: string,
  isWinner: boolean,
  now: Date = new Date(),
): Promise<GrantedReward[]> {
  const today = kstDateString(now);

  return await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { dailyStreak: true, lastMatchDate: true },
    });
    if (!user) return [];

    const granted: GrantedReward[] = [];
    let pointsAccum = 0;

    async function emit(type: RewardType, amount: number, note: string, metadata?: Record<string, unknown>) {
      // (matchId, userId, type) 유니크로 중복 적립 차단 — 충돌 시 무시
      try {
        await tx.rewardEvent.create({
          data: { userId, matchId, type, amount, metadata: metadata ? JSON.stringify(metadata) : null },
        });
        granted.push({ type, amount, note });
        pointsAccum += amount;
      } catch (e) {
        const err = e as Prisma.PrismaClientKnownRequestError;
        if (err.code !== "P2002") throw e;
      }
    }

    // 1) 참여
    await emit("match_played", REWARD_AMOUNTS.match_played, "참여 보상");

    // 2) 승리 보너스
    if (isWinner) {
      await emit("match_won", REWARD_AMOUNTS.match_won, "승리 보너스");
    }

    // 3) 그날 첫 경기 + 연속 출석 보너스 (단, 오늘 이미 처리됐다면 스킵)
    const alreadyToday = user.lastMatchDate === today;
    if (!alreadyToday) {
      await emit("first_of_day", REWARD_AMOUNTS.first_of_day, "오늘 첫 경기");
      const newStreak = nextStreak(user.dailyStreak, user.lastMatchDate, today);
      if (newStreak >= 2) {
        const days = Math.min(newStreak, DAILY_STREAK_CAP_DAYS);
        await emit(
          "daily_streak",
          days * REWARD_AMOUNTS.daily_streak_per_day,
          `${newStreak}일 연속 출석`,
          { streak: newStreak },
        );
      }
      // user.dailyStreak / lastMatchDate 갱신 — 같은 매치에서 두 보상 모두 emit 후 한 번에
      await tx.user.update({
        where: { id: userId },
        data: { dailyStreak: newStreak, lastMatchDate: today },
      });
    }

    // 4) 마일스톤 — 이 매치 포함한 총 confirmed 경기 수
    const totalMatches = await tx.match.count({
      where: {
        OR: [{ player1Id: userId }, { player2Id: userId }],
        status: "confirmed",
      },
    });
    const milestones: Array<[number, RewardType, number]> = [
      [10,  "milestone_10",  REWARD_AMOUNTS.milestone_10],
      [50,  "milestone_50",  REWARD_AMOUNTS.milestone_50],
      [100, "milestone_100", REWARD_AMOUNTS.milestone_100],
    ];
    for (const [target, type, amount] of milestones) {
      if (totalMatches === target) {
        const existing = await tx.rewardEvent.findFirst({ where: { userId, type } });
        if (!existing) {
          await emit(type, amount, `${target}경기 달성`);
        }
      }
    }

    if (pointsAccum > 0) {
      await tx.user.update({
        where: { id: userId },
        data: {
          rewardPoints: { increment: pointsAccum },
          totalMatches,
        },
      });
    }

    return granted;
  });
}

// 다음 마일스톤까지 남은 경기 + 보상 — UI에 표시
export function nextMilestone(totalMatches: number): { target: number; amount: number; remaining: number } | null {
  const tiers: Array<[number, number]> = [
    [10,  REWARD_AMOUNTS.milestone_10],
    [50,  REWARD_AMOUNTS.milestone_50],
    [100, REWARD_AMOUNTS.milestone_100],
  ];
  for (const [target, amount] of tiers) {
    if (totalMatches < target) {
      return { target, amount, remaining: target - totalMatches };
    }
  }
  return null;
}

export const REWARD_TYPE_LABEL: Record<RewardType, string> = {
  match_played: "참여",
  match_won:    "승리",
  first_of_day: "첫 경기",
  daily_streak: "연속 출석",
  milestone_10:  "10경기 마일스톤",
  milestone_50:  "50경기 마일스톤",
  milestone_100: "100경기 마일스톤",
};
