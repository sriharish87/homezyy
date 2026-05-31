import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Dimensions, TextInput, useWindowDimensions, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/Theme';
import { POPULAR_SERVICES } from '@/constants/Data';
import { fetchHomeScreenData } from '@/services/homeService';
import type { HomeScreenData } from '@/constants/HomeData';

const { width: SCREEN_W } = Dimensions.get('window');

// ── Sub-components ────────────────────────────────────────

function HeaderSection({ location, hasNotifications, userAvatar }: {
  location: string;
  hasNotifications: boolean;
  userAvatar: string | null;
}) {
  return (
    <View style={styles.header}>
      {/* Location */}
      <View style={styles.locationChip}>
        <MaterialIcons name="location-on" size={16} color={Colors.primary} />
        <Text style={styles.locationText}>{location}</Text>
      </View>

      {/* Right icons */}
      <View style={styles.headerRight}>
        {/* Notification */}
        <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
          <MaterialIcons name="notifications" size={20} color={Colors.textPrimary} />
          {hasNotifications && <View style={styles.notificationDot} />}
        </TouchableOpacity>

        {/* Profile avatar */}
        <View style={styles.avatarSmall}>
          {userAvatar ? (
            <Image source={{ uri: userAvatar }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarInitial}>P</Text>
          )}
        </View>
      </View>
    </View>
  );
}

function HeroCard({ onBookPress }: { onBookPress: () => void }) {
  return (
    <View style={styles.heroCard}>
      {/* Background circle accent */}
      <View style={styles.heroAccent} />

      <View style={styles.heroContent}>
        <Text style={styles.heroTitle}>Trusted services for your community</Text>
        <Text style={styles.heroSubtitle}>Verified professionals for all your home needs</Text>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={onBookPress}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>Book Service</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function SearchBar({ onSearch }: { onSearch?: (text: string) => void }) {
  const [searchText, setSearchText] = useState('');

  return (
    <View style={styles.searchContainer}>
      <MaterialIcons name="search" size={20} color={Colors.textMuted} />
      <TextInput
        style={styles.searchInput}
        placeholder="Search for ac services, cleaning..."
        placeholderTextColor={Colors.textMuted}
        value={searchText}
        onChangeText={(text) => {
          setSearchText(text);
          onSearch?.(text);
        }}
      />
    </View>
  );
}

function PopularServicesGrid({ onNavigate }: { onNavigate: (id: string) => void }) {
  return (
    <View style={styles.servicesSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Popular Services</Text>
        <TouchableOpacity onPress={() => onNavigate('__all__')}>
          <Text style={styles.seeAllText}>SEE ALL</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.servicesGrid}>
        {POPULAR_SERVICES.map((service) => (
          <TouchableOpacity
            key={service.id}
            style={styles.serviceCard}
            onPress={() => onNavigate(service.id)}
            activeOpacity={0.8}
          >
            <View style={styles.serviceIcon}>
              <MaterialIcons name={service.icon as any} size={32} color={Colors.primary} />
            </View>
            <Text style={styles.serviceLabel}>{service.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function TrustedProfessionalCard({ professional, onBookPress }: {
  professional: any;
  onBookPress: () => void;
}) {
  if (!professional) return null;

  return (
    <View style={styles.trustedSection}>
      <Text style={styles.sectionTitle}>Trusted In your apartment</Text>

      <View style={styles.professionalCard}>
        {/* Avatar and basic info */}
        <View style={styles.professionalHeader}>
          <Image
            source={{ uri: professional.avatar }}
            style={styles.professionalAvatar}
          />

          <View style={styles.professionalInfo}>
            <View style={styles.professionalTitleRow}>
              <Text style={styles.professionalName}>{professional.name}</Text>
              <View style={styles.topRatedBadge}>
                <MaterialIcons name="star" size={12} color="#fff" />
                <Text style={styles.topRatedText}>Top Rated</Text>
              </View>
            </View>
            <Text style={styles.professionalRole}>{professional.role}</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.professionalStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{professional.visits}+</Text>
            <Text style={styles.statLabel}>visits</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{professional.satisfaction}%+</Text>
            <Text style={styles.statLabel}>satisfaction</Text>
          </View>
        </View>

        {/* Book button */}
        <TouchableOpacity
          style={styles.bookAgainBtn}
          onPress={onBookPress}
          activeOpacity={0.85}
        >
          <Text style={styles.bookAgainBtnText}>Book {professional.name?.split(' ')[0]} Again</Text>
          <MaterialIcons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ActivitySection({ activities }: { activities: any[] }) {
  if (!activities || activities.length === 0) return null;

  return (
    <View style={styles.activitySection}>
      <Text style={styles.sectionTitle}>Activity</Text>

      <View style={styles.activityList}>
        {activities.map((activity) => (
          <View key={activity.id} style={styles.activityItem}>
            <View style={styles.activityIcon}>
              <MaterialIcons
                name={activity.icon as any}
                size={20}
                color={Colors.primary}
              />
            </View>

            <View style={styles.activityContent}>
              <Text style={styles.activityName}>{activity.serviceName}</Text>
              <Text style={styles.activityDesc}>{activity.description}</Text>
            </View>

            <Text style={styles.activityPrice}>{activity.price}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Main screen ────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { width } = useWindowDimensions();

  const [homeData, setHomeData] = useState<HomeScreenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHomeData();
  }, []);

  const loadHomeData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchHomeScreenData();
      setHomeData(data);
    } catch (err) {
      setError('Failed to load home screen data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const navigateToCategory = (categoryId: string) => {
    if (categoryId === '__all__') {
      router.push('/(tabs)/services');
    } else {
      router.push({ pathname: '/categories/[id]', params: { id: categoryId } });
    }
  };

  const navigateToBooking = () => {
    router.push('/(tabs)/services');
  };

  const userInitial = user?.name?.charAt(0) ?? 'P';
  const locationStr = homeData
    ? `${homeData.location.city}, ${homeData.location.state}`
    : 'Location';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <HeaderSection
          location={locationStr}
          hasNotifications={homeData?.hasNotifications ?? false}
          userAvatar={user?.profilePic ?? null}
        />

        {/* Hero Card */}
        <HeroCard onBookPress={navigateToBooking} />

        {/* Search Bar */}
        <SearchBar onSearch={(text) => {
          // TODO: Implement search functionality - filter services by search text
        }} />

        {/* Popular Services */}
        <PopularServicesGrid onNavigate={navigateToCategory} />

        {/* Trusted Professional */}
        {homeData?.trustedProfessionals?.[0] && (
          <TrustedProfessionalCard
            professional={homeData.trustedProfessionals[0]}
            onBookPress={navigateToBooking}
          />
        )}

        {/* Activity Section */}
        {!loading && homeData?.activities && (
          <ActivitySection activities={homeData.activities} />
        )}

        {/* Spacer for bottom nav */}
        <View style={styles.bottomSpacer} />
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
