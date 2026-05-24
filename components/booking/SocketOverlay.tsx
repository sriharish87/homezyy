import React, { useEffect, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Radius, Shadow, Spacing, Typography } from '@/constants/Theme';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { usePaymentFlow } from '@/hooks/usePaymentFlow';
import PaymentResultModal from '@/components/ui/PaymentResultModal';

function formatDateTime(value?: string) {
  if (!value) return 'Scheduled time not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function SocketOverlay() {
  const { user } = useAuth();
  const {
    incomingRequest,
    bookingUpdate,
    paymentReceived,
    respondBooking,
    clearIncomingRequest,
    clearBookingUpdate,
    clearPaymentReceived,
  } = useSocket();

  const isTechnician = user?.role === 'technician';
  const isCustomer = user?.role === 'customer';

  const showRequest = isTechnician && !!incomingRequest;
  const showUpdate = isCustomer && !!bookingUpdate;
  const showPaymentReceived = isTechnician && !!paymentReceived;

  const requestTime = useMemo(
    () => formatDateTime(incomingRequest?.bookingTime),
    [incomingRequest?.bookingTime]
  );

  // ── Payment hook (used by customer "Pay Now") ──────────
  const {
    initiatePayment,
    loading: paymentLoading,
    razorpayError,
    paymentResult,
    dismissResult,
  } = usePaymentFlow({
    onSuccess: () => {
      clearBookingUpdate();
    },
    onClose: () => {
      clearBookingUpdate();
    },
  });

  const handleRespond = (status: 'accepted' | 'declined') => {
    if (!incomingRequest) return;
    respondBooking({
      bookingId: incomingRequest.bookingId,
      status,
      customerId: incomingRequest.customerId,
    });
    clearIncomingRequest();
  };

  const handlePayNow = () => {
    if (!bookingUpdate?.bookingId) return;
    initiatePayment(bookingUpdate.bookingId);
  };

  return (
    <>
      {/* ── Technician: Incoming booking request ───────── */}
      <Modal visible={showRequest} transparent animationType="fade">
        <View style={styles.backdrop}>
          <View style={styles.card}>
            <View style={styles.titleRow}>
              <MaterialIcons name="notifications" size={22} color={Colors.primary} />
              <Text style={styles.title}>New Booking Request</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Customer</Text>
              <Text style={styles.value}>{incomingRequest?.customerName ?? 'Customer'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Service</Text>
              <Text style={styles.value}>{incomingRequest?.serviceType}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Price</Text>
              <Text style={styles.value}>₹{(incomingRequest?.price ?? 0).toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Time</Text>
              <Text style={styles.value}>{requestTime}</Text>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.declineBtn]}
                onPress={() => handleRespond('declined')}
              >
                <Text style={styles.declineText}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.acceptBtn]}
                onPress={() => handleRespond('accepted')}
              >
                <Text style={styles.acceptText}>Accept</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Customer: Booking accepted → Pay Now ───────── */}
      <Modal visible={showUpdate} transparent animationType="fade">
        <View style={styles.backdrop}>
          <View style={styles.card}>
            {/* Icon badge */}
            <View style={styles.iconBadge}>
              <MaterialIcons
                name={bookingUpdate?.status === 'accepted' ? 'check-circle' : 'cancel'}
                size={48}
                color={bookingUpdate?.status === 'accepted' ? Colors.success : Colors.error}
              />
            </View>

            <Text style={styles.modalTitle}>
              {bookingUpdate?.status === 'accepted'
                ? 'Order Accepted! 🎉'
                : 'Order Declined'}
            </Text>

            <Text style={styles.statusText}>
              {bookingUpdate?.status === 'accepted'
                ? 'Great news! A technician has accepted your booking. You can pay now to confirm or pay later from your bookings.'
                : 'Unfortunately, no technician is available right now. Please try again later.'}
            </Text>

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.dismissBtn]}
                onPress={clearBookingUpdate}
                disabled={paymentLoading}
              >
                <Text style={styles.dismissText}>Dismiss</Text>
              </TouchableOpacity>

              {bookingUpdate?.status === 'accepted' && (
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    styles.payNowBtn,
                    paymentLoading && styles.payNowBtnDisabled,
                  ]}
                  onPress={handlePayNow}
                  disabled={paymentLoading}
                  activeOpacity={0.8}
                >
                  {paymentLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <MaterialIcons name="payment" size={16} color="#fff" />
                      <Text style={styles.payNowText}>Pay Now</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Payment result modal (5 scenarios) ── */}
      <PaymentResultModal
        result={paymentResult}
        onDismiss={dismissResult}
      />

      {/* ── Technician: Payment received notification ──── */}
      <PaymentReceivedModal
        visible={showPaymentReceived}
        amount={paymentReceived?.amount ?? 0}
        onDismiss={clearPaymentReceived}
      />
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: Radius.xl,
    backgroundColor: '#fff',
    padding: Spacing.xl,
    ...Shadow.lg,
    gap: 12,
  },
  iconBadge: {
    alignItems: 'center',
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  title: {
    fontSize: Typography.lg,
    fontFamily: 'Manrope-Bold',
    color: Colors.textPrimary,
  },
  modalTitle: {
    fontSize: Typography.xl,
    fontFamily: 'Manrope-Bold',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  label: {
    fontSize: Typography.sm,
    fontFamily: 'Manrope-Medium',
    color: Colors.textSecondary,
  },
  value: {
    fontSize: Typography.base,
    fontFamily: 'Manrope-Bold',
    color: Colors.textPrimary,
    textAlign: 'right',
    flex: 1,
  },
  statusText: {
    fontSize: Typography.base,
    fontFamily: 'Manrope-Medium',
    color: Colors.textSecondary,
    lineHeight: 22,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: Spacing.md,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  declineBtn: {
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  acceptBtn: {
    backgroundColor: Colors.primary,
  },
  dismissBtn: {
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  payNowBtn: {
    backgroundColor: Colors.success,
  },
  payNowBtnDisabled: {
    opacity: 0.7,
  },
  declineText: {
    fontSize: Typography.base,
    fontFamily: 'Manrope-Bold',
    color: Colors.textSecondary,
  },
  acceptText: {
    fontSize: Typography.base,
    fontFamily: 'Manrope-Bold',
    color: '#fff',
  },
  dismissText: {
    fontSize: Typography.base,
    fontFamily: 'Manrope-Bold',
    color: Colors.textSecondary,
  },
  payNowText: {
    fontSize: Typography.base,
    fontFamily: 'Manrope-Bold',
    color: '#fff',
  },
});

// ── Technician Payment Received Modal ─────────────────────

function PaymentReceivedModal({
  visible,
  amount,
  onDismiss,
}: {
  visible: boolean;
  amount: number;
  onDismiss: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(0.6)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const iconBounce = useRef(new Animated.Value(0)).current;
  const amountSlide = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.6);
      opacityAnim.setValue(0);
      iconBounce.setValue(0);
      amountSlide.setValue(20);

      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 5,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();

      // Icon bounce in
      Animated.sequence([
        Animated.delay(200),
        Animated.spring(iconBounce, {
          toValue: 1,
          friction: 4,
          tension: 120,
          useNativeDriver: true,
        }),
      ]).start();

      // Amount slide up
      Animated.sequence([
        Animated.delay(350),
        Animated.spring(amountSlide, {
          toValue: 0,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  const formatted = `₹${(amount / 100).toLocaleString('en-IN')}`;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[prStyles.backdrop, { opacity: opacityAnim }]}>
        <Animated.View
          style={[
            prStyles.card,
            { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
          ]}
        >
          {/* Green glow + icon */}
          <View style={prStyles.iconWrap}>
            <View style={prStyles.glowCircle} />
            <Animated.View
              style={[
                prStyles.iconCircle,
                { transform: [{ scale: iconBounce }] },
              ]}
            >
              <MaterialIcons name="account-balance-wallet" size={40} color="#10b981" />
            </Animated.View>
          </View>

          <Text style={prStyles.title}>Payment Received! 💰</Text>

          <Animated.View
            style={[prStyles.amountBox, { transform: [{ translateY: amountSlide }] }]}
          >
            <Text style={prStyles.amountLabel}>Credited to your wallet</Text>
            <Text style={prStyles.amount}>{formatted}</Text>
          </Animated.View>

          <Text style={prStyles.subtitle}>
            A customer has paid for a booking.{"\n"}The amount has been added to your wallet.
          </Text>

          <View style={prStyles.divider} />

          <TouchableOpacity
            style={prStyles.button}
            onPress={onDismiss}
            activeOpacity={0.85}
          >
            <Text style={prStyles.buttonText}>Awesome!</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const prStyles = StyleSheet.create({
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
  iconWrap: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  glowCircle: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(16, 185, 129, 0.10)',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: Typography.xl,
    fontFamily: 'Manrope-Bold',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 16,
  },
  amountBox: {
    backgroundColor: '#ecfdf5',
    borderRadius: Radius.md,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  amountLabel: {
    fontSize: Typography.xs,
    fontFamily: 'Manrope-Medium',
    color: '#059669',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  amount: {
    fontSize: 32,
    fontFamily: 'Manrope-Black',
    color: '#047857',
  },
  subtitle: {
    fontSize: Typography.sm,
    fontFamily: 'Manrope-Medium',
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
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
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: Typography.md,
    fontFamily: 'Manrope-Bold',
    color: '#fff',
    letterSpacing: 0.3,
  },
});
