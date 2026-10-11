import { describe, it, expect } from 'vitest';
import {
  buildUpiUri,
  validateVpa,
  sanitizePayeeName,
  formatFareAmount,
} from '@/lib/upi';

describe('UPI Deep Link Generator (TASK-07 / TASK-08)', () => {
  it('validates correct UPI VPAs', () => {
    expect(validateVpa('sneha.patil@okaxis')).toBe(true);
    expect(validateVpa('ramesh98@ybl')).toBe(true);
    expect(validateVpa('driver@paytm')).toBe(true);
    expect(validateVpa('invalid-vpa')).toBe(false);
    expect(validateVpa('')).toBe(false);
  });

  it('sanitizes payee names properly', () => {
    expect(sanitizePayeeName('Ramesh Kumar')).toBe('Ramesh Kumar');
    expect(sanitizePayeeName('Ramesh & Sons <script>')).toBe('Ramesh  Sons script');
  });

  it('formats amounts to standard 2-decimal places', () => {
    expect(formatFareAmount(45)).toBe('45.00');
    expect(formatFareAmount('120.5')).toBe('120.50');
    expect(() => formatFareAmount(0)).toThrow();
    expect(() => formatFareAmount(-10)).toThrow();
  });

  it('builds compliant NPCI URI with all required query parameters', () => {
    const uri = buildUpiUri({
      vpa: 'sneha.patil@okaxis',
      payeeName: 'Ramesh Patel',
      amount: 65,
      token: '4827',
      sessionId: 'sess_12345',
    });

    expect(uri.startsWith('upi://pay?')).toBe(true);
    const url = new URL(uri);
    expect(url.searchParams.get('pa')).toBe('sneha.patil@okaxis');
    expect(url.searchParams.get('pn')).toBe('Ramesh Patel');
    expect(url.searchParams.get('am')).toBe('65.00');
    expect(url.searchParams.get('cu')).toBe('INR');
    expect(url.searchParams.get('tn')).toBe('AM4827');
    expect(url.searchParams.get('tr')).toBe('sess_12345');
  });

  it('handles existing AM prefix in token without duplicating', () => {
    const uri = buildUpiUri({
      vpa: 'driver@upi',
      payeeName: 'Driver',
      amount: 100,
      token: 'AM9999',
      sessionId: 'sess_999',
    });
    const url = new URL(uri);
    expect(url.searchParams.get('tn')).toBe('AM9999');
  });
});
