import React from 'react';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Shadow } from '@/constants/Theme';
import { useAuth } from '@/context/AuthContext';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

interface TabIconProps {
  name: IconName;
  color: string;
  focused: boolean;
}

function TabIcon({ name, color, focused }: TabIconProps) {
  return (
    <View style={[styles.iconWrapper, focused && styles.iconWrapperActive]}>
      <MaterialIcons name={name} size={24} color={color} />
    </View>
  );
}

export default function TabsLayout() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const { user } = useAuth();
  const isTechnician = user?.role === 'technician';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor:   Colors.primary,
        tabBarInactiveTintColor: '#71717a',
        tabBarStyle: isDesktop ? { display: 'none' } : styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarLabelPosition: 'below-icon',
      }}
    >
      {/* ── Home ─────────────────────────────────── */}
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="home" color={color} focused={focused} />
          ),
        }}
      />

      {/* ── Services ─────────────────────────────── */}
      <Tabs.Screen
        name="services"
        options={{
          href: isTechnician ? null : '/services',
          title: 'Services',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="list-alt" color={color} focused={focused} />
          ),
        }}
      />

      {/* ── Bookings ─────────────────────────────── */}
      <Tabs.Screen
        name="bookings"
        options={{
          title: isTechnician ? 'Orders' : 'Bookings',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="calendar-month" color={color} focused={focused} />
          ),
        }}
      />

      {/* ── Profile ──────────────────────────────── */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="person" color={color} focused={focused} />
          ),
        }}
      />

    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    borderTopColor: '#e4e4e7',
    borderTopWidth: 1,
    backgroundColor: '#fff',
    height: Platform.OS === 'web' ? 85 : (Platform.OS === 'ios' ? 88 : 75),
    paddingTop: 8,
    paddingBottom: Platform.OS === 'web' ? 25 : (Platform.OS === 'ios' ? 28 : 12),
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    ...Shadow.lg,
  },
  tabBarLabel: {
    fontSize: 11,
    fontFamily: 'Manrope-Bold',
    marginTop: 4,
  },
  iconWrapper: {
    width: 48,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  iconWrapperActive: {
    backgroundColor: Colors.primaryLight,
  },
});
