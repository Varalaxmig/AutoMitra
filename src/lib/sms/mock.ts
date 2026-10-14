import type { SmsPayload, SmsSendResult } from './types';

export async function sendMockSms(payload: SmsPayload): Promise<SmsSendResult> {
  const mockMsgId = `mock_sms_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  return {
    success: true,
    provider: 'mock',
    messageId: mockMsgId,
    deliveryStatus: 'sent',
  };
}
