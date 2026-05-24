import React, { useEffect } from 'react';
import { Stack, usePathname } from 'expo-router';
import { View, useWindowDimensions, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import { AuthProvider } from '@/context/AuthContext';
import { SocketProvider } from '@/context/SocketContext';
import WebSidebar from '@/components/layout/WebSidebar';
import SocketOverlay from '@/components/booking/SocketOverlay';

// Keep splash visible while fonts load
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Manrope-Regular':   Manrope_400Regular,
    'Manrope-Medium':    Manrope_500Medium,
    'Manrope-SemiBold':  Manrope_600SemiBold,
    'Manrope-Bold':      Manrope_700Bold,
    'Manrope-ExtraBold': Manrope_800ExtraBold,
    'Manrope-Black':     Manrope_800ExtraBold, // Closest weight for Black
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
        <AuthProvider>
          <SocketProvider>
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
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
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
