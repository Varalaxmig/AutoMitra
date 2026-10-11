/**
 * AutoMitra Circuit Breaker & Failover Engine (Phase 4 / TASK-21)
 *
 * Implements:
 * 1. 3 consecutive failure threshold before opening circuit.
 * 2. BUG-03 fix: Indian domestic numbers (+91 / 10 digits) are NEVER failed over
 *    to non-DLT Twilio plain text, preventing silent operator blackholing.
 */

export interface CircuitBreakerState {
  failureCount: number;
  isOpen: boolean;
  lastFailureTime: number | null;
  resetTimeoutMs: number;
}

const state: CircuitBreakerState = {
  failureCount: 0,
  isOpen: false,
  lastFailureTime: null,
  resetTimeoutMs: 60 * 1000, // 1 minute half-open cooldown
};

export function recordSmsSuccess(): void {
  state.failureCount = 0;
  state.isOpen = false;
  state.lastFailureTime = null;
}

export function recordSmsFailure(): boolean {
  state.failureCount++;
  state.lastFailureTime = Date.now();
  if (state.failureCount >= 3) {
    state.isOpen = true;
  }
  return state.isOpen;
}

export function isCircuitOpen(): boolean {
  if (!state.isOpen) return false;
  // Check if cooldown has elapsed (half-open test)
  if (state.lastFailureTime && Date.now() - state.lastFailureTime > state.resetTimeoutMs) {
    // Reset to half-open: allow next attempt
    state.isOpen = false;
    state.failureCount = 2; // one more failure trips it again
    return false;
  }
  return true;
}

export function getCircuitState(): Readonly<CircuitBreakerState> {
  return { ...state };
}

export function resetCircuitBreaker(): void {
  state.failureCount = 0;
  state.isOpen = false;
  state.lastFailureTime = null;
}

/**
 * BUG-03 Guard:
 * Check if Twilio fallback is allowed for the target number.
 * Telecom operators in India block non-DLT SMS by default for domestic numbers.
 */
export function isTwilioFallbackAllowed(phone: string, dltApproved = false): boolean {
  if (dltApproved) return true;
  const clean = phone.replace(/\D/g, '');
  // If it's a 10-digit Indian mobile or starts with 91 followed by 10 digits
  const isIndianNumber = clean.length === 10 || (clean.length === 12 && clean.startsWith('91'));
  if (isIndianNumber) {
    // BLOCKED until DLT registration approved
    return false;
  }
  return true;
}
