/**
 * AutoMitra SMS Quota & Whitelist Guard
 *
 * 1. Restricts dispatch to an approved whitelist of 2-3 phone numbers (if configured).
 * 2. Enforces a maximum cap (default 50-60 SMS) per phone number to prevent credit exhaustion.
 */

const phoneDispatchCounts = new Map<string, number>();

export function getDispatchedCount(phone: string): number {
  const clean = phone.replace(/\D/g, '').slice(-10);
  return phoneDispatchCounts.get(clean) || 0;
}

export function incrementDispatchedCount(phone: string): number {
  const clean = phone.replace(/\D/g, '').slice(-10);
  const next = (phoneDispatchCounts.get(clean) || 0) + 1;
  phoneDispatchCounts.set(clean, next);
  return next;
}

export function resetPhoneQuota(phone?: string): void {
  if (phone) {
    phoneDispatchCounts.delete(phone.replace(/\D/g, '').slice(-10));
  } else {
    phoneDispatchCounts.clear();
  }
}

export function checkSmsDispatchAllowed(phone: string): {
  allowed: boolean;
  reason?: string;
  currentCount: number;
  maxLimit: number;
} {
  const clean = phone.replace(/\D/g, '').slice(-10);
  const currentCount = phoneDispatchCounts.get(clean) || 0;

  // 1. Whitelist check (if ALLOWED_PHONE_NUMBERS is configured)
  const allowedEnv =
    (typeof process !== 'undefined' && process.env ? process.env['ALLOWED_PHONE_NUMBERS'] : undefined) ||
    (typeof import.meta !== 'undefined' && import.meta.env
      ? (import.meta.env['VITE_ALLOWED_PHONE_NUMBERS'] as string | undefined)
      : undefined);

  if (allowedEnv && allowedEnv.trim()) {
    const list = allowedEnv
      .split(',')
      .map((p) => p.replace(/\D/g, '').slice(-10))
      .filter(Boolean);

    if (list.length > 0 && !list.includes(clean)) {
      return {
        allowed: false,
        reason: `Phone number ${clean} is not in the whitelist: [${list.join(', ')}]`,
        currentCount,
        maxLimit: 50,
      };
    }
  }

  // 2. Max SMS limit check (configurable via MAX_SMS_PER_PHONE, default 50)
  const maxEnv =
    (typeof process !== 'undefined' && process.env ? process.env['MAX_SMS_PER_PHONE'] : undefined) ||
    (typeof import.meta !== 'undefined' && import.meta.env
      ? (import.meta.env['VITE_MAX_SMS_PER_PHONE'] as string | undefined)
      : undefined);
  const maxLimit = maxEnv ? parseInt(maxEnv, 10) || 50 : 50;

  if (currentCount >= maxLimit) {
    return {
      allowed: false,
      reason: `SMS quota limit of ${maxLimit} reached for ${clean} (${currentCount}/${maxLimit} sent). Dispatch stopped to prevent waste.`,
      currentCount,
      maxLimit,
    };
  }

  return {
    allowed: true,
    currentCount,
    maxLimit,
  };
}
