import { describe, it, expect } from "vitest";
import { getK, expectedScore, calcEloChange, computeMatchEloChanges, K_PLACEMENT, K_NORMAL } from "./elo";

describe("getK", () => {
  it("uses K_PLACEMENT for placement games", () => {
    expect(getK(0)).toBe(K_PLACEMENT);
    expect(getK(4)).toBe(K_PLACEMENT);
  });
  it("uses K_NORMAL after placement", () => {
    expect(getK(5)).toBe(K_NORMAL);
    expect(getK(100)).toBe(K_NORMAL);
  });
});

describe("expectedScore", () => {
  it("returns 0.5 for equal ratings", () => {
    expect(expectedScore(1000, 1000)).toBeCloseTo(0.5, 5);
  });
  it("favors higher rating", () => {
    expect(expectedScore(1200, 1000)).toBeGreaterThan(0.5);
    expect(expectedScore(1000, 1200)).toBeLessThan(0.5);
  });
  it("symmetric — A and B expected scores sum to 1", () => {
    expect(expectedScore(1500, 1300) + expectedScore(1300, 1500)).toBeCloseTo(1, 5);
  });
});

describe("calcEloChange", () => {
  it("returns 0 when actual matches expected", () => {
    expect(calcEloChange(1000, 24, 0.5, 0.5)).toBe(0);
  });
  it("positive when actual > expected (upset win)", () => {
    expect(calcEloChange(1000, 24, 0.3, 1)).toBeGreaterThan(0);
  });
  it("rounds to integer", () => {
    const v = calcEloChange(1000, 24, 0.5, 1);
    expect(Number.isInteger(v)).toBe(true);
  });
});

describe("computeMatchEloChanges", () => {
  it("zero-sum after rounding for equal ratings (both normal)", () => {
    const r = computeMatchEloChanges({ myElo: 1000, oppElo: 1000, myGames: 10, oppGames: 10, iWon: true });
    expect(r.p1Change + r.p2Change).toBe(0);
    expect(r.p1Change).toBeGreaterThan(0);
    expect(r.p2Change).toBeLessThan(0);
  });

  it("loser change is negative, winner positive", () => {
    const r = computeMatchEloChanges({ myElo: 1100, oppElo: 1300, myGames: 10, oppGames: 10, iWon: false });
    expect(r.p1Change).toBeLessThan(0);
    expect(r.p2Change).toBeGreaterThan(0);
  });

  it("placement K (48) gives larger change than normal K (24)", () => {
    const placement = computeMatchEloChanges({ myElo: 1000, oppElo: 1000, myGames: 0, oppGames: 10, iWon: true });
    const normal    = computeMatchEloChanges({ myElo: 1000, oppElo: 1000, myGames: 10, oppGames: 10, iWon: true });
    expect(placement.p1Change).toBeGreaterThan(normal.p1Change);
  });

  it("upset (lower rating beats higher) awards more points to underdog", () => {
    const upset = computeMatchEloChanges({ myElo: 900, oppElo: 1300, myGames: 10, oppGames: 10, iWon: true });
    const expected = computeMatchEloChanges({ myElo: 1300, oppElo: 900, myGames: 10, oppGames: 10, iWon: true });
    expect(upset.p1Change).toBeGreaterThan(expected.p1Change);
  });
});
