import { describe, it, expect, beforeEach } from "vitest";
import { isRateLimited, recordFailedAttempt, clearFailedAttempts } from "@/lib/auth";

describe("Auth Brute-Force Rate Limiting (T14)", () => {
  const testEmail = "driver1@automitra.test";

  beforeEach(() => {
    clearFailedAttempts(testEmail);
  });

  it("should not be rate limited on first attempt", () => {
    expect(isRateLimited(testEmail)).toBe(false);
  });

  it("should allow up to 4 failed attempts without triggering rate limit", () => {
    for (let i = 0; i < 4; i++) {
      recordFailedAttempt(testEmail);
    }
    expect(isRateLimited(testEmail)).toBe(false);
  });

  it("should trigger rate limit after 5 failed attempts (T14)", () => {
    for (let i = 0; i < 5; i++) {
      recordFailedAttempt(testEmail);
    }
    expect(isRateLimited(testEmail)).toBe(true);
  });

  it("should reset rate limit when cleared on successful login", () => {
    for (let i = 0; i < 5; i++) {
      recordFailedAttempt(testEmail);
    }
    expect(isRateLimited(testEmail)).toBe(true);

    clearFailedAttempts(testEmail);
    expect(isRateLimited(testEmail)).toBe(false);
  });
});

describe("Test Credentials Compliance", () => {
  const testAccounts = [
    { email: "proxy1@automitra.test", password: "ProxyOne#2026-Test", role: "proxy" },
    { email: "proxy2@automitra.test", password: "ProxyTwo#2026-Test", role: "proxy" },
    { email: "driver1@automitra.test", password: "DriverOne#2026-Test", role: "driver" },
    { email: "driver2@automitra.test", password: "DriverTwo#2026-Test", role: "driver" },
  ];

  it("all test passwords must satisfy the 10-character minimum in auth spec", () => {
    testAccounts.forEach((acc) => {
      expect(acc.password.length).toBeGreaterThanOrEqual(10);
    });
  });

  it("all test emails must use the reserved .test domain", () => {
    testAccounts.forEach((acc) => {
      expect(acc.email).toMatch(/@automitra\.test$/);
    });
  });
});
