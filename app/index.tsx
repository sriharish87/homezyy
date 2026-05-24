import { Redirect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { View, ActivityIndicator } from 'react-native';
import { Colors } from '@/constants/Theme';

export default function Index() {
  const { isAuthenticated, loading, user } = useAuth();

  // Still loading from AsyncStorage
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/welcome" />;
  }

  if (!user?.isProfileComplete) {
    return <Redirect href={'/complete-profile' as any} />;
  }

  return <Redirect href="/(tabs)/home" />;
}
