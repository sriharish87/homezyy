// ============================================================
// NOTIFICATION & LOCATION PREFERENCE SERVICE
// Persists user preferences locally using AsyncStorage
// ============================================================

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  NOTIFICATION: '@homezy_notification_pref',
  LOCATION: '@homezy_location_pref',
} as const;

// ── Notification Preferences ──────────────────────────────

export async function saveNotificationPreference(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(KEYS.NOTIFICATION, JSON.stringify(enabled));
}

export async function getNotificationPreference(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(KEYS.NOTIFICATION);
    return value !== null ? JSON.parse(value) : true; // default: enabled
  } catch {
    return true;
  }
}

// ── Location Preferences ──────────────────────────────────

export async function saveLocationPreference(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(KEYS.LOCATION, JSON.stringify(enabled));
}

export async function getLocationPreference(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(KEYS.LOCATION);
    return value !== null ? JSON.parse(value) : false; // default: disabled
  } catch {
    return false;
  }
}
