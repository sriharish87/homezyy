import api from '@/lib/axiosConfig';

export interface CancellationConfigData {
  freeCancellationWindowMinutes: number;
  customerLateCancelFinePercentage: number;
  customerLateCancelPointsPenalty: number;
  techLateCancelPointsPenalty: number;
}

export interface CancelBookingResponse {
  success: boolean;
  message: string;
  booking?: any;
  refundTicket?: {
    _id: string;
    refundAmount: number;
    fineAmount: number;
    status: string;
    notes: string;
  } | null;
  pointsDeducted?: number;
}

/**
 * Fetch dynamic cancellation policy configuration from backend
 */
export async function fetchCancellationConfig(): Promise<{ success: boolean; config: CancellationConfigData }> {
  try {
    const response = await api.get('/bookings/cancellation-config');
    return response.data;
  } catch (error: any) {
    // Return default fallback if API is temporarily unavailable
    return {
      success: true,
      config: {
        freeCancellationWindowMinutes: 45,
        customerLateCancelFinePercentage: 20,
        customerLateCancelPointsPenalty: 50,
        techLateCancelPointsPenalty: 100,
      },
    };
  }
}

/**
 * Request atomic cancellation of a booking by ID with reason
 */
export async function cancelBookingRequest(bookingId: string, reason?: string): Promise<CancelBookingResponse> {
  const response = await api.post(`/bookings/${bookingId}/cancel`, { reason });
  return response.data;
}
