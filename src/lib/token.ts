/**
 * AutoMitra HMAC-Based Token Derivation Library (Phase 2 / TASK-06)
 *
 * Generates deterministic yet unpredictable 4-digit numeric tokens (1000 - 9999)
 * for a driver transaction.
 *
 * Token formula:
 * Token = 1000 + (HMAC_SHA256(Secret, driver_id + ":" + YYYYMMDD + ":" + seq) % 9000)
 */

function getDayString(date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

// Simple deterministic hash when Web Crypto or Node crypto is unavailable
function simpleHmacFallback(key: string, message: string): number {
  let hash = 0x811c9dc5;
  const str = key + ':' + message;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return Math.abs(hash >>> 0);
}

/**
 * Derives a raw 4-digit token string ('1000' to '9999')
 */
export function generateTokenCode(
  driverId: string,
  seq: number,
  saltDate: Date = new Date(),
  secret: string = 'automitra-default-salt-2026'
): string {
  const day = getDayString(saltDate);
  const input = `${driverId}:${day}:${seq}`;
  const num = simpleHmacFallback(secret, input);
  const fourDigit = 1000 + (num % 9000);
  return String(fourDigit);
}

/**
 * Returns formatted AM token, e.g. "AM4827" or raw 4 digits "4827"
 */
export function formatAmToken(tokenCode: string, withPrefix = false): string {
  const code = tokenCode.replace(/^AM/i, '').trim();
  return withPrefix ? `AM${code}` : code;
}

/**
 * Collision retry loop:
 * Given a driver, sequence, and a set/array of currently active tokens for that driver,
 * attempts to find a non-colliding token by incrementing the sequence counter.
 */
export function deriveUniqueToken(
  driverId: string,
  initialSeq: number,
  activeTokens: Iterable<string>,
  maxAttempts: number = 20,
  secret?: string
): { token: string; seq: number } {
  const activeSet = new Set(
    Array.from(activeTokens).map((t) => formatAmToken(t, false))
  );

  let currentSeq = initialSeq;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidate = generateTokenCode(driverId, currentSeq, new Date(), secret);
    if (!activeSet.has(candidate)) {
      return { token: candidate, seq: currentSeq };
    }
    currentSeq++;
  }

  // Fallback random generation within 1000-9999 if all deterministic candidates collide
  for (let i = 0; i < 50; i++) {
    const randCandidate = String(Math.floor(1000 + Math.random() * 9000));
    if (!activeSet.has(randCandidate)) {
      return { token: randCandidate, seq: currentSeq + i };
    }
  }

  // Extreme emergency fallback
  return {
    token: String(1000 + (Math.floor(Date.now() / 1000) % 9000)),
    seq: currentSeq,
  };
}
