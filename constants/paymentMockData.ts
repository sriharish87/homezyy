export interface PaymentMethod {
  id: string;
  type: 'upi' | 'credit_card' | 'debit_card' | 'wallet';
  name: string;
  displayName: string;
  isDefault: boolean;
  isActive: boolean;
  expiryDate?: string;
  lastFourDigits?: string;
  icon?: string;
}

export const MOCK_PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'pm_001',
    type: 'upi',
    name: 'Google Pay',
    displayName: 'Google Pay - user@okhdfcbank',
    isDefault: true,
    isActive: true,
    icon: 'payment',
  },
  {
    id: 'pm_002',
    type: 'credit_card',
    name: 'HDFC Credit Card',
    displayName: 'HDFC Bank Credit Card ending in 4567',
    isDefault: false,
    isActive: true,
    expiryDate: '12/26',
    lastFourDigits: '4567',
    icon: 'credit-card',
  },
];
