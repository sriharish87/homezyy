import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '@/constants/Theme';
import type { Coupon } from '@/types/profile';
import { getCoupons, applyCoupon, removeCoupon } from '@/services/couponService';

export default function CouponsScreen() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      // TODO: Fetch coupons from backend
      const data = await getCoupons();
      setCoupons(data);
    } catch (err) {
      console.error('Failed to load coupons:', err);
      setError('Failed to load coupons');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Coupons & Offers</Text>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {coupons.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No coupons available</Text>
          </View>
        ) : (
          <FlatList
            data={coupons}
            keyExtractor={(i: Coupon) => i.id}
            renderItem={({ item }: { item: Coupon }) => (
              <View style={styles.card}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.code}>{item.code}</Text>
                  <Text style={styles.desc}>{item.description}</Text>
                </View>
                <View>
                  <TouchableOpacity
                    onPress={async () => {
                      try {
                        // TODO: Apply coupon via backend
                        await applyCoupon(item.code);
                        await load();
                        Alert.alert('Success', 'Coupon applied');
                      } catch (err) {
                        console.error('Failed to apply coupon:', err);
                        Alert.alert('Error', 'Failed to apply coupon');
                      }
                    }}
                  >
                    <Text style={styles.action}>Apply</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={async () => {
                      try {
                        // TODO: Remove coupon via backend
                        await removeCoupon(item.id);
                        await load();
                        Alert.alert('Success', 'Coupon removed');
                      } catch (err) {
                        console.error('Failed to remove coupon:', err);
                        Alert.alert('Error', 'Failed to remove coupon');
                      }
                    }}
                  >
                    <Text style={[styles.action, { color: Colors.error }]}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            scrollEnabled={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { padding: Spacing.base, flex: 1 },
  title: { fontSize: Typography.xl, fontFamily: 'Manrope-Bold', marginBottom: Spacing.md },
  errorContainer: { backgroundColor: Colors.error + '15', borderRadius: Radius.md, padding: Spacing.sm, marginBottom: Spacing.md },
  errorText: { color: Colors.error, fontSize: Typography.sm, fontFamily: 'Manrope-Medium' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: Colors.textMuted, fontFamily: 'Manrope-Medium', textAlign: 'center' },
  card: { padding: Spacing.base, backgroundColor: Colors.surface, borderRadius: Radius.md, marginBottom: Spacing.sm, flexDirection: 'row', alignItems: 'center' },
  code: { fontFamily: 'Manrope-Bold' },
  desc: { color: Colors.textMuted },
  action: { color: Colors.primary, fontFamily: 'Manrope-SemiBold', marginTop: 6 },
});

