import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000';

const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('@homezy_token');

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config;

    if (
      error?.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      const storedRefreshToken = await AsyncStorage.getItem('@homezy_refresh_token');
      const storedUser = await AsyncStorage.getItem('@homezy_user');

      if (!storedRefreshToken) {
        return Promise.reject(error);
      }

      try {
        const parsedUser = storedUser ? JSON.parse(storedUser) : null;

        const refreshResponse = await refreshClient.post('/api/auth/refresh', {
          refreshToken: storedRefreshToken,
          role: parsedUser?.role,
        });

        const newAccessToken = refreshResponse?.data?.accessToken;

        if (!newAccessToken) {
          return Promise.reject(error);
        }

        await AsyncStorage.setItem('@homezy_token', newAccessToken);

        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        return api(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
