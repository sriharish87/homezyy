import api from '@/lib/axiosConfig';
import type { UserProfile, EditProfilePayload } from '@/types/profile';

// TODO: GET profile from backend
export async function getProfile(): Promise<UserProfile | null> {
  try {
    // TODO: Replace with real API call
    // const response = await api.get<UserProfile>('/profile');
    // return response.data;
    return null;
  } catch (error) {
    console.error('Failed to fetch profile:', error);
    return null;
  }
}

// TODO: UPDATE profile in backend
export async function updateProfile(payload: EditProfilePayload): Promise<UserProfile> {
  try {
    // TODO: Replace with real API call
    // const response = await api.put<UserProfile>('/profile', payload);
    // return response.data;
    // Return payload merged into minimal response expected by UI
    return {
      id: 'local',
      name: payload.name ?? 'User',
      email: payload.email ?? 'user@example.com',
      phone: payload.phone ?? '',
      profilePic: (payload as any).profilePic,
      role: 'customer',
      isProfileComplete: true,
    } as UserProfile;
  } catch (error) {
    console.error('Failed to update profile:', error);
    throw error;
  }
}

// TODO: UPDATE profile picture in backend
export async function uploadProfilePicture(imagePath: string): Promise<{ url: string }> {
  try {
    // TODO: Replace with real API call
    // const formData = new FormData();
    // formData.append('image', imagePath);
    // const response = await api.post('/profile/picture', formData);
    // return response.data;
    return { url: 'https://via.placeholder.com/150' };
  } catch (error) {
    console.error('Failed to upload profile picture:', error);
    throw error;
  }
}
