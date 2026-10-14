export * from './types';
export * from './templates';
export * from './circuit-breaker';
export * from './escalation';
export * from './telegram';
export * from './mock';
export * from './textbee';
export * from './quota';

import { sendTextBeeSms } from './textbee';
import { sendMockSms } from './mock';
import { recordSmsFailure, recordSmsSuccess } from './circuit-breaker';
import { checkSmsDispatchAllowed, incrementDispatchedCount } from './quota';
import type { SmsPayload, SmsSendResult } from './types';

/**
 * Universal SMS Gateway Dispatcher
 * - Enforces allowed phone number whitelist (e.g. 2-3 test numbers)
 * - Enforces per-number max quota (e.g. 50-60 SMS)
 * - Dispatches via TextBee if TEXTBEE_API_KEY is configured (100% free Android gateway)
 * - Gracefully falls back to mock simulation
 */
export async function sendSms(payload: SmsPayload): Promise<SmsSendResult> {
  // Check whitelist & 50-60 SMS quota
  const guard = checkSmsDispatchAllowed(payload.toPhone);
  if (!guard.allowed) {
    return {
      success: false,
      provider: 'mock',
      error: guard.reason,
      deliveryStatus: 'failed',
    };
  }

  // Check TextBee (Free Android Gateway route)
  const textBeeKey =
    (typeof process !== 'undefined' && process.env ? process.env['TEXTBEE_API_KEY'] : undefined) ||
    (typeof import.meta !== 'undefined' && import.meta.env
      ? (import.meta.env['VITE_TEXTBEE_API_KEY'] as string | undefined)
      : undefined);

  if (textBeeKey) {
    const res = await sendTextBeeSms(payload);
    if (res.success) {
      incrementDispatchedCount(payload.toPhone);
      recordSmsSuccess();
      return res;
    }
    recordSmsFailure();
    return res;
  }

  // Fallback to mock simulation
  const mockRes = await sendMockSms(payload);
  incrementDispatchedCount(payload.toPhone);
  return mockRes;
}

