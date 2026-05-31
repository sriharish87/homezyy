// ── Types ─────────────────────────────────────────────────────

export interface TrustedProfessional {
  id: string;
  name: string;
  role: string;
  avatar: string;
  rating: number;
  reviewCount: number;
  visits: number;
  satisfaction: number;
  specialization?: string;
}

export interface Activity {
  id: string;
  icon: string;
  serviceName: string;
  price: string;
  timestamp: string;
  description?: string;
}

export interface HomeLocation {
  city: string;
  state: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface HomeScreenData {
  location: HomeLocation;
  trustedProfessionals: TrustedProfessional[];
  activities: Activity[];
  hasNotifications: boolean;
}

// ── Mock Data ──────────────────────────────────────────────────

export const MOCK_USER_LOCATION: HomeLocation = {
  city: 'Hyderabad',
  state: 'IN',
};

export const MOCK_TRUSTED_PROFESSIONALS: TrustedProfessional[] = [
  {
    id: 'prof_1',
    name: 'Rajesh Kumar',
    role: 'Top Rated',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop',
    rating: 4.5,
    reviewCount: 89,
    visits: 45,
    satisfaction: 98,
    specialization: 'Plumbing Services',
  },
];

export const MOCK_ACTIVITIES: Activity[] = [
  {
    id: 'act_1',
    icon: 'cleaning-services',
    serviceName: 'AC Deep Cleaning',
    price: '₹899',
    timestamp: 'Completed: 12-12-2023',
    description: 'COMPLETED - 12-12-2',
  },
  {
    id: 'act_2',
    icon: 'home-repair-service',
    serviceName: 'Full Home Sanitation',
    price: '₹2,499',
    timestamp: 'scheduled at 4:00 PM',
    description: 'scheduled at 4:00 PM',
  },
];

export const MOCK_HOME_SCREEN_DATA: HomeScreenData = {
  location: MOCK_USER_LOCATION,
  trustedProfessionals: MOCK_TRUSTED_PROFESSIONALS,
  activities: MOCK_ACTIVITIES,
  hasNotifications: false,
};
