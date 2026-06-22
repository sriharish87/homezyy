import React, { useEffect, useRef } from 'react';
import { Stack, usePathname, useRouter } from 'expo-router';
import { View, Platform, useWindowDimensions, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import {
  useFonts,
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { SocketProvider } from '@/context/SocketContext';
import { ServiceProvider } from '@/hooks/useServices';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import WebSidebar from '@/components/layout/WebSidebar';
import SocketOverlay from '@/components/booking/SocketOverlay';

// Keep splash visible while fonts load
SplashScreen.preventAutoHideAsync();

// ── TRAFFIC COP ────────────────────────────────────────────
// Suppress push notification banners when the app is in the FOREGROUND.
// WebSocket handles all live UI updates, so we silently eat push banners.
// When app is BACKGROUNDED/KILLED, the OS shows the banner automatically
// (this handler only runs while the app is foregrounded).
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: false,
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: false,
      shouldShowList: false,
    }),
  });
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Manrope-Regular': Manrope_400Regular,
    'Manrope-Medium': Manrope_500Medium,
    'Manrope-SemiBold': Manrope_600SemiBold,
    'Manrope-Bold': Manrope_700Bold,
    'Manrope-ExtraBold': Manrope_800ExtraBold,
    'Manrope-Black': Manrope_800ExtraBold, // Closest weight for Black
  });

  const { width } = useWindowDimensions();
  const pathname = usePathname();

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  const isDesktop = width >= 1024;
  const noSidebar = pathname === '/login' || pathname === '/welcome' || pathname === '/' || pathname === '/complete-profile';

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ServiceProvider>
          <AuthProvider>
            <SocketProvider>
              {/* Push notification bootstrap — registers token + handles tap routing */}
              <PushNotificationBootstrap />
              <StatusBar style="auto" />
              <View style={isDesktop && !noSidebar ? styles.desktopWrapper : styles.mobileWrapper}>
                {isDesktop && !noSidebar && <WebSidebar />}
                <View style={styles.contentWrapper}>
                  <Stack screenOptions={{ headerShown: false }} />
                  <SocketOverlay />
                </View>
              </View>
            </SocketProvider>
          </AuthProvider>
        </ServiceProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// ── PUSH NOTIFICATION BOOTSTRAP ────────────────────────────
// This component lives INSIDE AuthProvider + SocketProvider so it can
// access useAuth(). It handles two things:
// 1. Token registration (via usePushNotifications hook)
// 2. Deep-link routing when a background notification is tapped
function PushNotificationBootstrap() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const responseListener = useRef<{ remove: () => void } | null>(null);

  // Register push token with backend when authenticated
  usePushNotifications(isAuthenticated);

  useEffect(() => {
    // Skip on web — Expo Push is native-only
    if (Platform.OS === 'web') return;

    // Listen for notification taps (background/killed → user taps banner)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response: any) => {
        const data = response.notification.request.content.data;
        const screen = data?.screen as string | undefined;

        if (screen) {
          console.log('[Push] Notification tapped, routing to:', screen);
          // Small delay to ensure navigation is ready after cold start
          setTimeout(() => {
            router.push(screen as any);
          }, 500);
        }
      }
    );

    return () => {
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [router]);

  // This component renders nothing — it's purely a side-effect bootstrap
  return null;
}

const styles = StyleSheet.create({
  desktopWrapper: {
    flex: 1,
    flexDirection: 'row',
  },
  mobileWrapper: {
    flex: 1,
    flexDirection: 'column',
  },
  contentWrapper: {
    flex: 1,
    position: 'relative',
  },
});
