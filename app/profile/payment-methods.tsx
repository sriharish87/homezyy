import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '@/constants/Theme';
import type { PaymentMethod } from '@/types/profile';
import { getPaymentMethods, addPaymentMethod, removePaymentMethod, setDefaultPaymentMethod } from '@/services/paymentMethodsService';

export default function PaymentMethodsScreen() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);

  const load = async () => setMethods(await getPaymentMethods());

  useEffect(() => { load(); }, []);

  const handleRemove = (id: string) => {
    Alert.alert('Remove', 'Remove payment method?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => { await removePaymentMethod(id); await load(); } },
    ]);
  };

  const handleSetDefault = async (id: string) => {
    await setDefaultPaymentMethod(id);
    await load();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Payment Methods</Text>

        <FlatList data={methods} keyExtractor={(i: PaymentMethod) => i.id} renderItem={({ item }: { item: PaymentMethod }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.displayName}</Text>
              <Text style={styles.sub}>{item.type}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              {!item.isDefault && <TouchableOpacity onPress={() => handleSetDefault(item.id)}><Text style={styles.action}>Set Default</Text></TouchableOpacity>}
              <TouchableOpacity onPress={() => handleRemove(item.id)}><Text style={[styles.action, { color: Colors.error }]}>Remove</Text></TouchableOpacity>
            </View>
          </View>
        )} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  container: { padding: Spacing.base, flex: 1 },
  title: { fontSize: Typography.xl, fontFamily: 'Manrope-Bold', marginBottom: Spacing.md },
  card: { padding: Spacing.base, backgroundColor: Colors.surface, borderRadius: Radius.md, marginBottom: Spacing.sm, flexDirection: 'row', alignItems: 'center' },
  name: { fontFamily: 'Manrope-Bold' },
  sub: { color: Colors.textMuted },
  action: { color: Colors.primary, fontFamily: 'Manrope-SemiBold', marginTop: 6 },
});
