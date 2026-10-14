import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildSmsBody,
  sendMockSms,
  isTwilioFallbackAllowed,
  recordSmsFailure,
  recordSmsSuccess,
  isCircuitOpen,
  resetCircuitBreaker,
} from '@/lib/sms';

describe('SMS Module & Gateway Engine (Phase 4)', () => {
  beforeEach(() => {
    resetCircuitBreaker();
  });

  describe('Standard SMS Formats (TASK-19)', () => {
    it('formats claim SMS with exact format in English', () => {
      const body = buildSmsBody({
        toPhone: '9820012345',
        kind: 'claim',
        senderName: 'Aditi Roy',
        amount: 85,
        lang: 'en',
      });
      expect(body).toBe("From AutoMitra\nUPI ID: Aditi Roy\nAmount: Rs.85\nTransaction Status: Pending");
    });

    it('formats confirm SMS in Hindi', () => {
      const body = buildSmsBody({
        toPhone: '9820012345',
        kind: 'confirm',
        senderName: 'Aditi Roy',
        amount: 85,
        lang: 'hi',
      });
      expect(body).toBe("From AutoMitra\nUPI ID: Aditi Roy\nAmount: Rs.85\nTransaction Status: सफल (Successful)");
    });

    it('formats void SMS in Marathi', () => {
      const body = buildSmsBody({
        toPhone: '9820012345',
        kind: 'void',
        senderName: 'Aditi Roy',
        amount: 85,
        lang: 'mr',
      });
      expect(body).toBe("From AutoMitra\nUPI ID: Aditi Roy\nAmount: Rs.85\nTransaction Status: अयशस्वी (Failed)");
    });

    it('formats OTP challenge message', () => {
      const body = buildSmsBody({
        toPhone: '9820012345',
        kind: 'otp',
        senderName: '',
        amount: 0,
        otpCode: '4821',
      });
      expect(body).toBe('AutoMitra OTP: 4821');
    });
  });

  describe('Circuit Breaker & Fallback (TASK-21 / BUG-03)', () => {
    it('trips circuit open after 3 consecutive failures', () => {
      expect(isCircuitOpen()).toBe(false);
      recordSmsFailure();
      expect(isCircuitOpen()).toBe(false);
      recordSmsFailure();
      expect(isCircuitOpen()).toBe(false);
      recordSmsFailure();
      expect(isCircuitOpen()).toBe(true);
    });

    it('resets circuit when success is recorded', () => {
      recordSmsFailure();
      recordSmsFailure();
      recordSmsFailure();
      expect(isCircuitOpen()).toBe(true);

      recordSmsSuccess();
      expect(isCircuitOpen()).toBe(false);
    });

    it('BUG-03: Blocks Twilio fallback for Indian domestic numbers (+91) before DLT approval', () => {
      // 10-digit Indian mobile
      expect(isTwilioFallbackAllowed('9820012345', false)).toBe(false);
      // With +91 prefix
      expect(isTwilioFallbackAllowed('+919820012345', false)).toBe(false);
      // With international number (e.g. US)
      expect(isTwilioFallbackAllowed('+14155552671', false)).toBe(true);
      // Once DLT is approved
      expect(isTwilioFallbackAllowed('9820012345', true)).toBe(true);
    });
  });

  describe('Mock SMS Dispatch (TASK-17)', () => {
    it('dispatches mock SMS with sent status', async () => {
      const res = await sendMockSms({
        toPhone: '9820012345',
        kind: 'claim',
        senderName: 'Test Commuter',
        amount: 50,
      });
      expect(res.success).toBe(true);
      expect(res.provider).toBe('mock');
      expect(res.deliveryStatus).toBe('sent');
      expect(res.messageId).toBeDefined();
    });
  });
});
