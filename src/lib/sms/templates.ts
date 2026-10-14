import type { SmsKind, SmsPayload } from './types';

/**
 * Standard TRAI-compliant SMS bodies (TASK-19 / TASK-30)
 *
 * Strictly formatted:
 * Sender's name: {senderName}
 * Amount: {amount}
 * Status: {Pending | Success | Failed}
 */

export function buildSmsBody(payload: SmsPayload): string {
  const { kind, senderName, senderUpi, amount, otpCode, lang = 'en' } = payload;

  if (kind === 'otp') {
    return `AutoMitra OTP: ${otpCode || '0000'}`;
  }

  const upiId = senderUpi || senderName || 'commuter@upi';
  const amtFormatted = typeof amount === 'number' ? amount.toFixed(0) : amount;

  if (lang === 'mr') {
    const statusText =
      kind === 'confirm'
        ? 'यशस्वी (Successful)'
        : kind === 'claim'
          ? 'प्रलंबित (Pending)'
          : 'अयशस्वी (Failed)';
    return `From AutoMitra\nUPI ID: ${upiId}\nAmount: Rs.${amtFormatted}\nTransaction Status: ${statusText}`;
  }

  if (lang === 'hi') {
    const statusText =
      kind === 'confirm'
        ? 'सफल (Successful)'
        : kind === 'claim'
          ? 'लंबित (Pending)'
          : 'विफल (Failed)';
    return `From AutoMitra\nUPI ID: ${upiId}\nAmount: Rs.${amtFormatted}\nTransaction Status: ${statusText}`;
  }

  const statusText =
    kind === 'confirm' ? 'Successful' : kind === 'claim' ? 'Pending' : 'Failed';

  return `From AutoMitra\nUPI ID: ${upiId}\nAmount: Rs.${amtFormatted}\nTransaction Status: ${statusText}`;
}

export function getDltTemplateId(kind: SmsKind): string | undefined {
  switch (kind) {
    case 'otp':
      return process.env['DLT_OTP_TEMPLATE_ID'];
    case 'claim':
      return process.env['DLT_CLAIM_TEMPLATE_ID'];
    case 'confirm':
      return process.env['DLT_CONFIRM_TEMPLATE_ID'];
    case 'void':
      return process.env['DLT_VOID_TEMPLATE_ID'];
  }
}
