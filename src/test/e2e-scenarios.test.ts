import { describe, it, expect, beforeEach } from 'vitest';
import {
  initiate,
  claim,
  confirm,
  reject,
  cancel,
  expireSweep,
  addDriver,
  getState,
  resetStoreForTesting,
} from '@/lib/store';
import { deriveUniqueToken } from '@/lib/token';

describe('AutoMitra State Machine & Field Verification (TASK-28 / Tests E1-E6, E9)', () => {
  beforeEach(() => {
    resetStoreForTesting();
  });

  // Test E1: Happy path (Initiate -> Hand off -> Claim -> Confirm -> SMS #2)
  it('E1: Happy path completes full transit cycle with claim and confirm SMS', () => {
    const slug = 'K7M2QX9A';
    const initialSmsCount = getState().sms.length;

    // 1. Commuter initiates fare
    const session = initiate(slug, 75, 'Rohit Sharma');
    expect(session.status).toBe('handed_off');
    expect(session.amount).toBe(75);
    expect(session.token).toMatch(/^\d{4}$/);

    // 2. Commuter returns and claims "I Have Paid" -> SMS #1 (claim)
    claim(session.id);
    const claimedSession = getState().sessions.find((s) => s.id === session.id);
    expect(claimedSession?.status).toBe('claimed');
    expect(claimedSession?.claimedAt).toBeDefined();

    const smsAfterClaim = getState().sms;
    expect(smsAfterClaim.length).toBe(initialSmsCount + 1);
    const claimSms = smsAfterClaim[0]!; // Newest SMS is at index 0
    expect(claimSms.kind).toBe('claim');
    expect(claimSms.body).toContain("From AutoMitra");
    expect(claimSms.body).toContain("Rohit Sharma");
    expect(claimSms.body).toContain('75');

    // 3. Proxy confirms fare on console -> SMS #2 (confirm)
    confirm(session.id);
    const finalSession = getState().sessions.find((s) => s.id === session.id);
    expect(finalSession?.status).toBe('confirmed');

    const smsAfterConfirm = getState().sms;
    expect(smsAfterConfirm.length).toBe(initialSmsCount + 2);
    const confirmSms = smsAfterConfirm[0]!; // Newest SMS is at index 0
    expect(confirmSms.kind).toBe('confirm');
    expect(confirmSms.body).toContain("From AutoMitra");
    expect(confirmSms.body).toContain("Rohit Sharma");
    expect(confirmSms.body).toContain("Successful");
  });

  // Test E2: Driver / Proxy rejection (Claim -> Reject -> VOID SMS)
  it('E2: Rejection dispatches VOID SMS with status failed', () => {
    const slug = 'K7M2QX9A';
    const session = initiate(slug, 120, 'Unknown Passenger');
    claim(session.id);

    // Proxy checks bank and sees NO credit -> Rejects
    reject(session.id);

    const updated = getState().sessions.find((s) => s.id === session.id);
    expect(updated?.status).toBe('rejected');
    expect(updated?.resolvedAt).toBeDefined();

    const lastSms = getState().sms[0]!; // Newest SMS is at index 0
    expect(lastSms.kind).toBe('void');
    expect(lastSms.body).toContain('Status:');
  });

  // Test E3: Fare amount adjustment by proxy
  it('E3: Proxy adjusts credited amount before confirming', () => {
    const slug = 'K7M2QX9A';
    const session = initiate(slug, 150, 'Priya S');
    claim(session.id);

    // Proxy noticed ₹140 was actually credited instead of ₹150
    confirm(session.id, 140);

    const updated = getState().sessions.find((s) => s.id === session.id);
    expect(updated?.status).toBe('confirmed');
    expect(updated?.amount).toBe(150);
    expect(updated?.creditedAmount).toBe(140);

    const lastSms = getState().sms[0]!; // Newest SMS is at index 0
    expect(lastSms.kind).toBe('confirm');
    expect(lastSms.body).toContain('140');
  });

  // Test E4: Duplicate token collision avoidance
  it('E4: Token derivation avoids collision with currently active tokens', () => {
    const driverId = 'driver_collision_test';
    const activeTokens = new Set(['1234', '5678', '9999']);

    const { token } = deriveUniqueToken(driverId, 0, activeTokens);
    expect(activeTokens.has(token)).toBe(false);
    expect(token).toMatch(/^[1-9]\d{3}$/);
  });

  // Test E5: Commuter cancellation before claim
  it('E5: Commuter can cancel session before claim without dispatching SMS', () => {
    const slug = 'K7M2QX9A';
    const initialSmsCount = getState().sms.length;

    const session = initiate(slug, 50, 'Cash Payer');
    expect(session.status).toBe('handed_off');

    cancel(session.id);

    const updated = getState().sessions.find((s) => s.id === session.id);
    expect(updated?.status).toBe('cancelled');
    // No claim or confirm SMS was sent
    expect(getState().sms.length).toBe(initialSmsCount);
  });

  // Test E6: Session expiry at 10 minutes
  it('E6: Stale sessions expire after 10-minute TTL', () => {
    const slug = 'K7M2QX9A';
    const session = initiate(slug, 60, 'Stale User');

    // Artificially age the session past 10 minutes
    const elevenMinutesAgo = Date.now() - 11 * 60 * 1000;
    session.createdAt = elevenMinutesAgo;

    expireSweep();

    const expired = getState().sessions.find((s) => s.id === session.id);
    expect(expired?.status).toBe('expired');
  });

  // Test E9: Multi-driver proxy isolation
  it('E9: Multi-driver proxy isolates session queues per vehicle slug', () => {
    // Add second auto
    addDriver({
      firstName: 'Suresh',
      vehicle: 'MH02CD5678',
      driverPhone: '9820055555',
      proxyPhone: '9930054321',
      vpa: 'sneha.patil@okaxis',
      lang: 'mr',
    });

    const drivers = getState().drivers;
    const driver1 = drivers[0]!;
    const driver2 = drivers[1]!;

    const s1 = initiate(driver1.slug, 40, 'Pass A');
    const s2 = initiate(driver2.slug, 80, 'Pass B');

    expect(s1.slug).toBe(driver1.slug);
    expect(s2.slug).toBe(driver2.slug);

    // Verify isolation in state
    const d1Sessions = getState().sessions.filter((s) => s.slug === driver1.slug);
    const d2Sessions = getState().sessions.filter((s) => s.slug === driver2.slug);

    expect(d1Sessions.some((s) => s.id === s1.id)).toBe(true);
    expect(d1Sessions.some((s) => s.id === s2.id)).toBe(false);
    expect(d2Sessions.some((s) => s.id === s2.id)).toBe(true);
  });
});
