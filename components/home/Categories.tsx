import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useServices } from '@/hooks/useServices';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/Theme';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = (SCREEN_W - Spacing.base * 2 - 12 * 2) / 3; // 3-column grid

/**
 * Category grid component for the Home screen.
 * Renders all service categories in a responsive grid layout.
 */
export default function Categories() {
  const router = useRouter();
  const { categories } = useServices();

  const handlePress = (category: any) => {
    router.push({ pathname: '/categories/[id]', params: { id: category.id } });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>All Categories</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/services')}>
          <Text style={styles.viewAll}>View All</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.grid}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={styles.card}
            onPress={() => handlePress(cat)}
            activeOpacity={0.8}
          >
            <View style={[styles.iconBg, { backgroundColor: cat.bgColor }]}>
              <MaterialIcons name={cat.icon as any} size={24} color={cat.color} />
            </View>
            <Text style={styles.label} numberOfLines={1}>{cat.name}</Text>
            <Text style={styles.count}>{cat.count}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  title: {
    fontSize: Typography.lg,
    fontFamily: 'Manrope-Bold',
    color: Colors.textPrimary,
  },
  viewAll: {
    fontSize: Typography.sm,
    fontFamily: 'Manrope-SemiBold',
    color: Colors.primary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    width: CARD_W,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 6,
    ...Shadow.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  iconBg: {
    width: 48, height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: Typography.sm,
    fontFamily: 'Manrope-Bold',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  count: {
    fontSize: Typography.xs,
    fontFamily: 'Manrope-Regular',
    color: Colors.textSecondary,
  },
});
