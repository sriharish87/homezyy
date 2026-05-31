import { MOCK_PAYMENT_METHODS } from '@/constants/paymentMockData';
import type { PaymentMethod } from '@/types/profile';

// TODO: GET payment methods from backend
let methods: PaymentMethod[] = MOCK_PAYMENT_METHODS.map((m) => ({ ...m }));

export async function getPaymentMethods(): Promise<PaymentMethod[]> {
  return methods.map((m) => ({ ...m }));
}

export async function addPaymentMethod(payload: PaymentMethod): Promise<PaymentMethod> {
  const pm = { ...payload, id: payload.id ?? `pm_${Date.now()}` };
  if (pm.isDefault) methods = methods.map((m) => ({ ...m, isDefault: false }));
  methods = [pm, ...methods];
  return { ...pm };
}

export async function removePaymentMethod(id: string): Promise<boolean> {
  const before = methods.length;
  methods = methods.filter((m) => m.id !== id);
  return methods.length < before;
}

export async function setDefaultPaymentMethod(id: string): Promise<boolean> {
  const exists = methods.some((m) => m.id === id);
  if (!exists) return false;
  methods = methods.map((m) => ({ ...m, isDefault: m.id === id }));
  return true;
}
