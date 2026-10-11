# AutoMitra (ऑटो मित्र)

> **Instant UPI Payment Verification for Keypad-Phone Auto Drivers.**
> Built for Mumbai auto drivers using basic 2G feature phones without internet or smartphones.

---

## 🛺 Problem & Solution

- **The Problem:** Auto-rickshaw drivers with 2G keypad phones (Nokia 105, JioBharat) cannot install UPI apps or carry expensive soundboxes with SIM rental fees. Cashless commuters either skip rides or waste 5–10 minutes waiting for slow bank SMS alerts.
- **The Solution:** AutoMitra provides an A6 QR sticker for the auto dashboard. Commuters scan the QR with GPay, PhonePe, or Paytm, enter the meter fare, and pay. The family proxy member confirms the payment on the web console, and AutoMitra instantly dispatches an automated SMS to the driver's basic keypad phone with a matching 4-digit token.

---

## ⚡ Tech Stack

- **Frontend & App Shell:** React 19, TypeScript, TanStack Start & Router, TailwindCSS.
- **Audio Soundbox:** Web Audio API synthesizer (two-tone chime & error buzzer).
- **Sticker Generation:** `pdf-lib` vector A6 landscape printable dashboard sticker generator.
- **SMS Gateway:** Fast2SMS (Indian SMS gateway with Quick route and DLT support).
- **Backend / DB:** Supabase PostgreSQL with Row Level Security (RLS) & partial indexes for live token uniqueness.
- **Rate Limiting:** Built-in sliding-window algorithm (optional Upstash Redis support).

---

## 🚀 Getting Started

### 1. Installation

```bash
npm install
```

### 2. Run Local Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to interact with:
- **Commuter Flow:** `/q/K7M2QX9A` (Meter fare entry, UPI handoff, 4-digit token screen).
- **Family Proxy Console:** `/console` (Real-time fare confirmation, amount adjustment, AM token search, simulated driver phone inbox).
- **Driver Onboarding:** `/onboard` (Register driver, 2G phone OTP verification, download printable A6 sticker PDF).

### 3. Run Tests

```bash
npm test
```

### 4. Type Check

```bash
npx tsc --noEmit
```
