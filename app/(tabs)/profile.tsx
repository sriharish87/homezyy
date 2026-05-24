import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Switch, Image, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/Theme';
import api from '@/lib/axiosConfig';

// ── Types ──────────────────────────────────────────────────

interface SettingRow {
  icon: string;
  label: string;
  type: 'chevron' | 'toggle' | 'danger';
  onPress?: () => void;
  value?: boolean;
  onToggle?: (v: boolean) => void;
  sublabel?: string;
}

// ── Setting row component ──────────────────────────────────

function SettingItem({ row }: { row: SettingRow }) {
  return (
    <TouchableOpacity
      style={[styles.settingRow, row.type === 'danger' && styles.settingRowDanger]}
      onPress={row.type !== 'toggle' ? row.onPress : undefined}
      activeOpacity={row.type === 'toggle' ? 1 : 0.7}
    >
      <View
        style={[
          styles.settingIcon,
          row.type === 'danger'
            ? { backgroundColor: '#fee2e2' }
            : { backgroundColor: Colors.primaryLight },
        ]}
      >
        <MaterialIcons
          name={row.icon as any}
          size={20}
          color={row.type === 'danger' ? Colors.error : Colors.primary}
        />
      </View>

      <View style={styles.settingLabel}>
        <Text
          style={[
            styles.settingLabelText,
            row.type === 'danger' && { color: Colors.error },
          ]}
        >
          {row.label}
        </Text>
        {row.sublabel && (
          <Text style={styles.settingSubLabel}>{row.sublabel}</Text>
        )}
      </View>

      {row.type === 'chevron' && (
        <MaterialIcons name="chevron-right" size={22} color={Colors.textMuted} />
      )}
      {row.type === 'toggle' && (
        <Switch
          value={row.value}
          onValueChange={row.onToggle}
          trackColor={{ false: Colors.border, true: Colors.primary + 'AA' }}
          thumbColor={row.value ? Colors.primary : '#fff'}
        />
      )}
    </TouchableOpacity>
  );
}

// ── Section wrapper ────────────────────────────────────────

function Section({ title, rows }: { title: string; rows: SettingRow[] }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>
        {rows.map((row, i) => (
          <React.Fragment key={row.label}>
            <SettingItem row={row} />
            {i < rows.length - 1 && <View style={styles.separator} />}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

// ── Main screen ────────────────────────────────────────────

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, updateUser } = useAuth();

  const [notificationsOn, setNotificationsOn] = useState(true);
  const [locationOn,      setLocationOn]      = useState(true);
  
  // Technician specific state
  const [isAvailable, setIsAvailable] = useState(user?.isAvailable ?? false);

  const handleToggleAvailability = async (value: boolean) => {
    try {
      // Optimistic update
      setIsAvailable(value);
      if (updateUser) {
        await updateUser({ isAvailable: value });
      }
      await api.patch('/tech/availability', { isAvailable: value });
    } catch (error) {
      // Revert on failure
      setIsAvailable(!value);
      if (updateUser) {
        await updateUser({ isAvailable: !value });
      }
      Alert.alert('Error', 'Failed to update availability. Please try again.');
    }
  };

  const handleLogout = () => {
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
  };

  const accountRows: SettingRow[] = [
    { icon: 'person-outline',   label: 'Edit Profile',          type: 'chevron', onPress: () => {} },
    // Wallet — only visible for technicians
    ...(user?.role === 'technician'
      ? [
          {
            icon: 'power-settings-new',
            label: 'Online Availability',
            type: 'toggle' as const,
            value: isAvailable,
            onToggle: handleToggleAvailability,
            sublabel: isAvailable ? 'You are accepting orders' : 'You are currently offline',
          },
          {
            icon: 'account-balance-wallet',
            label: 'Wallet',
            type: 'chevron' as const,
            sublabel: 'View earnings & withdraw',
            onPress: () => router.push('/wallet'),
          },
        ]
      : []),
    { icon: 'location-on',      label: 'Saved Addresses',       type: 'chevron', onPress: () => {} },
    { icon: 'payment',          label: 'Payment Methods',       type: 'chevron', onPress: () => {} },
    { icon: 'local-offer',      label: 'Coupons & Offers',      type: 'chevron', onPress: () => {} },
  ];


  const preferenceRows: SettingRow[] = [
    {
      icon: 'notifications',
      label: 'Push Notifications',
      type: 'toggle',
      value: notificationsOn,
      onToggle: setNotificationsOn,
      sublabel: 'Booking updates, offers & reminders',
    },
    {
      icon: 'my-location',
      label: 'Location Access',
      type: 'toggle',
      value: locationOn,
      onToggle: setLocationOn,
      sublabel: 'Used to find nearby professionals',
    },
  ];

  const supportRows: SettingRow[] = [
    { icon: 'help-outline',       label: 'Help Center',             type: 'chevron', onPress: () => {} },
    { icon: 'chat-bubble-outline',label: 'Chat with Support',       type: 'chevron', onPress: () => {} },
    { icon: 'star-outline',       label: 'Rate Homezy',             type: 'chevron', onPress: () => {} },
    { icon: 'info-outline',       label: 'About Homezy',            type: 'chevron', onPress: () => {} },
    { icon: 'policy',             label: 'Privacy Policy',          type: 'chevron', onPress: () => {} },
    { icon: 'description',        label: 'Terms & Conditions',      type: 'chevron', onPress: () => {} },
  ];

  const dangerRows: SettingRow[] = [
    { icon: 'logout',             label: 'Sign Out',                type: 'danger',  onPress: handleLogout },
  ];

  // Stats (mock — wire to backend)
  const stats = [
    { label: 'Bookings', value: '12' },
    { label: 'Reviews',  value: '8' },
    { label: 'Saved',    value: '5' },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Profile header card ─────────────────── */}
        <View style={styles.profileCard}>
          {/* Avatar */}
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <MaterialIcons name="person" size={40} color={Colors.primary} />
            </View>
            <TouchableOpacity style={styles.editAvatarBtn}>
              <MaterialIcons name="camera-alt" size={14} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Name + phone */}
          <Text style={styles.userName}>
            {user?.name ?? 'Homezy User'}
          </Text>
          <View style={styles.phoneRow}>
            <MaterialIcons name="phone" size={14} color={Colors.textMuted} />
            <Text style={styles.userPhone}>
              +91 {user?.id ?? '98765-43210'}
            </Text>
          </View>

          {/* Verified badge */}
          <View style={styles.verifiedBadge}>
            <MaterialIcons name="verified" size={14} color={Colors.primary} />
            <Text style={styles.verifiedText}>Verified Account</Text>
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            {stats.map((stat, i) => (
              <React.Fragment key={stat.label}>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
                {i < stats.length - 1 && <View style={styles.statDivider} />}
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* ── Partner CTA banner ──────────────────── */}
        <TouchableOpacity style={styles.partnerBanner} activeOpacity={0.88}>
          <View style={styles.partnerBannerLeft}>
            <Text style={styles.partnerBannerTitle}>Become a Pro Partner</Text>
            <Text style={styles.partnerBannerSub}>Register as a service professional and grow your business.</Text>
          </View>
          <MaterialIcons name="arrow-forward-ios" size={16} color="#fff" />
        </TouchableOpacity>

        {/* ── Settings sections ───────────────────── */}
        <Section title="Account"      rows={accountRows} />
        <Section title="Preferences"  rows={preferenceRows} />
        <Section title="Support"      rows={supportRows} />
        <Section title=""             rows={dangerRows} />

        <Text style={styles.versionText}>Homezy v1.0.0 · Made with ♥ in India</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  scroll:   { paddingBottom: 100 },

  // Profile card
  profileCard: {
    backgroundColor: Colors.surface,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  avatarWrap:    { position: 'relative', marginBottom: Spacing.md },
  avatar: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.primary + '33',
  },
  editAvatarBtn: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: Colors.surface,
  },
  userName: {
    fontSize: Typography.xl,
    fontFamily: 'Manrope-Black',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  phoneRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginBottom: Spacing.sm,
  },
  userPhone: {
    fontSize: Typography.sm,
    fontFamily: 'Manrope-Medium',
    color: Colors.textSecondary,
  },
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: Radius.full,
    marginBottom: Spacing.xl,
  },
  verifiedText: {
    fontSize: Typography.xs,
    fontFamily: 'Manrope-Bold',
    color: Colors.primary,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.xl,
    paddingVertical: Spacing.base,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: {
    fontSize: Typography.xl,
    fontFamily: 'Manrope-Black',
    color: Colors.primary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: Typography.xs,
    fontFamily: 'Manrope-Medium',
    color: Colors.textSecondary,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: Colors.border,
  },

  // Partner banner
  partnerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.md,
    borderRadius: Radius.xl,
    padding: Spacing.base,
    gap: 12,
    ...Shadow.md,
  },
  partnerBannerLeft: { flex: 1 },
  partnerBannerTitle: {
    fontSize: Typography.base,
    fontFamily: 'Manrope-Bold',
    color: '#fff',
    marginBottom: 2,
  },
  partnerBannerSub: {
    fontSize: Typography.sm,
    fontFamily: 'Manrope-Regular',
    color: 'rgba(255,255,255,0.75)',
  },

  // Sections
  section:      { marginBottom: Spacing.md },
  sectionTitle: {
    fontSize: Typography.xs,
    fontFamily: 'Manrope-Bold',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.sm,
  },
  sectionCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.base,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadow.sm,
  },

  // Setting rows
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    gap: 12,
  },
  settingRowDanger: {},
  settingIcon: {
    width: 38, height: 38,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingLabel: { flex: 1 },
  settingLabelText: {
    fontSize: Typography.base,
    fontFamily: 'Manrope-SemiBold',
    color: Colors.textPrimary,
  },
  settingSubLabel: {
    fontSize: Typography.xs,
    fontFamily: 'Manrope-Regular',
    color: Colors.textMuted,
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginLeft: 62,
  },

  versionText: {
    fontSize: Typography.xs,
    fontFamily: 'Manrope-Regular',
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.base,
    paddingBottom: Spacing.xl,
  },
});
