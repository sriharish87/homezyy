import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '@/constants/Theme';
import type { Coupon } from '@/types/profile';
import { getCoupons, applyCoupon, removeCoupon } from '@/services/couponService';

export default function CouponsScreen() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);

  const load = async () => setCoupons(await getCoupons());

  useEffect(() => { load(); }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Coupons & Offers</Text>

        <FlatList data={coupons} keyExtractor={(i: Coupon) => i.id} renderItem={({ item }: { item: Coupon }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.code}>{item.code}</Text>
              <Text style={styles.desc}>{item.description}</Text>
            </View>
            <View>
              <TouchableOpacity onPress={async () => { await applyCoupon(item.code); await load(); }}><Text style={styles.action}>Apply</Text></TouchableOpacity>
              <TouchableOpacity onPress={async () => { await removeCoupon(item.id); await load(); }}><Text style={[styles.action, { color: Colors.error }]}>Remove</Text></TouchableOpacity>
            </View>
          </View>
        )} ListEmptyComponent={<Text style={{ color: Colors.textMuted }}>No coupons available</Text>} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  container: { padding: Spacing.base, flex: 1 },
  title: { fontSize: Typography.xl, fontFamily: 'Manrope-Bold', marginBottom: Spacing.md },
  card: { padding: Spacing.base, backgroundColor: Colors.surface, borderRadius: Radius.md, marginBottom: Spacing.sm, flexDirection: 'row', alignItems: 'center' },
  code: { fontFamily: 'Manrope-Bold' },
  desc: { color: Colors.textMuted },
  action: { color: Colors.primary, fontFamily: 'Manrope-SemiBold', marginTop: 6 },
});
