/**
 * AutoMitra — TextBee Free Cellular SMS Dispatch Verification Script
 *
 * Usage:
 *   npx tsx scripts/test-textbee-dispatch.ts [10-digit-phone-number]
 *   npm run test:textbee [10-digit-phone-number]
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

const apiKey = process.env.TEXTBEE_API_KEY || process.env.VITE_TEXTBEE_API_KEY;
const deviceId = process.env.TEXTBEE_DEVICE_ID || process.env.VITE_TEXTBEE_DEVICE_ID;

const cliPhone = process.argv[2]?.replace(/\D/g, '').slice(-10);
const targetPhone =
  cliPhone ||
  (process.env.TEST_PHONE ? process.env.TEST_PHONE.replace(/\D/g, '').slice(-10) : undefined);

console.log('='.repeat(65));
console.log('  AutoMitra — TextBee 100% Free Cellular SMS Verification');
console.log('='.repeat(65));

if (!apiKey) {
  console.log('\n⚠️ TEXTBEE_API_KEY not found in .env.local.\n');
  console.log('To send 100% free cellular SMS using your phone’s daily SMS pack:\n');
  console.log('1. Go to https://textbee.dev and create a free account.');
  console.log('2. Download & install the free TextBee APK on your Android phone.');
  console.log('3. Open the TextBee app, log in, and grant SMS permissions.');
  console.log('4. Copy your "API Key" and "Device ID" from https://textbee.dev/dashboard/devices');
  console.log('5. Add them to your .env.local:');
  console.log('   TEXTBEE_API_KEY=your_textbee_api_key');
  console.log('   TEXTBEE_DEVICE_ID=your_device_id_here  (optional if single device)');
  console.log('   TEST_PHONE=your_10_digit_driver_phone\n');
  console.log('Then run this test again:');
  console.log('   npm run test:textbee <10-digit-phone>\n');
  process.exit(0);
}

if (!targetPhone || targetPhone.length !== 10) {
  console.log('\n⚠️ Please provide a valid 10-digit phone number to test.\n');
  console.log('Usage:');
  console.log('   npm run test:textbee 98XXXXXXXX\n');
  process.exit(1);
}

async function sendTextBeeTest() {
  const formattedRecipient = `+91${targetPhone}`;
  console.log(`\n🔑 TextBee API Key: ${apiKey.slice(0, 8)}... (Length: ${apiKey.length})`);
  if (deviceId) {
    console.log(`📱 Device ID: ${deviceId}`);
  }
  console.log(`🎯 Destination: ${formattedRecipient} (2G Keypad Phone)`);
  console.log('\nSending test fare SMS via TextBee Android Gateway...\n');

  const messageText = "From AutoMitra\nUPI ID: payer@okhdfcbank\nAmount: Rs.50\nTransaction Status: Successful";

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
      console.log('✅ SUCCESS: SMS request successfully queued on your Android phone!');
      console.log(`   Batch ID: ${data.smsBatchId || 'queued'}`);
      console.log('   Your Android phone is transmitting the SMS to the 2G keypad phone now.\n');
      console.log('   Check the 2G phone inbox in 5-15 seconds!\n');
    } else {
      console.log('❌ FAILED: TextBee returned an error:');
      console.log(`   ${data.message || `Status HTTP ${res.status}`}`);
      console.log('   Tip: Ensure your Android phone has active internet and the TextBee app is running in background.\n');
    }
  } catch (err: unknown) {
    console.error('❌ Network error:', err instanceof Error ? err.message : err);
  }
}

sendTextBeeTest();
