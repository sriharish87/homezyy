import { MOCK_ADDRESSES } from '@/constants/addressMockData';
import type { Address } from '@/types/profile';

// TODO: GET addresses from backend
let addresses: Address[] = MOCK_ADDRESSES.map((a) => ({ ...a }));

export async function getAddresses(): Promise<Address[]> {
	try {
		// TODO: Replace with real API call
		return addresses.map((a) => ({ ...a }));
	} catch (error) {
		console.error('Failed to fetch addresses:', error);
		return addresses.map((a) => ({ ...a }));
	}
}

// TODO: SAVE address to backend
export async function saveAddress(payload: Address): Promise<Address> {
	const newAddr: Address = { ...payload, id: payload.id ?? `addr_${Date.now()}` };
	if (newAddr.isDefault) addresses = addresses.map((a) => ({ ...a, isDefault: false }));
	addresses = [newAddr, ...addresses];
	return { ...newAddr };
}

export async function updateAddress(id: string, payload: Partial<Address>): Promise<Address | null> {
	const idx = addresses.findIndex((a) => a.id === id);
	if (idx === -1) return null;
	const updated = { ...addresses[idx], ...payload } as Address;
	if (payload.isDefault) {
		addresses = addresses.map((a) => ({ ...a, isDefault: a.id === id }));
	} else {
		addresses[idx] = updated;
	}
	return { ...updated };
}

export async function deleteAddress(id: string): Promise<boolean> {
	const before = addresses.length;
	addresses = addresses.filter((a) => a.id !== id);
	return addresses.length < before;
}

export async function setDefaultAddress(id: string): Promise<boolean> {
	const exists = addresses.some((a) => a.id === id);
	if (!exists) return false;
	addresses = addresses.map((a) => ({ ...a, isDefault: a.id === id }));
	return true;
}

