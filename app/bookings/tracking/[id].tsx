import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, AppState, Platform, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import MapView, { Marker, UrlTile, Region } from 'react-native-maps';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/Theme';
import { useSocket } from '@/context/SocketContext';
import ReviewModal from '@/components/ui/ReviewModal';
import api from '@/lib/axiosConfig';

type RNAppStateStatus = 'active' | 'background' | 'inactive' | 'unknown' | 'extension';

interface TechLocation {
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  timestamp?: number;
}

interface BookingDetails {
  id: string;
  serviceTitle: string;
  status: string;
  completionOtp?: string | null;
  counterparty?: {
    name: string;
    phone: string;
    avatar?: string;
  };
  serviceLocation?: {
    coordinates: [number, number]; // [lng, lat]
  };
}

export default function LiveTrackingScreen() {
  const { id } = useLocalSearchParams() as { id?: string };
  const router = useRouter();
  const { socket, joinTrackingRoom, connected } = useSocket();

  const mapRef = useRef<MapView | null>(null);
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [techLocation, setTechLocation] = useState<TechLocation | null>(null);
  const [arrived, setArrived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);

  // 1. Fetch booking details for destination markers and tech info
  const fetchBookingInfo = useCallback(async () => {
    try {
      if (!id) return;
      const res = await api.get(`/bookings/${id}`);
      if (res.data) {
        setBooking(res.data);
        if (res.data.status === 'arrived') {
          setArrived(true);
        }
      }
    } catch (err) {
      console.error('[LiveTrackingScreen] Failed to fetch booking details:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  // 2. The Redis Handshake: Ask server to join tracking room and fetch last known coordinates
  const performHandshake = useCallback(() => {
    if (!id || !joinTrackingRoom) return;
    console.log(`[LiveTrackingScreen] Performing Redis handshake for booking: ${id}`);
    joinTrackingRoom(id, (response) => {
      if (response?.success && response.lastLocation) {
        console.log('[LiveTrackingScreen] Handshake success! Initial coords from Redis:', response.lastLocation);
        setTechLocation(response.lastLocation);
        
        // Center map to initial location
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude: response.lastLocation.latitude,
            longitude: response.lastLocation.longitude,
            latitudeDelta: 0.015,
            longitudeDelta: 0.015,
          }, 1000);
        }
      }
    });
  }, [id, joinTrackingRoom]);

  useEffect(() => {
    fetchBookingInfo();
    performHandshake();
  }, [fetchBookingInfo, performHandshake, connected]);

  // 3. Resilient Reconnection (`Customer can leave and return anytime`)
  useEffect(() => {
    const handleAppStateChange = (nextState: RNAppStateStatus) => {
      if (nextState === 'active') {
        console.log('[LiveTrackingScreen] App returned to active state -> re-running Redis handshake');
        performHandshake();
        fetchBookingInfo();
      }
    };
    const subscription = AppState.addEventListener('change', handleAppStateChange as any);
    return () => subscription.remove();
  }, [performHandshake, fetchBookingInfo]);

  // 4. The Live Stream: Listen for real-time location broadcasts and arrival geofence
  useEffect(() => {
    if (!socket || !id) return;

    const handleLocationBroadcast = (payload: TechLocation & { bookingId: string }) => {
      if (payload.bookingId === id) {
        setTechLocation({
          latitude: payload.latitude,
          longitude: payload.longitude,
          heading: payload.heading,
          speed: payload.speed,
          timestamp: payload.timestamp,
        });

        // Smooth camera follow
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude: payload.latitude,
            longitude: payload.longitude,
            latitudeDelta: 0.012,
            longitudeDelta: 0.012,
          }, 1000);
        }
      }
    };

    const handleArrived = (payload: { bookingId: string; completionOtp?: string; status?: string }) => {
      if (payload.bookingId === id) {
        console.log('[LiveTrackingScreen] Technician arrived geofence triggered!', payload);
        setArrived(true);
        if (payload.completionOtp) {
          setBooking((prev) => prev ? { ...prev, completionOtp: payload.completionOtp, status: payload.status || 'arrived' } : prev);
        } else {
          fetchBookingInfo();
        }
      }
    };

    const handleBookingUpdate = (payload: { bookingId: string; status?: string; completionOtp?: string }) => {
      if (payload.bookingId === id) {
        if (payload.status === 'arrived' || payload.status === 'paid') {
          setArrived(true);
        }
        if (payload.completionOtp) {
          setBooking((prev) => prev ? { ...prev, completionOtp: payload.completionOtp, status: payload.status || prev.status } : prev);
        } else {
          fetchBookingInfo();
        }
      }
    };

    const handleJobCompleted = (payload: { bookingId: string; status?: string }) => {
      if (payload.bookingId === id) {
        setBooking((prev) => prev ? { ...prev, status: 'completed' } : prev);
        setReviewModalVisible(true);
      }
    };

    socket.on('location_broadcast', handleLocationBroadcast);
    socket.on('technician_arrived', handleArrived);
    socket.on('booking_update', handleBookingUpdate);
    socket.on('job_completed', handleJobCompleted);
    socket.on('initial_location', handleLocationBroadcast);

    return () => {
      socket.off('location_broadcast', handleLocationBroadcast);
      socket.off('technician_arrived', handleArrived);
      socket.off('booking_update', handleBookingUpdate);
      socket.off('job_completed', handleJobCompleted);
      socket.off('initial_location', handleLocationBroadcast);
    };
  }, [socket, id, fetchBookingInfo]);

  const targetLat = booking?.serviceLocation?.coordinates?.[1] || 13.0827;
  const targetLng = booking?.serviceLocation?.coordinates?.[0] || 80.2707;

  return (
    <View style={styles.container}>
      {/* ── Top Floating Back & Status Bar ── */}
      <SafeAreaView style={styles.topBar} edges={['top']}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.statusChip}>
          <View style={[styles.statusDot, { backgroundColor: arrived ? Colors.success : '#7c3aed' }]} />
          <Text style={styles.statusChipText}>
            {arrived ? '📍 Technician Arrived' : '🚗 Live Tracking Active'}
          </Text>
        </View>
      </SafeAreaView>

      {/* ── Zero-API-Key MapView with OpenStreetMap Tile fallback on Android ── */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: techLocation?.latitude || targetLat,
          longitude: techLocation?.longitude || targetLng,
          latitudeDelta: 0.025,
          longitudeDelta: 0.025,
        }}
      >
        {/* Render free OpenStreetMap raster tiles across Android & iOS without API billing */}
        {Platform.OS === 'android' && (
          <UrlTile
            urlTemplate="https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maximumZ={19}
          />
        )}

        {/* Customer Destination Marker */}
        <Marker
          coordinate={{ latitude: targetLat, longitude: targetLng }}
          title="Your Service Location"
          description={booking?.serviceTitle || 'Destination'}
        >
          <View style={styles.destinationPin}>
            <MaterialIcons name="home" size={20} color="#fff" />
          </View>
        </Marker>

        {/* Dynamic Technician Vehicle Marker */}
        {techLocation && (
          <Marker
            coordinate={{
              latitude: techLocation.latitude,
              longitude: techLocation.longitude,
            }}
            rotation={techLocation.heading || 0}
            flat={true}
            anchor={{ x: 0.5, y: 0.5 }}
            title="Technician Vehicle"
            description={booking?.counterparty?.name || 'Technician'}
          >
            <View style={styles.vehicleMarker}>
              <MaterialIcons name="navigation" size={24} color="#7c3aed" />
            </View>
          </Marker>
        )}
      </MapView>

      {/* ── Bottom Floating Card Overlay ── */}
      <View style={styles.bottomOverlay}>
        <View style={styles.techInfoRow}>
          <View style={styles.avatarWrap}>
            <MaterialIcons name="person" size={28} color={Colors.primary} />
          </View>
          <View style={styles.techDetails}>
            <Text style={styles.techName}>{booking?.counterparty?.name || 'Assigned Technician'}</Text>
            <Text style={styles.serviceTitle}>{booking?.serviceTitle || 'Service Job'}</Text>
          </View>
          {arrived && (
            <View style={styles.arrivedBadge}>
              <MaterialIcons name="check-circle" size={16} color={Colors.success} />
              <Text style={styles.arrivedText}>Outside</Text>
            </View>
          )}
        </View>

        {/* ── Job Completion Verification Code Banner ── */}
        {(arrived || booking?.status === 'paid' || booking?.completionOtp) && (
          <View style={styles.otpBanner}>
            <View style={styles.otpHeader}>
              <MaterialIcons name="lock" size={16} color="#059669" />
              <Text style={styles.otpTitle}>Job Completion OTP</Text>
            </View>
            <Text style={styles.otpSub}>Share with technician when service is completed:</Text>
            <View style={styles.otpCodeBox}>
              <Text style={styles.otpCodeText}>{booking?.completionOtp || '••••'}</Text>
            </View>
          </View>
        )}

        {/* ── Rate & Review Experience Banner if Completed ── */}
        {booking?.status === 'completed' && (
          <TouchableOpacity
            style={styles.reviewBannerBtn}
            onPress={() => setReviewModalVisible(true)}
            activeOpacity={0.85}
          >
            <MaterialIcons name="star" size={20} color={Colors.star} />
            <Text style={styles.reviewBannerText}>Rate & Review Experience (+20 Pts ⭐)</Text>
          </TouchableOpacity>
        )}

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.callBtn} activeOpacity={0.8}>
            <MaterialIcons name="phone" size={18} color="#fff" />
            <Text style={styles.callBtnText}>Call Technician</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.doneBtn} onPress={() => router.back()} activeOpacity={0.8}>
            <Text style={styles.doneBtnText}>Close Map</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ReviewModal
        visible={reviewModalVisible}
        onClose={() => setReviewModalVisible(false)}
        bookingId={id || ''}
        technicianId={booking?.counterparty?.name ? 'tech' : ''}
        technicianName={booking?.counterparty?.name || 'Technician'}
        onReviewSubmitted={fetchBookingInfo}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  map: { ...StyleSheet.absoluteFillObject },
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.base, paddingTop: Spacing.sm,
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.surface,
    justifyContent: 'center', alignItems: 'center', ...Shadow.sm,
  },
  statusChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.surface, paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: Radius.full, ...Shadow.sm,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusChipText: { fontSize: Typography.sm, fontFamily: 'Manrope-Bold', color: Colors.textPrimary },
  destinationPin: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff', ...Shadow.sm,
  },
  vehicleMarker: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: '#ede9fe',
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#7c3aed', ...Shadow.md,
  },
  bottomOverlay: {
    position: 'absolute', bottom: 30, left: Spacing.base, right: Spacing.base,
    backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.base,
    ...Shadow.lg, borderWidth: 1, borderColor: Colors.borderLight,
  },
  techInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: Spacing.base },
  avatarWrap: {
    width: 50, height: 50, borderRadius: 25, backgroundColor: Colors.surfaceAlt,
    justifyContent: 'center', alignItems: 'center',
  },
  techDetails: { flex: 1 },
  techName: { fontSize: Typography.base, fontFamily: 'Manrope-Bold', color: Colors.textPrimary },
  serviceTitle: { fontSize: Typography.sm, fontFamily: 'Manrope-Medium', color: Colors.textSecondary },
  arrivedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#d1fae5',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full,
  },
  arrivedText: { fontSize: 12, fontFamily: 'Manrope-Bold', color: Colors.success },
  actionsRow: { flexDirection: 'row', gap: 10 },
  callBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: Colors.primary, paddingVertical: 12, borderRadius: Radius.full,
  },
  callBtnText: { fontSize: Typography.sm, fontFamily: 'Manrope-Bold', color: '#fff' },
  doneBtn: {
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: Radius.full,
    backgroundColor: Colors.surfaceAlt, justifyContent: 'center', alignItems: 'center',
  },
  doneBtnText: { fontSize: Typography.sm, fontFamily: 'Manrope-Bold', color: Colors.textPrimary },
  otpBanner: {
    backgroundColor: '#ecfdf5', borderWidth: 1, borderColor: '#a7f3d0',
    borderRadius: Radius.lg, padding: 12, marginBottom: Spacing.base,
  },
  otpHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  otpTitle: { fontSize: Typography.sm, fontFamily: 'Manrope-Bold', color: '#065f46' },
  otpSub: { fontSize: 12, fontFamily: 'Manrope-Medium', color: '#047857', marginBottom: 8 },
  otpCodeBox: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#10b981',
    borderRadius: Radius.md, paddingVertical: 6, paddingHorizontal: 16, alignSelf: 'flex-start',
  },
  otpCodeText: { fontSize: Typography.lg, fontFamily: 'Manrope-Black', color: '#059669', letterSpacing: 4 },
  reviewBannerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a',
    paddingVertical: 12, borderRadius: Radius.lg, marginBottom: Spacing.base,
  },
  reviewBannerText: { fontSize: Typography.sm, fontFamily: 'Manrope-Bold', color: '#b45309' },
});
