import { buildSmsBody } from './templates';
import type { SmsPayload, SmsSendResult } from './types';

export interface TextBeeConfig {
  apiKey?: string;
  deviceId?: string;
}

/**
 * TextBee SMS Gateway Dispatcher
 *
 * Connects to your Android phone running the TextBee Gateway app
 * to deliver 100% free cellular GSM SMS to any 2G keypad phone
 * using your SIM card's daily SMS pack.
 *
 * Web API: https://api.textbee.dev/api/v1/gateway/send-sms
 */
export async function sendTextBeeSms(
  payload: SmsPayload,
  config?: TextBeeConfig
): Promise<SmsSendResult> {
  const apiKey =
    config?.apiKey ??
    (typeof process !== 'undefined' && process.env ? process.env['TEXTBEE_API_KEY'] : undefined) ??
    (typeof import.meta !== 'undefined' && import.meta.env
      ? (import.meta.env['VITE_TEXTBEE_API_KEY'] as string | undefined)
      : undefined);

  const deviceId =
    config?.deviceId ??
    (typeof process !== 'undefined' && process.env ? process.env['TEXTBEE_DEVICE_ID'] : undefined) ??
    (typeof import.meta !== 'undefined' && import.meta.env
      ? (import.meta.env['VITE_TEXTBEE_DEVICE_ID'] as string | undefined)
      : undefined);

  if (!apiKey) {
    return {
      success: false,
      provider: 'textbee',
      error: 'TEXTBEE_API_KEY not configured in .env.local',
      deliveryStatus: 'failed',
    };
  }

  // Format recipient to E.164 (+91XXXXXXXXXX)
  const digits = payload.toPhone.replace(/\D/g, '');
  let formattedRecipient = payload.toPhone.trim();
  if (digits.length === 10) {
    formattedRecipient = `+91${digits}`;
  } else if (digits.length === 12 && digits.startsWith('91')) {
    formattedRecipient = `+${digits}`;
  } else if (!formattedRecipient.startsWith('+')) {
    formattedRecipient = `+${digits}`;
  }

  const messageText = buildSmsBody(payload);

  try {
    const requestBody: Record<string, unknown> = {
      recipients: [formattedRecipient],
      message: messageText,
    };

    if (deviceId && deviceId.trim()) {
      requestBody['deviceId'] = deviceId.trim();
    }

    const res = await fetch('https://api.textbee.dev/api/v1/gateway/send-sms', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = (await res.json()) as {
      success?: boolean;
      smsBatchId?: string;
      message?: string;
    };

    if (res.ok && (data.success !== false || data.smsBatchId)) {
      return {
        success: true,
        provider: 'textbee',
        messageId: data.smsBatchId || `textbee_${Date.now()}`,
        deliveryStatus: 'sent',
      };
    }

    return {
      success: false,
      provider: 'textbee',
      error: data.message || `TextBee returned HTTP status ${res.status}`,
      deliveryStatus: 'failed',
    };
  } catch (err: unknown) {
    return {
      success: false,
      provider: 'textbee',
      error: err instanceof Error ? err.message : String(err),
      deliveryStatus: 'failed',
    };
  }
}
