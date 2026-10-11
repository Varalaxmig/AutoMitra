# AutoMitra — Field Testing & DLT Production Runbook

This runbook covers the operational protocols for **Phase 5 (UPI Interoperability & Field Testing)** and **Phase 7 (TRAI DLT Production Cutover)**.

---

## 💳 Phase 5: UPI Interoperability & Field Testing

### 1. The ₹1 Test Protocol
Before onboarding real drivers in the field, execute a test cycle with ₹1.00 fare across all four major UPI mobile applications on both Android and iOS:

| App | Android Intent | iOS Link Handler | `tn` (Transaction Note) Handling |
|:---|:---|:---|:---|
| **Google Pay (GPay)** | Handled | Handled | Usually retains `AM####`. Shows in payer history. |
| **PhonePe** | Handled | Handled | Retains `AM####`. Shown in transaction details. |
| **Paytm** | Handled | Handled | Retains `AM####`. Transmitted in bank narration. |
| **BHIM (NPCI)** | Handled | Handled | 100% NPCI compliant. Retains full `tn=AM####`. |

### 2. Deep Link Schema Audit
NPCI Specification requires strict parameter naming:
```text
upi://pay?pa={vpa}&pn={name}&am={amount}&cu=INR&tn=AM{token}&tr={sessionId}
```

- `pa`: Payee VPA (e.g. `sneha.patil@okaxis`).
- `pn`: Payee Name (sanitized alphanumeric only, max 50 chars).
- `am`: Exact 2-decimal amount (e.g. `1.00` or `75.00`).
- `cu`: Currency code, strictly `INR`.
- `tn`: Transaction note containing `AM####` (e.g. `AM4827`).
- `tr`: Unique reference ID (session ID).

### 3. Banking Statement Truncation Fallback
Certain cooperative or regional banks truncate the transaction note `tn` to save character space in SMS passbook alerts.

**Fallback Mechanism:**
1. The commuter shows their phone screen with the high-contrast 4-digit token (`AM####`).
2. The proxy family member enters the 4-digit token in the **Proxy Console Search Bar** (`#input-token-search`).
3. The matching session card immediately highlights with the passenger's name, meter fare, and single-tap confirm button.

---

## 🏛️ Phase 7: TRAI DLT Production Cutover Runbook

Under TRAI (Telecom Regulatory Authority of India) TCCCPR 2018 regulations, commercial/transactional SMS sent to domestic Indian mobile numbers (`+91`) must originate from a registered Principal Entity (PE) with approved headers and pre-approved DLT content templates.

### 1. Principal Entity Registration
1. Register on any telecom operator DLT portal (e.g., VilPower/Vodafone-Idea, Jio DLT, or Airtel DLT). Registration syncs across all operators via DLT blockchain.
2. Complete KYC:
   - Certificate of Incorporation / Shop Act / Udyam MSME Registration.
   - Authorized Signatory PAN & Aadhaar.
   - One-time registration fee: ₹5,900 (incl. GST).

### 2. Header (Sender ID) Registration
- **Header Type:** Transactional / Service Implicit.
- **Header Length:** Exactly 6 alphabetical characters (e.g., `AUTMIT`, `ATMTRA`).
- **Purpose:** SMS notifications for auto fare verification.

### 3. Pre-Approved Transactional Templates
Submit the following 4 exact templates for approval (typical approval time: 24–48 hours):

#### Template 1: OTP Verification
- **Template Name:** `AutoMitra_OTP`
- **Template Type:** Service Implicit
- **Content:**
  ```text
  AutoMitra OTP: {#var#}
  ```

#### Template 2: Commuter Claim (Pending Notification)
- **Template Name:** `AutoMitra_Claim_Pending`
- **Template Type:** Service Implicit
- **Content:**
  ```text
  Sender's name: {#var#}
  Amount: {#var#}
  Status: Pending
  ```

#### Template 3: Fare Confirmation (Success)
- **Template Name:** `AutoMitra_Fare_Success`
- **Template Type:** Service Implicit
- **Content:**
  ```text
  Sender's name: {#var#}
  Amount: {#var#}
  Status: Success
  ```

#### Template 4: Fare Rejection (Void / Failed)
- **Template Name:** `AutoMitra_Fare_Failed`
- **Template Type:** Service Implicit
- **Content:**
  ```text
  Sender's name: {#var#}
  Amount: {#var#}
  Status: Failed
  ```

### 4. Fast2SMS Environment Cutover
Once the DLT portal issues your Entity ID and Template IDs:
1. Set the following in your environment (`.env.local` or hosting provider):
   ```bash
   SMS_ROUTE=dlt
   FAST2SMS_SENDER_ID=AUTMIT
   DLT_ENTITY_ID=1101234567890123456
   DLT_OTP_TEMPLATE_ID=1107123456789012345
   DLT_CLAIM_TEMPLATE_ID=1107123456789012346
   DLT_CONFIRM_TEMPLATE_ID=1107123456789012347
   DLT_VOID_TEMPLATE_ID=1107123456789012348
   ```
2. Verify live dispatch to a physical 2G keypad phone using Test E1.
3. Print final A6 dashboard stickers and begin field deployments!
