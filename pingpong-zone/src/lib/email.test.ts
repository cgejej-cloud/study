import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("email helpers", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });
  afterEach(() => {
    logSpy.mockRestore();
  });

  it("sendEmailIfEnabled silently skips when user has no email", async () => {
    const { sendEmailIfEnabled } = await import("./email");
    await sendEmailIfEnabled(null, "test", "<p>body</p>");
    await sendEmailIfEnabled(undefined, "test", "<p>body</p>");
    await sendEmailIfEnabled({ email: null, emailNotify: true }, "test", "<p>body</p>");
    expect(logSpy).not.toHaveBeenCalled();
  });

  it("sendEmailIfEnabled silently skips when emailNotify is false", async () => {
    const { sendEmailIfEnabled } = await import("./email");
    await sendEmailIfEnabled({ email: "user@example.com", emailNotify: false }, "test", "<p>body</p>");
    expect(logSpy).not.toHaveBeenCalled();
  });

  it("sendEmailIfEnabled logs (no SMTP) when user opted in", async () => {
    const { sendEmailIfEnabled } = await import("./email");
    await sendEmailIfEnabled({ email: "user@example.com", emailNotify: true }, "test subject", "<p>body</p>");
    expect(logSpy).toHaveBeenCalled();
    expect((logSpy.mock.calls[0][0] as string)).toContain("user@example.com");
  });
});
