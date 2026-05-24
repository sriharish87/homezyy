import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/Theme';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';

WebBrowser.maybeCompleteAuthSession();

type Role = 'customer' | 'technician';

export default function Login() {
  const router = useRouter();
  const params = useLocalSearchParams<{ role?: string }>();
  const { login } = useAuth();

  const selectedRole: Role =
    params.role === 'technician' ? 'technician' : 'customer';

  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState('');

  // Entrance animation
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(30)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, delay: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, delay: 150, useNativeDriver: true }),
    ]).start();
  }, []);

  const googleClientId =
    process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '';

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: googleClientId,
    androidClientId: googleClientId,
    iosClientId: googleClientId,
    webClientId: googleClientId,
  });

  React.useEffect(() => {
    const handleGoogleResponse = async () => {
      if (!response) return;

      if (response.type !== 'success') {
        setErrorMessage('Google sign-in cancelled');
        return;
      }

      const idToken = response.params?.id_token;

      if (!idToken) {
        setErrorMessage('Failed to get Google idToken');
        return;
      }

      try {
        setIsLoading(true);
        setErrorMessage('');

        const sessionUser = await login(idToken, selectedRole);

        if (sessionUser) {
          router.replace(
            sessionUser.isProfileComplete
              ? '/(tabs)/home'
              : ('/complete-profile' as any)
          );
        }
      } catch (error) {
        console.error(error);
        setErrorMessage('Google login failed');
      } finally {
        setIsLoading(false);
      }
    };

    handleGoogleResponse();
  }, [response, selectedRole, login, router]);

  const handleGoogleLogin = async () => {
    if (!googleClientId) {
      setErrorMessage('Google Client ID is missing in .env');
      return;
    }

    setErrorMessage('');
    await promptAsync();
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Back button */}
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>

          <Animated.View style={[styles.cardWrapper, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.logoCircle}>
                <MaterialIcons name="lock" size={28} color={Colors.primary} />
              </View>
              <Text style={styles.heading}>Sign in to Homezy</Text>
              <Text style={styles.subheading}>
                Continue as {selectedRole === 'technician' ? 'Service Provider' : 'Household'}
              </Text>
            </View>

            {/* Card */}
            <View style={styles.card}>
              {/* Google icon */}
              <View style={styles.googleIconRow}>
                <View style={styles.googleIconCircle}>
                  <MaterialIcons name="g-mobiledata" size={32} color={Colors.primary} />
                </View>
                <Text style={styles.googleLabel}>Google Account</Text>
              </View>

              <Text style={styles.googleDesc}>
                Sign in securely using your Google account. No passwords needed.
              </Text>

              {/* Divider */}
              <View style={styles.divider} />

              {/* CTA */}
              <TouchableOpacity
                style={[styles.submitBtn, (isLoading || !request) && styles.disabled]}
                onPress={handleGoogleLogin}
                disabled={isLoading || !request}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <MaterialIcons name="login" size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.submitBtnText}>Continue with Google</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Error */}
              {errorMessage ? (
                <View style={styles.errorRow}>
                  <MaterialIcons name="error-outline" size={15} color={Colors.error} />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              ) : null}
            </View>

            {/* Change role link */}
            <TouchableOpacity
              onPress={() => router.replace('/welcome')}
              style={styles.changeRoleRow}
            >
              <MaterialIcons name="swap-horiz" size={16} color={Colors.primary} />
              <Text style={styles.changeRoleText}>Change role</Text>
            </TouchableOpacity>

            <Text style={styles.terms}>
              By continuing, you agree to Homezy's{' '}
              <Text style={styles.link}>Terms of Service</Text> and{' '}
              <Text style={styles.link}>Privacy Policy</Text>.
            </Text>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  safeArea: { flex: 1 },
  scroll: {
    flexGrow: 1,
    padding: Spacing.xl,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    ...Shadow.sm,
  },
  cardWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  heading: {
    fontSize: Typography['2xl'],
    fontFamily: 'Manrope-Black',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  subheading: {
    fontSize: Typography.base,
    fontFamily: 'Manrope-Regular',
    color: Colors.textSecondary,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    ...Shadow.md,
    marginBottom: Spacing.xl,
  },
  googleIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  googleIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  googleLabel: {
    fontSize: Typography.lg,
    fontFamily: 'Manrope-Bold',
    color: Colors.textPrimary,
  },
  googleDesc: {
    fontSize: Typography.base,
    fontFamily: 'Manrope-Regular',
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: Spacing.base,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: Spacing.xl,
  },
  submitBtn: {
    flexDirection: 'row',
    height: 56,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.lg,
  },
  disabled: { opacity: 0.65 },
  submitBtnText: {
    color: '#fff',
    fontFamily: 'Manrope-Bold',
    fontSize: Typography.md,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.sm,
  },
  errorText: {
    fontSize: Typography.sm,
    fontFamily: 'Manrope-Medium',
    color: Colors.error,
  },
  changeRoleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginBottom: Spacing.base,
  },
  changeRoleText: {
    fontSize: Typography.base,
    fontFamily: 'Manrope-SemiBold',
    color: Colors.primary,
  },
  terms: {
    fontSize: Typography.xs,
    fontFamily: 'Manrope-Regular',
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  link: {
    color: Colors.primary,
    fontFamily: 'Manrope-SemiBold',
  },
});
