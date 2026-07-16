import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/Theme';
import { useSocket } from '@/context/SocketContext';
import { useAuth } from '@/context/AuthContext';

const BOOKING_DATA = {
  serviceName: 'Expert Electrician',
  serviceImage: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&q=80',
  providerName: 'VoltMaster Pro',
  date: 'Monday, 28th April 2026',
  time: '10:00 AM - 11:00 AM',
  location: '12, Jubilee Hills, Hyderabad',
  bookingId: '#HMZ-20260428',
  price: '₹199',
};

export default function BookingConfirmation() {
  const router = useRouter();
  const params = useLocalSearchParams() as {
    bookingId?: string;
    serviceName?: string;
    providerName?: string;
    date?: string;
    time?: string;
    price?: string;
    status?: string;
  };
  const { bookingUpdate } = useSocket();
  const { user } = useAuth();

  const [status, setStatus] = useState<'pending' | 'accepted' | 'declined' | 'arrived' | 'in_progress'>(() => {
    if (params.status === 'accepted' || params.status === 'declined' || params.status === 'arrived' || params.status === 'in_progress') return params.status as any;
    return 'pending';
  });

  // Entrance animations
  const checkScale = useRef(new Animated.Value(0)).current;
  const checkOpacity = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(40)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(checkScale, {
      toValue: 1,
      tension: 60,
      friction: 5,
      useNativeDriver: true,
    }).start();

    Animated.timing(checkOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    Animated.parallel([
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 400,
        delay: 350,
        useNativeDriver: true,
      }),
      Animated.timing(cardSlide, {
        toValue: 0,
        duration: 400,
        delay: 350,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    if (!bookingUpdate?.bookingId || !params.bookingId) return;
    if (bookingUpdate.bookingId === params.bookingId) {
      setStatus(bookingUpdate.status);
    }
  }, [bookingUpdate, params.bookingId]);

  const bookingData = useMemo(() => {
    const dateLabel = params.date
      ? new Date(params.date).toLocaleDateString('en-IN', {
          weekday: 'long',
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        })
      : BOOKING_DATA.date;

    return {
      serviceName: params.serviceName || BOOKING_DATA.serviceName,
      serviceImage: BOOKING_DATA.serviceImage,
      providerName: params.providerName || BOOKING_DATA.providerName,
      date: dateLabel,
      time: params.time || BOOKING_DATA.time,
      location: (user?.location as any)?.address_text || user?.address_text || BOOKING_DATA.location,
      bookingId: params.bookingId || BOOKING_DATA.bookingId,
      price: params.price ? `₹${params.price}` : BOOKING_DATA.price,
    };
  }, [params.bookingId, params.date, params.price, params.providerName, params.serviceName, params.time, user]);

  const title =
    status === 'accepted'
      ? 'Booking Accepted'
      : status === 'declined'
      ? 'Booking Declined'
      : 'Booking Request Sent';

  const statusMessage =
    status === 'accepted'
      ? 'Your technician accepted the request. Proceed to payment to confirm.'
      : status === 'declined'
      ? 'The technician declined this request. Please select another time or technician.'
      : 'Waiting for the technician to accept your request.';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Back button */}
      <View style={styles.navRow}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.push('/(tabs)/services')}
        >
          <MaterialIcons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Booking Confirmation</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.centerContainer}>
          {/* Success circle */}
          <Animated.View style={[styles.successWrap, { opacity: checkOpacity }]}>
            <Animated.View style={[styles.successCircle, { transform: [{ scale: checkScale }] }]}>
              <View style={styles.glowRing} />
              <MaterialIcons name="check-circle" size={80} color={Colors.success} />
            </Animated.View>

            <Text style={styles.successTitle}>{title}</Text>
            <Text style={styles.successMsg}>{statusMessage}</Text>

            <View style={styles.bookingIdRow}>
              <Text style={styles.bookingIdLabel}>Booking ID</Text>
              <Text style={styles.bookingId}>{bookingData.bookingId}</Text>
            </View>
          </Animated.View>

          {/* Booking detail card */}
          <Animated.View
            style={[
              styles.card,
              { opacity: cardOpacity, transform: [{ translateY: cardSlide }] },
            ]}
          >
            <View style={styles.serviceRow}>
              <Image
                source={{ uri: bookingData.serviceImage }}
                style={styles.serviceImg}
                resizeMode="cover"
              />
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceLabel}>Service</Text>
                <Text style={styles.serviceName}>{bookingData.serviceName}</Text>
                <Text style={styles.providerName}>{bookingData.providerName}</Text>
              </View>
              <Text style={styles.servicePrice}>{bookingData.price}</Text>
            </View>

            <View style={styles.divider} />

            {[
              { icon: 'calendar-today', value: bookingData.date },
              { icon: 'schedule', value: bookingData.time },
              { icon: 'location-on', value: bookingData.location },
            ].map((row) => (
              <View key={row.value} style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <MaterialIcons name={row.icon as any} size={18} color={Colors.primary} />
                </View>
                <Text style={styles.detailText}>{row.value}</Text>
              </View>
            ))}

            <View style={styles.statusRow}>
              <MaterialIcons
                name={status === 'accepted' ? 'verified' : status === 'declined' ? 'cancel' : 'schedule'}
                size={16}
                color={status === 'accepted' ? Colors.success : status === 'declined' ? Colors.error : Colors.primary}
              />
              <Text style={styles.statusText}>
                {status === 'accepted'
                  ? 'Accepted - proceed to payment'
                  : status === 'declined'
                  ? 'Declined - try another time'
                  : 'Pending - awaiting response'}
              </Text>
            </View>
          </Animated.View>

          {/* Action buttons */}
          <Animated.View style={[{ opacity: cardOpacity }, styles.buttonGroup]}>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => router.push('/(tabs)/bookings')}
              activeOpacity={0.85}
            >
              <MaterialIcons name="calendar-month" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>View Booking Details</Text>
            </TouchableOpacity>

            {status === 'accepted' && (
              <TouchableOpacity
                style={styles.payBtn}
                onPress={() => router.push('/(tabs)/bookings')}
                activeOpacity={0.85}
              >
                <MaterialIcons name="payments" size={18} color="#fff" />
                <Text style={styles.payBtnText}>Pay Now</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => router.push('/(tabs)/services')}
              activeOpacity={0.85}
            >
              <MaterialIcons name="explore" size={18} color={Colors.primary} />
              <Text style={styles.secondaryBtnText}>Explore Other Services</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.ghostBtn}
              onPress={() => router.push('/(tabs)/home')}
              activeOpacity={0.85}
            >
              <Text style={styles.ghostBtnText}>Back to Home</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },

  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    ...Shadow.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navTitle: {
    fontSize: Typography.md,
    fontFamily: 'Manrope-Bold',
    color: Colors.textPrimary,
  },

  scroll: {
    padding: Spacing.xl,
    paddingBottom: 40,
  },
  centerContainer: {
    width: '100%',
    maxWidth: 540,
    alignSelf: 'center',
    gap: 24,
  },

  successWrap: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  successCircle: {
    position: 'relative',
    marginBottom: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowRing: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: Colors.success + '20',
  },
  successTitle: {
    fontSize: Typography['2xl'],
    fontFamily: 'Manrope-Black',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  successMsg: {
    fontSize: Typography.base,
    fontFamily: 'Manrope-Regular',
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.base,
    maxWidth: 320,
  },
  bookingIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.full,
  },
  bookingIdLabel: {
    fontSize: Typography.sm,
    fontFamily: 'Manrope-Medium',
    color: Colors.primary,
  },
  bookingId: {
    fontSize: Typography.sm,
    fontFamily: 'Manrope-Bold',
    color: Colors.primary,
  },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadow.md,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: Spacing.base,
  },
  serviceImg: {
    width: 64,
    height: 64,
    borderRadius: Radius.md,
    backgroundColor: Colors.border,
  },
  serviceInfo: { flex: 1 },
  serviceLabel: {
    fontSize: Typography.xs,
    fontFamily: 'Manrope-Bold',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  serviceName: {
    fontSize: Typography.md,
    fontFamily: 'Manrope-Bold',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  providerName: {
    fontSize: Typography.sm,
    fontFamily: 'Manrope-Medium',
    color: Colors.primary,
  },
  servicePrice: {
    fontSize: Typography.xl,
    fontFamily: 'Manrope-Black',
    color: Colors.primary,
  },

  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginBottom: Spacing.base,
  },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: Spacing.md,
  },
  detailIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailText: {
    flex: 1,
    fontSize: Typography.base,
    fontFamily: 'Manrope-Medium',
    color: Colors.textPrimary,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.success + '15',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.md,
    marginTop: 4,
  },
  statusText: {
    fontSize: Typography.sm,
    fontFamily: 'Manrope-SemiBold',
    color: Colors.success,
  },

  buttonGroup: {
    gap: 12,
    width: '100%',
    marginTop: 16,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3e2a56',
    borderRadius: Radius.md,
    height: 52,
  },
  primaryBtnText: {
    color: '#fff',
    fontFamily: 'Manrope-Bold',
    fontSize: Typography.base,
  },
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: Radius.md,
  },
  payBtnText: {
    fontSize: Typography.base,
    fontFamily: 'Manrope-Bold',
    color: '#fff',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: Radius.md,
    height: 52,
  },
  secondaryBtnText: {
    color: '#2d3436',
    fontFamily: 'Manrope-Bold',
    fontSize: Typography.base,
  },
  ghostBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
  },
  ghostBtnText: {
    color: Colors.textSecondary,
    fontFamily: 'Manrope-Medium',
    fontSize: Typography.base,
  },
});
