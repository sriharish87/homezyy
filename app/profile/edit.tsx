import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, Radius } from '@/constants/Theme';
import { useAuth } from '@/context/AuthContext';
import { updateProfile, uploadProfilePicture } from '@/services/profileService';
import * as ImagePicker from 'expo-image-picker';

export default function EditProfile() {
	const router = useRouter();
	const { user, updateUser } = useAuth();

	const [name, setName] = useState(user?.name ?? '');
	const [email, setEmail] = useState(user?.email ?? '');
	const [phone, setPhone] = useState(user?.phone ?? '');
	const [profilePic, setProfilePic] = useState<string | undefined>(user?.profilePic ?? undefined);
	const [imageLocal, setImageLocal] = useState<any>(null);
	const [saving, setSaving] = useState(false);
	const [validationError, setValidationError] = useState<string | null>(null);

	const validateInputs = (): boolean => {
		if (!name.trim()) {
			setValidationError('Full name is required');
			return false;
		}
		if (name.trim().length < 2) {
			setValidationError('Name must be at least 2 characters');
			return false;
		}
		if (!email.trim()) {
			setValidationError('Email is required');
			return false;
		}
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			setValidationError('Invalid email format');
			return false;
		}
		if (phone && !/^\+?[\d\s\-()]{10,}$/.test(phone)) {
			setValidationError('Invalid phone number format');
			return false;
		}
		setValidationError(null);
		return true;
	};

	const requestMediaPermission = async () => {
		const res = await ImagePicker.requestMediaLibraryPermissionsAsync();
		if (res.status !== 'granted') {
			Alert.alert('Permission required', 'Permission to access photos is required.');
			return false;
		}
		return true;
	};

	const pickImage = async () => {
		const ok = await requestMediaPermission();
		if (!ok) return;

		const res = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ImagePicker.MediaTypeOptions.Images,
			allowsEditing: true,
			quality: 0.8,
			aspect: [1, 1],
		});

		if ((res as any).canceled || (res as any).cancelled) return;

		const uri = (res as any).assets ? (res as any).assets[0].uri : (res as any).uri;
		if (!uri) return;

		setProfilePic(uri);
		setImageLocal((res as any).assets ? (res as any).assets[0] : res);
	};

	const handleSave = async () => {
		if (!validateInputs()) return;

		setSaving(true);
		try {
			let uploadedUrl: string | undefined;

			// TODO: If user picked a new image, upload to backend
			if (imageLocal && (imageLocal.uri || imageLocal.localUri)) {
				const localUri = imageLocal.uri ?? imageLocal.localUri;
				try {
					const up = await uploadProfilePicture(localUri);
					uploadedUrl = up?.url;
				} catch (err) {
					console.warn('Profile picture upload failed:', err);
					Alert.alert('Warning', 'Profile picture could not be uploaded. Profile will be saved without picture.');
				}
			}

			const payload: any = { name, email, phone, profilePic: uploadedUrl ?? profilePic };

			console.log('Saving profile payload:', payload);

			// TODO: Save updated profile data to backend
			const saved = await updateProfile(payload as any);
			console.log('Profile save response:', saved);

			// TODO: Refresh global user state after successful update
			if (saved && typeof saved === 'object') {
				await updateUser(saved as any);
			} else {
				await updateUser(payload);
			}

			Alert.alert('Success', 'Profile updated successfully');
			router.back();
		} catch (err) {
			console.error('Failed to save profile', err);
			Alert.alert('Error', 'Failed to save profile. Please try again.');
		} finally {
			setSaving(false);
		}
	};

	return (
		<SafeAreaView style={styles.safeArea} edges={["top"]}>
			<View style={styles.container}>
				<Text style={styles.title}>Edit Profile</Text>

				<View style={styles.avatarRow}>
					<Image source={{ uri: profilePic ?? 'https://via.placeholder.com/100' }} style={styles.avatar} />
					<TouchableOpacity style={styles.photoBtn} onPress={pickImage}>
						<Text style={styles.photoBtnText}>Change Photo</Text>
					</TouchableOpacity>
				</View>

				{validationError && (
					<View style={styles.errorContainer}>
						<Text style={styles.errorText}>{validationError}</Text>
					</View>
				)}

				<Text style={styles.label}>Full name</Text>
				<TextInput
					style={styles.input}
					value={name}
					onChangeText={(text: string) => {
						setName(text);
						setValidationError(null);
					}}
					placeholder="Enter your full name"
					editable={!saving}
				/>

				<Text style={styles.label}>Email</Text>
				<TextInput
					style={styles.input}
					value={email}
					onChangeText={(text: string) => {
						setEmail(text);
						setValidationError(null);
					}}
					keyboardType="email-address"
					placeholder="Enter your email"
					editable={!saving}
				/>

				<Text style={styles.label}>Phone</Text>
				<TextInput
					style={styles.input}
					value={phone}
					onChangeText={(text: string) => {
						setPhone(text);
						setValidationError(null);
					}}
					keyboardType="phone-pad"
					placeholder="Enter your phone number"
					editable={!saving}
				/>

				<TouchableOpacity
					style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
					onPress={handleSave}
					disabled={saving}
				>
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
	errorContainer: { backgroundColor: Colors.error + '15', borderRadius: Radius.md, padding: Spacing.sm, marginBottom: Spacing.md },
	errorText: { color: Colors.error, fontSize: Typography.sm, fontFamily: 'Manrope-Medium' },
	avatarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
	avatar: { width: 88, height: 88, borderRadius: Radius.full, backgroundColor: Colors.surfaceAlt },
	photoBtn: { marginLeft: Spacing.md, backgroundColor: Colors.surface, padding: Spacing.base, borderRadius: Radius.md, alignItems: 'center' },
	photoBtnText: { color: Colors.primary, fontFamily: 'Manrope-SemiBold' },
	saveBtn: { marginTop: Spacing.lg, backgroundColor: Colors.primary, padding: Spacing.base, borderRadius: Radius.md, alignItems: 'center' },
	saveBtnDisabled: { opacity: 0.7 },
	saveBtnText: { color: '#fff', fontFamily: 'Manrope-Bold' },
});

