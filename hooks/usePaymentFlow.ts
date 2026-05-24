// ============================================================
// usePaymentFlow — Razorpay payment hook with retry logic
//
// Features:
// 1. Order ID caching — never re-creates an order for the same booking
// 2. Razorpay failure handling — keeps UI open for retry
// 3. Full verify-payment with 5-scenario result mapping
// ============================================================

import { useState, useCallback, useRef } from 'react';
import { Alert, Platform } from 'react-native';
import {
  createOrder,
  verifyPayment,
  VerifyPaymentResponse,
} from '@/services/paymentService';
import type { PaymentResultType } from '@/components/ui/PaymentResultModal';

const RAZORPAY_KEY =
  process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_YOUR_KEY_HERE';

// ── Types ──────────────────────────────────────────────────

interface PaymentFlowOptions {
  /** Called after a successful payment + verification */
  onSuccess?: (bookingId: string) => void;
  /** Called when any step fails (Razorpay dismiss, verify fail, etc.) */
  onError?: (error: string) => void;
  /** Called when the payment flow is fully done and UI should close */
  onClose?: () => void;
}

interface UsePaymentFlowReturn {
  /** Kick off the full payment flow for a booking */
  initiatePayment: (bookingId: string) => Promise<void>;
  /** True while any API call or Razorpay is open */
  loading: boolean;
  /** Last error message from Razorpay (not from verify) */
  razorpayError: string | null;
  /** Result type from verify-payment for the result modal */
  paymentResult: PaymentResultType;
  /** Dismiss the result modal */
  dismissResult: () => void;
  /** Clear the cached orderId (e.g., when switching bookings) */
  resetOrder: () => void;
}

// ── Razorpay native data shape ─────────────────────────────

interface RazorpaySuccessData {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

// ── Hook ───────────────────────────────────────────────────

export function usePaymentFlow(
  options?: PaymentFlowOptions
): UsePaymentFlowReturn {
  const [loading, setLoading] = useState(false);
  const [razorpayError, setRazorpayError] = useState<string | null>(null);
  const [paymentResult, setPaymentResult] = useState<PaymentResultType>(null);

  // ── Order ID cache: bookingId → orderId ──
  const orderCacheRef = useRef<Record<string, string>>({});

  // Guard against double-triggering
  const busyRef = useRef(false);

  // ── Map verify-payment response → result type ─────────

  function mapVerifyResponse(res: VerifyPaymentResponse): PaymentResultType {
    const msg = res.message?.toLowerCase() ?? '';

    // Scenario 1: 400 + missing fields
    if (
      res.status === 400 &&
      msg.includes('required')
    ) {
      return 'missing_fields';
    }

    // Scenario 4: 400 + invalid signature (fraud)
    if (
      res.status === 400 &&
      (msg.includes('invalid signature') || msg.includes('fraud'))
    ) {
      return 'invalid_signature';
    }

    // Scenario 2: 200 + success + PAID
    if (
      res.status === 200 &&
      res.success &&
      msg.includes('wallet credited')
    ) {
      return 'success';
    }

    // Scenario 3: 200 + success + already processed
    if (
      res.status === 200 &&
      res.success &&
      (msg.includes('already processed') || msg.includes('not found'))
    ) {
      return 'already_processed';
    }

    // Scenario 5: 500 or any other unknown
    if (res.status === 500 || res.status === 0) {
      return 'server_error';
    }

    // Fallback: if 200 + success, treat as success
    if (res.status === 200 && res.success) {
      return 'success';
    }

    // Anything else → server error
    return 'server_error';
  }

  // ── Dismiss result modal ──────────────────────────────

  const dismissResult = useCallback(() => {
    const wasSuccess =
      paymentResult === 'success' || paymentResult === 'already_processed';
    setPaymentResult(null);
    if (wasSuccess) {
      options?.onClose?.();
    }
  }, [paymentResult, options]);

  // ── Reset cached order ────────────────────────────────

  const resetOrder = useCallback(() => {
    orderCacheRef.current = {};
  }, []);

  // ── Main flow ─────────────────────────────────────────

  const initiatePayment = useCallback(
    async (bookingId: string) => {
      if (busyRef.current) return;
      busyRef.current = true;
      setLoading(true);
      setRazorpayError(null);

      try {
        // ── Step 1: Get or create order ──────────────
        let orderId = orderCacheRef.current[bookingId];

        if (!orderId) {
          const orderResponse = await createOrder(bookingId);
          orderId = orderResponse.orderId;

          if (!orderId) {
            throw new Error('Server did not return an orderId');
          }

          // Cache it for retry
          orderCacheRef.current[bookingId] = orderId;
        }

        // ── Step 2: Open Razorpay checkout ───────────
        let razorpayResult: RazorpaySuccessData;
        try {
          razorpayResult = await openRazorpay(orderId);
        } catch (rzpError: any) {
          // Razorpay failure: user closed modal, bank declined, etc.
          // CRITICAL: Keep the UI open and Pay Now button active for retry
          const desc =
            rzpError?.error?.description ||
            rzpError?.description ||
            rzpError?.message ||
            'Payment was not completed. You can try again.';
          setRazorpayError(desc);
          options?.onError?.(desc);
          // DON'T clear the cached orderId — user can retry
          return;
        }

        // ── Step 3: Verify payment with backend ─────
        const verifyResult = await verifyPayment({
          razorpay_order_id: razorpayResult.razorpay_order_id,
          razorpay_payment_id: razorpayResult.razorpay_payment_id,
          razorpay_signature: razorpayResult.razorpay_signature,
        });

        // ── Step 4: Map to UI scenario ──────────────
        const resultType = mapVerifyResponse(verifyResult);
        setPaymentResult(resultType);

        if (resultType === 'success' || resultType === 'already_processed') {
          // Clear cache on success (order is consumed)
          delete orderCacheRef.current[bookingId];
          options?.onSuccess?.(bookingId);
        } else {
          options?.onError?.(verifyResult.message);
        }
      } catch (err: any) {
        // Network or unexpected error during create-order
        const message =
          err?.response?.data?.message ||
          err?.message ||
          'Something went wrong. Please try again.';
        setRazorpayError(message);
        options?.onError?.(message);
      } finally {
        setLoading(false);
        busyRef.current = false;
      }
    },
    [options]
  );

  return {
    initiatePayment,
    loading,
    razorpayError,
    paymentResult,
    dismissResult,
    resetOrder,
  };
}

// ── Razorpay checkout wrapper ──────────────────────────────

async function openRazorpay(orderId: string): Promise<RazorpaySuccessData> {
  // On web, use the Razorpay Web SDK
  if (Platform.OS === 'web') {
    return openRazorpayWeb(orderId);
  }

  // On native, use react-native-razorpay
  try {
    const RazorpayCheckout = (await import('react-native-razorpay')).default;

    const razorpayOptions = {
      description: 'Fixi Service Payment',
      image: 'https://i.imgur.com/3g7nmJC.png',
      currency: 'INR',
      key: RAZORPAY_KEY,
      amount: 0, // Overridden by SDK using order_id
      order_id: orderId,
      name: 'Fixi',
      prefill: {
        email: 'customer@fixi.com',
        contact: '9999999999',
        name: 'Fixi Customer',
      },
      theme: { color: '#3e2a56' },
    };

    const data = await RazorpayCheckout.open(razorpayOptions);

    return {
      razorpay_order_id: data.razorpay_order_id,
      razorpay_payment_id: data.razorpay_payment_id,
      razorpay_signature: data.razorpay_signature,
    };
  } catch (nativeError: any) {
    // If native module unavailable (Expo Go), show clear error
    if (
      nativeError?.message?.includes?.('Cannot read') ||
      nativeError?.message?.includes?.('null') ||
      nativeError?.message?.includes?.('undefined') ||
      nativeError?.code === 'MODULE_NOT_FOUND'
    ) {
      throw new Error(
        'Razorpay is not available in Expo Go. Please test on web or build a custom dev client.'
      );
    }
    // Real Razorpay error (user dismissed, bank declined, etc.)
    throw nativeError;
  }
}

// ── Razorpay Web SDK ───────────────────────────────────────

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      return reject(new Error('Window not available'));
    }
    if ((window as any).Razorpay) {
      return resolve();
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Razorpay SDK'));
    document.body.appendChild(script);
  });
}

function openRazorpayWeb(orderId: string): Promise<RazorpaySuccessData> {
  return new Promise(async (resolve, reject) => {
    try {
      await loadRazorpayScript();

      const rzpOptions = {
        key: RAZORPAY_KEY,
        order_id: orderId,
        name: 'Fixi',
        description: 'Fixi Service Payment',
        image: 'https://i.imgur.com/3g7nmJC.png',
        handler: (response: any) => {
          resolve({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
        },
        modal: {
          ondismiss: () => {
            reject(new Error('Payment cancelled by user'));
          },
        },
        theme: { color: '#3e2a56' },
      };

      const rzp = new (window as any).Razorpay(rzpOptions);
      rzp.on('payment.failed', (response: any) => {
        reject({
          description:
            response?.error?.description ||
            'Payment failed. Please try again.',
          error: response?.error,
        });
      });
      rzp.open();
    } catch (err) {
      reject(err);
    }
  });
}

export default usePaymentFlow;
