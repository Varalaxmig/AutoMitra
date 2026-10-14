import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendTelegramAlert } from '@/lib/sms/telegram';

describe('Telegram Notification Engine', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fails gracefully when botToken or chatId are not configured', async () => {
    const result = await sendTelegramAlert(
      {
        kind: 'claim',
        senderName: 'Test Commuter',
        amount: 50,
      },
      { botToken: '', chatId: '' }
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('not configured');
  });

  it('sends claim alert via Telegram Bot API when configured', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      json: async () => ({ ok: true, result: { message_id: 12345 } }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await sendTelegramAlert(
      {
        kind: 'claim',
        senderName: 'Rohit Sharma',
        amount: 85,
        token: '4827',
      },
      { botToken: 'mock_bot_token', chatId: '123456789' }
    );

    expect(result.success).toBe(true);
    expect(result.messageId).toBe(12345);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.telegram.org/botmock_bot_token/sendMessage',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('Rohit Sharma'),
      })
    );
  });

  it('sends confirm and escalation alerts', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      json: async () => ({ ok: true, result: { message_id: 67890 } }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const confirmRes = await sendTelegramAlert(
      {
        kind: 'confirm',
        senderName: 'Priya',
        amount: 100,
        token: '9999',
      },
      { botToken: 'mock_token', chatId: '12345' }
    );
    expect(confirmRes.success).toBe(true);

    const escRes = await sendTelegramAlert(
      {
        kind: 'escalation',
        senderName: 'Priya',
        amount: 100,
        token: '9999',
      },
      { botToken: 'mock_token', chatId: '12345' }
    );
    expect(escRes.success).toBe(true);
  });

  it('returns failure when Telegram API returns ok: false', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      json: async () => ({ ok: false, description: 'Forbidden: bot was blocked by the user' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await sendTelegramAlert(
      {
        kind: 'claim',
        senderName: 'Karan',
        amount: 40,
      },
      { botToken: 'mock_token', chatId: '12345' }
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('Forbidden');
  });
});
