/**
 * AutoMitra — Free Telegram Alert Dispatch Verification Script
 *
 * Usage:
 *   npx tsx scripts/test-telegram-dispatch.ts
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Load .env.local if present
const envLocalPath = resolve(process.cwd(), '.env.local');
if (existsSync(envLocalPath)) {
  const content = readFileSync(envLocalPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1]?.trim();
      const value = match[2]?.trim().replace(/^["']|["']$/g, '');
      if (key && value && !process.env[key]) {
        process.env[key] = value;
      }
    }
  }
}

const botToken = process.env.TELEGRAM_BOT_TOKEN || process.env.VITE_TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID || process.env.VITE_TELEGRAM_CHAT_ID;

console.log('='.repeat(60));
console.log('  AutoMitra — Free Telegram Push Alert Verification');
console.log('='.repeat(60));

if (!botToken || !chatId) {
  console.log('\n⚠️ Telegram Bot credentials not found in .env.local.\n');
  console.log('Follow these 2 quick steps to enable free real-time alerts on your phone:\n');
  console.log('1. On Telegram, message @BotFather -> send /newbot to create your bot.');
  console.log('   Copy the API Token (e.g. 7891234567:AAFnX...)\n');
  console.log('2. Open your new bot and tap "Start".');
  console.log('   Message @userinfobot to get your numeric Chat ID (e.g. 123456789)\n');
  console.log('3. Add them to your .env.local:');
  console.log('   TELEGRAM_BOT_TOKEN=your-bot-token');
  console.log('   TELEGRAM_CHAT_ID=your-chat-id\n');
  process.exit(0);
}

async function sendTest() {
  console.log(`\n🤖 Bot Token: ${botToken.slice(0, 10)}... (length: ${botToken.length})`);
  console.log(`💬 Chat ID: ${chatId}`);
  console.log('Sending test alert to Telegram...\n');

  const text =
    `🚖 *AutoMitra — Alert System Online*\n\n` +
    `✅ Your phone is now connected to AutoMitra!\n\n` +
    `👤 *Test Driver:* Ramesh (MH02AB1234)\n` +
    `💰 *Test Fare:* ₹1.00\n` +
    `🏷 *Token:* \`AM4827\`\n` +
    `📌 *Status:* Connected (Free Real-Time Alerts)\n\n` +
    `_Every fare claim, confirmation, and 2-minute escalation will buzz here directly._`;

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
      }),
    });

    const data = (await res.json()) as { ok: boolean; description?: string; result?: { message_id: number } };

    if (data.ok) {
      console.log('✅ SUCCESS: Telegram alert sent successfully!');
      console.log(`   Message ID: ${data.result?.message_id}`);
      console.log('   Check your Telegram app on your phone right now!\n');
    } else {
      console.log('❌ FAILED: Telegram API rejected the request.');
      console.log(`   Error: ${data.description}`);
      console.log('   Make sure you opened your bot in Telegram and tapped "Start" first.\n');
    }
  } catch (err: unknown) {
    console.error('❌ Network error:', err instanceof Error ? err.message : err);
  }
}

sendTest();
