import { describe, it, expect } from "vitest";
import { calculateBadges } from "./badges";

const base = {
  total: 0,
  wins: 0,
  losses: 0,
  winRate: null as number | null,
  eloRating: 1000,
  bestStreak: 0,
  recentForm: [] as ("W" | "L")[],
};

function got(stats: Partial<typeof base>) {
  return calculateBadges({ ...base, ...stats }).filter((b) => b.earned).map((b) => b.id);
}

describe("calculateBadges", () => {
  it("returns empty earned for fresh user (only tier_gold via 1000 default)", () => {
    expect(got({})).toEqual(["tier_gold"]);
  });

  it("awards first_match and first_win at 1 game", () => {
    expect(got({ total: 1, wins: 1, winRate: 100 })).toContain("first_match");
    expect(got({ total: 1, wins: 1, winRate: 100 })).toContain("first_win");
  });

  it("awards wins_10 / 50 / 100 thresholds", () => {
    expect(got({ total: 10, wins: 10 })).toContain("wins_10");
    expect(got({ total: 50, wins: 50 })).toContain("wins_50");
    expect(got({ total: 100, wins: 100 })).toContain("wins_100");
  });

  it("does not award wins_50 with 49 wins", () => {
    expect(got({ total: 50, wins: 49, losses: 1 })).not.toContain("wins_50");
  });

  it("awards streak tiers from bestStreak", () => {
    expect(got({ bestStreak: 3 })).toContain("streak_3");
    expect(got({ bestStreak: 4 })).not.toContain("streak_5");
    expect(got({ bestStreak: 10 })).toContain("streak_10");
  });

  it("awards winrate_70 only with 10+ games", () => {
    expect(got({ total: 10, wins: 7, losses: 3, winRate: 70 })).toContain("winrate_70");
    expect(got({ total: 9, wins: 7, losses: 2, winRate: 78 })).not.toContain("winrate_70");
  });

  it("awards tier badges based on elo", () => {
    expect(got({ eloRating: 1200 })).toEqual(expect.arrayContaining(["tier_gold", "tier_diamond"]));
    expect(got({ eloRating: 1300 })).toContain("tier_master");
    expect(got({ eloRating: 999 })).not.toContain("tier_gold");
  });

  it("awards no_loss_5 only when recent 5 are all wins", () => {
    expect(got({ recentForm: ["W", "W", "W", "W", "W"] })).toContain("no_loss_5");
    expect(got({ recentForm: ["W", "W", "L", "W", "W"] })).not.toContain("no_loss_5");
    expect(got({ recentForm: ["W", "W", "W", "W"] })).not.toContain("no_loss_5");
  });
});
