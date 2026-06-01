import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import * as Location from 'expo-location';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '@/constants/Theme';

interface LocationPickerProps {
  onLocationFetched: (lat: number, lng: number) => void;
}

export default function LocationPicker({ onLocationFetched }: LocationPickerProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const fetchLocation = async () => {
    setLoading(true);
    setSuccess(false);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Please grant location permissions to automatically detect your location.'
        );
        setLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setSuccess(true);
      onLocationFetched(location.coords.latitude, location.coords.longitude);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch location. Please try again.');
      console.error('Location fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, success && styles.buttonSuccess]}
        onPress={fetchLocation}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color={Colors.primary} size="small" />
        ) : (
          <>
            <MaterialIcons
              name={success ? "check-circle" : "my-location"}
              size={20}
              color={success ? Colors.success : Colors.primary}
            />
            <Text style={[styles.buttonText, success && styles.textSuccess]}>
              {success ? 'Location Synced' : '📍 Use My Current Location'}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {success && (
        <Text style={styles.successMessage}>
          ✅ Location synced successfully!
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
    paddingVertical: 14,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    gap: 8,
  },
  buttonSuccess: {
    backgroundColor: Colors.success + '15',
    borderColor: Colors.success,
  },
  buttonText: {
    fontSize: Typography.base,
    fontFamily: 'Manrope-Bold',
    color: Colors.primary,
  },
  textSuccess: {
    color: Colors.success,
  },
  successMessage: {
    fontSize: Typography.sm,
    fontFamily: 'Manrope-Medium',
    color: Colors.success,
    marginTop: 8,
    textAlign: 'center',
  },
});
