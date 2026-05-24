import React from 'react';
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/Theme';

type ProtectedRouteProps = {
  children: React.ReactNode;
  requireProfileComplete?: boolean;
  onlyIncompleteProfile?: boolean;
};

export default function ProtectedRoute({
  children,
  requireProfileComplete = false,
  onlyIncompleteProfile = false,
}: ProtectedRouteProps) {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: Colors.background,
        }}
      >
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated || !user) {
    return <Redirect href="/login" />;
  }

  const isProfileComplete = Boolean(user?.isProfileComplete);

  if (requireProfileComplete && !isProfileComplete) {
    return <Redirect href={'/complete-profile' as any} />;
  }

  if (onlyIncompleteProfile && isProfileComplete) {
    return <Redirect href="/(tabs)/home" />;
  }

  return <>{children}</>;
}
