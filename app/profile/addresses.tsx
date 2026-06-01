import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Alert, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '@/constants/Theme';
import type { Address } from '@/types/profile';
import { getAddresses, saveAddress, deleteAddress, setDefaultAddress } from '@/services/addressService';

export default function AddressesScreen() {
	const [addresses, setAddresses] = useState<Address[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [adding, setAdding] = useState(false);
	const [newAddressText, setNewAddressText] = useState('');
	const [error, setError] = useState<string | null>(null);

	const load = async () => {
		setLoading(true);
		setError(null);
		try {
			// TODO: Fetch user addresses from backend
			const list = await getAddresses();
			setAddresses(list);
		} catch (err) {
			console.error('Failed to load addresses:', err);
			setError('Failed to load addresses. Please try again.');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => { load(); }, []);

	const handleAdd = async () => {
		if (!newAddressText.trim()) {
			Alert.alert('Enter address', 'Please enter an address');
			return;
		}

		setSaving(true);
		try {
			const addr: Address = {
				id: `addr_${Date.now()}`,
				type: 'home',
				name: 'New Address',
				address: newAddressText.trim(),
				city: '',
				state: '',
				postalCode: '',
				phone: '',
				isDefault: addresses.length === 0,
			};
			// TODO: Save new address via backend API
			await saveAddress(addr);
			setNewAddressText('');
			setAdding(false);
			await load();
			Alert.alert('Success', 'Address added successfully');
		} catch (err) {
			console.error('Failed to add address:', err);
			Alert.alert('Error', 'Failed to add address. Please try again.');
		} finally {
			setSaving(false);
		}
	};

	const handleDelete = (id: string) => {
		Alert.alert('Delete', 'Remove this address?', [
			{ text: 'Cancel', style: 'cancel' },
			{
				text: 'Delete',
				style: 'destructive',
				onPress: async () => {
					try {
						// TODO: Delete address via backend API
						await deleteAddress(id);
						await load();
						Alert.alert('Success', 'Address deleted');
					} catch (err) {
						console.error('Failed to delete address:', err);
						Alert.alert('Error', 'Failed to delete address');
					}
				},
			},
		]);
	};

	const handleSetDefault = async (id: string) => {
		try {
			// TODO: Set default address via backend API
			await setDefaultAddress(id);
			await load();
		} catch (err) {
			console.error('Failed to set default:', err);
			Alert.alert('Error', 'Failed to set default address');
		}
	};

	if (loading) {
		return (
			<SafeAreaView style={styles.safeArea} edges={["top"]}>
				<View style={styles.center}>
					<ActivityIndicator size="large" color={Colors.primary} />
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.safeArea} edges={["top"]}>
			<View style={styles.container}>
				<Text style={styles.title}>Saved Addresses</Text>

				{error && (
					<View style={styles.errorContainer}>
						<Text style={styles.errorText}>{error}</Text>
					</View>
				)}

				{adding ? (
					<View style={styles.addRow}>
						<TextInput
							value={newAddressText}
							onChangeText={setNewAddressText}
							style={styles.input}
							placeholder="Address"
							editable={!saving}
						/>
						<TouchableOpacity
							style={[styles.addBtn, saving && styles.addBtnDisabled]}
							onPress={handleAdd}
							disabled={saving}
						>
							{saving ? (
								<ActivityIndicator size="small" color="#fff" />
							) : (
								<Text style={styles.addBtnText}>Save</Text>
							)}
						</TouchableOpacity>
					</View>
				) : (
					<TouchableOpacity style={styles.addToggle} onPress={() => setAdding(true)}>
						<Text style={styles.addToggleText}>+ Add Address</Text>
					</TouchableOpacity>
				)}

				{addresses.length === 0 ? (
					<View style={styles.emptyState}>
						<Text style={styles.emptyText}>No addresses yet. Add one to get started.</Text>
					</View>
				) : (
					<FlatList
						data={addresses}
						keyExtractor={(i: Address) => i.id}
						renderItem={({ item }: { item: Address }) => (
							<View style={styles.card}>
								<View style={{ flex: 1 }}>
									<Text style={styles.addrName}>{item.name} {item.isDefault ? '· Default' : ''}</Text>
									<Text style={styles.addrText}>{item.address}</Text>
								</View>
								<View style={styles.actions}>
									{!item.isDefault && (
										<TouchableOpacity onPress={() => handleSetDefault(item.id)}>
											<Text style={styles.actionText}>Set Default</Text>
										</TouchableOpacity>
									)}
									<TouchableOpacity onPress={() => handleDelete(item.id)}>
										<Text style={[styles.actionText, { color: Colors.error }]}>Delete</Text>
									</TouchableOpacity>
								</View>
							</View>
						)}
						scrollEnabled={false}
					/>
				)}
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: Colors.background },
	container: { padding: Spacing.base, flex: 1 },
	center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
	title: { fontSize: Typography.xl, fontFamily: 'Manrope-Bold', marginBottom: Spacing.md },
	errorContainer: { backgroundColor: Colors.error + '15', borderRadius: Radius.md, padding: Spacing.sm, marginBottom: Spacing.md },
	errorText: { color: Colors.error, fontSize: Typography.sm, fontFamily: 'Manrope-Medium' },
	addToggle: { padding: Spacing.base, backgroundColor: Colors.surface, borderRadius: Radius.md, marginBottom: Spacing.md },
	addToggleText: { color: Colors.primary, fontFamily: 'Manrope-SemiBold' },
	addRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.md },
	input: { flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.base, borderWidth: 1, borderColor: Colors.borderLight },
	addBtn: { marginLeft: 8, backgroundColor: Colors.primary, padding: Spacing.base, borderRadius: Radius.md, justifyContent: 'center' },
	addBtnDisabled: { opacity: 0.7 },
	addBtnText: { color: '#fff' },
	emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
	emptyText: { color: Colors.textMuted, fontFamily: 'Manrope-Medium', textAlign: 'center' },
	card: { flexDirection: 'row', padding: Spacing.base, backgroundColor: Colors.surface, borderRadius: Radius.md, marginBottom: Spacing.sm, alignItems: 'center' },
	addrName: { fontFamily: 'Manrope-Bold', color: Colors.textPrimary },
	addrText: { color: Colors.textMuted, marginTop: 4 },
	actions: { marginLeft: 12, alignItems: 'flex-end' },
	actionText: { color: Colors.primary, fontFamily: 'Manrope-SemiBold', marginBottom: 6 },
});
