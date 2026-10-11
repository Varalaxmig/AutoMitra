# AutoMitra (ऑटो मित्र) — System Specification & Technical Architecture

> **Zero-Screen UPI Payment Verification & Keypad SMS Proxy for Auto-Rickshaws.**
> Built for Mumbai auto-rickshaw drivers using basic 2G feature phones (Nokia 105, JioBharat) without smartphones, internet connectivity, or paid soundbox devices.

---

## 📌 Executive Summary

### The Real-World Problem
In major Indian transit hubs (Mumbai, Pune, Delhi, Bengaluru), 60–70% of auto-rickshaw drivers operate basic 2G keypad feature phones due to battery durability, screen vulnerability, and digital unfamiliarity. However, over 80% of urban commuters prefer cashless UPI payments (GPay, PhonePe, Paytm). 

Current commercial soundboxes cost ₹125–₹250/month in SIM and hardware rentals, eat battery life, and often fail in transit. When commuters pay directly via static UPI QR stickers, bank credit SMS alerts to the driver's phone take between 30 seconds to several minutes, creating distrust, vehicle gridlocks, and awkward disputes on the street.

### The AutoMitra Solution
AutoMitra solves this transit friction through an innovative **family/proxy verification bridge**:
1. **Physical A6 Sticker:** An A6 landscape vector sticker on the auto dashboard featuring a high-res QR code and clear 3-step commuter instructions.
2. **Sub-50 KB Fast Web App:** Commuters scan the QR with any UPI app or camera, entering the meter fare (₹10 to ₹5,000). No native app installation required.
3. **Deterministic 4-Digit AM Token:** Commuters pay via UPI and receive a high-contrast 4-digit token (`AM####`) on a screen that stays awake with the Screen Wake Lock API.
4. **Real-Time Family Proxy Console:** A family member or fleet manager sees claimed rides in real-time, verifies the bank credit on their phone/desktop, and confirms the fare with a single tap.
5. **Automated 2G SMS Dispatch:** Within 2–5 seconds, the driver's Nokia/Jio keypad phone receives a plain-text SMS with the exact sender name, fare amount, and matching 4-digit token.

---

## 🏗️ System Architecture & Workflow

```
+-----------------------------------------------------------------------------------+
|                               Commuter Journey                                    |
|                                                                                   |
|  [1. Scan A6 QR] ---> [2. Enter Fare in /q/[slug]] ---> [3. Pay via UPI Deep Link]|
|                                                                  |                |
|                                                                  v                |
|  [5. Show 4-Digit Token] <------------------------- [4. Click "I Have Paid"]      |
+-----------------------------------------------------------------------------------+
                                           |
                                           v  (Instant Webhook / Realtime Sync)
+-----------------------------------------------------------------------------------+
|                              Family Proxy Console                                 |
|                                                                                   |
|  [1. Bank Credit Notification] ---> [2. Verify AM Token & Passenger Name]         |
|                                     [3. Edit Fare (if mismatched)]                |
|                                     [4. Tap "Confirm Fare" (Soundbox Chime)]      |
+-----------------------------------------------------------------------------------+
                                           |
                                           v  (Fast2SMS Gateway Dispatch)
+-----------------------------------------------------------------------------------+
|                         Driver Physical 2G Phone (Feature Phone)                  |
|                                                                                   |
|  Received SMS:                                                                    |
|  Sender's name: Aditi Roy                                                         |
|  Amount: Rs.75                                                                    |
|  Status: Success                                                                  |
|                                                                                   |
|  --> Driver matches 4-digit token with passenger screen and releases auto!        |
+-----------------------------------------------------------------------------------+
```

---

## 🚀 Core Features & Implementation Modules

### 1. Database & State Machine (Supabase / PostgreSQL)
- **5 Core Tables:**
  - `drivers`: Driver identity, vehicle plate (`MH02AB1234`), 2G phone, family proxy phone, UPI VPA, language preference (`en`, `hi`, `mr`), active status.
  - `qr_endpoints`: Slugs bound to drivers with support for instant QR rotation if physically damaged or compromised.
  - `otp_challenges`: One-time password verification for driver phone binding during onboarding.
  - `sessions`: Core transaction ledger tracking status, token, sequence number, meter fare, and credited amount.
  - `sms_logs`: Comprehensive dispatch audit trail tracking providers (`fast2sms`, `twilio`, `mock`), delivery status, and timestamps.
- **Partial Unique Index:** `idx_sessions_live_token` enforces uniqueness on `(driver_id, token)` strictly where `status IN ('initiated', 'handed_off', 'claimed')`. This completely prevents active token collisions while allowing historical reuse after resolution.
- **Automated Stale Session Expiry:** `pg_cron` scheduled job running every minute automatically transitions abandoned or unpaid sessions older than 10 minutes to `expired`.

### 2. Deterministic HMAC Token Derivation
- Generates 4-digit tokens (`1000` to `9999`) derived from:
  $$\text{Token} = 1000 + (\text{HMAC-SHA256}(\text{Secret}, \text{driver\_id} + \text{YYYYMMDD} + \text{seq}) \pmod{9000})$$
- Deterministic for the same driver and sequence counter on a given day.
- Collision retry engine detects any currently active tokens for that specific driver and increments sequence until a unique candidate is guaranteed.

### 3. NPCI-Compliant UPI Deep-Linking
- Formats and sanitizes standard NPCI UPI URI strings:
  ```text
  upi://pay?pa={vpa}&pn={name}&am={amount}&cu=INR&tn=AM{token}&tr={sessionId}
  ```
- **Input Sanitization:** Strips special characters from payee names, enforces exact 2-decimal amounts, and standardizes notes with the `AM` prefix.
- **Companion / Desktop QR Mode:** Renders a dynamic, on-screen QR code for commuters using laptops, tablets, or secondary smartphones.

### 4. High-Performance Commuter Flow (`/q/[slug]`)
- **Strict <50 KB Bundle Budget:** Zero heavy third-party assets; uses system font stacks and inline vector icons for near-instant rendering on 2G/3G mobile networks.
- **Decimal-Safe Fare Input:** Quick-select presets (₹20, ₹50, ₹100, ₹200) with real-time validation (₹10 min to ₹5,000 max).
- **Tab Focus Return Detection:** Listens to the browser `visibilitychange` API. When the commuter switches back from their UPI payment app (GPay/PhonePe/Paytm), AutoMitra immediately presents the "Did you pay ₹XX?" claim confirmation modal.
- **Screen Wake Lock:** Engages `navigator.wakeLock` when displaying the 4-digit token screen to prevent phone dimming while the driver inspects the screen from the front seat.

### 5. High-Contrast Verification Displays
- **Confirmed Ride (`#A2DDA9`):** Full-screen solid emerald green display, massive shield checkmark, 200ms haptic vibration, high-frequency success chime, and dynamic meta `theme-color` change.
- **Rejected / Unpaid Ride (`#F87171`):** Full-screen solid red display, alert icon, double haptic vibration (`[300ms, 100ms, 300ms]`), low-frequency error buzzer, and explicit "DO NOT RELEASE AUTO" warning.

### 6. Family Proxy Console (`/console`)
- **Real-Time Driver Queues:** Categorized into `Awaiting (Claimed)`, `Confirmed`, and `Failed`.
- **Quick AM Token Search:** Instant search input allowing the proxy to look up commuters by their 4-digit token if a regional bank statement truncates the transaction note.
- **Amount Adjustment:** Allows the proxy to modify the recorded credited amount prior to confirmation if the passenger paid a different fare.
- **Audio Soundbox Synthesizer:** Built-in Web Audio API synthesizer generates rich physical soundbox chimes directly from browser speakers without needing hardware accessories.

### 7. Indian SMS Gateway & Failover Engine
- **Fast2SMS Quick Route (`route=q`):** Instant pilot and operational delivery to Indian numbers without upfront TRAI DLT registration.
- **Strict Message Body Format:**
  ```text
  Sender's name: {senderName}
  Amount: Rs.{amount}
  Status: {Pending | Success | Failed}
  ```
- **Language Localization:** Translates status labels into English, Hindi, and Marathi Unicode for regional keypad phone displays.
- **Escalation Engine:**
  - **T = 20s:** UI ping / reminder if claimed fare remains unverified.
  - **T = 120s:** Automated backup SMS escalation sent to secondary family number.
- **Circuit Breaker:** Trips after 3 consecutive dispatch failures with a 60-second half-open cooldown. Domestic `+91` numbers are protected against unapproved plain-text Twilio fallbacks.

### 8. A6 Landscape Printable Sticker Generator
- Implemented with `pdf-lib` for client-side and server-side vector generation.
- Exact ISO A6 landscape dimensions: **148mm × 105mm** (419.53 pt × 297.64 pt).
- Includes driver identity, vehicle plate number badge, unique QR endpoint ID, high-resolution vector QR code, and 3-step passenger guide in English/Marathi/Hindi.
- One-click direct PDF file download directly from the onboarding dashboard.

---

## 🛠️ Verification & Test Suite

The project includes an end-to-end automated Vitest test suite with **39 tests across 7 test files**:

| Test File | Scope | Status |
|:---|:---|:---:|
| `token.test.ts` | HMAC token derivation, range bounds (1000–9999), collision retry | ✅ Passed |
| `upi.test.ts` | NPCI deep link generation, VPA validation, name sanitization | ✅ Passed |
| `rate-limit.test.ts` | Sliding-window algorithms for IP sessions and phone OTPs | ✅ Passed |
| `sms.test.ts` | Template generation (EN/HI/MR), circuit breaker, delivery receipts | ✅ Passed |
| `store.test.ts` | State machine transitions, driver fleet isolation, session TTL | ✅ Passed |
| `app-routing.test.tsx` | Route definitions, TanStack router links, layout wrappers | ✅ Passed |
| `e2e-scenarios.test.ts` | **Tests E1–E6, E9:** Happy path, rejection, adjustment, TTL expiry | ✅ Passed |

---

## ⚙️ Environment Configuration

| Variable | Description | Default / Mode |
|:---|:---|:---|
| `FAST2SMS_API_KEY` | Fast2SMS API key for real SMS to 2G phones | Simulated if empty |
| `SMS_ROUTE` | Route selector (`q` for Quick route, `dlt` for production) | `q` |
| `SUPABASE_URL` | Supabase PostgreSQL project URL | Local storage if empty |
| `SUPABASE_ANON_KEY` | Supabase public anonymous API key | Local storage if empty |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase backend administrative key | Local storage if empty |
| `HMAC_SECRET_KEY` | Internal cryptographic salt for 4-digit token generation | Built-in fallback |
| `BASE_URL` | Web app root domain | `http://localhost:3000` |

---

## 📱 Operational Field Protocol (Pilot Checklist)

1. **Sticker Printing:** Download the A6 PDF from `/onboard`, print on water-resistant vinyl sticker paper, and mount on the driver's front dashboard.
2. **Meter Fare Ride:** Passenger enters vehicle, completes journey, and scans QR code.
3. **Payment & Token:** Passenger enters fare on phone, completes payment in GPay/PhonePe, and displays the 4-digit token screen.
4. **Proxy Confirmation:** Family proxy verifies credit on their banking app, confirms on `/console`, and the driver receives the plain-text SMS confirmation.
