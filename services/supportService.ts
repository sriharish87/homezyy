import api from '@/lib/axiosConfig';
import type { FAQ, RatingPayload } from '@/types/profile';

// TODO: GET FAQs from backend
export async function getFAQs(): Promise<FAQ[]> {
  try {
    // TODO: Replace with real API call
    // const response = await api.get<FAQ[]>('/faqs');
    // return response.data;
    return [];
  } catch (error) {
    console.error('Failed to fetch FAQs:', error);
    return [];
  }
}

// TODO: GET support messages from backend
export async function getSupportMessages(): Promise<any[]> {
  try {
    // TODO: Replace with real API call
    // const response = await api.get('/support/messages');
    // return response.data;
    return [];
  } catch (error) {
    console.error('Failed to fetch support messages:', error);
    return [];
  }
}

// TODO: POST send support message to backend
export async function sendSupportMessage(message: string): Promise<{ success: boolean; id: string }> {
  try {
    // TODO: Replace with real API call
    // const response = await api.post('/support/messages', { message });
    // return { success: response.data.success, id: response.data.messageId };
    return {
      success: true,
      id: `msg_${Date.now()}`,
    };
  } catch (error) {
    console.error('Failed to send support message:', error);
    throw error;
  }
}

// TODO: POST submit app rating to backend
export async function submitRating(payload: RatingPayload): Promise<{ success: boolean; message: string }> {
  try {
    // TODO: Replace with real API call
    // const response = await api.post('/ratings', payload);
    // return { success: response.data.success, message: response.data.message };
    return {
      success: true,
      message: 'Thank you for rating Homezy! Your feedback helps us improve.',
    };
  } catch (error) {
    console.error('Failed to submit rating:', error);
    return {
      success: false,
      message: 'Failed to submit rating. Please try again.',
    };
  }
}
