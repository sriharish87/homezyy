import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, Radius } from '@/constants/Theme';
import { useAuth } from '@/context/AuthContext';
import { updateProfile, uploadProfilePicture } from '@/services/profileService';

export default function EditProfile() {
	const router = useRouter();
	const { user, updateUser } = useAuth();

	const [name, setName] = useState(user?.name ?? '');
	const [email, setEmail] = useState(user?.email ?? '');
	const [phone, setPhone] = useState(user?.phone ?? '');
	const [saving, setSaving] = useState(false);

	const handleSave = async () => {
		setSaving(true);
		try {
			const payload = { name, email, phone };
			// Optimistically update auth context so changes reflect immediately
			await updateUser({ name, email, phone });

			// Persist via profileService (TODO: backend integration)
			await updateProfile(payload as any);

			Alert.alert('Saved', 'Profile updated');
			router.back();
		} catch (err) {
			console.error('Failed to save profile', err);
			Alert.alert('Error', 'Failed to save profile');
		} finally {
			setSaving(false);
		}
	};

	const handleUploadPhoto = async () => {
		try {
			// TODO: integrate image picker and backend upload
			const res = await uploadProfilePicture('local-path');
			await updateUser({ profilePic: res.url });
			Alert.alert('Photo uploaded');
		} catch (err) {
			console.error('Upload failed', err);
			Alert.alert('Error', 'Failed to upload photo');
		}
	};

	return (
		<SafeAreaView style={styles.safeArea} edges={["top"]}>
			<View style={styles.container}>
				<Text style={styles.title}>Edit Profile</Text>

				<Text style={styles.label}>Full name</Text>
				<TextInput style={styles.input} value={name} onChangeText={setName} />

				<Text style={styles.label}>Email</Text>
				<TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" />

				<Text style={styles.label}>Phone</Text>
				<TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

				<TouchableOpacity style={styles.photoBtn} onPress={handleUploadPhoto}>
					<Text style={styles.photoBtnText}>Upload Photo</Text>
				</TouchableOpacity>

				<TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
					{saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save</Text>}
				</TouchableOpacity>
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: Colors.background },
	container: { padding: Spacing.base },
	title: { fontSize: Typography.xl, fontFamily: 'Manrope-Bold', marginBottom: Spacing.md },
	label: { fontSize: Typography.xs, color: Colors.textMuted, marginTop: Spacing.sm },
	input: { backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.base, marginTop: Spacing.sm, borderWidth: 1, borderColor: Colors.borderLight },
	photoBtn: { marginTop: Spacing.md, backgroundColor: Colors.surface, padding: Spacing.base, borderRadius: Radius.md, alignItems: 'center' },
	photoBtnText: { color: Colors.primary, fontFamily: 'Manrope-SemiBold' },
	saveBtn: { marginTop: Spacing.lg, backgroundColor: Colors.primary, padding: Spacing.base, borderRadius: Radius.md, alignItems: 'center' },
	saveBtnDisabled: { opacity: 0.7 },
	saveBtnText: { color: '#fff', fontFamily: 'Manrope-Bold' },
});
