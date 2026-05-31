export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  profilePic?: string;
  role: 'customer' | 'technician';
  isProfileComplete: boolean;
  isAvailable?: boolean;
}

export type EditProfilePayload = Partial<Pick<UserProfile, 'name' | 'email' | 'phone' | 'profilePic'>>;

export interface Address {
  id: string;
  type: 'home' | 'work' | 'other';
  name: string;
  address: string;
  city?: string;
  state?: string;
  postalCode?: string;
  phone?: string;
  isDefault?: boolean;
}

export interface PaymentMethod {
  id: string;
  type: 'upi' | 'credit_card' | 'debit_card' | 'wallet';
  name: string;
  displayName: string;
  isDefault: boolean;
  isActive: boolean;
}

export interface Coupon {
  id: string;
  code: string;
  description?: string;
  isActive: boolean;
  isApplied?: boolean;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
}

export interface RatingPayload {
  userId: string;
  rating: number; // 1-5
  comment?: string;
}
