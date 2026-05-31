import api from '@/lib/axiosConfig';
import type { Coupon } from '@/types/profile';

// TODO: GET coupons/offers from backend
export async function getCoupons(): Promise<Coupon[]> {
  try {
    // TODO: Replace with real API call
    // const response = await api.get<Coupon[]>('/coupons');
    // return response.data;
    return [];
  } catch (error) {
    console.error('Failed to fetch coupons:', error);
    return [];
  }
}

export async function getActiveCoupons(): Promise<Coupon[]> {
  const coupons = await getCoupons();
  return coupons.filter((coupon) => coupon.isActive);
}

export async function getExpiredCoupons(): Promise<Coupon[]> {
  const coupons = await getCoupons();
  return coupons.filter((coupon) => !coupon.isActive);
}

export async function getAppliedCoupons(): Promise<Coupon[]> {
  const coupons = await getCoupons();
  return coupons.filter((coupon) => coupon.isApplied);
}

// TODO: POST apply coupon to backend
export async function applyCoupon(couponCode: string): Promise<{ success: boolean; message: string }> {
  try {
    // const response = await api.post('/coupons/apply', { code: couponCode });
    // return { success: response.data.success, message: response.data.message };
    return { success: true, message: 'Coupon applied (local)' };
  } catch (error) {
    console.error('Failed to apply coupon:', error);
    return { success: false, message: 'Failed to apply coupon' };
  }
}

// TODO: POST remove applied coupon from backend
export async function removeCoupon(couponId: string): Promise<{ success: boolean; message: string }> {
  try {
    // const response = await api.post(`/coupons/${couponId}/remove`);
    // return { success: response.data.success, message: response.data.message };
    return { success: true, message: 'Coupon removed (local)' };
  } catch (error) {
    console.error('Failed to remove coupon:', error);
    return { success: false, message: 'Failed to remove coupon' };
  }
}
