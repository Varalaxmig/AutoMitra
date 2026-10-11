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
  const { kind, senderName, amount, otpCode, lang = 'hi' } = payload;

  if (kind === 'otp') {
    return `AutoMitra OTP: ${otpCode || '0000'}`;
  }

  const amtFormatted = typeof amount === 'number' ? amount.toFixed(0) : amount;
  const name = senderName || 'Passenger';

  if (lang === 'mr') {
    const statusText =
      kind === 'claim' ? 'प्रलंबित (Pending)' : kind === 'confirm' ? 'यशस्वी (Success)' : 'अयशस्वी (Failed)';
    return `Sender's name: ${name}\nAmount: Rs.${amtFormatted}\nStatus: ${statusText}`;
  }

  if (lang === 'hi') {
    const statusText =
      kind === 'claim' ? 'लंबित (Pending)' : kind === 'confirm' ? 'सफल (Success)' : 'विफल (Failed)';
    return `Sender's name: ${name}\nAmount: Rs.${amtFormatted}\nStatus: ${statusText}`;
  }

  const statusText =
    kind === 'claim' ? 'Pending' : kind === 'confirm' ? 'Success' : 'Failed';

  return `Sender's name: ${name}\nAmount: Rs.${amtFormatted}\nStatus: ${statusText}`;
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
