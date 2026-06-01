import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  FlatList, ActivityIndicator, Dimensions, Animated, Easing
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/Theme';
import { ALL_SUBSERVICES, CATEGORIES, type SubService, type Category } from '@/constants/Data';
import LoadingScreen from '@/components/ui/LoadingScreen';

// Used directly in stylesheet

// ── Tab pill ───────────────────────────────────────────────

function TabPill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.tab, active && styles.activeTab]}
      activeOpacity={0.7}
    >
      <Text style={[styles.tabText, active && styles.activeTabText]}>
        {label === 'All' ? 'All Services' : label}
      </Text>
    </TouchableOpacity>
  );
}

// ── Service card ───────────────────────────────────────────

interface ServiceCardProps {
  service: SubService;
  isFavorited: boolean;
  onFavorite: () => void;
  onViewDetails: (service: SubService) => void;
}

function ServiceCard({ service, isFavorited, onFavorite, onViewDetails }: ServiceCardProps) {
  return (
    <View style={card.container}>
      {/* Image with skeleton */}
      <View style={[card.imgWrapper, card.skeleton]}>
        <Image
          source={{ uri: service.img }}
          style={card.img}
          contentFit="cover"
          transition={300}
        />
        {/* Rating badge */}
        <View style={card.ratingBadge}>
          <MaterialIcons name="star" size={12} color={Colors.star} />
          <Text style={card.ratingText}>{service.rating}</Text>
        </View>
      </View>

      {/* Card body */}
      <View style={card.body}>
        <Text style={card.title} numberOfLines={1}>{service.title}</Text>
        <Text style={card.meta} numberOfLines={1}>{service.reviews} reviews • {service.duration}</Text>
        <Text style={card.price}>{service.price}</Text>

        <View style={card.actions}>
          <TouchableOpacity style={card.viewBtn} onPress={() => onViewDetails(service)} activeOpacity={0.85}>
            <Text style={card.viewBtnText}>View Details</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[card.favBtn, isFavorited && card.favBtnActive]}
            onPress={onFavorite}
            activeOpacity={0.8}
          >
            <MaterialIcons
              name={isFavorited ? 'favorite' : 'favorite-border'}
              size={18}
              color={isFavorited ? '#ef4444' : Colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const card = StyleSheet.create({
  container: {
    width: '48%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadow.sm,
  },
  imgWrapper: {
    height: 130,
    backgroundColor: Colors.border,
    position: 'relative',
  },
  skeleton: {
    backgroundColor: Colors.surfaceAlt,
  },
  img: {
    width: '100%',
    height: '100%',
  },
  imgVisible: { opacity: 1 },
  imgHidden:  { opacity: 0 },
  ratingBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    ...Shadow.sm,
  },
  ratingText: {
    fontSize: Typography.xs,
    fontFamily: 'Manrope-Bold',
    color: Colors.textPrimary,
  },
  body: {
    padding: Spacing.md,
  },
  title: {
    fontSize: Typography.sm,
    fontFamily: 'Manrope-Bold',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  meta: {
    fontSize: 11,
    fontFamily: 'Manrope-Regular',
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  price: {
    fontSize: Typography.base,
    fontFamily: 'Manrope-Bold',
    color: Colors.primary,
    marginBottom: Spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  viewBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 8,
    alignItems: 'center',
  },
  viewBtnText: {
    fontSize: 12,
    fontFamily: 'Manrope-Bold',
    color: '#fff',
  },
  favBtn: {
    width: 36, height: 36,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  favBtnActive: {
    borderColor: '#ef4444',
    backgroundColor: '#fff5f5',
  },
});

// ── Main screen ────────────────────────────────────────────

export default function SubServicesScreen() {
  const router   = useRouter();
  const { id }   = useLocalSearchParams<{ id: string }>();
  const category = id as string;

  const [activeTab,  setActiveTab]  = useState('All');
  const [favorites,  setFavorites]  = useState<Set<string>>(new Set());
  const [isLoading,  setIsLoading]  = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);
  const [selectedServiceName, setSelectedServiceName] = useState("");
  const [services, setServices] = useState<SubService[]>([]);

  // Animation refs for smooth entrance
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(20)).current;

  // Initial category load
  useEffect(() => {
    // Immediate fetch for local data to avoid double-loading blink
    const data = ALL_SUBSERVICES[category as string] || [];
    setServices(data);
    
    // Only show loading if we really need to (data is empty/fetching)
    if (data.length === 0 && category) {
      setIsLoading(true);
      setTimeout(() => setIsLoading(false), 400); 
    } else {
      setIsLoading(false);
    }
  }, [category]);

  // Trigger content animation when loading stops
  useEffect(() => {
    if (!isLoading && !isNavigating) {
      Animated.parallel([
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(contentTranslateY, {
          toValue: 0,
          duration: 600,
          easing: Easing.out(Easing.back(1)),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset for next navigation
      contentOpacity.setValue(0);
      contentTranslateY.setValue(20);
    }
  }, [isLoading, isNavigating]);

  const categoryMeta = CATEGORIES.find((c: Category) => c.id === category);

  const tabs = useMemo(() => {
    const unique = new Set(services.map((s: SubService) => s.tab));
    return ['All', ...Array.from(unique)];
  }, [services]);

  const filtered = useMemo(() =>
    activeTab === 'All' ? services : services.filter((s: SubService) => s.tab === activeTab),
    [services, activeTab]
  );

  const toggleFav = (title: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      next.has(title) ? next.delete(title) : next.add(title);
      return next;
    });
  };

  const handleViewDetails = (service: SubService) => {
    setSelectedServiceName(service.title);
    setIsNavigating(true);

    setTimeout(() => {
      router.push({
        pathname: '/technicians/[service]/[subservice]',
        params: {
          service: category,
          subservice: service.title,
        },
      });
      setTimeout(() => setIsNavigating(false), 1000);
    }, 800);
  };

  if (!category || services.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyState}>
          <MaterialIcons name="sentiment-dissatisfied" size={64} color={Colors.border} />
          <Text style={styles.emptyTitle}>No services found</Text>
          <Text style={styles.emptyDesc}>We couldn't find services for this category.</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Browse All Services</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Blurred loader overlay for navigation */}
        {isNavigating && (
          <LoadingScreen
            serviceName={selectedServiceName}
            onComplete={() => {}}
          />
        )}
        {/* Initial category load loader */}
        {isLoading && (
          <LoadingScreen
            serviceName={`${categoryMeta?.name || category} Services`}
            onComplete={() => {}}
          />
        )}
      <Animated.View style={{ flex: 1, opacity: contentOpacity, transform: [{ translateY: contentTranslateY }] }}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.titleRow}>
            <View style={[styles.catIcon, { backgroundColor: categoryMeta?.bgColor ?? Colors.primaryLight }]}>
              <MaterialIcons name={categoryMeta?.icon as any ?? 'home-repair-service'} size={18} color={categoryMeta?.color ?? Colors.primary} />
            </View>
            <Text style={styles.pageTitle}>{category} Services</Text>
          </View>

          <TouchableOpacity style={styles.iconBtn}>
            <MaterialIcons name="tune" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Tab strip */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabs}
        >
          {tabs.map((tab) => (
            <TabPill
              key={tab}
              label={tab}
              active={activeTab === tab}
              onPress={() => setActiveTab(tab)}
            />
          ))}
        </ScrollView>
      </View>

      {/* ── Grid ───────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <View style={styles.emptyTab}>
          <MaterialIcons name="search-off" size={40} color={Colors.border} />
          <Text style={styles.emptyTabText}>No services in this tab.</Text>
        </View>
      ) : (
        <FlatList<SubService>
          data={filtered}
          keyExtractor={(item) => item.title}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <ServiceCard
              service={item}
              isFavorited={favorites.has(item.title)}
              onFavorite={() => toggleFav(item.title)}
              onViewDetails={() => handleViewDetails(item)}
            />
          )}
        />
        )}
      </Animated.View>
    </SafeAreaView>
  </>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },

  // Header
  header: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: Spacing.sm,
    ...Shadow.sm,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    gap: 8,
  },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  catIcon: {
    width: 32, height: 32,
    borderRadius: Radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageTitle: {
    fontSize: Typography.lg,
    fontFamily: 'Manrope-Bold',
    color: Colors.textPrimary,
  },

  // Tabs
  tabs: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    gap: 8,
    flexDirection: 'row',
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.full,
  },
  activeTab: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: Typography.sm,
    fontFamily: 'Manrope-Bold',
    color: Colors.textSecondary,
  },
  activeTabText: {
    color: '#fff',
  },

  // Grid
  grid: {
    padding: Spacing.base,
    paddingBottom: 100,
    gap: 12,
  },
  row: {
    gap: 12,
    justifyContent: 'space-between',
  },

  // Empty states
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    padding: Spacing.xl,
  },
  emptyTitle: {
    fontSize: Typography.xl,
    fontFamily: 'Manrope-Bold',
    color: Colors.textPrimary,
  },
  emptyDesc: {
    fontSize: Typography.base,
    fontFamily: 'Manrope-Regular',
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  backBtn: {
    marginTop: 8,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  backBtnText: {
    color: '#fff',
    fontFamily: 'Manrope-Bold',
    fontSize: Typography.base,
  },
  emptyTab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyTabText: {
    fontSize: Typography.base,
    fontFamily: 'Manrope-Regular',
    color: Colors.textSecondary,
  },
});
