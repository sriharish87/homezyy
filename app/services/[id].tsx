import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Image, Dimensions, Platform, Modal, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/Theme';
import { SERVICE_DESCRIPTIONS, PROVIDER_NAMES } from '@/constants/Data';
import api from '@/lib/axiosConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/context/AuthContext';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const HERO_H = Math.min(SCREEN_H * 0.35, 280);

// ── Package card ───────────────────────────────────────────

interface Package {
  id: string;
  name: string;
  description: string;
  price: number;
  icon: string;
  popular?: boolean;
}

function PackageCard({ pkg, selected, onSelect }: { pkg: Package; selected: boolean; onSelect: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.pkgCard, selected && styles.pkgCardSelected, pkg.popular && styles.pkgCardPopular]}
      onPress={onSelect}
      activeOpacity={0.85}
    >
      {pkg.popular && (
        <View style={styles.popularBadge}>
          <Text style={styles.popularBadgeText}>POPULAR</Text>
        </View>
      )}
      <View style={[styles.pkgIcon, selected && styles.pkgIconSelected]}>
        <MaterialIcons name={pkg.icon as any} size={22} color={selected ? '#fff' : Colors.primary} />
      </View>
      <View style={styles.pkgBody}>
        <Text style={[styles.pkgName, selected && styles.pkgNameSelected]}>{pkg.name}</Text>
        <Text style={[styles.pkgDesc, selected && styles.pkgDescSelected]}>{pkg.description}</Text>
      </View>
      <View style={styles.pkgPriceCol}>
        <Text style={[styles.pkgPrice, selected && styles.pkgPriceSelected]}>
          ₹{pkg.price.toLocaleString('en-IN')}
        </Text>
        {selected && (
          <MaterialIcons name="check-circle" size={18} color={Colors.primary} style={{ marginTop: 4 }} />
        )}
      </View>
    </TouchableOpacity>
  );
}

// ── Main screen ────────────────────────────────────────────

export default function ServiceDetailsScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { user, isAuthenticated } = useAuth();
  const { data, tech } = useLocalSearchParams<{ data: string; tech?: string }>();

  // Parse service data passed from SubServices screen
  const service = (() => {
    try { return JSON.parse(data ?? ''); }
    catch { return null; }
  })();

  const technician = (() => {
    if (!tech) return null;
    try { return JSON.parse(tech); }
    catch { return null; }
  })();

  const [selectedPkg, setSelectedPkg] = useState<string>('Standard');
  const [pricingLoading, setPricingLoading] = useState(true);
  const [pricingError, setPricingError] = useState<string | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [basePrice, setBasePrice] = useState<number | null>(null);
  const [pricingRange, setPricingRange] = useState<{
    min: number | null;
    mid: number | null;
    max: number | null;
  }>({ min: null, mid: null, max: null });

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  if (!service) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorState}>
          <MaterialIcons name="error-outline" size={64} color={Colors.border} />
          <Text style={styles.errorTitle}>Service not found</Text>
          <TouchableOpacity style={styles.browseBtn} onPress={() => router.push('/(tabs)/services')}>
            <Text style={styles.browseBtnText}>Browse Services</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const category = service.category ?? '';
  const parsePrice = (value: unknown) => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const cleaned = value.replace(/[₹,–]/g, '').trim();
      const parsed = parseFloat(cleaned);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  };

  useEffect(() => {
    const loadPricing = async () => {
      try {
        setPricingLoading(true);
        setPricingError(null);

        const serviceParam = encodeURIComponent(String(category));
        const subserviceParam = encodeURIComponent(String(service.title));
        const cacheBust = Date.now();
        const response = await api.get(
          `/pricing/${serviceParam}/${subserviceParam}?ts=${cacheBust}`
        );
        console.log('[Pricing] raw response:', response?.data);
        const payload = response?.data?.data ?? response?.data ?? {};
        const price =
          payload?.priceMid ??
          payload?.priceMin ??
          payload?.priceMax ??
          payload?.price ??
          payload?.amount ??
          payload?.pricePerHour ??
          payload?.basePrice ??
          payload?.pricing;

        const parsed = parsePrice(price);
        console.log('[Pricing] parsed price:', parsed, 'service price:', service.price);
        setPricingRange({
          min: parsePrice(payload?.priceMin),
          mid: parsePrice(payload?.priceMid),
          max: parsePrice(payload?.priceMax),
        });
        setBasePrice(parsed || parsePrice(service.price));
      } catch (error) {
        console.error('Failed to load pricing:', error);
        setPricingError('Pricing unavailable');
        setPricingRange({ min: null, mid: null, max: null });
        setBasePrice(parsePrice(service.price));
      } finally {
        setPricingLoading(false);
      }
    };

    if (category && service?.title) {
      loadPricing();
    } else {
      setPricingLoading(false);
      setPricingRange({ min: null, mid: null, max: null });
      setBasePrice(parsePrice(service.price));
    }
  }, [category, service?.title]);

  const resolvedPrice = basePrice ?? parsePrice(service.price);
  const hasPricingRange =
    typeof pricingRange.min === 'number' &&
    typeof pricingRange.mid === 'number' &&
    typeof pricingRange.max === 'number' &&
    pricingRange.min > 0 &&
    pricingRange.mid > 0 &&
    pricingRange.max > 0;

  const packages: Package[] = hasPricingRange
    ? [
        { id: 'Basic',    name: 'Basic Package',    description: 'Essential service covering core requirements.', price: pricingRange.min!, icon: 'bolt' },
        { id: 'Standard', name: 'Standard Package', description: 'Our most popular choice with added care.',      price: pricingRange.mid!, icon: 'stars',   popular: true },
        { id: 'Premium',  name: 'Premium Package',  description: 'Complete top-to-bottom service with premium care.', price: pricingRange.max!, icon: 'diamond' },
      ]
    : [
        { id: 'Basic',    name: 'Basic Package',    description: 'Essential service covering core requirements.', price: Math.round(resolvedPrice * 0.7), icon: 'bolt' },
        { id: 'Standard', name: 'Standard Package', description: 'Our most popular choice with added care.',      price: resolvedPrice,                icon: 'stars',   popular: true },
        { id: 'Premium',  name: 'Premium Package',  description: 'Complete top-to-bottom service with premium care.', price: Math.round(resolvedPrice * 1.5), icon: 'diamond' },
      ];

  const currentPrice   = packages.find((p) => p.id === selectedPkg)?.price ?? resolvedPrice;
  const description    = SERVICE_DESCRIPTIONS[category] ?? `Professional ${service.title.toLowerCase()} service delivered by our top-rated technicians.`;
  const providerName = technician?.name || PROVIDER_NAMES[category] || 'Homezy Pro Provider';
  const providerAvatar =
    technician?.profilePic ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(providerName)}`;
  const providerExperience = typeof technician?.experience === 'number'
    ? `${technician.experience} yrs exp.`
    : '5 yrs exp.';
  const ratingValue = technician?.rating ?? service.rating;

  const timeSlots = useMemo(
    () => [
      '09:00 AM - 10:00 AM',
      '10:30 AM - 11:30 AM',
      '12:00 PM - 01:00 PM',
      '02:00 PM - 03:00 PM',
      '04:00 PM - 05:00 PM',
      '06:00 PM - 07:00 PM',
    ],
    []
  );

  const dateOptions = useMemo(() => {
    const list: Date[] = [];
    const today = new Date();
    for (let i = 0; i < 7; i += 1) {
      const next = new Date(today);
      next.setDate(today.getDate() + i);
      list.push(next);
    }
    return list;
  }, []);

  const formattedSchedule = useMemo(() => {
    if (!selectedDate || !selectedTime) return 'Select date and time';
    const dateLabel = selectedDate.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    });
    return `${dateLabel}, ${selectedTime}`;
  }, [selectedDate, selectedTime]);

  const getBookingDateTime = () => {
    if (!selectedDate || !selectedTime) return null;
    const [start] = selectedTime.split('-').map((part) => part.trim());
    const [time, meridiem] = start.split(' ');
    const [hourText, minuteText] = time.split(':');
    let hours = parseInt(hourText, 10);
    const minutes = parseInt(minuteText, 10);

    if (meridiem === 'PM' && hours < 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;

    const date = new Date(selectedDate);
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  const handleBookNow = async () => {
    try {
      setBookingError(null);

      if (!isAuthenticated) {
        router.push('/login');
        return;
      }

      if (!technician?._id) {
        setBookingError('Select a technician to continue.');
        return;
      }

      const bookingDate = getBookingDateTime();
      if (!bookingDate) {
        setBookingError('Select a booking time.');
        return;
      }

      let location = user?.location ?? null;

      if (!location) {
        const [storedLat, storedLng] = await AsyncStorage.multiGet([
          '@homezy_lat',
          '@homezy_lng',
        ]);
        const lat = storedLat?.[1];
        const lng = storedLng?.[1];

        if (lat && lng) {
          location = {
            type: 'Point',
            coordinates: [Number(lng), Number(lat)],
          };
        }
      }

      if (!location) {
        setBookingError('Add your location before booking.');
        return;
      }

      setBookingLoading(true);

      const payload = {
        technicianId: technician._id,
        serviceType: service.title,
        price: currentPrice,
        bookingTime: bookingDate.toISOString(),
        location,
      };

      const response = await api.post('/user/invite', payload);
      const responseData = response?.data?.data ?? response?.data ?? {};
      const bookingId =
        responseData?.bookingId || responseData?._id || responseData?.id || '';

      router.push({
        pathname: '/bookings/booking-confirmation',
        params: {
          bookingId,
          serviceName: service.title,
          providerName,
          price: String(currentPrice),
          date: selectedDate?.toISOString() ?? '',
          time: selectedTime ?? '',
          status: 'pending',
        },
      });
    } catch (error: any) {
      console.error('Booking request failed:', error);
      const msg = error.response?.data?.message || error.message || 'Unable to send booking request.';
      setBookingError(msg);
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      {/* ── Hero Image ──────────────────────────────────── */}
      <View style={[styles.hero, { height: HERO_H }]}>
        <Image
          source={{ uri: service.img }}
          style={styles.heroImg}
          resizeMode="cover"
        />
        <View style={styles.heroOverlay} />

        {/* Back + Share buttons */}
        <SafeAreaView style={styles.heroNav} edges={['top']}>
          <TouchableOpacity style={styles.circleBtn} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.circleBtn}>
            <MaterialIcons name="share" size={20} color="#fff" />
          </TouchableOpacity>
        </SafeAreaView>
      </View>

      {/* ── Scrollable content ──────────────────────────── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 150 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* TOP RATED badge */}
        <View style={styles.badge}>
          <MaterialIcons name="verified" size={13} color={Colors.primary} />
          <Text style={styles.badgeText}>TOP RATED</Text>
        </View>

        {/* Title + rating */}
        <View style={styles.titleRow}>
          <Text style={styles.serviceTitle}>{service.title}</Text>
          <View style={styles.ratingChip}>
            <MaterialIcons name="star" size={16} color={Colors.star} />
            <Text style={styles.ratingText}>{ratingValue ?? '0'}</Text>
            <Text style={styles.reviewCount}>({service.reviews})</Text>
          </View>
        </View>

        {/* Provider card */}
        <View style={styles.providerCard}>
          <Image source={{ uri: providerAvatar }} style={styles.providerAvatar} />
          <View style={styles.providerInfo}>
            <Text style={styles.providerName}>{providerName}</Text>
            <Text style={styles.providerMeta}>
              Professional Provider • {providerExperience}
            </Text>
          </View>
          <View style={styles.basePriceChip}>
            <Text style={styles.basePriceText}>
              {pricingLoading ? '—' : `₹${currentPrice.toLocaleString('en-IN')}`}
            </Text>
          </View>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About this service</Text>
          <Text style={styles.description}>{description}</Text>
        </View>

        {/* Packages */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Service Packages</Text>
          <View style={styles.packagesList}>
            {packages.map((pkg) => (
              <PackageCard
                key={pkg.id}
                pkg={pkg}
                selected={selectedPkg === pkg.id}
                onSelect={() => setSelectedPkg(pkg.id)}
              />
            ))}
          </View>
        </View>

        {/* Schedule */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Schedule</Text>
          <TouchableOpacity
            style={styles.scheduleCard}
            onPress={() => setScheduleOpen(true)}
            activeOpacity={0.85}
          >
            <View style={styles.scheduleLeft}>
              <MaterialIcons name="event" size={20} color={Colors.primary} />
              <View>
                <Text style={styles.scheduleTitle}>Choose date and time</Text>
                <Text style={styles.scheduleValue}>{formattedSchedule}</Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>
          {bookingError ? <Text style={styles.bookingError}>{bookingError}</Text> : null}
        </View>

        {/* What's included */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What's Included</Text>
          {['Professional equipment & tools', 'Certified & background-verified experts', '30-day service warranty', 'Real-time job tracking'].map((item) => (
            <View key={item} style={styles.includesRow}>
              <MaterialIcons name="check-circle" size={18} color={Colors.success} />
              <Text style={styles.includesText}>{item}</Text>
            </View>
          ))}
        </View>

      </ScrollView>

      {/* ── Sticky bottom CTA ───────────────────────────── */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.priceSummary}>
          <Text style={styles.priceLabel}>TOTAL PRICE</Text>
          <Text style={styles.totalPrice}>
            {pricingLoading ? '—' : `₹${currentPrice.toLocaleString('en-IN')}`}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.bookBtn}
          onPress={handleBookNow}
          activeOpacity={0.85}
          disabled={bookingLoading}
        >
          {bookingLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.bookBtnText}>Book Now</Text>
              <MaterialIcons name="arrow-forward" size={18} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Schedule modal */}
      <Modal visible={scheduleOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select date and time</Text>
              <TouchableOpacity onPress={() => setScheduleOpen(false)}>
                <MaterialIcons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSectionTitle}>Date</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateRow}>
              {dateOptions.map((date) => {
                const isSelected =
                  selectedDate?.toDateString() === date.toDateString();
                return (
                  <TouchableOpacity
                    key={date.toISOString()}
                    style={[styles.dateChip, isSelected && styles.dateChipSelected]}
                    onPress={() => setSelectedDate(date)}
                  >
                    <Text style={[styles.dateChipDay, isSelected && styles.dateChipTextSelected]}>
                      {date.toLocaleDateString('en-IN', { weekday: 'short' })}
                    </Text>
                    <Text style={[styles.dateChipDate, isSelected && styles.dateChipTextSelected]}>
                      {date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={styles.modalSectionTitle}>Time</Text>
            <View style={styles.timeGrid}>
              {timeSlots.map((slot) => {
                const isSelected = selectedTime === slot;
                return (
                  <TouchableOpacity
                    key={slot}
                    style={[styles.timeChip, isSelected && styles.timeChipSelected]}
                    onPress={() => setSelectedTime(slot)}
                  >
                    <Text style={[styles.timeChipText, isSelected && styles.timeChipTextSelected]}>
                      {slot}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.modalCta}
              onPress={() => setScheduleOpen(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.modalCtaText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },

  // Hero
  hero: { position: 'relative' },
  heroImg: { width: '100%', height: '100%' },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  heroNav: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingTop: Platform.OS === 'android' ? Spacing.xl : 0,
  },
  circleBtn: {
    width: 40, height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Scroll content
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.base, paddingTop: Spacing.base },

  // Badge
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryLight,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    marginBottom: Spacing.sm,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: 'Manrope-Bold',
    color: Colors.primary,
    letterSpacing: 0.5,
  },

  // Title + rating
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: Spacing.base,
  },
  serviceTitle: {
    flex: 1,
    fontSize: Typography.xl,
    fontFamily: 'Manrope-Black',
    color: Colors.textPrimary,
    lineHeight: 28,
  },
  ratingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  ratingText: {
    fontSize: Typography.sm,
    fontFamily: 'Manrope-Bold',
    color: Colors.textPrimary,
  },
  reviewCount: {
    fontSize: Typography.sm,
    fontFamily: 'Manrope-Regular',
    color: Colors.textSecondary,
  },

  // Provider card
  providerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.xl,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadow.sm,
  },
  providerAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.border,
  },
  providerInfo: { flex: 1 },
  providerName: {
    fontSize: Typography.base,
    fontFamily: 'Manrope-Bold',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  providerMeta: {
    fontSize: Typography.sm,
    fontFamily: 'Manrope-Regular',
    color: Colors.textSecondary,
  },
  basePriceChip: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.md,
  },
  basePriceText: {
    fontSize: Typography.base,
    fontFamily: 'Manrope-Bold',
    color: Colors.primary,
  },

  // Sections
  section: { marginBottom: Spacing.xl },
  sectionTitle: {
    fontSize: Typography.lg,
    fontFamily: 'Manrope-Bold',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  description: {
    fontSize: Typography.base,
    fontFamily: 'Manrope-Regular',
    color: Colors.textSecondary,
    lineHeight: 24,
  },

  // Packages
  packagesList: { gap: 10 },
  pkgCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.base,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: 12,
    position: 'relative',
  },
  pkgCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  pkgCardPopular: {
    borderColor: Colors.primary + '66',
  },
  popularBadge: {
    position: 'absolute',
    top: -1, right: 12,
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  popularBadgeText: {
    fontSize: 10,
    fontFamily: 'Manrope-Bold',
    color: '#fff',
    letterSpacing: 0.5,
  },
  pkgIcon: {
    width: 42, height: 42,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pkgIconSelected: {
    backgroundColor: Colors.primary,
  },
  pkgBody: { flex: 1 },
  pkgName: {
    fontSize: Typography.base,
    fontFamily: 'Manrope-Bold',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  pkgNameSelected: { color: Colors.primary },
  pkgDesc: {
    fontSize: Typography.xs,
    fontFamily: 'Manrope-Regular',
    color: Colors.textSecondary,
  },
  pkgDescSelected: { color: Colors.primaryMid ?? Colors.primary },
  pkgPriceCol: { alignItems: 'flex-end' },
  pkgPrice: {
    fontSize: Typography.md,
    fontFamily: 'Manrope-Bold',
    color: Colors.textPrimary,
  },
  pkgPriceSelected: { color: Colors.primary },

  // Schedule
  scheduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadow.sm,
  },
  scheduleLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  scheduleTitle: {
    fontSize: Typography.base,
    fontFamily: 'Manrope-Bold',
    color: Colors.textPrimary,
  },
  scheduleValue: {
    fontSize: Typography.sm,
    fontFamily: 'Manrope-Regular',
    color: Colors.textSecondary,
    marginTop: 2,
  },
  bookingError: {
    marginTop: 8,
    color: Colors.error,
    fontSize: Typography.sm,
    fontFamily: 'Manrope-Medium',
  },

  // Includes
  includesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  includesText: {
    fontSize: Typography.base,
    fontFamily: 'Manrope-Regular',
    color: Colors.textPrimary,
  },

  // Bottom bar
  bottomBar: {
    position: 'absolute',
    bottom: 0, 
    left: 0, 
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    zIndex: 100,
    ...Shadow.lg,
    gap: 16,
    minHeight: 80, // Ensure a minimum height for smaller screens
  },
  priceSummary: { flex: 1 },
  priceLabel: {
    fontSize: Typography.xs,
    fontFamily: 'Manrope-Bold',
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  totalPrice: {
    fontSize: Typography.xl,
    fontFamily: 'Manrope-Black',
    color: Colors.primary,
  },
  bookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: 24,
    paddingVertical: 14,
    ...Shadow.lg,
  },
  bookBtnText: {
    color: '#fff',
    fontFamily: 'Manrope-Bold',
    fontSize: Typography.base,
  },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.xl,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: Typography.lg,
    fontFamily: 'Manrope-Bold',
    color: Colors.textPrimary,
  },
  modalSectionTitle: {
    fontSize: Typography.sm,
    fontFamily: 'Manrope-Bold',
    color: Colors.textSecondary,
  },
  dateRow: { gap: 10, paddingVertical: 6 },
  dateChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
  },
  dateChipSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  dateChipDay: {
    fontSize: Typography.sm,
    fontFamily: 'Manrope-Bold',
    color: Colors.textPrimary,
  },
  dateChipDate: {
    fontSize: Typography.sm,
    fontFamily: 'Manrope-Regular',
    color: Colors.textSecondary,
    marginTop: 2,
  },
  dateChipTextSelected: {
    color: Colors.primary,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  timeChip: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceAlt,
  },
  timeChipSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  timeChipText: {
    fontSize: Typography.sm,
    fontFamily: 'Manrope-Bold',
    color: Colors.textPrimary,
  },
  timeChipTextSelected: {
    color: Colors.primary,
  },
  modalCta: {
    marginTop: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalCtaText: {
    color: '#fff',
    fontFamily: 'Manrope-Bold',
    fontSize: Typography.base,
  },

  // Error state
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    padding: Spacing.xl,
  },
  errorTitle: {
    fontSize: Typography.xl,
    fontFamily: 'Manrope-Bold',
    color: Colors.textPrimary,
  },
  browseBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  browseBtnText: {
    color: '#fff',
    fontFamily: 'Manrope-Bold',
    fontSize: Typography.base,
  },
});
