export type SmsKind = 'claim' | 'confirm' | 'void' | 'otp';
export type SmsRoute = 'q' | 'dlt';

export interface SmsPayload {
  toPhone: string;
  kind: SmsKind;
  senderName: string;
  senderUpi?: string;
  amount: number | string;
  sessionId?: string;
  otpCode?: string;
  lang?: 'en' | 'hi' | 'mr';
}

export interface SmsSendResult {
  success: boolean;
  messageId?: string;
  provider: 'telegram' | 'twilio' | 'mock' | 'fast2sms' | 'textbee';
  error?: string;
  deliveryStatus: 'queued' | 'sent' | 'failed';
}

export interface DlrReport {
  messageId: string;
  status: 'DELIVERED' | 'FAILED' | 'PENDING';
  deliveredAt?: string;
  reason?: string;
}
