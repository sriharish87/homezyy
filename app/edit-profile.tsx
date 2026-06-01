import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { Colors, Typography, Spacing, Radius } from '@/constants/Theme';
import { CATEGORIES } from '@/constants/Data';
import api from '@/lib/axiosConfig';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, updateUser } = useAuth();
  const isTech = user?.role === 'technician';

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  
  // Location/Address state
  const [addressText, setAddressText] = useState(user?.address_text || user?.address || '');
  const [lat, setLat] = useState(user?.location?.coordinates?.[1]?.toString() || '');
  const [lng, setLng] = useState(user?.location?.coordinates?.[0]?.toString() || '');

  // Tech state
  const [experience, setExperience] = useState(user?.experienceYears?.toString() || '');
  const [price, setPrice] = useState(user?.pricePerHour?.toString() || '');
  const [selectedServices, setSelectedServices] = useState<string[]>(user?.services || []);
  const [selectedSubservices, setSelectedSubservices] = useState<string[]>(user?.subservices || []);
  
  const [loading, setLoading] = useState(false);

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

  const parseNumber = (value: string) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const handleSave = async () => {
    if (!name.trim() || !phone.trim()) {
      Alert.alert('Validation Error', 'Name and Phone are required.');
      return;
    }

    const latNumber = parseNumber(lat);
    const lngNumber = parseNumber(lng);

    try {
      setLoading(true);
      const payload: any = { 
        name, 
        phone 
      };

      if (latNumber !== null && lngNumber !== null) {
        payload.location = {
          type: 'Point',
          coordinates: [lngNumber, latNumber]
        };
      }
      
      if (isTech) {
        payload.experience = parseNumber(experience) || 0;
        payload.pricePerHour = parseNumber(price) || 0;
        payload.services = selectedServices;
        payload.subservices = selectedSubservices;
      } else {
        payload.address_text = addressText;
      }

      // Backend route for update depends on role
      const endpoint = isTech ? '/tech' : '/user';
      const response = await api.post(endpoint, payload);
      
      // Update local Auth context to reflect instantly
      await updateUser({
        name: response.data.name,
        phone: response.data.phone,
        location: response.data.location,
        address_text: response.data.address_text,
        address: response.data.address_text,
        ...(isTech && {
          experienceYears: response.data.experience,
          pricePerHour: response.data.pricePerHour,
          services: response.data.services,
          subservices: response.data.subservices,
        })
      });

      router.back();
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to save profile changes.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <View style={styles.inputWrap}>
              <MaterialIcons name="person-outline" size={20} color={Colors.textMuted} />
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="John Doe"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <View style={styles.inputWrap}>
              <MaterialIcons name="phone" size={20} color={Colors.textMuted} />
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="9876543210"
                keyboardType="phone-pad"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
          </View>

          {!isTech && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Address</Text>
              <View style={styles.inputWrap}>
                <MaterialIcons name="location-on" size={20} color={Colors.textMuted} />
                <TextInput
                  style={styles.input}
                  value={addressText}
                  onChangeText={setAddressText}
                  placeholder="Address"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Latitude</Text>
            <View style={styles.inputWrap}>
              <MaterialIcons name="my-location" size={20} color={Colors.textMuted} />
              <TextInput
                style={styles.input}
                value={lat}
                onChangeText={setLat}
                placeholder="e.g. 13.0827"
                keyboardType="decimal-pad"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Longitude</Text>
            <View style={styles.inputWrap}>
              <MaterialIcons name="explore" size={20} color={Colors.textMuted} />
              <TextInput
                style={styles.input}
                value={lng}
                onChangeText={setLng}
                placeholder="e.g. 80.2707"
                keyboardType="decimal-pad"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
          </View>

          {isTech && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Select Services</Text>
                <View style={styles.multiSelectContainer}>
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
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Select Subservices</Text>
                  <View style={styles.multiSelectContainer}>
                    {availableSubservices.map((entry) => (
                      <View key={entry.service} style={{ marginBottom: 12 }}>
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

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Years of Experience</Text>
                <View style={styles.inputWrap}>
                  <MaterialIcons name="work-outline" size={20} color={Colors.textMuted} />
                  <TextInput
                    style={styles.input}
                    value={experience}
                    onChangeText={setExperience}
                    placeholder="e.g. 5"
                    keyboardType="numeric"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Price per Hour (₹)</Text>
                <View style={styles.inputWrap}>
                  <MaterialIcons name="attach-money" size={20} color={Colors.textMuted} />
                  <TextInput
                    style={styles.input}
                    value={price}
                    onChangeText={setPrice}
                    placeholder="e.g. 500"
                    keyboardType="numeric"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
              </View>
            </>
          )}

          <TouchableOpacity 
            style={[styles.saveBtn, loading && styles.saveBtnDisabled]} 
            onPress={handleSave} 
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  backBtn: { padding: Spacing.sm },
  headerTitle: { fontSize: Typography.lg, fontFamily: 'Manrope-Black', color: Colors.textPrimary },
  content: { padding: Spacing.xl },
  inputGroup: { marginBottom: Spacing.lg },
  label: { fontSize: Typography.sm, fontFamily: 'Manrope-Bold', color: Colors.textSecondary, marginBottom: 8 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    height: 54,
  },
  input: { flex: 1, marginLeft: 12, fontSize: Typography.base, fontFamily: 'Manrope-Medium', color: Colors.textPrimary },
  
  multiSelectContainer: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
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
    backgroundColor: Colors.surfaceAlt,
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
  subserviceTitle: {
    fontSize: Typography.sm,
    fontFamily: 'Manrope-Bold',
    color: Colors.textPrimary,
    marginBottom: 8,
  },

  saveBtn: {
    backgroundColor: Colors.primary,
    height: 54,
    borderRadius: Radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { color: '#fff', fontSize: Typography.base, fontFamily: 'Manrope-Bold' },
});
