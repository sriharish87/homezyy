import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, LayoutAnimation, Platform, UIManager, Animated, Easing
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/Theme';
import { useServices, type ServiceCategory } from '@/hooks/useServices';

import LoadingScreen from '@/components/ui/LoadingScreen';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ── Accordion card ─────────────────────────────────────────

interface CategoryCardProps {
  category: ServiceCategory;
  isExpanded: boolean;
  searchQuery: string;
  onToggle: (id: string) => void;
  onNavigate: (category: ServiceCategory) => void;
}

function CategoryCard({ category, isExpanded, searchQuery, onToggle, onNavigate }: CategoryCardProps) {
  const isSearching = searchQuery.length > 1;

  const subMatches = useMemo(() =>
    category.subservices.filter((s) =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [category.subservices, searchQuery]
  );

  const showSubservices = isExpanded || (isSearching && subMatches.length > 0);
  const displayedSubs   = isSearching && subMatches.length > 0 ? subMatches : category.subservices;

  return (
    <TouchableOpacity
      style={[styles.card, isExpanded && styles.cardExpanded]}
      onPress={() => onNavigate(category)}
      activeOpacity={0.9}
    >
      {/* Card header row */}
      <View style={styles.cardHeader}>
        <View style={[styles.iconWrapper, { backgroundColor: category.bgColor }]}>
          <MaterialIcons
            name={category.icon as any}
            size={24}
            color={category.color}
          />
        </View>

        <View style={styles.cardMeta}>
          <Text style={styles.cardName}>{category.name}</Text>
          <Text style={styles.cardCount}>{category.count}</Text>
        </View>

        <TouchableOpacity
          style={[styles.chevronBtn, { backgroundColor: category.bgColor }]}
          onPress={(e: any) => {
            e.stopPropagation?.();
            // Smooth height animation
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            onToggle(category.id);
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialIcons
            name={isExpanded ? 'expand-less' : 'chevron-right'}
            size={22}
            color={category.color}
          />
        </TouchableOpacity>
      </View>

      {/* Accordion subservices list */}
      {showSubservices && (
        <View style={styles.subList}>
          {displayedSubs.map((sub, i) => (
            <TouchableOpacity
              key={i}
              style={[
                styles.subItem,
                isSearching && subMatches.includes(sub) && styles.subItemHighlighted,
              ]}
              onPress={() => onNavigate(category)}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="chevron-right"
                size={16}
                color={isSearching && subMatches.includes(sub) ? category.color : Colors.textMuted}
              />
              <Text
                style={[
                  styles.subText,
                  isSearching && subMatches.includes(sub) && { color: category.color, fontFamily: 'Manrope-SemiBold' },
                ]}
              >
                {sub.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

// ── Main screen ────────────────────────────────────────────

export default function ServicesScreen() {
  const router = useRouter();
  const { categories, isLoading } = useServices();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isNavigating, setIsNavigating] = useState(false);
  const [selectedCategoryName, setSelectedCategoryName] = useState("");

  const filteredCategories = useMemo(() => {
    if (!searchQuery) return categories;
    const q = searchQuery.toLowerCase();
    return categories.filter((cat) =>
      cat.name.toLowerCase().includes(q) ||
      cat.subservices.some((s) => s.title.toLowerCase().includes(q))
    );
  }, [searchQuery, categories]);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleNavigate = (category: ServiceCategory) => {
    setSelectedCategoryName(category.name);
    setIsNavigating(true);

    // Transition timing optimized for 700ms to feel snappier and avoid blink
    setTimeout(() => {
      router.push({ pathname: '/categories/[id]', params: { id: category.id } });
      // Keep loader active for a moment on the new screen to hide layout jump
      setTimeout(() => setIsNavigating(false), 500);
    }, 700);
  };

  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (!isNavigating) {
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
      contentOpacity.setValue(0);
      contentTranslateY.setValue(20);
    }
  }, [isNavigating]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Blurred loader overlay for navigation */}
      {(isNavigating || isLoading) && (
        <LoadingScreen
          serviceName={selectedCategoryName || "Services"}
          onComplete={() => {}}
        />
      )}
      
      <Animated.View style={{ flex: 1, opacity: contentOpacity, transform: [{ translateY: contentTranslateY }] }}>
        {/* ── Header ─────────────────────────────────────── */}
        <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <MaterialIcons name="arrow-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <TouchableOpacity style={styles.iconBtn}>
            <MaterialIcons name="notifications" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.pageTitle}>Our Services</Text>
          <Text style={styles.pageSubtitle}>Find the right expert for your home needs</Text>
        </View>

        {/* Search bar */}
        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={20} color={Colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for a service..."
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialIcons name="close" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Category List ───────────────────────────────── */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {filteredCategories.length > 0 ? (
          filteredCategories.map((cat) => (
            <CategoryCard
              key={cat.id}
              category={cat}
              isExpanded={expandedId === cat.id}
              searchQuery={searchQuery}
              onToggle={toggleExpand}
              onNavigate={handleNavigate}
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <MaterialIcons name="sentiment-dissatisfied" size={52} color={Colors.border} />
            <Text style={styles.emptyTitle}>No services found</Text>
            <Text style={styles.emptyDesc}>No services matching "{searchQuery}".</Text>
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearLink}>Clear search</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },

  // Header
  header: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    ...Shadow.sm,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  iconBtn: {
    width: 40, height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleBlock: { marginBottom: Spacing.md },
  pageTitle: {
    fontSize: Typography['2xl'],
    fontFamily: 'Manrope-Black',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  pageSubtitle: {
    fontSize: Typography.base,
    fontFamily: 'Manrope-Regular',
    color: Colors.textSecondary,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    height: 48,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.base,
    fontFamily: 'Manrope-Regular',
    color: Colors.textPrimary,
  },

  // List
  list:        { flex: 1 },
  listContent: { padding: Spacing.base, gap: 12, paddingBottom: 100 },

  // Card
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadow.sm,
  },
  cardExpanded: {
    borderColor: Colors.primaryLight,
    ...Shadow.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    gap: 12,
  },
  iconWrapper: {
    width: 48, height: 48,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardMeta: { flex: 1 },
  cardName: {
    fontSize: Typography.md,
    fontFamily: 'Manrope-Bold',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  cardCount: {
    fontSize: Typography.sm,
    fontFamily: 'Manrope-Regular',
    color: Colors.textSecondary,
  },
  chevronBtn: {
    width: 34, height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Accordion subservices
  subList: {
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    gap: 4,
  },
  subItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: Radius.sm,
    gap: 6,
  },
  subItemHighlighted: {
    backgroundColor: Colors.primaryLight,
  },
  subText: {
    fontSize: Typography.sm,
    fontFamily: 'Manrope-Medium',
    color: Colors.textSecondary,
    flex: 1,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyTitle: {
    fontSize: Typography.lg,
    fontFamily: 'Manrope-Bold',
    color: Colors.textPrimary,
  },
  emptyDesc: {
    fontSize: Typography.base,
    fontFamily: 'Manrope-Regular',
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  clearLink: {
    fontSize: Typography.base,
    fontFamily: 'Manrope-SemiBold',
    color: Colors.primary,
  },
});
