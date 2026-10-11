import type { SmsPayload, SmsSendResult } from './types';
import { buildSmsBody, getDltTemplateId } from './templates';

export interface Fast2SmsConfig {
  apiKey?: string;
  senderId?: string;
  route?: 'q' | 'dlt';
}

export async function sendFast2Sms(
  payload: SmsPayload,
  config?: Fast2SmsConfig
): Promise<SmsSendResult> {
  const apiKey = config?.apiKey ?? process.env['FAST2SMS_API_KEY'];
  const route = config?.route ?? (process.env['SMS_ROUTE'] as 'q' | 'dlt' | undefined) ?? 'q';
  const senderId = config?.senderId ?? process.env['FAST2SMS_SENDER_ID'] ?? 'AUTMIT';

  const cleanPhone = payload.toPhone.replace(/\D/g, '').slice(-10);
  const messageBody = buildSmsBody(payload);

  // If no API key configured, use simulated mock delivery
  if (!apiKey) {
    const mockMsgId = `f2s_mock_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    return {
      success: true,
      provider: 'mock',
      messageId: mockMsgId,
      deliveryStatus: 'sent',
    };
  }

  try {
    const dltTemplateId = getDltTemplateId(payload.kind);

    const headers: Record<string, string> = {
      authorization: apiKey,
      'Content-Type': 'application/json',
    };

    let bodyData: Record<string, unknown>;

    if (route === 'dlt' && dltTemplateId) {
      bodyData = {
        route: 'dlt',
        sender_id: senderId,
        message: [dltTemplateId],
        variables_values: `${payload.senderName}|${payload.amount}`,
        flash: 0,
        numbers: cleanPhone,
      };
    } else {
      // Quick SMS route (route=q) - doesn't require DLT template ID
      bodyData = {
        route: 'q',
        message: messageBody,
        language: payload.lang === 'en' ? 'english' : 'unicode',
        flash: 0,
        numbers: cleanPhone,
      };
    }

    const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers,
      body: JSON.stringify(bodyData),
    });

    const json = (await response.json()) as {
      return?: boolean;
      request_id?: string;
      message?: string[];
    };

    if (json.return) {
      return {
        success: true,
        provider: 'fast2sms',
        messageId: json.request_id || `f2s_${Date.now()}`,
        deliveryStatus: 'sent',
      };
    } else {
      return {
        success: false,
        provider: 'fast2sms',
        error: Array.isArray(json.message) ? json.message.join('; ') : 'Fast2SMS dispatch failed',
        deliveryStatus: 'failed',
      };
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      provider: 'fast2sms',
      error: errorMsg,
      deliveryStatus: 'failed',
    };
  }
}
