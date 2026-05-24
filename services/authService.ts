// ============================================================
// AUTH SERVICE — Google Sign-In integration
// Ported from FIXI with Homezy branding
// ============================================================

import api from '@/lib/axiosConfig';

type GeoPoint = {
  type: 'Point';
  coordinates: [number, number];
};

export type User = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  address_text?: string;
  location?: GeoPoint;
  services?: string[];
  subservices?: string[];
  experienceYears?: number;
  pricePerHour?: number;
  rating?: number;
  profilePic?: string;
  role?: 'customer' | 'technician';
  isProfileComplete: boolean;
};

export type AuthResponse = {
  accessToken: string;
  refreshToken?: string;
  user: User;
};

export type GoogleAuthResponse = {
  accessToken: string;
  refreshToken?: string;
  user: User;
};

export type CompleteCustomerProfilePayload = {
  phone: string;
  address_text: string;
  lat: number;
  lng: number;
};

export type CompleteTechnicianProfilePayload = {
  phone: string;
  services: string[];
  subservices: string[];
  experienceYears: number;
  pricePerHour: number;
  location: GeoPoint;
};

// ============================================================
// 🔐 GOOGLE LOGIN
// ============================================================

export const loginWithGoogleToken = async (
  idToken: string,
  role: 'customer' | 'technician'
): Promise<GoogleAuthResponse> => {
  const response = await api.post('/auth/google', { idToken, role });
  const payload = response?.data || {};
  const backendUser = payload.user || {};

  return {
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken,
    user: {
      id: backendUser._id || backendUser.id,
      name: backendUser.name,
      email: backendUser.email,
      phone: backendUser.phone,
      address: backendUser.address || backendUser.address_text,
      address_text: backendUser.address_text,
      location: backendUser.location,
      services: backendUser.services,
      subservices: backendUser.subservices,
      experienceYears: backendUser.experienceYears,
      pricePerHour: backendUser.pricePerHour,
      rating: backendUser.rating,
      role: backendUser.role || role,
      profilePic: backendUser.profilePic,
      isProfileComplete: Boolean(backendUser.isProfileComplete),
    },
  };
};

// ============================================================
// 🔄 REFRESH TOKEN
// ============================================================

export const refreshAccessToken = async (
  refreshToken: string,
  role?: 'customer' | 'technician'
): Promise<{ accessToken: string }> => {
  const response = await api.post('/api/auth/refresh', {
    refreshToken,
    role,
  });

  return {
    accessToken: response?.data?.accessToken,
  };
};

// ============================================================
// ✅ COMPLETE PROFILE
// ============================================================

export const completeUserProfile = async (
  payload: CompleteCustomerProfilePayload | CompleteTechnicianProfilePayload,
  role: 'customer' | 'technician'
): Promise<Partial<User>> => {
  const endpoint = role === 'technician' ? '/tech' : '/user';
  const response = await api.post(endpoint, payload);
  const backendUser = response?.data?.data?.user || response?.data?.user || {};

  if (role === 'technician') {
    const technicianPayload = payload as CompleteTechnicianProfilePayload;
    return {
      ...backendUser,
      phone: backendUser.phone || technicianPayload.phone,
      services: backendUser.services || technicianPayload.services,
      subservices: backendUser.subservices || technicianPayload.subservices,
      experienceYears:
        backendUser.experienceYears || technicianPayload.experienceYears,
      pricePerHour: backendUser.pricePerHour || technicianPayload.pricePerHour,
      location: backendUser.location || technicianPayload.location,
      role,
      isProfileComplete: true,
    };
  }

  const customerPayload = payload as CompleteCustomerProfilePayload;
  return {
    ...backendUser,
    phone: backendUser.phone || customerPayload.phone,
    address: backendUser.address || customerPayload.address_text,
    address_text: backendUser.address_text || customerPayload.address_text,
    location:
      backendUser.location || {
        type: 'Point',
        coordinates: [customerPayload.lng, customerPayload.lat],
      },
    role,
    isProfileComplete: true,
  };
};
