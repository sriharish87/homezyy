import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '@/lib/axiosConfig';
import type { PaymentMethod } from '@/types/profile';

const PAYMENT_METHODS_STORAGE_KEY = '@homezy_payment_methods';

// TODO: Fetch payment methods from backend
export async function getPaymentMethods(): Promise<PaymentMethod[]> {
  try {
    // TODO: Replace with real API call
    // const response = await api.get<PaymentMethod[]>('/payment-methods');
    // return response.data;

    // For now, load from local storage
    const stored = await AsyncStorage.getItem(PAYMENT_METHODS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to fetch payment methods:', error);
    return [];
  }
}

// TODO: Add new payment method via backend API
export async function addPaymentMethod(payload: PaymentMethod): Promise<PaymentMethod> {
  try {
    // TODO: Replace with real API call
    // const response = await api.post<PaymentMethod>('/payment-methods', payload);
    // return response.data;

    const pm = { ...payload, id: payload.id ?? `pm_${Date.now()}` };
    const existing = await getPaymentMethods();
    const updated = [pm, ...existing];
    await AsyncStorage.setItem(PAYMENT_METHODS_STORAGE_KEY, JSON.stringify(updated));
    return pm;
  } catch (error) {
    console.error('Failed to add payment method:', error);
    throw error;
  }
}

// TODO: Remove payment method via backend API
export async function removePaymentMethod(id: string): Promise<boolean> {
  try {
    // TODO: Replace with real API call
    // await api.delete(`/payment-methods/${id}`);
    // return true;

    const existing = await getPaymentMethods();
    const filtered = existing.filter((m) => m.id !== id);
    await AsyncStorage.setItem(PAYMENT_METHODS_STORAGE_KEY, JSON.stringify(filtered));
    return filtered.length < existing.length;
  } catch (error) {
    console.error('Failed to remove payment method:', error);
    throw error;
  }
}

// TODO: Set default payment method via backend API
export async function setDefaultPaymentMethod(id: string): Promise<boolean> {
  try {
    // TODO: Replace with real API call
    // const response = await api.patch<{ success: boolean }>(`/payment-methods/${id}/default`);
    // return response.data.success;

    const existing = await getPaymentMethods();
    const updated = existing.map((m) => ({ ...m, isDefault: m.id === id }));
    await AsyncStorage.setItem(PAYMENT_METHODS_STORAGE_KEY, JSON.stringify(updated));
    return true;
  } catch (error) {
    console.error('Failed to set default payment method:', error);
    throw error;
  }
}


