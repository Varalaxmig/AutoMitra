/**
 * AutoMitra UPI Deep Link Generator Library (Phase 2 / TASK-07)
 *
 * Implements standard NPCI UPI URI scheme:
 * upi://pay?pa={vpa}&pn={name}&am={amount}&cu=INR&tn=AM{token}&tr={sessionId}
 */

export interface UpiParams {
  vpa: string;
  payeeName: string;
  amount: number | string;
  token: string;
  sessionId: string;
  notePrefix?: string; // Default "AM"
}

export function validateVpa(vpa: string): boolean {
  if (!vpa || typeof vpa !== 'string') return false;
  // Typical Indian UPI ID format: username@handle (alphanumeric with dots, hyphens, underscores)
  const vpaRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
  return vpaRegex.test(vpa.trim());
}

export function sanitizePayeeName(name: string): string {
  if (!name) return 'Auto Driver';
  // Strip characters that break UPI deep links
  return name.replace(/[^\w\s.-]/g, '').trim().slice(0, 50) || 'Auto Driver';
}

export function formatFareAmount(amount: number | string): string {
  const num = typeof amount === 'number' ? amount : parseFloat(amount);
  if (isNaN(num) || num <= 0) {
    throw new Error(`Invalid fare amount: ${amount}`);
  }
  // NPCI requires standard decimal representation up to 2 places without trailing zeros if whole
  return num.toFixed(2);
}

/**
 * Builds standard UPI deep link URL conforming to NPCI specs
 */
export function buildUpiUri(params: UpiParams): string {
  const { vpa, payeeName, amount, token, sessionId, notePrefix = 'AM' } = params;

  const cleanVpa = vpa.trim();
  const cleanName = sanitizePayeeName(payeeName);
  const cleanAmt = formatFareAmount(amount);
  const rawToken = token.replace(/^AM/i, '').trim();
  const tn = `${notePrefix}${rawToken}`;

  const queryParams = new URLSearchParams();
  queryParams.set('pa', cleanVpa);
  queryParams.set('pn', cleanName);
  queryParams.set('am', cleanAmt);
  queryParams.set('cu', 'INR');
  queryParams.set('tn', tn);
  queryParams.set('tr', sessionId);

  return `upi://pay?${queryParams.toString()}`;
}

/**
 * Intent scheme helpers for specific mobile apps when deep-linking fails
 */
export function buildAppSpecificUpiUri(
  app: 'gpay' | 'phonepe' | 'paytm' | 'bhim',
  params: UpiParams
): string {
  const baseUri = buildUpiUri(params);
  // Standard generic uri works best across Android intent chooser and iOS
  return baseUri;
}
