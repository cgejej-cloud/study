// 업적 정의 - 사용자 통계로부터 즉시 계산되는 derived 데이터 (DB 별도 저장 X)

export type BadgeId =
  | "first_match" | "first_win"
  | "wins_10" | "wins_50" | "wins_100"
  | "streak_3" | "streak_5" | "streak_10"
  | "winrate_70" | "winrate_80"
  | "games_50" | "games_100"
  | "tier_gold" | "tier_diamond" | "tier_master"
  | "no_loss_5";

export type Badge = {
  id: BadgeId;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  progress?: { current: number; target: number };
};

type Stats = {
  total: number;
  wins: number;
  losses: number;
  winRate: number | null;
  eloRating: number;
  bestStreak: number; // 역대 최장 연승
  recentForm: ("W" | "L")[];
};

const DEFS: Array<Omit<Badge, "earned" | "progress"> & {
  check: (s: Stats) => { earned: boolean; progress?: { current: number; target: number } };
}> = [
  { id: "first_match", name: "첫 발자국", icon: "🚶", description: "첫 경기 완료",
    check: (s) => ({ earned: s.total >= 1, progress: { current: Math.min(s.total, 1), target: 1 } }) },
  { id: "first_win", name: "첫 승리", icon: "🎯", description: "첫 승 달성",
    check: (s) => ({ earned: s.wins >= 1, progress: { current: Math.min(s.wins, 1), target: 1 } }) },
  { id: "wins_10", name: "10승 달성", icon: "🥉", description: "누적 10승",
    check: (s) => ({ earned: s.wins >= 10, progress: { current: Math.min(s.wins, 10), target: 10 } }) },
  { id: "wins_50", name: "50승 달성", icon: "🥈", description: "누적 50승",
    check: (s) => ({ earned: s.wins >= 50, progress: { current: Math.min(s.wins, 50), target: 50 } }) },
  { id: "wins_100", name: "100승 달성", icon: "🥇", description: "누적 100승",
    check: (s) => ({ earned: s.wins >= 100, progress: { current: Math.min(s.wins, 100), target: 100 } }) },
  { id: "games_50", name: "성실 플레이어", icon: "📅", description: "누적 50경기",
    check: (s) => ({ earned: s.total >= 50, progress: { current: Math.min(s.total, 50), target: 50 } }) },
  { id: "games_100", name: "탁구 마니아", icon: "🏓", description: "누적 100경기",
    check: (s) => ({ earned: s.total >= 100, progress: { current: Math.min(s.total, 100), target: 100 } }) },
  { id: "streak_3", name: "기세 올라가는 중", icon: "🔥", description: "3연승",
    check: (s) => ({ earned: s.bestStreak >= 3, progress: { current: Math.min(s.bestStreak, 3), target: 3 } }) },
  { id: "streak_5", name: "5연승", icon: "💥", description: "5연승",
    check: (s) => ({ earned: s.bestStreak >= 5, progress: { current: Math.min(s.bestStreak, 5), target: 5 } }) },
  { id: "streak_10", name: "10연승의 전설", icon: "👑", description: "10연승",
    check: (s) => ({ earned: s.bestStreak >= 10, progress: { current: Math.min(s.bestStreak, 10), target: 10 } }) },
  { id: "winrate_70", name: "고승률 플레이어", icon: "⭐", description: "10경기+ & 승률 70%+",
    check: (s) => ({ earned: s.total >= 10 && (s.winRate ?? 0) >= 70 }) },
  { id: "winrate_80", name: "압도적 실력", icon: "🌟", description: "20경기+ & 승률 80%+",
    check: (s) => ({ earned: s.total >= 20 && (s.winRate ?? 0) >= 80 }) },
  { id: "tier_gold", name: "골드 티어", icon: "🏅", description: "1000점 이상",
    check: (s) => ({ earned: s.eloRating >= 1000 }) },
  { id: "tier_diamond", name: "다이아 티어", icon: "💎", description: "1200점 이상",
    check: (s) => ({ earned: s.eloRating >= 1200 }) },
  { id: "tier_master", name: "마스터 티어", icon: "🌠", description: "1300점 이상",
    check: (s) => ({ earned: s.eloRating >= 1300 }) },
  { id: "no_loss_5", name: "무패 행진", icon: "🛡️", description: "최근 5경기 전승",
    check: (s) => ({ earned: s.recentForm.length >= 5 && s.recentForm.slice(0, 5).every((f) => f === "W") }) },
];

export function calculateBadges(stats: Stats): Badge[] {
  return DEFS.map((d) => {
    const r = d.check(stats);
    return { id: d.id, name: d.name, description: d.description, icon: d.icon, earned: r.earned, progress: r.progress };
  });
}
