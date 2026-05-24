// ============================================================
// PaymentResultModal — Premium response modal for verify-payment
// Covers all 5 backend response scenarios with polished UI
// ============================================================

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Radius, Shadow, Spacing, Typography } from '@/constants/Theme';

// ── Result types matching backend responses ─────────────────

export type PaymentResultType =
  | 'success'          // 200 — PAID, wallet credited, booking completed
  | 'already_processed' // 200 — already processed / no PENDING transaction
  | 'missing_fields'   // 400 — missing required fields
  | 'invalid_signature' // 400 — signature mismatch (fraud)
  | 'server_error'     // 500 — server crashed
  | null;              // modal hidden

interface PaymentResultModalProps {
  /** Current result type to display, null to hide */
  result: PaymentResultType;
  /** Called when user dismisses the modal */
  onDismiss: () => void;
}

// ── Config per scenario ─────────────────────────────────────

interface ScenarioConfig {
  icon: string;
  iconColor: string;
  iconBg: string;
  title: string;
  subtitle: string;
  buttonLabel: string;
  buttonColor: string;
  accentGlow: string;
}

const SCENARIOS: Record<Exclude<PaymentResultType, null>, ScenarioConfig> = {
  success: {
    icon: 'check-circle',
    iconColor: '#10b981',
    iconBg: 'rgba(16, 185, 129, 0.12)',
    title: 'Payment Successful! 🎉',
    subtitle: 'Your technician is confirmed.\nSit back, help is on the way!',
    buttonLabel: 'Done',
    buttonColor: '#10b981',
    accentGlow: 'rgba(16, 185, 129, 0.15)',
  },
  already_processed: {
    icon: 'info',
    iconColor: '#3b82f6',
    iconBg: 'rgba(59, 130, 246, 0.12)',
    title: 'Already Processed',
    subtitle: 'This payment was already verified.\nYour booking is confirmed.',
    buttonLabel: 'Got it',
    buttonColor: '#3b82f6',
    accentGlow: 'rgba(59, 130, 246, 0.12)',
  },
  missing_fields: {
    icon: 'error-outline',
    iconColor: '#f59e0b',
    iconBg: 'rgba(245, 158, 11, 0.12)',
    title: 'Data Missing',
    subtitle: 'Payment data is incomplete.\nPlease try again.',
    buttonLabel: 'Retry',
    buttonColor: '#f59e0b',
    accentGlow: 'rgba(245, 158, 11, 0.12)',
  },
  invalid_signature: {
    icon: 'gpp-bad',
    iconColor: '#ef4444',
    iconBg: 'rgba(239, 68, 68, 0.12)',
    title: 'Security Error',
    subtitle: 'Invalid payment signature detected.\nPlease contact support immediately.',
    buttonLabel: 'Close',
    buttonColor: '#ef4444',
    accentGlow: 'rgba(239, 68, 68, 0.12)',
  },
  server_error: {
    icon: 'cloud-off',
    iconColor: '#6b7280',
    iconBg: 'rgba(107, 114, 128, 0.12)',
    title: 'Verification Pending',
    subtitle: "We couldn't verify it right now.\nPlease check your bookings tab shortly.",
    buttonLabel: 'OK',
    buttonColor: '#6b7280',
    accentGlow: 'rgba(107, 114, 128, 0.10)',
  },
};

// ── Component ───────────────────────────────────────────────

export default function PaymentResultModal({
  result,
  onDismiss,
}: PaymentResultModalProps) {
  // Animations
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const iconPulse = useRef(new Animated.Value(0.5)).current;
  const checkScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (result) {
      // Reset
      scaleAnim.setValue(0.7);
      opacityAnim.setValue(0);
      iconPulse.setValue(0.5);
      checkScale.setValue(0);

      // Card entrance
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();

      // Icon entrance (delayed bounce)
      Animated.sequence([
        Animated.delay(200),
        Animated.spring(checkScale, {
          toValue: 1,
          friction: 4,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();

      // Glow pulse loop (only for success)
      if (result === 'success') {
        Animated.loop(
          Animated.sequence([
            Animated.timing(iconPulse, {
              toValue: 1,
              duration: 1200,
              useNativeDriver: true,
            }),
            Animated.timing(iconPulse, {
              toValue: 0.5,
              duration: 1200,
              useNativeDriver: true,
            }),
          ])
        ).start();
      }
    }
  }, [result]);

  if (!result) return null;

  const config = SCENARIOS[result];

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]}>
        <Animated.View
          style={[
            styles.card,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          {/* ── Accent glow behind icon ── */}
          <View style={styles.iconContainer}>
            {result === 'success' && (
              <Animated.View
                style={[
                  styles.glowRing,
                  {
                    backgroundColor: config.accentGlow,
                    opacity: iconPulse,
                    transform: [
                      {
                        scale: iconPulse.interpolate({
                          inputRange: [0.5, 1],
                          outputRange: [1, 1.4],
                        }),
                      },
                    ],
                  },
                ]}
              />
            )}
            <Animated.View
              style={[
                styles.iconCircle,
                {
                  backgroundColor: config.iconBg,
                  transform: [{ scale: checkScale }],
                },
              ]}
            >
              <MaterialIcons
                name={config.icon as any}
                size={48}
                color={config.iconColor}
              />
            </Animated.View>
          </View>

          {/* ── Title ── */}
          <Text style={styles.title}>{config.title}</Text>

          {/* ── Subtitle ── */}
          <Text style={styles.subtitle}>{config.subtitle}</Text>

          {/* ── Divider ── */}
          <View style={styles.divider} />

          {/* ── Action button ── */}
          <TouchableOpacity
            style={[styles.button, { backgroundColor: config.buttonColor }]}
            onPress={onDismiss}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>{config.buttonLabel}</Text>
          </TouchableOpacity>

          {/* ── Security footer for fraud scenario ── */}
          {result === 'invalid_signature' && (
            <View style={styles.securityFooter}>
              <MaterialIcons name="shield" size={14} color="#ef4444" />
              <Text style={styles.securityText}>
                Ref: Contact support@fixi.app
              </Text>
            </View>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ── Styles ──────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: Radius['2xl'],
    backgroundColor: '#fff',
    paddingTop: 36,
    paddingBottom: 28,
    paddingHorizontal: 28,
    alignItems: 'center',
    ...Shadow.lg,
  },
  iconContainer: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  glowRing: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: Typography.xl,
    fontFamily: 'Manrope-Bold',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: Typography.base,
    fontFamily: 'Manrope-Medium',
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 4,
  },
  divider: {
    width: '80%',
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: 20,
  },
  button: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: Typography.md,
    fontFamily: 'Manrope-Bold',
    color: '#fff',
    letterSpacing: 0.3,
  },
  securityFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#fee2e2',
  },
  securityText: {
    fontSize: Typography.xs,
    fontFamily: 'Manrope-Medium',
    color: '#ef4444',
  },
});
