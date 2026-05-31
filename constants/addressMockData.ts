export interface Address {
  id: string;
  type: 'home' | 'work' | 'other';
  name: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  phone: string;
  isDefault: boolean;
  latitude?: number;
  longitude?: number;
}

export const MOCK_ADDRESSES: Address[] = [
  {
    id: 'addr_001',
    type: 'home',
    name: 'Home',
    address: '123 Green Street, Apartment 4B',
    city: 'Hyderabad',
    state: 'Telangana',
    postalCode: '500081',
    phone: '+91 98765-43210',
    isDefault: true,
    latitude: 17.3850,
    longitude: 78.4867,
  },
  {
    id: 'addr_002',
    type: 'work',
    name: 'Office',
    address: '456 Tech Park, Tower A, Floor 5',
    city: 'Hyderabad',
    state: 'Telangana',
    postalCode: '500082',
    phone: '+91 98765-43211',
    isDefault: false,
    latitude: 17.3880,
    longitude: 78.4950,
  },
];
