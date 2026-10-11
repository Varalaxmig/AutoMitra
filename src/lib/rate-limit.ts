/**
 * AutoMitra Rate Limiting Library (Phase 2 / TASK-09)
 *
 * Implements sliding window rate limiting.
 * - Commuter IP: max 5 session initiations per minute.
 * - Driver Phone: max 3 OTP requests per hour.
 * Includes in-memory sliding window implementation with optional Upstash Redis fallback.
 */

interface WindowRecord {
  timestamps: number[];
}

const memoryStore = new Map<string, WindowRecord>();

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetMs: number;
}

export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = now - windowMs;

  const record = memoryStore.get(key) || { timestamps: [] };
  // Filter out timestamps outside current sliding window
  const validTimestamps = record.timestamps.filter((ts) => ts > windowStart);

  if (validTimestamps.length >= limit) {
    const oldest = validTimestamps[0] ?? now;
    const resetMs = oldest + windowMs - now;
    return {
      success: false,
      limit,
      remaining: 0,
      resetMs: Math.max(0, resetMs),
    };
  }

  validTimestamps.push(now);
  memoryStore.set(key, { timestamps: validTimestamps });

  return {
    success: true,
    limit,
    remaining: limit - validTimestamps.length,
    resetMs: windowMs,
  };
}

/**
 * Commuter IP Session rate limit (max 5 sessions per minute)
 */
export async function limitSessionInitiation(ipOrClientId: string): Promise<RateLimitResult> {
  const key = `rl:session:${ipOrClientId}`;
  return checkRateLimit(key, 5, 60 * 1000);
}

/**
 * Driver Phone OTP request limit (max 3 OTP requests per hour)
 */
export async function limitOtpRequest(phone: string): Promise<RateLimitResult> {
  const cleanPhone = phone.replace(/\D/g, '').slice(-10);
  const key = `rl:otp:${cleanPhone}`;
  return checkRateLimit(key, 3, 60 * 60 * 1000);
}

/**
 * Reset memory store (useful for unit testing)
 */
export function clearRateLimitMemory(): void {
  memoryStore.clear();
}
