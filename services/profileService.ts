import api from '@/lib/axiosConfig';
import type { UserProfile, EditProfilePayload } from '@/types/profile';

// TODO: Fetch user profile from backend
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

// TODO: Save updated profile data to backend
// For now, returns the payload to be saved via AuthContext.updateUser()
export async function updateProfile(payload: EditProfilePayload): Promise<UserProfile> {
  try {
    // TODO: Replace with real API call
    // const response = await api.put<UserProfile>('/profile', payload);
    // return response.data;

    // For now, return the payload as the updated profile
    // This will be saved to state via AuthContext.updateUser()
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

// TODO: Upload profile picture to backend storage
export async function uploadProfilePicture(imagePath: string): Promise<{ url: string }> {
  try {
    // TODO: Replace with real API call
    // const formData = new FormData();
    // formData.append('file', { uri: imagePath, type: 'image/jpeg', name: 'profile.jpg' });
    // const response = await api.post('/profile/picture', formData, {
    //   headers: { 'Content-Type': 'multipart/form-data' }
    // });
    // return response.data;

    // For now, return the local URI
    return { url: imagePath };
  } catch (error) {
    console.error('Failed to upload profile picture:', error);
    throw error;
  }
}

