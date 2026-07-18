import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/Theme';
import { useAuth } from '@/context/AuthContext';
import {
  fetchTechnicianProfile,
  withdrawFunds,
} from '@/services/paymentService';
import {
  fetchPointsBalance,
  redeemTechnicianPoints,
  redeemCustomerPoints,
  PointsConfigData,
} from '@/services/pointsService';

// ── Main screen ────────────────────────────────────────────

export default function WalletScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [balance, setBalance] = useState<number>(0);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [walletHelpVisible, setWalletHelpVisible] = useState(false);

  // Fixi Points state
  const [pointsBalance, setPointsBalance] = useState<number>(0);
  const [pointsConfig, setPointsConfig] = useState<PointsConfigData | null>(null);
  const [redeemModalVisible, setRedeemModalVisible] = useState(false);
  const [redeemPointsAmount, setRedeemPointsAmount] = useState<number>(100);
  const [redeeming, setRedeeming] = useState(false);

  // Guard against double withdraw
  const withdrawGuardRef = useRef(false);

  // ── Fetch profile + wallet balance ───────────────────────
  const loadWallet = useCallback(async () => {
    try {
      setLoadingProfile(true);
      const [profile, pointsData] = await Promise.all([
        fetchTechnicianProfile().catch(() => ({ walletBalance: 0 })),
        fetchPointsBalance().catch(() => null),
      ]);
      setBalance(profile.walletBalance);
      if (pointsData?.success) {
        setPointsBalance(pointsData.pointsBalance || 0);
        if (pointsData.config) setPointsConfig(pointsData.config);
      }
    } catch (err) {
      console.error('[WalletScreen] Failed to load profile/points:', err);
      Alert.alert('Error', 'Failed to load wallet data. Pull down to retry.');
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadWallet();
    }, [loadWallet])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadWallet();
    setRefreshing(false);
  }, [loadWallet]);

  // ── Withdraw ─────────────────────────────────────────────
  const handleWithdraw = async () => {
    // Double-click guard
    if (withdrawGuardRef.current || withdrawing || balance <= 0) return;
    withdrawGuardRef.current = true;

    const originalBalance = balance;

    // ── OPTIMISTIC UI: Immediately set balance to 0 ────
    setBalance(0);
    setWithdrawing(true);

    try {
      await withdrawFunds(originalBalance);
      Alert.alert(
        '✅ Withdrawal Requested!',
        `₹${originalBalance.toLocaleString('en-IN')} will be processed within 24-48 hours.`,
        [{ text: 'OK' }]
      );
    } catch (err: any) {
      // ── REVERT on failure ────────────────────────────
      setBalance(originalBalance);
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Withdrawal failed. Please try again.';
      Alert.alert('Withdrawal Failed', message, [{ text: 'OK' }]);
    } finally {
      setWithdrawing(false);
      withdrawGuardRef.current = false;
    }
  };

  // ── Redeem Fixi Points ───────────────────────────────────
  const handleRedeemPoints = async () => {
    if (redeeming || redeemPointsAmount <= 0 || pointsBalance < redeemPointsAmount) return;
    const originalPoints = pointsBalance;

    // Optimistic UI update
    setPointsBalance((prev) => Math.max(0, prev - redeemPointsAmount));
    setRedeeming(true);

    try {
      if (user?.role === 'customer') {
        await redeemCustomerPoints({ pointsRedeemed: redeemPointsAmount });
      } else {
        await redeemTechnicianPoints({ pointsRedeemed: redeemPointsAmount });
      }
      setRedeemModalVisible(false);
      Alert.alert(
        '⭐ Points Redeemed!',
        `Successfully requested redemption of ${redeemPointsAmount} Fixi Points. Processed within 24 hours.`,
        [{ text: 'OK', onPress: loadWallet }]
      );
    } catch (err: any) {
      setPointsBalance(originalPoints);
      const msg = err?.response?.data?.message || 'Points redemption failed. Please try again.';
      Alert.alert('Redemption Failed', msg);
    } finally {
      setRedeeming(false);
    }
  };

  // ── Render ───────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* ── Header ────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Wallet</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {/* ── Balance Card ────────────────────────────────── */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceIconWrap}>
            <MaterialIcons name="account-balance-wallet" size={32} color={Colors.primary} />
          </View>

          <Text style={styles.balanceLabel}>Available Earnings</Text>

          {loadingProfile ? (
            <ActivityIndicator
              size="large"
              color={Colors.primary}
              style={{ marginVertical: 12 }}
            />
          ) : (
            <Text style={styles.balanceAmount}>
              ₹{balance.toLocaleString('en-IN')}
            </Text>
          )}

          <Text style={styles.balanceSub}>
            {user?.name ? `Hi ${user.name.split(' ')[0]}, ` : ''}
            {balance > 0
              ? 'you have earnings ready to withdraw!'
              : 'no pending earnings right now.'}
          </Text>

          {/* ── Withdraw Button ───────────────────────────── */}
          <TouchableOpacity
            style={[
              styles.withdrawBtn,
              (withdrawing || balance <= 0) && styles.withdrawBtnDisabled,
            ]}
            onPress={handleWithdraw}
            disabled={withdrawing || balance <= 0 || loadingProfile}
            activeOpacity={0.8}
          >
            {withdrawing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialIcons name="arrow-downward" size={18} color="#fff" />
                <Text style={styles.withdrawBtnText}>
                  {balance <= 0 ? 'No Balance to Withdraw' : 'Withdraw Funds'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Info Cards ──────────────────────────────────── */}
        <View style={styles.infoRow}>
          <View style={styles.infoCard}>
            <View style={[styles.infoIcon, { backgroundColor: '#dbeafe' }]}>
              <MaterialIcons name="access-time" size={20} color="#2563eb" />
            </View>
            <Text style={styles.infoTitle}>Processing</Text>
            <Text style={styles.infoDesc}>Withdrawals take 24-48 hours</Text>
          </View>

          <View style={styles.infoCard}>
            <View style={[styles.infoIcon, { backgroundColor: '#d1fae5' }]}>
              <MaterialIcons name="verified-user" size={20} color="#059669" />
            </View>
            <Text style={styles.infoTitle}>Secure</Text>
            <Text style={styles.infoDesc}>Bank-grade security</Text>
          </View>
        </View>

        {/* ── Fixi Points Card (⭐) ───────────────────────── */}
        <View style={styles.pointsCard}>
          <View style={styles.pointsHeader}>
            <View style={styles.pointsIconWrap}>
              <MaterialIcons name="stars" size={28} color="#d97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.pointsTitle}>Fixi Points Balance</Text>
              <Text style={styles.pointsConversion}>
                100 Points = ₹1.00 (Current value: ₹{((pointsBalance / (pointsConfig?.techPointsPerRupee || 100))).toFixed(2)})
              </Text>
            </View>
          </View>

          <Text style={styles.pointsAmountText}>{pointsBalance.toLocaleString('en-IN')} <Text style={{ fontSize: Typography.base, color: '#b45309' }}>pts</Text></Text>

          <TouchableOpacity
            style={[styles.redeemBtn, pointsBalance < (pointsConfig?.minTechRedeemPoints || 100) && styles.redeemBtnDisabled]}
            onPress={() => {
              setRedeemPointsAmount(pointsBalance >= 500 ? 500 : pointsBalance >= 100 ? 100 : pointsBalance);
              setRedeemModalVisible(true);
            }}
            disabled={pointsBalance < (pointsConfig?.minTechRedeemPoints || 100)}
            activeOpacity={0.8}
          >
            <MaterialIcons name="military-tech" size={18} color="#fff" />
            <Text style={styles.redeemBtnText}>
              {pointsBalance < (pointsConfig?.minTechRedeemPoints || 100) ? `Min ${(pointsConfig?.minTechRedeemPoints || 100)} Pts to Redeem` : 'Redeem Points (Processed within 24 hrs)'}
            </Text>
          </TouchableOpacity>
        </View>



        {/* ── Help section ────────────────────────────────── */}
        <TouchableOpacity style={styles.helpCard} activeOpacity={0.88} onPress={() => setWalletHelpVisible(true)}>
          <View style={styles.helpLeft}>
            <MaterialIcons name="help-outline" size={20} color={Colors.primary} />
            <View>
              <Text style={styles.helpTitle}>Need help with your wallet?</Text>
              <Text style={styles.helpDesc}>Contact support for assistance</Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={22} color={Colors.textMuted} />
        </TouchableOpacity>
      </ScrollView>

      {/* Wallet Help Modal */}
      <Modal
        visible={walletHelpVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setWalletHelpVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconWrap}>
              <MaterialIcons name="account-balance" size={32} color={Colors.primary} />
            </View>
            <Text style={styles.modalTitle}>Wallet Settlements</Text>
            <Text style={styles.modalText}>
              All your earnings and payments are processed securely. The amount will be automatically settled to your registered bank account within 48 hours of job completion.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setWalletHelpVisible(false)}
              >
                <Text style={styles.modalCancelText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Redeem Points Modal ───────────────────────────── */}
      <Modal
        visible={redeemModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRedeemModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalIconWrap, { backgroundColor: '#fef3c7' }]}>
              <MaterialIcons name="military-tech" size={32} color="#d97706" />
            </View>
            <Text style={styles.modalTitle}>Redeem Fixi Points</Text>
            <Text style={styles.modalText}>
              Select or confirm points to redeem. Redemptions are processed and credited within 24 hours.
            </Text>

            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
              {[100, 200, 500].map((amt) => (
                <TouchableOpacity
                  key={amt}
                  onPress={() => setRedeemPointsAmount(amt)}
                  disabled={pointsBalance < amt}
                  style={[
                    styles.quickAmtBtn,
                    redeemPointsAmount === amt && styles.quickAmtBtnActive,
                    pointsBalance < amt && { opacity: 0.4 }
                  ]}
                >
                  <Text style={[styles.quickAmtText, redeemPointsAmount === amt && styles.quickAmtTextActive]}>{amt} Pts</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ width: '100%', marginBottom: 16 }}>
              <TouchableOpacity
                style={styles.modalBtn}
                onPress={handleRedeemPoints}
                disabled={redeeming}
              >
                {redeeming ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalBtnText}>Confirm Redemption ({redeemPointsAmount} Pts)</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { marginTop: 10 }]}
                onPress={() => setRedeemModalVisible(false)}
                disabled={redeeming}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Header
  header: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingTop: 12,
    paddingBottom: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: Typography.xl,
    fontFamily: 'Manrope-Bold',
    color: '#fff',
  },

  scroll: {
    paddingBottom: 40,
  },

  // Balance card
  balanceCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.base,
    marginTop: -8,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadow.md,
  },
  balanceIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  balanceLabel: {
    fontSize: Typography.sm,
    fontFamily: 'Manrope-Bold',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  balanceAmount: {
    fontSize: 42,
    fontFamily: 'Manrope-Black',
    color: Colors.primary,
    marginTop: 4,
    marginBottom: 4,
  },
  balanceSub: {
    fontSize: Typography.sm,
    fontFamily: 'Manrope-Regular',
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 18,
  },

  // Withdraw button
  withdrawBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: Radius.md,
    width: '100%',
    ...Shadow.sm,
  },
  withdrawBtnDisabled: {
    backgroundColor: Colors.textMuted,
    opacity: 0.7,
  },
  withdrawBtnText: {
    fontSize: Typography.md,
    fontFamily: 'Manrope-Bold',
    color: '#fff',
  },

  // Info row
  infoRow: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: Spacing.base,
    marginTop: Spacing.base,
  },
  infoCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.base,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadow.sm,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  infoTitle: {
    fontSize: Typography.base,
    fontFamily: 'Manrope-Bold',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  infoDesc: {
    fontSize: Typography.xs,
    fontFamily: 'Manrope-Regular',
    color: Colors.textMuted,
    textAlign: 'center',
  },

  // Transaction history
  historySection: {
    marginTop: Spacing.xl,
    marginHorizontal: Spacing.base,
  },
  sectionTitle: {
    fontSize: Typography.md,
    fontFamily: 'Manrope-Bold',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  historyEmpty: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  historyEmptyTitle: {
    fontSize: Typography.base,
    fontFamily: 'Manrope-Bold',
    color: Colors.textPrimary,
  },
  historyEmptyDesc: {
    fontSize: Typography.sm,
    fontFamily: 'Manrope-Regular',
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Help card
  helpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.base,
    marginTop: Spacing.base,
    borderRadius: Radius.xl,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadow.sm,
  },
  helpLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  helpTitle: {
    fontSize: Typography.base,
    fontFamily: 'Manrope-SemiBold',
    color: Colors.textPrimary,
  },
  helpDesc: {
    fontSize: Typography.xs,
    fontFamily: 'Manrope-Regular',
    color: Colors.textMuted,
    marginTop: 1,
  },

  // Modal styles
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: Spacing.xl,
  },
  modalContent: {
    backgroundColor: '#fff', borderRadius: Radius.xl,
    padding: Spacing.xl, alignItems: 'center', width: '100%', maxWidth: 320,
    ...Shadow.md,
  },
  modalIconWrap: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.primaryLight,
    justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.lg,
  },
  modalTitle: { fontSize: 18, fontFamily: 'Manrope-Black', color: Colors.textPrimary, marginBottom: 12 },
  modalText: {
    fontSize: 14, fontFamily: 'Manrope-Medium', color: Colors.textSecondary,
    textAlign: 'center', lineHeight: 22, marginBottom: 24,
  },
  modalBtn: {
    backgroundColor: Colors.primary, width: '100%', paddingVertical: 14,
    borderRadius: Radius.lg, alignItems: 'center',
  },
  modalBtnText: { fontSize: 15, fontFamily: 'Manrope-Bold', color: '#fff' },
  modalActions: { width: '100%' },
  modalCancelBtn: { width: '100%', paddingVertical: 12, alignItems: 'center' },
  modalCancelText: { fontSize: 14, fontFamily: 'Manrope-Bold', color: Colors.textSecondary },
  pointsCard: {
    backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a',
    borderRadius: Radius.xl, padding: Spacing.base, marginHorizontal: Spacing.base,
    marginTop: Spacing.base, ...Shadow.sm,
  },
  pointsHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  pointsIconWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#fef3c7', justifyContent: 'center', alignItems: 'center' },
  pointsTitle: { fontSize: Typography.base, fontFamily: 'Manrope-Bold', color: '#b45309' },
  pointsConversion: { fontSize: 12, fontFamily: 'Manrope-Medium', color: '#92400e', marginTop: 2 },
  pointsAmountText: { fontSize: 28, fontFamily: 'Manrope-Black', color: '#92400e', marginBottom: 14 },
  redeemBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#d97706', paddingVertical: 14, borderRadius: Radius.full, ...Shadow.sm,
  },
  redeemBtnDisabled: { opacity: 0.6, backgroundColor: '#9ca3af' },
  redeemBtnText: { fontSize: Typography.sm, fontFamily: 'Manrope-Bold', color: '#fff' },
  quickAmtBtn: { flex: 1, paddingVertical: 10, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.borderLight },
  quickAmtBtnActive: { backgroundColor: '#fef3c7', borderColor: '#d97706' },
  quickAmtText: { fontSize: Typography.sm, fontFamily: 'Manrope-Bold', color: Colors.textSecondary },
  quickAmtTextActive: { color: '#b45309' },
});
