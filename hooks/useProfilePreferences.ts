import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { Platform, Alert } from 'react-native';
import {
  saveNotificationPreference,
  getNotificationPreference,
  saveLocationPreference,
  getLocationPreference,
} from '@/services/notificationPreferenceService';

export function useProfilePreferences() {
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [locationOn, setLocationOn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const [notifPref, locPref] = await Promise.all([
        getNotificationPreference(),
        getLocationPreference(),
      ]);
      setNotificationsOn(notifPref);
      setLocationOn(locPref);
    } catch (error) {
      console.error('Failed to load preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleNotifications = async (value: boolean) => {
    try {
      setNotificationsOn(value);
      await saveNotificationPreference(value);
    } catch (error) {
      console.error('Failed to save notification preference:', error);
      setNotificationsOn(!value); // Revert on error
      Alert.alert('Error', 'Failed to update notification preference');
    }
  };

  const toggleLocation = async (value: boolean) => {
    try {
      if (value && Platform.OS !== 'web') {
        // Request permission
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Location permission is required to use this feature.');
          return;
        }
      }

      setLocationOn(value);
      await saveLocationPreference(value);
    } catch (error) {
      console.error('Failed to save location preference:', error);
      setLocationOn(!value); // Revert on error
      Alert.alert('Error', 'Failed to update location preference');
    }
  };

  return {
    notificationsOn,
    locationOn,
    loading,
    toggleNotifications,
    toggleLocation,
  };
}
