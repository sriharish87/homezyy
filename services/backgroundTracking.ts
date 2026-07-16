import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '@/lib/axiosConfig';

export const BACKGROUND_TRACKING_TASK = 'BACKGROUND_TRACKING_TASK';
const ACTIVE_TRACKING_BOOKING_KEY = '@fixi_active_tracking_booking_id';

// The Headless Bridge: Invisible background process triggered by Android when GPS registers 10m movement
TaskManager.defineTask(BACKGROUND_TRACKING_TASK, async ({ data, error }) => {
  if (error) {
    console.error('[BackgroundTracking] Task error:', error.message);
    return;
  }

  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    if (!locations || locations.length === 0) return;

    const location = locations[0];
    try {
      const bookingId = await AsyncStorage.getItem(ACTIVE_TRACKING_BOOKING_KEY);
      if (!bookingId) {
        console.warn('[BackgroundTracking] No active booking ID found in storage. Stopping tracker.');
        await Location.stopLocationUpdatesAsync(BACKGROUND_TRACKING_TASK);
        return;
      }

      console.log(`[BackgroundTracking] Waking up! Sending coords for booking ${bookingId}:`, {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      });

      // Fire a single lightweight HTTP POST to Node.js backend and return to sleep
      const response = await api.post('/tracking/location', {
        bookingId,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        heading: location.coords.heading || 0,
        speed: location.coords.speed || 0,
      });

      if (response.data?.arrived) {
        console.log('[BackgroundTracking] Geofence arrived triggered! Stopping background tracking automatically.');
        await stopTechnicianTracking();
      }
    } catch (err: any) {
      console.error('[BackgroundTracking] Failed to post location update:', err?.message || err);
    }
  }
});

/**
 * Starts Phase 1 technician location tracking with 10m hardware GPS filter and Android Foreground Service.
 */
export async function startTechnicianTracking(bookingId: string): Promise<boolean> {
  try {
    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== 'granted') {
      console.warn('[BackgroundTracking] Foreground location permission denied');
      return false;
    }

    const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
    if (bgStatus !== 'granted') {
      console.warn('[BackgroundTracking] Background location permission denied');
      return false;
    }

    await AsyncStorage.setItem(ACTIVE_TRACKING_BOOKING_KEY, bookingId);

    const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_TRACKING_TASK);
    if (isTaskRegistered) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_TRACKING_TASK);
    }

    // The Hardware Trigger & OS Shield
    await Location.startLocationUpdatesAsync(BACKGROUND_TRACKING_TASK, {
      accuracy: Location.Accuracy.Highest,
      distanceInterval: 10, // 10-meter hardware distance filter
      timeInterval: 5000,   // Safety interval
      foregroundService: {
        notificationTitle: 'Fixi Active Tracking',
        notificationBody: 'Sharing live location during active booking. Do not close app.',
        notificationColor: '#3e2a56',
      },
    });

    console.log(`[BackgroundTracking] Started background tracking for booking: ${bookingId}`);
    return true;
  } catch (error: any) {
    console.error('[BackgroundTracking] Error starting tracking:', error?.message || error);
    return false;
  }
}

/**
 * Stops technician location updates and clears stored active booking ID.
 */
export async function stopTechnicianTracking(): Promise<void> {
  try {
    const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_TRACKING_TASK);
    if (isTaskRegistered) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_TRACKING_TASK);
    }
    await AsyncStorage.removeItem(ACTIVE_TRACKING_BOOKING_KEY);
    console.log('[BackgroundTracking] Stopped background tracking and cleared active booking ID');
  } catch (error: any) {
    console.error('[BackgroundTracking] Error stopping tracking:', error?.message || error);
  }
}

/**
 * Checks if tracking is currently active for any booking.
 */
export async function getActiveTrackingBookingId(): Promise<string | null> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_TRACKING_TASK);
    if (!isRegistered) return null;
    return await AsyncStorage.getItem(ACTIVE_TRACKING_BOOKING_KEY);
  } catch {
    return null;
  }
}
