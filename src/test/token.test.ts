import { describe, it, expect } from 'vitest';
import { generateTokenCode, formatAmToken, deriveUniqueToken } from '@/lib/token';

describe('HMAC Token Derivation (TASK-06 / TASK-08)', () => {
  it('generates 4-digit token between 1000 and 9999', () => {
    for (let seq = 0; seq < 100; seq++) {
      const code = generateTokenCode('driver_ramesh_123', seq);
      expect(code).toMatch(/^[1-9]\d{3}$/);
      const num = parseInt(code, 10);
      expect(num).toBeGreaterThanOrEqual(1000);
      expect(num).toBeLessThanOrEqual(9999);
    }
  });

  it('generates deterministic tokens for identical inputs on the same day', () => {
    const today = new Date();
    const token1 = generateTokenCode('driver-abc', 42, today);
    const token2 = generateTokenCode('driver-abc', 42, today);
    expect(token1).toBe(token2);
  });

  it('formats AM token correctly', () => {
    expect(formatAmToken('4827', true)).toBe('AM4827');
    expect(formatAmToken('AM4827', true)).toBe('AM4827');
    expect(formatAmToken('AM4827', false)).toBe('4827');
  });

  it('resolves collisions by selecting non-colliding token', () => {
    const driverId = 'driver_collide_test';
    const firstCode = generateTokenCode(driverId, 0);

    // Pretend firstCode is active
    const active = new Set([firstCode]);
    const result = deriveUniqueToken(driverId, 0, active);

    expect(result.token).not.toBe(firstCode);
    expect(result.token).toMatch(/^[1-9]\d{3}$/);
  });

  it('distributes tokens across 4 digits uniformly without clustering', () => {
    const tokens = new Set<string>();
    for (let i = 0; i < 50; i++) {
      tokens.add(generateTokenCode('driver_test_dist', i));
    }
    // High entropy check - 50 distinct sequence numbers should generate mostly unique tokens
    expect(tokens.size).toBeGreaterThan(40);
  });
});
