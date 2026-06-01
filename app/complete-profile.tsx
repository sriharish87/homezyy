import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { completeUserProfile } from '@/services/authService';
import { useAuth } from '@/context/AuthContext';
import LocationPicker from '@/components/LocationPicker';
import { CATEGORIES } from '@/constants/Data';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/Theme';

export default function CompleteProfileScreen() {
  const router = useRouter();
  const { user, updateUser, authLoading } = useAuth();
  const role = user?.role === 'technician' ? 'technician' : 'customer';

  const [phone, setPhone] = useState(user?.phone ?? '');
  const [addressText, setAddressText] = useState(
    user?.address_text || user?.address || ''
  );
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedSubservices, setSelectedSubservices] = useState<string[]>([]);
  const [experienceYears, setExperienceYears] = useState('');
  const [pricePerHour, setPricePerHour] = useState('');
  const [saving, setSaving] = useState(false);

  const parseNumber = (value: string) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const cacheLocation = async (latNumber: number, lngNumber: number) => {
    await AsyncStorage.multiSet([
      ['@homezy_lat', String(latNumber)],
      ['@homezy_lng', String(lngNumber)],
    ]);
  };

  const availableSubservices = useMemo(() => {
    return selectedServices.map((service) => {
      const category = CATEGORIES.find((entry) => entry.id === service);
      const cleaned = (category?.subservices || []).filter(
        (item) => !/visit/i.test(item.trim())
      );
      return { service, subservices: cleaned };
    });
  }, [selectedServices]);

  useEffect(() => {
    const validSubservices = new Set(
      availableSubservices.flatMap((entry) => entry.subservices)
    );
    setSelectedSubservices((prev) => prev.filter((item) => validSubservices.has(item)));
  }, [availableSubservices]);

  const toggleService = (serviceId: string) => {
    setSelectedServices((prev) =>
      prev.includes(serviceId)
        ? prev.filter((item) => item !== serviceId)
        : [...prev, serviceId]
    );
  };

  const toggleSubservice = (subservice: string) => {
    setSelectedSubservices((prev) =>
      prev.includes(subservice)
        ? prev.filter((item) => item !== subservice)
        : [...prev, subservice]
    );
  };

  const submit = async () => {
    if (!phone.trim()) {
      Alert.alert('Missing details', 'Please fill phone number.');
      return;
    }

    const latNumber = parseNumber(lat);
    const lngNumber = parseNumber(lng);

    if (latNumber === null || lngNumber === null) {
      Alert.alert('Missing details', 'Please enter valid latitude and longitude.');
      return;
    }

    try {
      setSaving(true);

      await cacheLocation(latNumber, lngNumber);

      if (role === 'technician') {
        const experienceNumber = parseNumber(experienceYears);
        const priceNumber = parseNumber(pricePerHour);

        if (
          !selectedServices.length ||
          !selectedSubservices.length ||
          experienceNumber === null ||
          priceNumber === null
        ) {
          Alert.alert(
            'Missing details',
            'Please select services and subservices, then fill experience years and price per hour.'
          );
          return;
        }

        const technicianPayload = {
          phone: phone.trim(),
          services: selectedServices,
          subservices: selectedSubservices,
          experienceYears: experienceNumber,
          pricePerHour: priceNumber,
          location: {
            type: 'Point' as const,
            coordinates: [lngNumber, latNumber] as [number, number],
          },
        };

        const updated = await completeUserProfile(technicianPayload, role);

        await updateUser({
          ...updated,
          ...technicianPayload,
          role,
          isProfileComplete: true,
        });
      } else {
        if (!addressText.trim()) {
          Alert.alert('Missing details', 'Please fill address.');
          return;
        }

        const customerPayload = {
          phone: phone.trim(),
          address_text: addressText.trim(),
          lat: latNumber,
          lng: lngNumber,
        };

        const updated = await completeUserProfile(customerPayload, role);

        await updateUser({
          ...updated,
          phone: customerPayload.phone,
          address: customerPayload.address_text,
          address_text: customerPayload.address_text,
          location: {
            type: 'Point',
            coordinates: [customerPayload.lng, customerPayload.lat],
          },
          role,
          isProfileComplete: true,
        });
      }

      router.replace('/(tabs)/home' as any);
    } catch (error) {
      console.error('Complete profile failed:', error);
      Alert.alert('Error', 'Failed to complete profile. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute onlyIncompleteProfile>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <SafeAreaView style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.badge}>
                <MaterialIcons name="verified-user" size={28} color={Colors.primary} />
              </View>
              <Text style={styles.title}>Complete Your Profile</Text>
              <Text style={styles.subtitle}>
                {role === 'technician'
                  ? 'Add technician details before accepting jobs.'
                  : 'Add your details before booking services.'}
              </Text>
            </View>

            {/* Form Card */}
            <View style={styles.card}>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="call" size={20} style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="Phone number"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                />
              </View>

              <View style={styles.inputWrapper}>
                <MaterialIcons name="location-on" size={20} style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder={role === 'technician' ? 'Service area (optional text)' : 'Address'}
                  placeholderTextColor={Colors.textMuted}
                  value={addressText}
                  onChangeText={setAddressText}
                />
              </View>

              <LocationPicker
                onLocationFetched={(latitude, longitude) => {
                  setLat(String(latitude));
                  setLng(String(longitude));
                }}
              />

              {role === 'technician' ? (
                <>
                  <View style={styles.inputWrapper}>
                    <MaterialIcons name="build" size={20} style={styles.icon} />
                    <View style={styles.multiSelectContainer}>
                      <Text style={styles.multiSelectLabel}>Select services</Text>
                      <View style={styles.chipGroup}>
                        {CATEGORIES.map((service) => {
                          const isSelected = selectedServices.includes(service.id);
                          return (
                            <TouchableOpacity
                              key={service.id}
                              style={[
                                styles.chip,
                                isSelected && styles.chipSelected,
                              ]}
                              onPress={() => toggleService(service.id)}
                              activeOpacity={0.8}
                            >
                              <Text
                                style={[
                                  styles.chipText,
                                  isSelected && styles.chipTextSelected,
                                ]}
                              >
                                {service.name}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  </View>

                  {selectedServices.length > 0 && (
                    <View style={styles.inputWrapper}>
                      <MaterialIcons name="format-list-bulleted" size={20} style={styles.icon} />
                      <View style={styles.multiSelectContainer}>
                        <Text style={styles.multiSelectLabel}>Select subservices</Text>
                        {availableSubservices.map((entry) => (
                          <View key={entry.service} style={styles.subserviceBlock}>
                            <Text style={styles.subserviceTitle}>{entry.service}</Text>
                            <View style={styles.chipGroup}>
                              {entry.subservices.map((subservice) => {
                                const isSelected = selectedSubservices.includes(subservice);
                                return (
                                  <TouchableOpacity
                                    key={`${entry.service}-${subservice}`}
                                    style={[
                                      styles.chip,
                                      isSelected && styles.chipSelected,
                                    ]}
                                    onPress={() => toggleSubservice(subservice)}
                                    activeOpacity={0.8}
                                  >
                                    <Text
                                      style={[
                                        styles.chipText,
                                        isSelected && styles.chipTextSelected,
                                      ]}
                                    >
                                      {subservice}
                                    </Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  <View style={styles.inputWrapper}>
                    <MaterialIcons name="timeline" size={20} style={styles.icon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Experience years"
                      placeholderTextColor={Colors.textMuted}
                      keyboardType="number-pad"
                      value={experienceYears}
                      onChangeText={setExperienceYears}
                    />
                  </View>

                  <View style={styles.inputWrapper}>
                    <MaterialIcons name="currency-rupee" size={20} style={styles.icon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Price per hour"
                      placeholderTextColor={Colors.textMuted}
                      keyboardType="number-pad"
                      value={pricePerHour}
                      onChangeText={setPricePerHour}
                    />
                  </View>
                </>
              ) : null}

              <TouchableOpacity
                style={[styles.button, (saving || authLoading) && styles.disabled]}
                onPress={submit}
                disabled={saving || authLoading}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Save and Continue</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  safeArea: { flex: 1 },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  badge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: Typography['2xl'],
    fontFamily: 'Manrope-Black',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    textAlign: 'center',
    fontFamily: 'Manrope-Regular',
    color: Colors.textSecondary,
    fontSize: Typography.base,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    ...Shadow.md,
  },
  inputWrapper: {
    marginBottom: Spacing.md,
    position: 'relative',
  },
  icon: {
    position: 'absolute',
    left: 12,
    top: 17,
    color: Colors.textSecondary,
    zIndex: 1,
  },
  input: {
    height: 56,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingLeft: 40,
    backgroundColor: Colors.surfaceAlt,
    fontFamily: 'Manrope-Medium',
    fontSize: Typography.base,
    color: Colors.textPrimary,
  },
  multiSelectContainer: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
    paddingLeft: 40,
    backgroundColor: Colors.surfaceAlt,
  },
  multiSelectLabel: {
    fontSize: Typography.sm,
    fontFamily: 'Manrope-SemiBold',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.surface,
  },
  chipSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: Typography.sm,
    fontFamily: 'Manrope-SemiBold',
    color: Colors.textPrimary,
  },
  chipTextSelected: {
    color: Colors.primary,
  },
  subserviceBlock: {
    marginBottom: Spacing.sm,
  },
  subserviceTitle: {
    fontSize: Typography.sm,
    fontFamily: 'Manrope-Bold',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
    ...Shadow.lg,
  },
  buttonText: {
    color: '#fff',
    fontSize: Typography.md,
    fontFamily: 'Manrope-Bold',
  },
  disabled: {
    opacity: 0.65,
  },
});
