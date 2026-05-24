// ============================================================
// PAYMENT SERVICE — Razorpay + Wallet API calls
// ============================================================

import api from '@/lib/axiosConfig';

// ── Types ──────────────────────────────────────────────────

export interface CreateOrderResponse {
  orderId: string;
}

export interface VerifyPaymentPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  message: string;
  status: number;
}

export interface UnpaidBooking {
  bookingId: string;
  serviceName: string;
  providerName?: string;
  category?: string;
  date?: string;
  time?: string;
  location?: string;
  price: number;
  serviceImage?: string;
}

export interface TechnicianProfile {
  walletBalance: number;
  name?: string;
  email?: string;
  phone?: string;
  profilePic?: string;
}

export interface WithdrawResponse {
  success: boolean;
  message?: string;
}

// ── Payment APIs ───────────────────────────────────────────

/**
 * Step 1: Create a Razorpay order for a booking.
 * POST /payment/create-order
 */
export async function createOrder(bookingId: string): Promise<CreateOrderResponse> {
  const response = await api.post('/payment/create-order', { bookingId });
  return {
    orderId: response?.data?.orderId || response?.data?.data?.orderId,
  };
}

/**
 * Step 3: Verify a completed Razorpay payment.
 * POST /payment/verify-payment
 *
 * Returns { success, message, status } covering all 5 backend scenarios:
 *   400 → missing fields / invalid signature
 *   200 → paid + wallet credited / already processed
 *   500 → server error
 */
export async function verifyPayment(
  payload: VerifyPaymentPayload
): Promise<VerifyPaymentResponse> {
  try {
    const response = await api.post('/payment/verify-payment', payload);
    return {
      success: response.data?.success ?? true,
      message: response.data?.message ?? 'Payment verified',
      status: response.status,
    };
  } catch (err: any) {
    // Axios throws for 4xx/5xx — extract the response data
    if (err?.response) {
      return {
        success: err.response.data?.success ?? false,
        message: err.response.data?.message ?? 'Verification failed',
        status: err.response.status,
      };
    }
    // Network error / no response
    return {
      success: false,
      message: 'Network error. Please check your connection.',
      status: 0,
    };
  }
}

// ── Bookings APIs ──────────────────────────────────────────

/**
 * Fetch upcoming unpaid bookings for the current customer.
 * GET /bookings/upcoming-unpaid
 */
export async function fetchUpcomingUnpaidBookings(): Promise<UnpaidBooking[]> {
  const response = await api.get('/bookings/upcoming-unpaid');
  const bookings = response?.data?.data || response?.data || [];
  return Array.isArray(bookings) ? bookings : [];
}

// ── Technician Wallet APIs ─────────────────────────────────

/**
 * Fetch the technician's profile (including wallet balance).
 * GET /tech/profile
 */
export async function fetchTechnicianProfile(): Promise<TechnicianProfile> {
  const response = await api.get('/tech/profile');
  const data = response?.data?.data || response?.data || {};
  return {
    walletBalance: (data.walletBalance ?? 0) / 100,
    name: data.name,
    email: data.email,
    phone: data.phone,
    profilePic: data.profilePic,
  };
}

/**
 * Request a withdrawal from the technician wallet.
 * POST /payment/withdraw
 */
export async function withdrawFunds(amount: number): Promise<WithdrawResponse> {
  const response = await api.post('/payment/withdraw', { amount });
  return {
    success: response?.data?.success ?? true,
    message: response?.data?.message,
  };
}
