import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions,
  FlatList, Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { OFFERS, type Offer } from '@/constants/Data';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/Theme';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = SCREEN_W - Spacing.base * 2;

/**
 * Horizontal scrolling offer banners with auto-advance and dot indicators.
 */
export default function Offers() {
  const flatRef    = useRef<any>(null);
  const [current, setCurrent] = useState(0);

  const advance = useCallback(() => {
    const next = (current + 1) % OFFERS.length;
    setCurrent(next);
    flatRef.current?.scrollToIndex({ index: next, animated: true });
  }, [current]);

  // Auto-advance every 4 seconds
  useEffect(() => {
    const interval = setInterval(advance, 4000);
    return () => clearInterval(interval);
  }, [advance]);

  const renderItem = ({ item }: { item: Offer }) => (
    <View style={[styles.card, { width: CARD_W, backgroundColor: item.color }]}>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardDesc}>{item.description}</Text>
        <View style={styles.codeRow}>
          <Text style={styles.codeLbl}>Use code:</Text>
          <View style={styles.codeChip}>
            <Text style={styles.codeText}>{item.code}</Text>
          </View>
        </View>
      </View>
      <MaterialIcons name="local-offer" size={60} color="rgba(255,255,255,0.15)" style={styles.bgIcon} />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Current Offers</Text>
      </View>
      <FlatList<Offer>
        ref={flatRef}
        data={OFFERS}
        keyExtractor={(item: Offer) => item.id}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: Spacing.base }}
        snapToInterval={CARD_W}
        decelerationRate="fast"
        onMomentumScrollEnd={(e: any) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / CARD_W);
          setCurrent(idx);
        }}
      />
      {/* Dots */}
      <View style={styles.dots}>
        {OFFERS.map((_, i) => (
          <View key={i} style={[styles.dot, current === i && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: Spacing.xl },
  header: {
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: Typography.lg,
    fontFamily: 'Manrope-Bold',
    color: Colors.textPrimary,
  },
  card: {
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    overflow: 'hidden',
    position: 'relative',
    minHeight: 140,
    ...Shadow.md,
  },
  cardContent: { zIndex: 1 },
  cardTitle: {
    fontSize: Typography['2xl'],
    fontFamily: 'Manrope-Black',
    color: '#fff',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: Typography.base,
    fontFamily: 'Manrope-Regular',
    color: 'rgba(255,255,255,0.85)',
    marginBottom: Spacing.md,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  codeLbl: {
    fontSize: Typography.sm,
    fontFamily: 'Manrope-Medium',
    color: 'rgba(255,255,255,0.7)',
  },
  codeChip: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  codeText: {
    fontSize: Typography.sm,
    fontFamily: 'Manrope-Bold',
    color: '#fff',
    letterSpacing: 1,
  },
  bgIcon: {
    position: 'absolute',
    right: -5,
    bottom: -5,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: Spacing.md,
  },
  dot: {
    width: 7, height: 7,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  dotActive: {
    backgroundColor: Colors.primary,
    width: 20,
  },
});
