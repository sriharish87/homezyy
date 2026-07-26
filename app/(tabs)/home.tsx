import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Dimensions, Image, ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/Theme';
import { POPULAR_SERVICES } from '@/constants/Data';
import api from '@/lib/axiosConfig';

const { width: SCREEN_W } = Dimensions.get('window');

// ── Types ──────────────────────────────────────────────────
type BookingStatus = 'pending' | 'accepted' | 'arrived' | 'in_progress' | 'paid' | 'rejected' | 'completed' | 'expired' | 'cancelled';
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
  completionOtp?: string | null;
  isPaid?: boolean;
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

const STATUS_META: Record<BookingStatus, { label: string; color: string; bg: string; icon: string }> = {
  pending:     { label: 'Pending',     color: '#d97706', bg: '#fef3c7', icon: 'schedule' },
  accepted:    { label: 'Accepted',    color: '#2563eb', bg: '#dbeafe', icon: 'thumb-up' },
  in_progress: { label: 'In Progress', color: '#7c3aed', bg: '#ede9fe', icon: 'my-location' },
  arrived:     { label: 'Arrived',     color: '#059669', bg: '#d1fae5', icon: 'location-on' },
  paid:        { label: 'Paid (Wait OTP)', color: '#059669', bg: '#d1fae5', icon: 'check-circle' },
  completed:   { label: 'Completed',   color: '#059669', bg: '#d1fae5', icon: 'task-alt' },
  rejected:    { label: 'Cancelled',   color: '#dc2626', bg: '#fee2e2', icon: 'cancel' },
  expired:     { label: 'Expired',     color: '#dc2626', bg: '#fee2e2', icon: 'cancel' },
  cancelled:   { label: 'Cancelled',   color: '#dc2626', bg: '#fee2e2', icon: 'cancel' },
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
  text: { fontSize: 11, fontFamily: 'Manrope-Bold' },
});

// ── Components ─────────────────────────────────────────────

function AppHeader({ userName, userAvatar }: { userName: string; userAvatar?: string }) {
  return (
    <View style={headStyles.container}>
      <View style={headStyles.left}>
        {userAvatar ? (
          <Image source={{ uri: userAvatar }} style={headStyles.avatar} />
        ) : (
          <View style={headStyles.avatarPlaceholder}>
            <MaterialIcons name="person" size={24} color="#3e2a56" />
          </View>
        )}
        <View style={headStyles.textWrap}>
          <Text style={headStyles.greeting}>Hello, {userName} 👋</Text>
          <Text style={headStyles.sub}>What do you need help with today?</Text>
        </View>
      </View>
      <TouchableOpacity style={headStyles.notificationBtn}>
        <MaterialIcons name="notifications-none" size={24} color="#3e2a56" />
        <View style={headStyles.badge} />
      </TouchableOpacity>
    </View>
  );
}
const headStyles = StyleSheet.create({
  container: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl, paddingBottom: Spacing.lg,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarPlaceholder: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(62, 42, 86, 0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  textWrap: { justifyContent: 'center' },
  greeting: { fontSize: 18, fontFamily: 'Manrope-Black', color: '#1a1a1a' },
  sub: { fontSize: 13, fontFamily: 'Manrope-Medium', color: '#666', marginTop: 2 },
  notificationBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#f0f2f5',
  },
  badge: {
    position: 'absolute', top: 12, right: 12, width: 8, height: 8,
    borderRadius: 4, backgroundColor: '#dc2626', borderWidth: 1, borderColor: '#fff',
  },
});

function LastBookingWidget({
  booking, loading, isCustomer, onNavigate
}: {
  booking: UnifiedBooking | null; loading: boolean; isCustomer: boolean; onNavigate: () => void;
}) {
  if (loading) {
    return (
      <View style={[bw.card, { justifyContent: 'center', alignItems: 'center', height: 120 }]}>
        <ActivityIndicator size="small" color="#3e2a56" />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={bw.card}>
        <View style={bw.emptyState}>
          <View style={bw.iconWrap}>
            <MaterialIcons name="home-repair-service" size={28} color="#3e2a56" />
          </View>
          <View style={bw.emptyTextWrap}>
            <Text style={bw.emptyTitle}>No Recent Bookings</Text>
            <Text style={bw.emptySub}>Book a service to keep your home in top shape.</Text>
          </View>
        </View>
      </View>
    );
  }

  const roleLabel = isCustomer ? 'Technician' : 'Customer';
  const name = booking.counterparty?.name || 'Unknown';
  const avatar = booking.counterparty?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;

  return (
    <TouchableOpacity style={bw.card} activeOpacity={0.8} onPress={onNavigate}>
      <View style={bw.headerRow}>
        <Text style={bw.title}>Last Booking</Text>
        <StatusChip status={booking.status} />
      </View>
      <View style={bw.bodyRow}>
        <Image source={{ uri: avatar }} style={bw.avatar} />
        <View style={bw.infoCol}>
          <Text style={bw.serviceTitle} numberOfLines={1}>{booking.serviceTitle}</Text>
          <Text style={bw.personName}>{roleLabel}: {name}</Text>
          <View style={bw.timeRow}>
            <MaterialIcons name="event" size={12} color="#666" />
            <Text style={bw.timeText}>{formatBookingTime(booking.bookingTime)}</Text>
          </View>
        </View>
        <View style={bw.priceCol}>
          <Text style={bw.price}>₹{booking.price?.toLocaleString('en-IN')}</Text>
          <MaterialIcons name="chevron-right" size={20} color="#ccc" style={{ marginTop: 4 }} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const bw = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.xl,
    backgroundColor: '#fff',
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1, borderColor: '#f0f2f5',
    ...Shadow.sm,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 16, fontFamily: 'Manrope-Black', color: '#1a1a1a' },
  bodyRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#eee', marginRight: 12 },
  infoCol: { flex: 1 },
  serviceTitle: { fontSize: 15, fontFamily: 'Manrope-Bold', color: '#3e2a56', marginBottom: 4 },
  personName: { fontSize: 13, fontFamily: 'Manrope-Medium', color: '#1a1a1a', marginBottom: 4 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeText: { fontSize: 12, fontFamily: 'Manrope-Regular', color: '#666' },
  priceCol: { alignItems: 'flex-end', justifyContent: 'center' },
  price: { fontSize: 16, fontFamily: 'Manrope-Black', color: '#3e2a56' },
  emptyState: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  iconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(62,42,86,0.05)', justifyContent: 'center', alignItems: 'center' },
  emptyTextWrap: { flex: 1 },
  emptyTitle: { fontSize: 15, fontFamily: 'Manrope-Bold', color: '#1a1a1a', marginBottom: 4 },
  emptySub: { fontSize: 13, fontFamily: 'Manrope-Regular', color: '#666', lineHeight: 18 },
});

function PopularServicesSection({ onNavigate }: { onNavigate: (id: string) => void }) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  return (
    <View style={[ps.section, isDesktop && { maxWidth: 800, alignSelf: 'center', width: '100%' }]}>
      <View style={ps.header}>
        <Text style={ps.title}>Popular Services</Text>
        <TouchableOpacity onPress={() => onNavigate('__all__')}>
          <Text style={ps.viewAll}>View All</Text>
        </TouchableOpacity>
      </View>
      <View style={ps.gridContent}>
        {POPULAR_SERVICES.map((svc) => (
          <TouchableOpacity
            key={svc.id}
            style={ps.card}
            onPress={() => onNavigate(svc.id)}
            activeOpacity={0.8}
          >
            <View style={ps.iconBg}>
              <MaterialIcons name={svc.icon as any} size={28} color="#3e2a56" />
            </View>
            <Text style={ps.cardLabel}>{svc.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
const ps = StyleSheet.create({
  section: { paddingTop: Spacing.xl, paddingBottom: Spacing.xl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingHorizontal: Spacing.xl },
  title: { fontSize: 18, fontFamily: 'Manrope-Black', color: '#1a1a1a' },
  viewAll: { fontSize: 14, fontFamily: 'Manrope-Bold', color: '#3e2a56' },
  gridContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.xl,
    gap: 16,
    justifyContent: 'space-between'
  },
  card: {
    width: '30%',
    minWidth: 100,
    backgroundColor: '#fff',
    borderRadius: Radius.lg,
    padding: Spacing.base,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1, borderColor: '#f0f2f5',
  },
  iconBg: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(62, 42, 86, 0.05)',
    justifyContent: 'center', alignItems: 'center',
  },
  cardLabel: { fontSize: 13, fontFamily: 'Manrope-Bold', color: '#2d3436', textAlign: 'center' },
});

// ── Main screen ────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const isCustomer = user?.role === 'customer';
  const isTechnician = user?.role === 'technician';
  const userName = user?.name?.split(' ')[0] || 'Guest';
  const userAvatar = user?.profilePic;

  const [lastBooking, setLastBooking] = useState<UnifiedBooking | null>(null);
  const [loadingBooking, setLoadingBooking] = useState(true);

  const fetchLastBooking = useCallback(async () => {
    try {
      setLoadingBooking(true);
      const res = await api.get('/bookings/last');
      setLastBooking(res.data);
    } catch (err) {
      console.log('Failed to fetch last booking', err);
    } finally {
      setLoadingBooking(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchLastBooking();
    }, [fetchLastBooking])
  );

  const navigateToCategory = (categoryId: string) => {
    if (categoryId === '__all__') {
      router.push('/(tabs)/services');
    } else {
      router.push({ pathname: '/categories/[id]', params: { id: categoryId } });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, isDesktop && { paddingBottom: 0 }]}
      >
        <AppHeader userName={userName} userAvatar={userAvatar} />

        <View style={[isDesktop && { maxWidth: 800, alignSelf: 'center', width: '100%', paddingVertical: 20 }]}>
          <LastBookingWidget
            booking={lastBooking}
            loading={loadingBooking}
            isCustomer={isCustomer}
            onNavigate={() => router.push('/(tabs)/bookings')}
          />
        </View>

        {!isTechnician && <PopularServicesSection onNavigate={navigateToCategory} />}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 20 },

  // ── Header ─────────────────────────────────────────
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
  },
  locationText: {
    fontSize: Typography.sm,
    fontFamily: 'Manrope-SemiBold',
    color: Colors.primary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.error,
    position: 'absolute',
    top: 8,
    right: 8,
  },
  avatarSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitial: {
    fontSize: Typography.lg,
    fontFamily: 'Manrope-Black',
    color: Colors.primary,
  },

  // ── Hero Card ─────────────────────────────────────
  heroCard: {
    marginHorizontal: Spacing.base,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    overflow: 'hidden',
    ...Shadow.md,
  },
  heroAccent: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(62, 42, 86, 0.08)',
    bottom: -60,
    right: -60,
  },
  heroContent: {
    position: 'relative',
    zIndex: 1,
  },
  heroTitle: {
    fontSize: Typography.lg,
    fontFamily: 'Manrope-Black',
    color: Colors.primary,
    marginBottom: Spacing.sm,
    lineHeight: 26,
  },
  heroSubtitle: {
    fontSize: Typography.sm,
    fontFamily: 'Manrope-Regular',
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignSelf: 'flex-start',
    ...Shadow.sm,
  },
  primaryBtnText: {
    fontSize: Typography.sm,
    fontFamily: 'Manrope-ExtraBold',
    color: '#fff',
  },

  // ── Search Bar ─────────────────────────────────────
  searchContainer: {
    marginHorizontal: Spacing.base,
    marginVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    fontSize: Typography.sm,
    fontFamily: 'Manrope-Regular',
    color: Colors.textPrimary,
  },

  // ── Services Section ───────────────────────────────
  servicesSection: {
    marginVertical: Spacing.lg,
    paddingHorizontal: Spacing.base,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.md,
    fontFamily: 'Manrope-ExtraBold',
    color: Colors.textPrimary,
  },
  seeAllText: {
    fontSize: Typography.xs,
    fontFamily: 'Manrope-ExtraBold',
    color: Colors.primary,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  serviceCard: {
    width: '48%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  serviceIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  serviceLabel: {
    fontSize: Typography.sm,
    fontFamily: 'Manrope-SemiBold',
    color: Colors.textPrimary,
    textAlign: 'center',
  },

  // ── Trusted Professional ────────────────────────────
  trustedSection: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.base,
  },
  professionalCard: {
    backgroundColor: '#2d1f41',
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.md,
    ...Shadow.md,
  },
  professionalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  professionalAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  professionalInfo: { flex: 1 },
  professionalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 4,
  },
  professionalName: {
    fontSize: Typography.base,
    fontFamily: 'Manrope-Black',
    color: '#fff',
  },
  topRatedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.star,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  topRatedText: {
    fontSize: Typography.xs,
    fontFamily: 'Manrope-Bold',
    color: '#fff',
  },
  professionalRole: {
    fontSize: Typography.xs,
    fontFamily: 'Manrope-Regular',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  professionalStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: Typography.base,
    fontFamily: 'Manrope-Black',
    color: '#fff',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: Typography.xs,
    fontFamily: 'Manrope-Regular',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  bookAgainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    ...Shadow.sm,
  },
  bookAgainBtnText: {
    fontSize: Typography.sm,
    fontFamily: 'Manrope-ExtraBold',
    color: '#fff',
  },

  // ── Activity Section ────────────────────────────────
  activitySection: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.base,
  },
  activityList: {
    marginTop: Spacing.md,
    gap: Spacing.md,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  activityIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  activityContent: { flex: 1 },
  activityName: {
    fontSize: Typography.sm,
    fontFamily: 'Manrope-SemiBold',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  activityDesc: {
    fontSize: Typography.xs,
    fontFamily: 'Manrope-Regular',
    color: Colors.textMuted,
  },
  activityPrice: {
    fontSize: Typography.sm,
    fontFamily: 'Manrope-ExtraBold',
    color: Colors.primary,
  },

  // ── Spacer ─────────────────────────────────────────
  bottomSpacer: { height: Spacing.xl },
});
