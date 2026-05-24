import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { Typography } from '@/constants/Theme';
import { useAuth } from '@/context/AuthContext';

const NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: 'home', path: '/(tabs)/home' },
  { id: 'services', label: 'Services', icon: 'grid-view', path: '/(tabs)/services' },
  { id: 'bookings', label: 'Bookings', icon: 'calendar-today', path: '/(tabs)/bookings' },
  { id: 'profile', label: 'Profile', icon: 'person', path: '/(tabs)/profile' },
];

export default function WebSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();

  // Handle active path matching
  const isActive = (itemId: string, itemPath: string) => {
    // If exact match
    if (pathname === itemPath) return true;
    // If services (because detail routes exist)
    if (itemId === 'services' && (pathname.startsWith('/services') || pathname.startsWith('/categories'))) return true;
    if (itemId === 'bookings' && pathname.startsWith('/bookings')) return true;
    return false;
  };

  return (
    <View style={styles.sidebar}>
      {/* ── Logo Section ── */}
      <View style={styles.logoSection}>
        <View style={styles.logoIconBg}>
          <MaterialIcons name="auto-fix-high" size={24} color="#3e2a56" />
        </View>
        <Text style={styles.logoText}>Homezy</Text>
      </View>

      {/* ── Navigation ── */}
      <View style={styles.nav}>
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.id, item.path);
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.navItem, active && styles.navItemActive]}
              onPress={() => router.push(item.path as any)}
              activeOpacity={0.8}
            >
              <MaterialIcons
                name={item.icon as any}
                size={22}
                color={active ? '#3e2a56' : 'rgba(255,255,255,0.65)'}
              />
              <Text style={[styles.navLabel, active && styles.navLabelActive]}>
                {item.label}
              </Text>

              {/* Active Indicator pip */}
              {active && <View style={styles.activeIndicator} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Footer / Profile ── */}
      <View style={styles.footer}>
        <View style={styles.userBrief}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name ? user.name.charAt(0).toUpperCase() : 'G'}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.name || 'Guest'}</Text>
            <Text style={styles.userRole}>
              {user?.role === 'technician' ? 'Technician' : 'Premium Member'}
            </Text>
          </View>
        </View>
        <TouchableOpacity 
          style={styles.logoutBtn} 
          activeOpacity={0.7}
          onPress={async () => {
            await logout();
            router.replace('/welcome');
          }}
        >
          <MaterialIcons name="logout" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 280,
    height: '100%',
    backgroundColor: '#3e2a56',
    flexDirection: 'column',
    paddingTop: 32,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.08)',
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 32,
    paddingBottom: 40,
  },
  logoIconBg: {
    width: 42,
    height: 42,
    backgroundColor: '#fff',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 24,
    fontFamily: 'Manrope-Black',
    color: '#fff',
    letterSpacing: -0.5,
  },
  nav: {
    flex: 1,
    paddingHorizontal: 16,
    gap: 8,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  navItemActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  navLabel: {
    fontSize: 15,
    fontFamily: 'Manrope-SemiBold',
    color: 'rgba(255, 255, 255, 0.65)',
  },
  navLabelActive: {
    color: '#3e2a56',
    fontFamily: 'Manrope-Bold',
  },
  activeIndicator: {
    position: 'absolute',
    right: 16,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3e2a56',
  },
  footer: {
    paddingVertical: 32,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userBrief: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    backgroundColor: '#fff',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: Typography.base,
    fontFamily: 'Manrope-Black',
    color: '#3e2a56',
  },
  userInfo: {
    flexDirection: 'column',
  },
  userName: {
    fontSize: 14,
    fontFamily: 'Manrope-ExtraBold',
    color: '#fff',
  },
  userRole: {
    fontSize: 12,
    fontFamily: 'Manrope-Regular',
    color: 'rgba(255,255,255,0.6)',
  },
  logoutBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
