import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Switch, Alert, Platform, Modal
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/Theme';
import api from '@/lib/axiosConfig';
import { fetchPointsBalance, PointsConfigData } from '@/services/pointsService';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, updateUser } = useAuth();

  const isTech = user?.role === 'technician';

  // Toggle State
  const [isAvailable, setIsAvailable] = useState(user?.isAvailable ?? false);


  // Stats state for Tech
  const [stats, setStats] = useState({
    totalOrders: 0,
    rating: 0,
    ratingCount: 0
  });

  // Stats state for Customer
  const [customerStats, setCustomerStats] = useState({
    upcomingOrders: 0,
    totalOrders: 0,
    ratingCount: 0
  });

  const [supportVisible, setSupportVisible] = useState(false);
  const [pointsBalance, setPointsBalance] = useState(0);
  const [pointsConfig, setPointsConfig] = useState<PointsConfigData | null>(null);

  // Sync state when context changes
  useEffect(() => {
    setIsAvailable(user?.isAvailable ?? false);
  }, [user?.isAvailable]);

  // Fetch Stats dynamically
  useFocusEffect(
    React.useCallback(() => {
      if (isTech) {
        api.get('/tech/profile')
          .then((res) => {
            setStats({
              totalOrders: res.data.totalOrdersCompleted || 0,
              rating: res.data.rating || 0,
              ratingCount: res.data.numberOfRatings || 0,
            });
            // Ensure availability is strictly synced with DB
            if (res.data.isAvailable !== undefined) {
              updateUser({ isAvailable: res.data.isAvailable });
            }
          })
          .catch((err) => console.log('Failed to fetch tech profile', err));
      } else {
        api.get('/user/profile')
          .then((res) => {
            setCustomerStats({
              upcomingOrders: res.data.upcomingOrders || 0,
              totalOrders: res.data.totalOrdersCompleted || 0,
              ratingCount: res.data.numberOfRatingsGiven || 0,
            });
          })
          .catch((err) => console.log('Failed to fetch user profile', err));
      }

      fetchPointsBalance()
        .then((res) => {
          if (res?.success) {
            setPointsBalance(res.pointsBalance || 0);
            if (res.config) setPointsConfig(res.config);
          }
        })
        .catch((err) => console.log('Failed to fetch points balance on profile', err));
    }, [isTech])
  );

  const handleToggleAvailability = async (value: boolean) => {
    try {
      // Optimistic update UI
      setIsAvailable(value);

      // Update backend first
      await api.patch('/tech/availability', { isAvailable: value });

      // If success, update auth context so it persists
      if (updateUser) {
        await updateUser({ isAvailable: value });
      }
    } catch (error) {
      // Revert on failure
      setIsAvailable(!value);
      Alert.alert('Error', 'Failed to update availability. Please try again.');
    }
  };

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to sign out?')) {
        await logout();
        router.replace('/welcome');
      }
    } else {
      Alert.alert(
        'Sign Out',
        'Are you sure you want to sign out?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Sign Out',
            style: 'destructive',
            onPress: async () => {
              await logout();
              router.replace('/welcome');
            },
          },
        ]
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Profile Header ─────────────────── */}
        <View style={styles.profileHeader}>
          <View style={styles.headerInfo}>
            <Text style={styles.userName}>{user?.name ?? 'Homezy User'}</Text>
            <View style={styles.phoneRow}>
              <MaterialIcons name="phone" size={14} color={Colors.textMuted} />
              <Text style={styles.userPhone}>{user?.phone ?? 'Not provided'}</Text>
            </View>
            <View style={styles.roleBadge}>
              <MaterialIcons name="verified" size={12} color={Colors.primary} />
              <Text style={styles.roleText}>{isTech ? 'Homezy Pro' : 'Customer'}</Text>
            </View>
          </View>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <MaterialIcons name="person" size={40} color={Colors.primary} />
            </View>
          </View>
        </View>

        {/* ── Dynamic Stats for Tech ─────────────────── */}
        {isTech ? (
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.totalOrders}</Text>
              <Text style={styles.statLabel}>Jobs Done</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.rating.toFixed(1)} <MaterialIcons name="star" size={16} color="#fbbf24" /></Text>
              <Text style={styles.statLabel}>Avg Rating</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.ratingCount}</Text>
              <Text style={styles.statLabel}>Reviews</Text>
            </View>
          </View>
        ) : (
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{customerStats.upcomingOrders}</Text>
              <Text style={styles.statLabel}>Upcoming</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{customerStats.totalOrders}</Text>
              <Text style={styles.statLabel}>Total Jobs</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{customerStats.ratingCount}</Text>
              <Text style={styles.statLabel}>Reviews Given</Text>
            </View>
          </View>
        )}

        {/* ── Fixi Points Card (⭐) ───────────────────────── */}
        <TouchableOpacity
          style={styles.pointsBanner}
          onPress={() => router.push('/wallet')}
          activeOpacity={0.88}
        >
          <View style={styles.pointsBannerLeft}>
            <View style={styles.pointsIconBox}>
              <MaterialIcons name="military-tech" size={26} color="#d97706" />
            </View>
            <View>
              <Text style={styles.pointsBannerTitle}>Fixi Points Balance</Text>
              <Text style={styles.pointsBannerSub}>
                100 Pts = ₹1.00 • Value: ₹{((pointsBalance / (pointsConfig?.customerPointsPerRupee || 100))).toFixed(2)}
              </Text>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.pointsBannerVal}>{pointsBalance} ⭐</Text>
            <Text style={styles.pointsRedeemLink}>Redeem Now →</Text>
          </View>
        </TouchableOpacity>

        {/* ── Menu Actions ───────────────────── */}
        <View style={styles.sectionCard}>
          <TouchableOpacity style={styles.menuRow} onPress={() => router.push('/edit-profile')}>
            <View style={styles.iconBox}><MaterialIcons name="person-outline" size={22} color={Colors.primary} /></View>
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuTitle}>Edit Profile</Text>
              <Text style={styles.menuSub}>Update your name, phone & details</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={Colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.separator} />

          <TouchableOpacity style={styles.menuRow} onPress={() => setSupportVisible(true)}>
            <View style={[styles.iconBox, { backgroundColor: '#f3e8ff' }]}><MaterialIcons name="support-agent" size={22} color="#9333ea" /></View>
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuTitle}>Help & Support</Text>
              <Text style={styles.menuSub}>Contact us for queries or issues</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={Colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.separator} />

          <TouchableOpacity style={styles.menuRow} onPress={() => router.push('/payments')}>
            <View style={[styles.iconBox, { backgroundColor: '#dcfce7' }]}><MaterialIcons name="history" size={22} color="#16a34a" /></View>
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuTitle}>Payment History</Text>
              <Text style={styles.menuSub}>View your past transactions</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={Colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.separator} />

          {isTech && (
            <>
              <View style={styles.menuRow}>
                <View style={styles.iconBox}><MaterialIcons name="power-settings-new" size={22} color={Colors.primary} /></View>
                <View style={styles.menuTextWrap}>
                  <Text style={styles.menuTitle}>Online Availability</Text>
                  <Text style={styles.menuSub}>{isAvailable ? 'You are accepting orders' : 'You are currently offline'}</Text>
                </View>
                <Switch
                  value={isAvailable}
                  onValueChange={handleToggleAvailability}
                  trackColor={{ false: Colors.border, true: Colors.primary + 'AA' }}
                  thumbColor={isAvailable ? Colors.primary : '#fff'}
                />
              </View>

              <View style={styles.separator} />

              <TouchableOpacity style={styles.menuRow} onPress={() => router.push('/wallet')}>
                <View style={styles.iconBox}><MaterialIcons name="account-balance-wallet" size={22} color={Colors.primary} /></View>
                <View style={styles.menuTextWrap}>
                  <Text style={styles.menuTitle}>My Wallet</Text>
                  <Text style={styles.menuSub}>View earnings and settlements</Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color={Colors.textMuted} />
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.sectionCard}>
          <TouchableOpacity style={styles.menuRow} onPress={handleLogout}>
            <View style={[styles.iconBox, { backgroundColor: '#fee2e2' }]}><MaterialIcons name="logout" size={22} color="#dc2626" /></View>
            <View style={styles.menuTextWrap}>
              <Text style={[styles.menuTitle, { color: '#dc2626' }]}>Sign Out</Text>
              <Text style={styles.menuSub}>Log out of your account</Text>
            </View>
          </TouchableOpacity>
        </View>

        <Text style={styles.versionText}>Homezy v1.0.0 · Designed for you</Text>

      </ScrollView>

      {/* Support Modal */}
      <Modal
        visible={supportVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSupportVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalIconWrap, { backgroundColor: '#f3e8ff' }]}>
              <MaterialIcons name="headset-mic" size={32} color="#9333ea" />
            </View>
            <Text style={styles.modalTitle}>Help & Support</Text>
            <Text style={styles.modalText}>
              We are here to help! If you have any questions, face any issues with your bookings, or need assistance, please feel free to reach out to our dedicated support team.
            </Text>
            <View style={styles.contactWrap}>
              <MaterialIcons name="email" size={20} color={Colors.textSecondary} />
              <Text style={styles.contactEmail}>fixi.helpdesk@gmail.com</Text>
            </View>
            <TouchableOpacity style={styles.modalBtn} onPress={() => setSupportVisible(false)}>
              <Text style={styles.modalBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingBottom: 100 },

  // Header
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    marginBottom: Spacing.lg,
  },
  headerInfo: { flex: 1 },
  userName: { fontSize: 24, fontFamily: 'Manrope-Black', color: Colors.textPrimary, marginBottom: 4 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  userPhone: { fontSize: 14, fontFamily: 'Manrope-Medium', color: Colors.textSecondary },
  roleBadge: {
    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.primaryLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.sm
  },
  roleText: { fontSize: 12, fontFamily: 'Manrope-Bold', color: Colors.primary },

  avatarWrap: { marginLeft: 16 },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: Colors.primary + '33',
  },

  // Stats
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.lg,
    borderRadius: Radius.xl,
    paddingVertical: Spacing.lg,
    borderWidth: 1, borderColor: Colors.borderLight,
    ...Shadow.sm,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontFamily: 'Manrope-Black', color: Colors.primary, marginBottom: 4 },
  statLabel: { fontSize: 13, fontFamily: 'Manrope-Medium', color: Colors.textSecondary },
  statDivider: { width: 1, backgroundColor: Colors.borderLight, marginVertical: 8 },

  // Menu
  sectionCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.base,
    borderRadius: Radius.xl,
    marginBottom: Spacing.md,
    borderWidth: 1, borderColor: Colors.borderLight,
    ...Shadow.sm,
  },
  menuRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: Spacing.base, gap: 12,
  },
  iconBox: {
    width: 40, height: 40, borderRadius: Radius.md,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center', alignItems: 'center',
  },
  menuTextWrap: { flex: 1 },
  menuTitle: { fontSize: 16, fontFamily: 'Manrope-Bold', color: Colors.textPrimary },
  menuSub: { fontSize: 13, fontFamily: 'Manrope-Regular', color: Colors.textMuted, marginTop: 2 },
  separator: { height: 1, backgroundColor: Colors.borderLight, marginLeft: 68 },

  versionText: {
    fontSize: 12, fontFamily: 'Manrope-Regular', color: Colors.textMuted,
    textAlign: 'center', marginTop: Spacing.xl,
  },

  // Modal
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
  contactWrap: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background,
    paddingHorizontal: Spacing.md, paddingVertical: 10, borderRadius: Radius.md,
    marginBottom: 24, gap: 8
  },
  contactEmail: {
    fontSize: 14, fontFamily: 'Manrope-SemiBold', color: Colors.textPrimary
  },
  modalBtn: {
    backgroundColor: Colors.primary, width: '100%', paddingVertical: 14,
    borderRadius: Radius.lg, alignItems: 'center',
  },
  modalBtnText: { fontSize: 15, fontFamily: 'Manrope-Bold', color: '#fff' },
  pointsBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a',
    borderRadius: Radius.xl, padding: Spacing.base, marginHorizontal: Spacing.base,
    marginBottom: Spacing.base, ...Shadow.sm,
  },
  pointsBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  pointsIconBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fef3c7', justifyContent: 'center', alignItems: 'center' },
  pointsBannerTitle: { fontSize: Typography.base, fontFamily: 'Manrope-Bold', color: '#b45309' },
  pointsBannerSub: { fontSize: 11, fontFamily: 'Manrope-Medium', color: '#92400e', marginTop: 2 },
  pointsBannerVal: { fontSize: 18, fontFamily: 'Manrope-Black', color: '#92400e' },
  pointsRedeemLink: { fontSize: 11, fontFamily: 'Manrope-Bold', color: '#d97706', marginTop: 2 },
});
