import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '@/lib/axiosConfig';
import type { Coupon } from '@/types/profile';

const COUPONS_STORAGE_KEY = '@homezy_coupons';

// TODO: Fetch coupons/offers from backend
export async function getCoupons(): Promise<Coupon[]> {
  try {
    // TODO: Replace with real API call
    // const response = await api.get<Coupon[]>('/coupons');
    // return response.data;

    // For now, load from local storage
    const stored = await AsyncStorage.getItem(COUPONS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
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

// TODO: Apply coupon via backend API
export async function applyCoupon(couponCode: string): Promise<{ success: boolean; message: string }> {
  try {
    // TODO: Replace with real API call
    // const response = await api.post('/coupons/apply', { code: couponCode });
    // return { success: response.data.success, message: response.data.message };

    const coupons = await getCoupons();
    const idx = coupons.findIndex((c) => c.code === couponCode);
    if (idx === -1) {
      return { success: false, message: 'Coupon not found' };
    }

    coupons[idx].isApplied = true;
    await AsyncStorage.setItem(COUPONS_STORAGE_KEY, JSON.stringify(coupons));
    return { success: true, message: 'Coupon applied successfully' };
  } catch (error) {
    console.error('Failed to apply coupon:', error);
    return { success: false, message: 'Failed to apply coupon' };
  }
}

// TODO: Remove applied coupon via backend API
export async function removeCoupon(couponId: string): Promise<{ success: boolean; message: string }> {
  try {
    // TODO: Replace with real API call
    // const response = await api.post(`/coupons/${couponId}/remove`);
    // return { success: response.data.success, message: response.data.message };

    const coupons = await getCoupons();
    const idx = coupons.findIndex((c) => c.id === couponId);
    if (idx === -1) {
      return { success: false, message: 'Coupon not found' };
    }

    coupons[idx].isApplied = false;
    await AsyncStorage.setItem(COUPONS_STORAGE_KEY, JSON.stringify(coupons));
    return { success: true, message: 'Coupon removed successfully' };
  } catch (error) {
    console.error('Failed to remove coupon:', error);
    return { success: false, message: 'Failed to remove coupon' };
  }
}


