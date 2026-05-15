import { describe, it, expect } from "vitest";
import { kstDateString, daysBetween, nextStreak, nextMilestone, REWARD_AMOUNTS } from "./rewards";

describe("rewards: kstDateString", () => {
  it("UTC 자정 직후 → KST 기준 다음날", () => {
    // 2024-03-15T23:00:00Z → KST 2024-03-16 08:00 → '2024-03-16'
    const d = new Date("2024-03-15T23:00:00Z");
    expect(kstDateString(d)).toBe("2024-03-16");
  });

  it("UTC 오전 → KST 같은날 오후", () => {
    const d = new Date("2024-03-15T03:00:00Z"); // KST 12:00
    expect(kstDateString(d)).toBe("2024-03-15");
  });

  it("KST 자정 직전 (UTC 14:59) → 같은 KST 날짜", () => {
    const d = new Date("2024-03-15T14:59:00Z"); // KST 23:59
    expect(kstDateString(d)).toBe("2024-03-15");
  });
});

describe("rewards: daysBetween", () => {
  it("동일 날짜 → 0", () => {
    expect(daysBetween("2024-03-15", "2024-03-15")).toBe(0);
  });
  it("어제 → 1", () => {
    expect(daysBetween("2024-03-14", "2024-03-15")).toBe(1);
  });
  it("일주일 전 → 7", () => {
    expect(daysBetween("2024-03-08", "2024-03-15")).toBe(7);
  });
  it("월 경계 통과", () => {
    expect(daysBetween("2024-02-29", "2024-03-01")).toBe(1); // 윤년
  });
});

describe("rewards: nextStreak", () => {
  it("lastDate 없음 → 1로 시작", () => {
    expect(nextStreak(0, null, "2024-03-15")).toBe(1);
  });
  it("오늘 이미 매치 함 → streak 유지", () => {
    expect(nextStreak(3, "2024-03-15", "2024-03-15")).toBe(3);
  });
  it("어제 매치 함 → streak +1", () => {
    expect(nextStreak(3, "2024-03-14", "2024-03-15")).toBe(4);
  });
  it("2일 전 매치 → 1로 리셋 (연속 끊김)", () => {
    expect(nextStreak(5, "2024-03-13", "2024-03-15")).toBe(1);
  });
  it("일주일 전 매치 → 1로 리셋", () => {
    expect(nextStreak(10, "2024-03-08", "2024-03-15")).toBe(1);
  });
});

describe("rewards: nextMilestone", () => {
  it("0경기 → 10경기 마일스톤", () => {
    expect(nextMilestone(0)).toEqual({ target: 10, amount: REWARD_AMOUNTS.milestone_10, remaining: 10 });
  });
  it("9경기 → 10경기까지 1경기", () => {
    expect(nextMilestone(9)).toEqual({ target: 10, amount: REWARD_AMOUNTS.milestone_10, remaining: 1 });
  });
  it("10경기 → 50경기 마일스톤 (다음 단계)", () => {
    expect(nextMilestone(10)).toEqual({ target: 50, amount: REWARD_AMOUNTS.milestone_50, remaining: 40 });
  });
  it("49경기 → 50경기까지 1경기", () => {
    expect(nextMilestone(49)).toEqual({ target: 50, amount: REWARD_AMOUNTS.milestone_50, remaining: 1 });
  });
  it("99경기 → 100경기까지 1경기", () => {
    expect(nextMilestone(99)).toEqual({ target: 100, amount: REWARD_AMOUNTS.milestone_100, remaining: 1 });
  });
  it("100경기 → 모든 마일스톤 달성 (null)", () => {
    expect(nextMilestone(100)).toBeNull();
  });
  it("150경기 → null", () => {
    expect(nextMilestone(150)).toBeNull();
  });
});

describe("rewards: REWARD_AMOUNTS 합산 (sanity check)", () => {
  it("승리한 첫 경기 + 연속 7일 = 10+15+20+35 = 80pt", () => {
    const sum = REWARD_AMOUNTS.match_played
      + REWARD_AMOUNTS.match_won
      + REWARD_AMOUNTS.first_of_day
      + 7 * REWARD_AMOUNTS.daily_streak_per_day;
    expect(sum).toBe(80);
  });

  it("그날 두 번째 경기 (패배) = 참여 10pt만", () => {
    // first_of_day, daily_streak는 그날 첫 경기에서만 지급
    expect(REWARD_AMOUNTS.match_played).toBe(10);
  });
});
