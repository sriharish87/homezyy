import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Image, FlatList, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/Theme';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { usePaymentFlow } from '@/hooks/usePaymentFlow';
import PaymentResultModal from '@/components/ui/PaymentResultModal';
import api from '@/lib/axiosConfig';

// ── Types ──────────────────────────────────────────────────

type BookingStatus = 'pending' | 'accepted' | 'rejected' | 'completed' | 'expired';

interface UnifiedBooking {
  id: string;
  serviceTitle: string;
  price: number;
  status: BookingStatus;
  bookingTime: string;
  createdAt: string;
  counterparty?: {
    id: string;
    name: string;
    role: string;
    phone: string;
    avatar?: string;
    rating?: number;
  } | null;
  location?: {
    addressText: string;
  } | null;
}

// ── Formatting ─────────────────────────────────────────────

function formatBookingTime(isoDate: string) {
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return isoDate;

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const isToday = date.toDateString() === today.toDateString();
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  const timeString = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  if (isToday) return `Today, ${timeString}`;
  if (isTomorrow) return `Tomorrow, ${timeString}`;

  const dateString = date.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
  return `${dateString}, ${timeString}`;
}

// ── Status chip ────────────────────────────────────────────

const STATUS_META: Record<BookingStatus, { label: string; color: string; bg: string; icon: string }> = {
  pending:   { label: 'Pending',   color: '#d97706', bg: '#fef3c7', icon: 'schedule' },
  accepted:  { label: 'Accepted',  color: '#2563eb', bg: '#dbeafe', icon: 'thumb-up' },
  completed: { label: 'Paid',      color: '#059669', bg: '#d1fae5', icon: 'check-circle' },
  rejected:  { label: 'Cancelled', color: '#dc2626', bg: '#fee2e2', icon: 'cancel' },
  expired:   { label: 'Expired',   color: '#dc2626', bg: '#fee2e2', icon: 'cancel' },
};

function StatusChip({ status }: { status: BookingStatus }) {
  const meta = STATUS_META[status] || { label: status, color: '#666', bg: '#eee', icon: 'info' };
  return (
    <View style={[chip.wrap, { backgroundColor: meta.bg }]}>
      <MaterialIcons name={meta.icon as any} size={12} color={meta.color} />
      <Text style={[chip.text, { color: meta.color }]}>{meta.label}</Text>
    </View>
  );
}
const chip = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: Radius.full,
  },
  text: {
    fontSize: 11, fontFamily: 'Manrope-Bold',
  },
});

// ── Booking card ───────────────────────────────────────────

function BookingCard({
  booking,
  isCustomer,
  onPress,
  onPayNow,
  paymentLoading,
  onRespond,
}: {
  booking: UnifiedBooking;
  isCustomer: boolean;
  onPress: () => void;
  onPayNow?: () => void;
  paymentLoading?: boolean;
  onRespond: (status: 'accepted' | 'declined') => void;
}) {
  const formattedTime = formatBookingTime(booking.bookingTime);
  const counterpartyName = booking.counterparty?.name || 'Unknown';
  const roleLabel = isCustomer ? 'Technician' : 'Customer';
  const avatar = booking.counterparty?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(counterpartyName)}`;

  return (
    <TouchableOpacity style={bc.card} onPress={onPress} activeOpacity={0.88}>
      <View style={bc.body}>
        <View style={bc.topRow}>
          <Text style={bc.serviceName} numberOfLines={1}>{booking.serviceTitle}</Text>
          <StatusChip status={booking.status} />
        </View>

        {/* Smart Identity Swap */}
        <View style={bc.identityRow}>
          <Image source={{ uri: avatar }} style={bc.avatar} />
          <View style={bc.identityInfo}>
            <Text style={bc.provider}>{roleLabel}: {counterpartyName}</Text>
            {isCustomer && booking.counterparty?.rating && (
              <View style={bc.ratingBadge}>
                <MaterialIcons name="star" size={12} color={Colors.star} />
                <Text style={bc.ratingText}>{booking.counterparty.rating}</Text>
              </View>
            )}
            {!isCustomer && booking.location?.addressText && (
              <Text style={bc.addressText} numberOfLines={1}>{booking.location.addressText}</Text>
            )}
          </View>
        </View>

        <View style={bc.detail}>
          <MaterialIcons name="event" size={14} color={Colors.textMuted} />
          <Text style={bc.detailText}>{formattedTime}</Text>
        </View>

        <View style={bc.footer}>
          <Text style={bc.price}>₹{booking.price?.toLocaleString('en-IN')}</Text>

          {/* Contextual CTA */}
          <View style={bc.actions}>
            {isCustomer && booking.status === 'accepted' && (
               <TouchableOpacity
                 style={[bc.payNowBtn, paymentLoading && bc.payNowBtnDisabled]}
                 onPress={(e) => {
                   e.stopPropagation?.();
                   if (onPayNow) onPayNow();
                 }}
                 disabled={paymentLoading}
                 activeOpacity={0.8}
               >
                 {paymentLoading ? (
                   <ActivityIndicator size="small" color="#fff" />
                 ) : (
                   <>
                     <MaterialIcons name="payment" size={14} color="#fff" />
                     <Text style={bc.payNowBtnText}>Pay Now</Text>
                   </>
                 )}
               </TouchableOpacity>
            )}

            {!isCustomer && booking.status === 'pending' && (
              <View style={bc.techActions}>
                <TouchableOpacity
                  style={bc.declineBtn}
                  onPress={(e) => { e.stopPropagation?.(); onRespond('declined'); }}
                >
                  <Text style={bc.declineBtnText}>Decline</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={bc.acceptBtn}
                  onPress={(e) => { e.stopPropagation?.(); onRespond('accepted'); }}
                >
                  <Text style={bc.acceptBtnText}>Accept</Text>
                </TouchableOpacity>
              </View>
            )}

            {booking.status === 'completed' && (
              <TouchableOpacity style={bc.rateBtn}>
                <MaterialIcons name="star" size={14} color={Colors.star} />
                <Text style={bc.rateBtnText}>Rate Service</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
const bc = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadow.sm,
  },
  body: { padding: Spacing.base },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  serviceName: {
    flex: 1,
    fontSize: Typography.md,
    fontFamily: 'Manrope-Bold',
    color: Colors.textPrimary,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
    backgroundColor: Colors.surfaceAlt,
    padding: 8,
    borderRadius: Radius.lg,
  },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.border,
  },
  identityInfo: { flex: 1 },
  provider: {
    fontSize: Typography.sm,
    fontFamily: 'Manrope-Bold',
    color: Colors.textPrimary,
  },
  ratingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2,
  },
  ratingText: {
    fontSize: 12, fontFamily: 'Manrope-Medium', color: Colors.textSecondary,
  },
  addressText: {
    fontSize: 12, fontFamily: 'Manrope-Regular', color: Colors.textSecondary, marginTop: 2,
  },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  detailText: {
    fontSize: Typography.sm,
    fontFamily: 'Manrope-Medium',
    color: Colors.textSecondary,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  price: {
    fontSize: Typography.lg,
    fontFamily: 'Manrope-Black',
    color: Colors.primary,
  },
  actions: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  rateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  rateBtnText: {
    fontSize: Typography.sm,
    fontFamily: 'Manrope-Bold',
    color: '#d97706',
  },
  payNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.success,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    minWidth: 100,
    justifyContent: 'center',
  },
  payNowBtnDisabled: {
    opacity: 0.7,
  },
  payNowBtnText: {
    fontSize: Typography.sm,
    fontFamily: 'Manrope-Bold',
    color: '#fff',
  },
  techActions: {
    flexDirection: 'row', gap: 8,
  },
  declineBtn: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.border,
  },
  declineBtnText: {
    fontSize: Typography.sm, fontFamily: 'Manrope-Bold', color: Colors.textSecondary,
  },
  acceptBtn: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
  },
  acceptBtnText: {
    fontSize: Typography.sm, fontFamily: 'Manrope-Bold', color: '#fff',
  },
});

// ── Main screen ────────────────────────────────────────────

type FilterTab = 'upcoming' | 'completed';

export default function BookingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { respondBooking } = useSocket();
  const isCustomer = user?.role === 'customer';

  const [activeTab, setActiveTab] = useState<FilterTab>('upcoming');
  const [bookings, setBookings] = useState<UnifiedBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payingBookingId, setPayingBookingId] = useState<string | null>(null);

  // ── Payment hook ─────────────────────────────────────────
  const {
    initiatePayment,
    loading: paymentLoading,
    razorpayError,
    paymentResult,
    dismissResult,
  } = usePaymentFlow({
    onSuccess: () => {
      setPayingBookingId(null);
      loadBookings(); // Refresh the list
    },
    onError: () => {},
    onClose: () => {
      setPayingBookingId(null);
    },
  });

  // ── Fetch unified bookings ───────────────────────────────
  const loadBookings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/bookings/my');
      setBookings(response.data || []);
    } catch (err) {
      console.error('[BookingsScreen] Failed to load bookings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadBookings();
    }, [loadBookings])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadBookings();
    setRefreshing(false);
  }, [loadBookings]);

  // ── Handle Respond for Techs ─────────────────────────────
  const handleRespond = (bookingId: string, status: 'accepted' | 'declined') => {
    const b = bookings.find((x) => x.id === bookingId);
    if (!b || !b.counterparty) return;
    
    // Optimistic UI update
    setBookings((prev) =>
      prev.map((item) =>
        item.id === bookingId ? { ...item, status: status === 'accepted' ? 'accepted' : 'rejected' } : item
      )
    );

    respondBooking({
      bookingId,
      status,
      customerId: b.counterparty.id,
    });
  };

  // ── Filter logic ─────────────────────────────────────────
  const filteredBookings = useMemo(() => {
    const now = new Date();
    
    // First, filter by the existing time logic as requested
    const filtered = bookings.filter((b) => {
      const bTime = new Date(b.bookingTime);
      const isFuture = bTime > now;

      if (activeTab === 'upcoming') {
        return isFuture;
      } else {
        return !isFuture;
      }
    });

    // Then, sort the filtered array
    return filtered.sort((a, b) => {
      const timeA = new Date(a.bookingTime).getTime();
      const timeB = new Date(b.bookingTime).getTime();
      
      if (activeTab === 'upcoming') {
        return timeA - timeB; // Ascending: soonest first
      } else {
        return timeB - timeA; // Descending: most recent first
      }
    });
  }, [bookings, activeTab]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* ── Header ────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.title}>{!isCustomer ? 'My Orders' : 'My Bookings'}</Text>
      </View>

      {/* ── Custom Tabs ───────────────────────────────────── */}
      <View style={styles.tabsWrap}>
        {(['upcoming', 'completed'] as FilterTab[]).map((tab) => {
          const isActive = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab === 'upcoming' ? 'Upcoming' : 'Past'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── List ──────────────────────────────────────────── */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredBookings}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <MaterialIcons name="event-busy" size={48} color={Colors.border} />
              </View>
              <Text style={styles.emptyTitle}>No {activeTab} bookings</Text>
              <Text style={styles.emptyDesc}>
                {isCustomer ? "You don't have any bookings here. Check back later!" : "No jobs assigned here."}
              </Text>
            </View>
          }
          ItemSeparatorComponent={() => <View style={{ height: Spacing.base }} />}
          renderItem={({ item }) => (
            <BookingCard
              booking={item}
              isCustomer={isCustomer}
              onPress={() => {
                // Future detail screen routing
              }}
              onPayNow={() => {
                setPayingBookingId(item.id);
                initiatePayment(item.id);
              }}
              paymentLoading={paymentLoading && payingBookingId === item.id}
              onRespond={(status) => handleRespond(item.id, status)}
            />
          )}
        />
      )}

      {/* ── Payment Modals ────────────────────────────────── */}
      <PaymentResultModal
        result={paymentResult ? 'success' : razorpayError ? 'server_error' : null}
        onDismiss={dismissResult}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.base,
    backgroundColor: Colors.surface,
  },
  title: {
    fontSize: Typography['2xl'],
    fontFamily: 'Manrope-Black',
    color: Colors.textPrimary,
  },
  tabsWrap: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: Radius.full,
    marginRight: 8,
    backgroundColor: Colors.surfaceAlt,
  },
  tabActive: { backgroundColor: Colors.primary },
  tabText: {
    fontSize: Typography.sm,
    fontFamily: 'Manrope-Bold',
    color: Colors.textSecondary,
  },
  tabTextActive: { color: '#fff' },
  listContent: { padding: Spacing.base, paddingBottom: 100 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIconWrap: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: Colors.surfaceAlt,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: Typography.lg, fontFamily: 'Manrope-Black', color: Colors.textPrimary, marginBottom: 4,
  },
  emptyDesc: {
    fontSize: Typography.base, fontFamily: 'Manrope-Medium', color: Colors.textSecondary, textAlign: 'center',
  },
});
