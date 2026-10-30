/**
 * AutoMitra — Razorpay Real-Time Bank-Verified UPI Gateway Integration
 *
 * Provides real-time UPI payment processing via Razorpay Standard Checkout.
 * Only triggers payment confirmation and cellular SMS dispatch when the bank
 * successfully authorizes and captures the payment.
 */

export interface RazorpayPaymentSuccess {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
}

export interface RazorpayCheckoutOptions {
  amount: number; // in Rupees
  driverName: string;
  vehicleNumber: string;
  driverPhone: string;
  driverVpa: string;
  payerName?: string;
  token: string;
  onSuccess: (payment: RazorpayPaymentSuccess) => void;
  onFailure?: (error: { code?: string; description?: string }) => void;
  onDismiss?: () => void;
}

export function getRazorpayKeyId(): string | undefined {
  const envKey =
    (typeof process !== 'undefined' && process.env ? process.env['RAZORPAY_KEY_ID'] : undefined) ||
    (typeof import.meta !== 'undefined' && import.meta.env
      ? (import.meta.env['VITE_RAZORPAY_KEY_ID'] as string | undefined)
      : undefined);

  if (envKey && envKey.trim() && !envKey.includes('placeholder')) {
    return envKey.trim();
  }
  return undefined;
}

export function isRazorpayConfigured(): boolean {
  const key = getRazorpayKeyId();
  return Boolean(key && (key.startsWith('rzp_test_') || key.startsWith('rzp_live_')));
}

let scriptLoadPromise: Promise<boolean> | null = null;

export function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if ((window as any).Razorpay) return Promise.resolve(true);

  if (!scriptLoadPromise) {
    scriptLoadPromise = new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => {
        scriptLoadPromise = null;
        resolve(false);
      };
      document.body.appendChild(script);
    });
  }

  return scriptLoadPromise;
}

export async function launchRazorpayPayment(options: RazorpayCheckoutOptions): Promise<boolean> {
  const key = getRazorpayKeyId();
  if (!key) {
    return false;
  }

  const loaded = await loadRazorpayScript();
  if (!loaded || !(window as any).Razorpay) {
    return false;
  }

  const amountInPaise = Math.round(options.amount * 100);

  const rzpOptions = {
    key,
    amount: amountInPaise,
    currency: 'INR',
    name: 'AutoMitra',
    description: `Auto Fare: ${options.vehicleNumber} (${options.driverName})`,
    theme: {
      color: '#F59E0B', // AutoMitra Amber
    },
    prefill: {
      name: options.payerName || 'Commuter',
    },
    notes: {
      vehicle: options.vehicleNumber,
      driver_name: options.driverName,
      driver_phone: options.driverPhone,
      token: options.token,
    },
    handler: function (response: RazorpayPaymentSuccess) {
      options.onSuccess(response);
    },
    modal: {
      ondismiss: function () {
        options.onDismiss?.();
      },
      confirm_close: true,
    },
  };

  try {
    const rzp = new (window as any).Razorpay(rzpOptions);
    rzp.on('payment.failed', function (resp: any) {
      options.onFailure?.(resp.error || { description: 'Payment declined by bank' });
    });
    rzp.open();
    return true;
  } catch (err) {
    console.error('Failed to open Razorpay checkout:', err);
    return false;
  }
}
