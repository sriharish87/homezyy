import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '@/constants/Theme';
import type { Address } from '@/types/profile';
import { getAddresses, saveAddress, updateAddress, deleteAddress, setDefaultAddress } from '@/services/addressService';

export default function AddressesScreen() {
	const [addresses, setAddresses] = useState<Address[]>([]);
	const [loading, setLoading] = useState(true);
	const [adding, setAdding] = useState(false);
	const [newAddressText, setNewAddressText] = useState('');

	const load = async () => {
		setLoading(true);
		const list = await getAddresses();
		setAddresses(list);
		setLoading(false);
	};

	useEffect(() => { load(); }, []);

	const handleAdd = async () => {
		if (!newAddressText.trim()) return Alert.alert('Enter address');
		const addr: Address = {
			id: `addr_${Date.now()}`,
			type: 'home',
			name: 'New Address',
			address: newAddressText.trim(),
			isDefault: addresses.length === 0,
		};
		await saveAddress(addr);
		setNewAddressText('');
		setAdding(false);
		await load();
	};

	const handleDelete = (id: string) => {
		Alert.alert('Delete', 'Remove this address?', [
			{ text: 'Cancel', style: 'cancel' },
			{ text: 'Delete', style: 'destructive', onPress: async () => { await deleteAddress(id); await load(); } },
		]);
	};

	const handleSetDefault = async (id: string) => {
		await setDefaultAddress(id);
		await load();
	};

	return (
		<SafeAreaView style={styles.safeArea} edges={["top"]}>
			<View style={styles.container}>
				<Text style={styles.title}>Saved Addresses</Text>

				{adding ? (
					<View style={styles.addRow}>
						<TextInput value={newAddressText} onChangeText={setNewAddressText} style={styles.input} placeholder="Address" />
						<TouchableOpacity style={styles.addBtn} onPress={handleAdd}><Text style={styles.addBtnText}>Save</Text></TouchableOpacity>
					</View>
				) : (
					<TouchableOpacity style={styles.addToggle} onPress={() => setAdding(true)}>
						<Text style={styles.addToggleText}>+ Add Address</Text>
					</TouchableOpacity>
				)}

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
								{!item.isDefault && <TouchableOpacity onPress={() => handleSetDefault(item.id)}><Text style={styles.actionText}>Set Default</Text></TouchableOpacity>}
								<TouchableOpacity onPress={() => handleDelete(item.id)}><Text style={[styles.actionText, { color: Colors.error }]}>Delete</Text></TouchableOpacity>
							</View>
						</View>
					)}
				/>
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: Colors.background },
	container: { padding: Spacing.base, flex: 1 },
	title: { fontSize: Typography.xl, fontFamily: 'Manrope-Bold', marginBottom: Spacing.md },
	addToggle: { padding: Spacing.base, backgroundColor: Colors.surface, borderRadius: Radius.md, marginBottom: Spacing.md },
	addToggleText: { color: Colors.primary, fontFamily: 'Manrope-SemiBold' },
	addRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.md },
	input: { flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.base, borderWidth: 1, borderColor: Colors.borderLight },
	addBtn: { marginLeft: 8, backgroundColor: Colors.primary, padding: Spacing.base, borderRadius: Radius.md, justifyContent: 'center' },
	addBtnText: { color: '#fff' },
	card: { flexDirection: 'row', padding: Spacing.base, backgroundColor: Colors.surface, borderRadius: Radius.md, marginBottom: Spacing.sm, alignItems: 'center' },
	addrName: { fontFamily: 'Manrope-Bold', color: Colors.textPrimary },
	addrText: { color: Colors.textMuted, marginTop: 4 },
	actions: { marginLeft: 12, alignItems: 'flex-end' },
	actionText: { color: Colors.primary, fontFamily: 'Manrope-SemiBold', marginBottom: 6 },
});
