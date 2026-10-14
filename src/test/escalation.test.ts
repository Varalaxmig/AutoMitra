import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  checkSessionEscalation,
  getEscalationStatus,
  clearEscalationTracking,
} from '@/lib/sms/escalation';
import type { Session, Driver } from '@/lib/store';

describe('SMS Escalation Engine (TASK-20 / automitra.md)', () => {
  const mockDriver: Driver = {
    slug: 'TESTSLUG',
    firstName: 'Ramesh',
    vehicle: 'MH02AB1234',
    driverPhone: '9820012345',
    proxyPhone: '9930054321',
    vpa: 'ramesh@upi',
    lang: 'hi',
    active: true,
  };

  beforeEach(() => {
    clearEscalationTracking();
  });

  it('ignores sessions that are not in claimed status', async () => {
    const onT20 = vi.fn();
    const onT120 = vi.fn();

    const handedOffSession: Session = {
      id: 'sess-1',
      slug: 'TESTSLUG',
      token: '1234',
      amount: 45,
      senderName: 'Amit',
      status: 'handed_off',
      createdAt: Date.now() - 30 * 1000,
    };

    const result = await checkSessionEscalation(handedOffSession, mockDriver, onT20, onT120);
    expect(result).toBeNull();
    expect(onT20).not.toHaveBeenCalled();
    expect(onT120).not.toHaveBeenCalled();
    expect(getEscalationStatus('sess-1')).toBeUndefined();
  });

  it('does not fire reminders when elapsed time is under 20 seconds', async () => {
    const onT20 = vi.fn();
    const onT120 = vi.fn();

    const session: Session = {
      id: 'sess-2',
      slug: 'TESTSLUG',
      token: '2345',
      amount: 50,
      senderName: 'Rohit',
      status: 'claimed',
      createdAt: Date.now() - 15 * 1000,
      claimedAt: Date.now() - 10 * 1000, // 10s elapsed
    };

    const result = await checkSessionEscalation(session, mockDriver, onT20, onT120);
    expect(result).not.toBeNull();
    expect(result?.t20Pinged).toBe(false);
    expect(result?.t120Escalated).toBe(false);
    expect(onT20).not.toHaveBeenCalled();
    expect(onT120).not.toHaveBeenCalled();
  });

  it('triggers onT20Ping when elapsed time reaches 20 seconds', async () => {
    const onT20 = vi.fn();
    const onT120 = vi.fn();

    const session: Session = {
      id: 'sess-3',
      slug: 'TESTSLUG',
      token: '3456',
      amount: 85,
      senderName: 'Sneha',
      status: 'claimed',
      createdAt: Date.now() - 25 * 1000,
      claimedAt: Date.now() - 21 * 1000, // 21s elapsed
    };

    const result = await checkSessionEscalation(session, mockDriver, onT20, onT120);
    expect(result?.t20Pinged).toBe(true);
    expect(result?.t120Escalated).toBe(false);
    expect(onT20).toHaveBeenCalledTimes(1);
    expect(onT20).toHaveBeenCalledWith(session);
    expect(onT120).not.toHaveBeenCalled();

    // Calling again does not re-trigger onT20Ping
    await checkSessionEscalation(session, mockDriver, onT20, onT120);
    expect(onT20).toHaveBeenCalledTimes(1);
  });

  it('triggers onT120Escalate and sends backup proxy SMS when elapsed time reaches 120 seconds', async () => {
    const onT20 = vi.fn();
    const onT120 = vi.fn();

    const session: Session = {
      id: 'sess-4',
      slug: 'TESTSLUG',
      token: '4567',
      amount: 110,
      senderName: 'Karan',
      status: 'claimed',
      createdAt: Date.now() - 130 * 1000,
      claimedAt: Date.now() - 125 * 1000, // 125s elapsed
    };

    const result = await checkSessionEscalation(session, mockDriver, onT20, onT120);
    expect(result?.t20Pinged).toBe(true);
    expect(result?.t120Escalated).toBe(true);
    expect(onT20).toHaveBeenCalledTimes(1);
    expect(onT120).toHaveBeenCalledTimes(1);
    expect(onT120).toHaveBeenCalledWith(session);

    // Calling again does not re-trigger
    await checkSessionEscalation(session, mockDriver, onT20, onT120);
    expect(onT120).toHaveBeenCalledTimes(1);
  });

  it('clearEscalationTracking resets the tracked status', async () => {
    const session: Session = {
      id: 'sess-5',
      slug: 'TESTSLUG',
      token: '5678',
      amount: 90,
      senderName: 'Vikas',
      status: 'claimed',
      createdAt: Date.now() - 30 * 1000,
      claimedAt: Date.now() - 25 * 1000,
    };

    await checkSessionEscalation(session, mockDriver);
    expect(getEscalationStatus('sess-5')?.t20Pinged).toBe(true);

    clearEscalationTracking();
    expect(getEscalationStatus('sess-5')).toBeUndefined();
  });
});
