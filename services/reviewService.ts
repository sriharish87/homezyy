import api from '@/lib/axiosConfig';

export interface ReviewItem {
  _id: string;
  bookingId: string;
  customerId: {
    _id: string;
    name?: string;
    profilePic?: string;
  };
  technicianId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface SubmitReviewPayload {
  bookingId: string;
  technicianId: string;
  rating: number;
  comment?: string;
}

export interface SubmitReviewResponse {
  success: boolean;
  message: string;
  review: ReviewItem;
  pointsEarned: number;
}

export interface TechnicianReviewsResponse {
  success: boolean;
  rating: number;
  numberOfRatings: number;
  reviews: ReviewItem[];
}

/**
 * Submit customer feedback for a completed booking
 */
export async function submitReview(payload: SubmitReviewPayload): Promise<SubmitReviewResponse> {
  const response = await api.post('/api/reviews', payload);
  return response.data;
}

/**
 * Fetch reviews and rolling average rating for a technician
 */
export async function fetchTechnicianReviews(technicianId: string): Promise<TechnicianReviewsResponse> {
  const response = await api.get(`/api/reviews/technician/${technicianId}`);
  return response.data;
}
