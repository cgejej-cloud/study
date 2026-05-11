import { describe, it, expect } from "vitest";
import {
  validateEmail,
  validatePassword,
  validateName,
  validatePhone,
  validateTime,
  isTimeBefore,
} from "./validation";

describe("validateEmail", () => {
  it("accepts standard emails", () => {
    expect(validateEmail("user@example.com")).toBe(true);
    expect(validateEmail("a.b+tag@sub.co.kr")).toBe(true);
  });
  it("rejects invalid emails", () => {
    expect(validateEmail("notanemail")).toBe(false);
    expect(validateEmail("a@b")).toBe(false);
    expect(validateEmail("@example.com")).toBe(false);
    expect(validateEmail("user@.com")).toBe(false);
    expect(validateEmail("")).toBe(false);
    expect(validateEmail(null)).toBe(false);
    expect(validateEmail(123)).toBe(false);
  });
  it("enforces length cap", () => {
    expect(validateEmail("a".repeat(250) + "@b.com")).toBe(false);
  });
});

describe("validatePassword", () => {
  it("requires 8+ chars", () => {
    expect(validatePassword("12345678")).toBe(true);
    expect(validatePassword("1234567")).toBe(false);
    expect(validatePassword("")).toBe(false);
  });
  it("caps at 128 chars", () => {
    expect(validatePassword("a".repeat(128))).toBe(true);
    expect(validatePassword("a".repeat(129))).toBe(false);
  });
});

describe("validateName", () => {
  it("trims and checks length 2~30", () => {
    expect(validateName("홍길동")).toBe(true);
    expect(validateName("  AB  ")).toBe(true);
    expect(validateName("A")).toBe(false);
    expect(validateName(" ")).toBe(false);
    expect(validateName("a".repeat(31))).toBe(false);
  });
});

describe("validatePhone", () => {
  it("accepts common formats", () => {
    expect(validatePhone("010-1234-5678")).toBe(true);
    expect(validatePhone("01012345678")).toBe(true);
    expect(validatePhone("+82 10 1234 5678")).toBe(true);
    expect(validatePhone("(02) 1234-5678")).toBe(true);
  });
  it("rejects non-digits and short strings", () => {
    expect(validatePhone("abc")).toBe(false);
    expect(validatePhone("123")).toBe(false);
    expect(validatePhone("")).toBe(false);
  });
});

describe("validateTime", () => {
  it("accepts HH:MM 24h format", () => {
    expect(validateTime("09:00")).toBe(true);
    expect(validateTime("00:00")).toBe(true);
    expect(validateTime("23:59")).toBe(true);
  });
  it("rejects invalid time", () => {
    expect(validateTime("24:00")).toBe(false);
    expect(validateTime("9:00")).toBe(false);  // not padded
    expect(validateTime("09:60")).toBe(false);
    expect(validateTime("invalid")).toBe(false);
  });
});

describe("isTimeBefore", () => {
  it("compares HH:MM as strings", () => {
    expect(isTimeBefore("09:00", "10:00")).toBe(true);
    expect(isTimeBefore("10:00", "10:00")).toBe(false);
    expect(isTimeBefore("11:00", "10:00")).toBe(false);
    expect(isTimeBefore("09:59", "10:00")).toBe(true);
  });
});
