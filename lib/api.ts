// ── Base configuration ─────────────────────────────────────
// Replace BASE_URL with your actual backend URL before production.
const BASE_URL = 'https://api.homezy.example.com/v1';

// ── Simple fetch wrapper ───────────────────────────────────
async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      // TODO: Add auth token here:
      // 'Authorization': `Bearer ${await getToken()}`,
    },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Types ──────────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  bgColor: string;
  count: string;
  subservices: string[];
}

export interface Service {
  id: string;
  title: string;
  price: string;
  rating: string;
  reviews: string;
  duration: string;
  img: string;
  tab: string;
  category?: string;
}

export interface Offer {
  id: string;
  title: string;
  description: string;
  code: string;
  color: string;
}

export interface Booking {
  id: string;
  serviceName: string;
  providerName: string;
  category: string;
  date: string;
  time: string;
  location: string;
  price: string;
  status: 'upcoming' | 'completed' | 'cancelled';
  serviceImage: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  totalBookings?: number;
  totalReviews?: number;
}

// ── Auth ───────────────────────────────────────────────────
// Auth is handled via Google Sign-In through:
//   - services/authService.ts (loginWithGoogleToken, completeUserProfile)
//   - context/AuthContext.tsx (login, setSession, logout)
// No phone/OTP flow is used.

// ── Categories ─────────────────────────────────────────────

/**
 * Fetch all service categories.
 * TODO: GET /categories
 */
export async function fetchCategories(): Promise<Category[]> {
  // return apiFetch<Category[]>('/categories');
  const { CATEGORIES } = await import('@/constants/Data');
  return CATEGORIES;
}

// ── Services ───────────────────────────────────────────────

/**
 * Fetch sub-services for a category.
 * TODO: GET /categories/:id/services
 */
export async function fetchSubServices(categoryId: string): Promise<Service[]> {
  // return apiFetch<Service[]>(`/categories/${categoryId}/services`);
  const { ALL_SUBSERVICES } = await import('@/constants/Data');
  return (ALL_SUBSERVICES[categoryId] ?? []).map((s, i) => ({ ...s, id: `${categoryId}-${i}` }));
}

/**
 * Fetch popular services for the home screen.
 * TODO: GET /services/popular
 */
export async function fetchPopularServices(): Promise<Service[]> {
  // return apiFetch<Service[]>('/services/popular');
  const { ALL_SUBSERVICES } = await import('@/constants/Data');
  return [
    { ...(ALL_SUBSERVICES['Electrical']?.[0] ?? {}), id: 'pop-1', category: 'Electrical' } as Service,
    { ...(ALL_SUBSERVICES['Plumbing']?.[0]   ?? {}), id: 'pop-2', category: 'Plumbing'   } as Service,
  ];
}

// ── Offers ─────────────────────────────────────────────────

/**
 * Fetch active promotional offers.
 * TODO: GET /offers
 */
export async function fetchOffers(): Promise<Offer[]> {
  // return apiFetch<Offer[]>('/offers');
  const { OFFERS } = await import('@/constants/Data');
  return OFFERS;
}

/**
 * Claim an offer by ID.
 * TODO: POST /offers/:id/claim
 */
export async function claimOffer(offerId: string): Promise<void> {
  // await apiFetch(`/offers/${offerId}/claim`, { method: 'POST' });
  console.log('[API STUB] claimOffer:', offerId);
  await delay(400);
}

// ── Bookings ───────────────────────────────────────────────

/**
 * Fetch all bookings for the current user.
 * TODO: GET /bookings?status=all|upcoming|completed|cancelled
 */
export async function fetchBookings(status?: string): Promise<Booking[]> {
  // const query = status ? `?status=${status}` : '';
  // return apiFetch<Booking[]>(`/bookings${query}`);
  console.log('[API STUB] fetchBookings:', status ?? 'all');
  return [];
}

/**
 * Create a new booking.
 * TODO: POST /bookings
 */
export async function createBooking(payload: {
  serviceId: string;
  packageId: string;
  date: string;
  timeSlot: string;
  address: string;
}): Promise<Booking> {
  // return apiFetch<Booking>('/bookings', { method: 'POST', body: JSON.stringify(payload) });
  console.log('[API STUB] createBooking:', payload);
  await delay(800);
  return {
    id: `HMZ-${Date.now()}`,
    serviceName: 'Service',
    providerName: 'Homezy Pro',
    category: 'General',
    date: payload.date,
    time: payload.timeSlot,
    location: payload.address,
    price: '₹199',
    status: 'upcoming',
    serviceImage: '',
  };
}

/**
 * Cancel a booking by ID.
 * TODO: DELETE /bookings/:id
 */
export async function cancelBooking(bookingId: string): Promise<void> {
  // await apiFetch(`/bookings/${bookingId}`, { method: 'DELETE' });
  console.log('[API STUB] cancelBooking:', bookingId);
  await delay(400);
}

// ── User ───────────────────────────────────────────────────

/**
 * Fetch the current authenticated user's profile.
 * TODO: GET /user/me
 */
export async function fetchProfile(): Promise<User> {
  // return apiFetch<User>('/user/me');
  return { id: 'u1', name: 'Homezy User', email: '' };
}

/**
 * Update user profile fields.
 * TODO: PATCH /user/me
 */
export async function updateProfile(data: Partial<User>): Promise<User> {
  // return apiFetch<User>('/user/me', { method: 'PATCH', body: JSON.stringify(data) });
  console.log('[API STUB] updateProfile:', data);
  await delay(600);
  return { id: 'u1', name: 'Homezy User', email: '', ...data };
}

// ── Helpers ────────────────────────────────────────────────

function delay(ms: number) {
  return new Promise<void>((res) => setTimeout(res, ms));
}
