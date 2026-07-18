import api from '@/lib/axiosConfig';

export interface PointsConfigData {
  customerPointsPerRupee: number;
  techPointsPerRupee: number;
  minCustomerRedeemPoints: number;
  minTechRedeemPoints: number;
  rewards: {
    customerBookingMade: number;
    customerJobCompleted: number;
    customerReviewSubmitted: number;
    customerOnlinePaymentBonus: number;
    techJobCompleted: number;
    techFiveStarRating: number;
    techOnTimeArrival: number;
  };
}

export interface PointsLedgerEntry {
  _id: string;
  userId: string;
  userRole: 'customer' | 'technician';
  type: 'EARN' | 'REDEEM' | 'ADJUST' | 'EXPIRE';
  amount: number;
  balanceAfter: number;
  reason: string;
  bookingId?: string;
  createdAt: string;
}

export interface PointsBalanceResponse {
  success: boolean;
  pointsBalance: number;
  pointsEarnedLifetime: number;
  walletBalance: number;
  config: PointsConfigData;
  ledger: PointsLedgerEntry[];
}

export interface RedeemCustomerPayload {
  pointsRedeemed: number;
  redemptionType?: 'CHECKOUT_DISCOUNT' | 'VOUCHER_CODE';
  bookingId?: string;
}

export interface RedeemCustomerResponse {
  success: boolean;
  message: string;
  remainingBalance: number;
  discountAmount?: number;
  voucherCode?: string;
}

export interface RedeemTechPayload {
  pointsRedeemed: number;
  rewardType?: 'WALLET_CASH' | 'PRIORITY_PASS';
}

export interface RedeemTechResponse {
  success: boolean;
  message: string;
  remainingPointsBalance: number;
  valueReceived?: number;
  rewardType?: string;
}

/**
 * Fetch current points balance, lifetime earnings, dynamic conversion rates, and recent ledger history
 */
export async function fetchPointsBalance(): Promise<PointsBalanceResponse> {
  const response = await api.get('/api/points/balance');
  return response.data;
}

/**
 * Fetch dynamic conversion configuration
 */
export async function fetchPointsConfig(): Promise<{ success: boolean; config: PointsConfigData }> {
  const response = await api.get('/api/points/config');
  return response.data;
}

/**
 * Customer redeems Fixi Points
 */
export async function redeemCustomerPoints(payload: RedeemCustomerPayload): Promise<RedeemCustomerResponse> {
  const response = await api.post('/api/points/redeem/customer', payload);
  return response.data;
}

/**
 * Technician redeems Fixi Points
 */
export async function redeemTechnicianPoints(payload: RedeemTechPayload): Promise<RedeemTechResponse> {
  const response = await api.post('/api/points/redeem/technician', payload);
  return response.data;
}
