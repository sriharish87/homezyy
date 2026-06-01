import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '@/lib/axiosConfig';
import type { Address } from '@/types/profile';

const ADDRESSES_STORAGE_KEY = '@homezy_addresses';

// TODO: Fetch user addresses from backend
export async function getAddresses(): Promise<Address[]> {
	try {
		// TODO: Replace with real API call
		// const response = await api.get<Address[]>('/addresses');
		// return response.data;

		// For now, load from local storage
		const stored = await AsyncStorage.getItem(ADDRESSES_STORAGE_KEY);
		return stored ? JSON.parse(stored) : [];
	} catch (error) {
		console.error('Failed to fetch addresses:', error);
		return [];
	}
}

// TODO: Save new address via backend API
export async function saveAddress(payload: Address): Promise<Address> {
	try {
		// TODO: Replace with real API call
		// const response = await api.post<Address>('/addresses', payload);
		// return response.data;

		const newAddr: Address = { ...payload, id: payload.id ?? `addr_${Date.now()}` };
		const existing = await getAddresses();
		const updated = [newAddr, ...existing];
		await AsyncStorage.setItem(ADDRESSES_STORAGE_KEY, JSON.stringify(updated));
		return newAddr;
	} catch (error) {
		console.error('Failed to save address:', error);
		throw error;
	}
}

// TODO: Update existing address via backend API
export async function updateAddress(id: string, payload: Partial<Address>): Promise<Address | null> {
	try {
		// TODO: Replace with real API call
		// const response = await api.put<Address>(`/addresses/${id}`, payload);
		// return response.data;

		const existing = await getAddresses();
		const idx = existing.findIndex((a) => a.id === id);
		if (idx === -1) return null;

		const updated = { ...existing[idx], ...payload } as Address;
		existing[idx] = updated;
		await AsyncStorage.setItem(ADDRESSES_STORAGE_KEY, JSON.stringify(existing));
		return updated;
	} catch (error) {
		console.error('Failed to update address:', error);
		throw error;
	}
}

// TODO: Delete address via backend API
export async function deleteAddress(id: string): Promise<boolean> {
	try {
		// TODO: Replace with real API call
		// await api.delete(`/addresses/${id}`);
		// return true;

		const existing = await getAddresses();
		const filtered = existing.filter((a) => a.id !== id);
		await AsyncStorage.setItem(ADDRESSES_STORAGE_KEY, JSON.stringify(filtered));
		return filtered.length < existing.length;
	} catch (error) {
		console.error('Failed to delete address:', error);
		throw error;
	}
}

// TODO: Set default address via backend API
export async function setDefaultAddress(id: string): Promise<boolean> {
	try {
		// TODO: Replace with real API call
		// const response = await api.patch<{ success: boolean }>(`/addresses/${id}/default`);
		// return response.data.success;

		const existing = await getAddresses();
		const updated = existing.map((a) => ({ ...a, isDefault: a.id === id }));
		await AsyncStorage.setItem(ADDRESSES_STORAGE_KEY, JSON.stringify(updated));
		return true;
	} catch (error) {
		console.error('Failed to set default address:', error);
		throw error;
	}
}



