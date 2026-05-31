import api from '@/lib/axiosConfig';
import {
  HomeScreenData,
  TrustedProfessional,
  Activity,
  HomeLocation,
  MOCK_HOME_SCREEN_DATA,
  MOCK_TRUSTED_PROFESSIONALS,
  MOCK_ACTIVITIES,
  MOCK_USER_LOCATION,
} from '@/constants/HomeData';

// TODO: Fetch location from backend API: GET /user/location
export async function fetchUserLocation(): Promise<HomeLocation> {
  try {
    // TODO: Replace with real API call when backend is ready
    // const response = await api.get<HomeLocation>('/user/location');
    // return response.data;
    return MOCK_USER_LOCATION;
  } catch (error) {
    console.error('Failed to fetch location:', error);
    return MOCK_USER_LOCATION;
  }
}

// TODO: Fetch trusted professionals from backend API: GET /professionals/featured
export async function fetchTrustedProfessionals(): Promise<TrustedProfessional[]> {
  try {
    // TODO: Replace with real API call when backend is ready
    // const response = await api.get<TrustedProfessional[]>('/professionals/featured');
    // return response.data;
    return MOCK_TRUSTED_PROFESSIONALS;
  } catch (error) {
    console.error('Failed to fetch trusted professionals:', error);
    return MOCK_TRUSTED_PROFESSIONALS;
  }
}

// TODO: Fetch user activity from backend API: GET /bookings/recent
export async function fetchUserActivity(): Promise<Activity[]> {
  try {
    // TODO: Replace with real API call when backend is ready
    // const response = await api.get<Activity[]>('/bookings/recent');
    // return response.data;
    return MOCK_ACTIVITIES;
  } catch (error) {
    console.error('Failed to fetch user activity:', error);
    return MOCK_ACTIVITIES;
  }
}

// TODO: Connect to real notification system
export async function fetchNotificationStatus(): Promise<boolean> {
  try {
    // TODO: Replace with real API call when backend is ready
    // const response = await api.get<{ hasNotifications: boolean }>('/notifications/status');
    // return response.data.hasNotifications;
    return false;
  } catch (error) {
    console.error('Failed to fetch notification status:', error);
    return false;
  }
}

export async function fetchHomeScreenData(): Promise<HomeScreenData> {
  try {
    const [location, professionals, activities, notifications] = await Promise.all([
      fetchUserLocation(),
      fetchTrustedProfessionals(),
      fetchUserActivity(),
      fetchNotificationStatus(),
    ]);

    return {
      location,
      trustedProfessionals: professionals,
      activities,
      hasNotifications: notifications,
    };
  } catch (error) {
    console.error('Failed to fetch home screen data:', error);
    return MOCK_HOME_SCREEN_DATA;
  }
}
