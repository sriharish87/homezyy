import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import api from '@/lib/axiosConfig';

/**
 * usePushNotifications
 *
 * Requests push notification permissions, retrieves the Expo Push Token,
 * and registers it with the backend. This hook is a no-op on web.
 *
 * Call this once globally (e.g., inside _layout.tsx) after the user is
 * authenticated. It does NOT interfere with the existing SocketContext.
 */
export function usePushNotifications(isAuthenticated: boolean) {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const registeredRef = useRef(false);

  useEffect(() => {
    // Skip on web — Expo Push is native-only
    if (Platform.OS === 'web') return;

    // Only register when authenticated and not already registered this session
    if (!isAuthenticated || registeredRef.current) return;

    async function registerForPushNotifications() {
      try {
        // 1. Must be a physical device (tokens don't work on simulators for iOS)
        if (!Device.isDevice) {
          console.warn('[Push] Must use a physical device for push notifications');
          return;
        }

        // 2. Check / request permissions
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== 'granted') {
          setError('Push notification permission denied');
          console.warn('[Push] Permission denied');
          return;
        }

        // 3. Get the Expo Push Token
        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        if (!projectId) {
          console.warn('[Push] Missing EAS projectId in app.json — cannot generate push token');
          return;
        }

        const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
        const token = tokenData.data;
        setExpoPushToken(token);
        console.log('[Push] Expo Push Token:', token);

        // 4. Send to backend
        await api.post('/push-token/register', { pushToken: token });
        registeredRef.current = true;
        console.log('[Push] Token registered with backend');

        // 5. Android: Set up notification channel
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'Default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#3e2a56',
          });
        }
      } catch (err: any) {
        console.error('[Push] Registration failed:', err?.message || err);
        setError(err?.message || 'Push registration failed');
      }
    }

    registerForPushNotifications();
  }, [isAuthenticated]);

  return { expoPushToken, error };
}
