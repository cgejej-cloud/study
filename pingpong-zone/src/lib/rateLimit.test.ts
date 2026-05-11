import { describe, it, expect, beforeEach } from "vitest";
import { rateLimit, resetRateLimit } from "./rateLimit";

describe("rateLimit", () => {
  beforeEach(() => {
    resetRateLimit("test:a");
    resetRateLimit("test:b");
  });

  it("allows up to max within window", () => {
    expect(rateLimit("test:a", 3, 1000).ok).toBe(true);
    expect(rateLimit("test:a", 3, 1000).ok).toBe(true);
    expect(rateLimit("test:a", 3, 1000).ok).toBe(true);
    const blocked = rateLimit("test:a", 3, 1000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });

  it("keys are isolated", () => {
    rateLimit("test:a", 1, 1000);
    expect(rateLimit("test:a", 1, 1000).ok).toBe(false);
    expect(rateLimit("test:b", 1, 1000).ok).toBe(true);
  });

  it("resets after window", async () => {
    expect(rateLimit("test:a", 1, 50).ok).toBe(true);
    expect(rateLimit("test:a", 1, 50).ok).toBe(false);
    await new Promise((r) => setTimeout(r, 60));
    expect(rateLimit("test:a", 1, 50).ok).toBe(true);
  });
});
