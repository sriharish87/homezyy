import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '@/constants/Theme';
import type { PaymentMethod } from '@/types/profile';
import { getPaymentMethods, removePaymentMethod, setDefaultPaymentMethod } from '@/services/paymentMethodsService';

export default function PaymentMethodsScreen() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      // TODO: Fetch payment methods from backend
      const data = await getPaymentMethods();
      setMethods(data);
    } catch (err) {
      console.error('Failed to load payment methods:', err);
      setError('Failed to load payment methods');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleRemove = (id: string) => {
    Alert.alert('Remove', 'Remove payment method?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            // TODO: Delete payment method via backend
            await removePaymentMethod(id);
            await load();
            Alert.alert('Success', 'Payment method removed');
          } catch (err) {
            console.error('Failed to remove payment method:', err);
            Alert.alert('Error', 'Failed to remove payment method');
          }
        },
      },
    ]);
  };

  const handleSetDefault = async (id: string) => {
    try {
      // TODO: Set default payment method via backend
      await setDefaultPaymentMethod(id);
      await load();
    } catch (err) {
      console.error('Failed to set default:', err);
      Alert.alert('Error', 'Failed to set default payment method');
    }
  };

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
        <Text style={styles.title}>Payment Methods</Text>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {methods.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No payment methods added yet.</Text>
          </View>
        ) : (
          <FlatList
            data={methods}
            keyExtractor={(i: PaymentMethod) => i.id}
            renderItem={({ item }: { item: PaymentMethod }) => (
              <View style={styles.card}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.displayName}</Text>
                  <Text style={styles.sub}>{item.type}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  {!item.isDefault && (
                    <TouchableOpacity onPress={() => handleSetDefault(item.id)}>
                      <Text style={styles.action}>Set Default</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => handleRemove(item.id)}>
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
  name: { fontFamily: 'Manrope-Bold' },
  sub: { color: Colors.textMuted },
  action: { color: Colors.primary, fontFamily: 'Manrope-SemiBold', marginTop: 6 },
});

