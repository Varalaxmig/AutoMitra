import { describe, it, expect, beforeEach } from 'vitest';
import {
  checkRateLimit,
  limitSessionInitiation,
  limitOtpRequest,
  clearRateLimitMemory,
} from '@/lib/rate-limit';

describe('Rate Limiter (TASK-09)', () => {
  beforeEach(() => {
    clearRateLimitMemory();
  });

  it('allows requests within limit and rejects once exceeded', async () => {
    const key = 'test-client';
    // Allow 3 requests in 1000ms
    const r1 = await checkRateLimit(key, 3, 1000);
    const r2 = await checkRateLimit(key, 3, 1000);
    const r3 = await checkRateLimit(key, 3, 1000);
    const r4 = await checkRateLimit(key, 3, 1000);

    expect(r1.success).toBe(true);
    expect(r1.remaining).toBe(2);
    expect(r2.success).toBe(true);
    expect(r3.success).toBe(true);
    expect(r4.success).toBe(false);
    expect(r4.remaining).toBe(0);
  });

  it('enforces 5 session initiations per minute for commuter', async () => {
    const ip = '192.168.1.100';
    for (let i = 0; i < 5; i++) {
      const res = await limitSessionInitiation(ip);
      expect(res.success).toBe(true);
    }
    const sixth = await limitSessionInitiation(ip);
    expect(sixth.success).toBe(false);
  });

  it('enforces 3 OTP requests per hour for driver phone', async () => {
    const phone = '9820012345';
    for (let i = 0; i < 3; i++) {
      const res = await limitOtpRequest(phone);
      expect(res.success).toBe(true);
    }
    const fourth = await limitOtpRequest(phone);
    expect(fourth.success).toBe(false);
  });
});
