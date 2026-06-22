import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, RefreshControl
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/Theme';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/axiosConfig';

export default function PaymentsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPayments = async () => {
    try {
      const res = await api.get('/payment/history');
      if (res.data?.success) {
        setTransactions(res.data.transactions || []);
      }
    } catch (err) {
      console.log('Failed to fetch payment history', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchPayments();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchPayments();
  };

  const renderTransaction = ({ item }: { item: any }) => {
    const isTech = user?.role === 'technician';
    
    // For Tech: display the amount they received (after platform fee)
    // For Customer: display the full amount they paid
    const amount = isTech ? (item.amount - item.platformFee) / 100 : item.amount / 100;
    
    const date = new Date(item.createdAt).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
    const time = new Date(item.createdAt).toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit'
    });

    const serviceType = item.bookingId?.serviceType || 'Service Booking';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.serviceRow}>
            <View style={styles.iconWrap}>
              <MaterialIcons name="receipt-long" size={20} color={Colors.primary} />
            </View>
            <View>
              <Text style={styles.serviceName}>{serviceType}</Text>
              <Text style={styles.dateText}>{date} • {time}</Text>
            </View>
          </View>
          <Text style={[styles.amountText, isTech ? { color: '#059669' } : { color: Colors.textPrimary }]}>
            {isTech ? '+' : '-'}₹{amount.toFixed(0)}
          </Text>
        </View>

        <View style={styles.divider} />
        
        <View style={styles.cardFooter}>
          <Text style={styles.txnIdLabel}>Transaction ID:</Text>
          <Text style={styles.txnIdValue} selectable>{item.razorpayPaymentId}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment History</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item: any) => item._id}
          renderItem={renderTransaction}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <MaterialIcons name="payment" size={64} color={Colors.border} />
              <Text style={styles.emptyTitle}>No payments yet</Text>
              <Text style={styles.emptyText}>When a booking is paid, it will appear here.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  backBtn: { padding: Spacing.sm },
  headerTitle: { fontSize: Typography.lg, fontFamily: 'Manrope-Black', color: Colors.textPrimary },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: Spacing.base, paddingBottom: 40 },
  
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    borderWidth: 1, borderColor: Colors.borderLight,
    ...Shadow.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  serviceRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  iconWrap: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primaryLight,
    justifyContent: 'center', alignItems: 'center'
  },
  serviceName: { fontSize: 15, fontFamily: 'Manrope-Bold', color: Colors.textPrimary },
  dateText: { fontSize: 12, fontFamily: 'Manrope-Medium', color: Colors.textMuted, marginTop: 2 },
  amountText: { fontSize: 16, fontFamily: 'Manrope-Black' },
  
  divider: { height: 1, backgroundColor: Colors.borderLight, marginVertical: 12 },
  
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  txnIdLabel: { fontSize: 12, fontFamily: 'Manrope-Medium', color: Colors.textSecondary },
  txnIdValue: { fontSize: 12, fontFamily: 'Manrope-SemiBold', color: Colors.textMuted },

  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyTitle: { fontSize: 18, fontFamily: 'Manrope-Bold', color: Colors.textPrimary, marginTop: 16 },
  emptyText: { fontSize: 14, fontFamily: 'Manrope-Medium', color: Colors.textSecondary, marginTop: 8 },
});
