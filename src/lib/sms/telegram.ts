export interface TelegramAlertOptions {
  kind: 'claim' | 'confirm' | 'void' | 'escalation' | 'otp';
  senderName: string;
  amount?: number;
  token?: string;
  phone?: string;
  driverName?: string;
  vehicle?: string;
}

export async function sendTelegramAlert(
  options: TelegramAlertOptions,
  config?: { botToken?: string; chatId?: string }
): Promise<{ success: boolean; messageId?: number; error?: string }> {
  const botToken =
    config?.botToken ??
    (typeof import.meta !== 'undefined' && import.meta.env
      ? (import.meta.env['VITE_TELEGRAM_BOT_TOKEN'] as string | undefined)
      : undefined) ??
    (typeof process !== 'undefined' && process.env
      ? (process.env['TELEGRAM_BOT_TOKEN'] || process.env['VITE_TELEGRAM_BOT_TOKEN'])
      : undefined);

  const chatId =
    config?.chatId ??
    (typeof import.meta !== 'undefined' && import.meta.env
      ? (import.meta.env['VITE_TELEGRAM_CHAT_ID'] as string | undefined)
      : undefined) ??
    (typeof process !== 'undefined' && process.env
      ? (process.env['TELEGRAM_CHAT_ID'] || process.env['VITE_TELEGRAM_CHAT_ID'])
      : undefined);

  if (!botToken || !chatId) {
    return { success: false, error: 'Telegram bot token or chat ID not configured' };
  }

  let text = '';
  if (options.kind === 'claim') {
    text =
      `🚖 *AutoMitra — Fare Claimed*\n\n` +
      `👤 *Passenger:* ${options.senderName || 'Commuter'}\n` +
      `💰 *Amount:* ₹${options.amount ?? 0}\n` +
      (options.token ? `🏷 *Token:* \`AM${options.token}\`\n` : '') +
      `📌 *Status:* ⏳ Pending Verification\n\n` +
      `_Check your UPI bank app to confirm credit._`;
  } else if (options.kind === 'confirm') {
    text =
      `✅ *AutoMitra — Fare Confirmed*\n\n` +
      `👤 *Passenger:* ${options.senderName || 'Commuter'}\n` +
      `💰 *Credited:* ₹${options.amount ?? 0}\n` +
      (options.token ? `🏷 *Token:* \`AM${options.token}\`\n` : '') +
      `📌 *Status:* ✅ Confirmed\n\n` +
      `_Driver 2G phone SMS dispatched._`;
  } else if (options.kind === 'void') {
    text =
      `❌ *AutoMitra — Fare Rejected / Failed*\n\n` +
      `👤 *Passenger:* ${options.senderName || 'Commuter'}\n` +
      `💰 *Amount:* ₹${options.amount ?? 0}\n` +
      `📌 *Status:* ❌ Rejected / Void\n\n` +
      `_No credit found in UPI account._`;
  } else if (options.kind === 'escalation') {
    text =
      `🚨 *AutoMitra — 2-Min URGENT Escalation*\n\n` +
      `👤 *Passenger:* ${options.senderName || 'Commuter'}\n` +
      `💰 *Amount:* ₹${options.amount ?? 0}\n` +
      (options.token ? `🏷 *Token:* \`AM${options.token}\`\n` : '') +
      `⚠️ *Action Needed:* Claimed fare waiting for 2 minutes without confirmation!\n` +
      `_Secondary family proxy alerted._`;
  } else if (options.kind === 'otp') {
    text = `🔐 *AutoMitra OTP Challenge:* \`${options.token}\``;
  }

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
      }),
    });

    const data = (await res.json()) as {
      ok: boolean;
      description?: string;
      result?: { message_id: number };
    };

    if (data.ok) {
      return { success: true, messageId: data.result?.message_id };
    }
    return { success: false, error: data.description || 'Telegram API returned an error' };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
