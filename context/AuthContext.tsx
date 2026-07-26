import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginWithGoogleToken } from '@/services/authService';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import api from '@/lib/axiosConfig';

// ── Storage keys ───────────────────────────────────────────
const STORAGE_KEYS = {
  TOKEN: '@homezy_token',
  REFRESH_TOKEN: '@homezy_refresh_token',
  USER: '@homezy_user',
} as const;

// ── Types ──────────────────────────────────────────────────
export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  address_text?: string;
  location?: {
    type: 'Point';
    coordinates: [number, number];
  };
  services?: string[];
  subservices?: string[];
  experienceYears?: number;
  pricePerHour?: number;
  rating?: number;
  profilePic?: string;
  role?: 'customer' | 'technician';
  isProfileComplete: boolean;
  isAvailable?: boolean;
}

type AuthRole = 'customer' | 'technician';

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  loading: boolean;
  authLoading: boolean;
  error: string | null;
  login: (googleToken: string, role: AuthRole) => Promise<User | null>;
  setSession: (user: User, token: string, refreshToken?: string) => Promise<User>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
  setError: (error: string | null) => void;
}

// ── Context ────────────────────────────────────────────────
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = !!token && !!user;

  // 🔄 Restore session
  useEffect(() => {
    const loadAuth = async () => {
      try {
        const storedToken = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
        const storedUser = await AsyncStorage.getItem(STORAGE_KEYS.USER);

        if (storedToken && storedUser) {
          const parsedUser = JSON.parse(storedUser);

          try {
            // Validate persisted session with backend on app start.
            const role =
              parsedUser?.role === 'technician' ? 'technician' : 'customer';
            const validationResponse = await api.get('/auth/validate', {
              params: { role },
            });

            const validatedUser =
              validationResponse?.data?.data?.user ||
              validationResponse?.data?.user ||
              parsedUser;

            const normalizedUser = {
              ...parsedUser,
              ...validatedUser,
              isProfileComplete: Boolean(
                validatedUser?.isProfileComplete ?? parsedUser?.isProfileComplete
              ),
            };

            setToken(storedToken);
            setUser(normalizedUser);

            await AsyncStorage.setItem(
              STORAGE_KEYS.USER,
              JSON.stringify(normalizedUser)
            );

            // Sync lat and lng so screens using it don't break
            if (normalizedUser?.location?.coordinates) {
              const [lng, lat] = normalizedUser.location.coordinates;
              await AsyncStorage.multiSet([
                ['@homezy_lat', String(lat)],
                ['@homezy_lng', String(lng)]
              ]);
            }
          } catch (validationError) {
            console.warn('Session validation failed:', validationError);

            await AsyncStorage.multiRemove([
              STORAGE_KEYS.TOKEN,
              STORAGE_KEYS.REFRESH_TOKEN,
              STORAGE_KEYS.USER,
            ]);

            setToken(null);
            setUser(null);
          }
        }
      } catch (err) {
        console.error('Restore session error:', err);
        setError('Failed to restore session');
      } finally {
        setLoading(false);
      }
    };

    loadAuth();
  }, []);

  // 🔐 SET SESSION
  const setSession = async (
    userData: User,
    authToken: string,
    refreshToken?: string
  ) => {
    try {
      setAuthLoading(true);
      const normalizedUser = {
        ...userData,
        isProfileComplete: Boolean(userData.isProfileComplete),
      };

      const entries: [string, string][] = [
        [STORAGE_KEYS.TOKEN, authToken],
        [STORAGE_KEYS.USER, JSON.stringify(normalizedUser)],
      ];

      // Sync lat and lng so screens using it don't break
      if (normalizedUser?.location?.coordinates) {
        const [lng, lat] = normalizedUser.location.coordinates;
        entries.push(['@homezy_lat', String(lat)]);
        entries.push(['@homezy_lng', String(lng)]);
      }

      if (refreshToken) {
        entries.push([STORAGE_KEYS.REFRESH_TOKEN, refreshToken]);
      }

      await AsyncStorage.multiSet(entries);

      setUser(normalizedUser);
      setToken(authToken);
      setError(null);

      return normalizedUser;
    } catch (err) {
      console.error('Login error:', err);
      setError('Failed to save login session');
      throw err;
    } finally {
      setAuthLoading(false);
    }
  };

  // 🔐 LOGIN (Google)
  const login = async (googleToken: string, role: AuthRole) => {
    try {
      setAuthLoading(true);
      setError(null);

      const response = await loginWithGoogleToken(googleToken, role);
      return await setSession(
        response.user,
        response.accessToken,
        response.refreshToken
      );
    } catch (err) {
      console.error('Google login error:', err);
      setError('Failed to login with Google');
      return null;
    } finally {
      setAuthLoading(false);
    }
  };

  // 🔓 LOGOUT
  const logout = async () => {
    try {
      setAuthLoading(true);

      // Sign out from Google to ensure the account prompt appears next time
      try {
        await GoogleSignin.signOut();
      } catch (googleErr) {
        console.warn('Google sign out error:', googleErr);
      }

      await AsyncStorage.multiRemove([
        STORAGE_KEYS.TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.USER,
      ]);

      setUser(null);
      setToken(null);
      setError(null);
    } catch (err) {
      console.error('Logout error:', err);

      // fallback: still clear state
      setUser(null);
      setToken(null);
    } finally {
      setAuthLoading(false);
    }
  };

  // 🔥 UPDATE USER PROFILE
  const updateUser = async (data: Partial<User>) => {
    if (!user) return;

    try {
      setAuthLoading(true);

      const updatedUser = { ...user, ...data };

      setUser(updatedUser);

      await AsyncStorage.setItem(
        STORAGE_KEYS.USER,
        JSON.stringify(updatedUser)
      );
    } catch (err) {
      console.error('Update user error:', err);
      setError('Failed to update profile');
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        token,
        loading,
        authLoading,
        error,
        login,
        setSession,
        logout,
        updateUser,
        setError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
