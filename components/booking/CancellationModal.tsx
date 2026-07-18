import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Radius, Shadow, Spacing } from '@/constants/Theme';
import { fetchCancellationConfig, cancelBookingRequest, CancellationConfigData } from '@/services/cancellationService';

interface CancellationModalProps {
  visible: boolean;
  onClose: () => void;
  booking: any;
  isCustomer?: boolean;
  onSuccess?: (result?: any) => void;
}

const REASONS = [
  'Change of plans',
  'Found another technician',
  'Emergency situation',
  'Schedule conflict',
  'Location issue',
  'Other',
];

export default function CancellationModal({
  visible,
  onClose,
  booking,
  isCustomer = true,
  onSuccess,
}: CancellationModalProps) {
  const [config, setConfig] = useState<CancellationConfigData>({
    freeCancellationWindowMinutes: 45,
    customerLateCancelFinePercentage: 20,
    customerLateCancelPointsPenalty: 50,
    techLateCancelPointsPenalty: 100,
  });
  const [loadingConfig, setLoadingConfig] = useState<boolean>(true);
  const [selectedReason, setSelectedReason] = useState<string>(REASONS[0]);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (visible && booking) {
      loadPolicyConfig();
    }
  }, [visible, booking]);

  const loadPolicyConfig = async () => {
    setLoadingConfig(true);
    try {
      const res = await fetchCancellationConfig();
      if (res.config) {
        setConfig(res.config);
      }
    } catch (e) {
      console.warn('Failed to load cancellation config, using defaults');
    } finally {
      setLoadingConfig(false);
    }
  };

  if (!booking) return null;

  // Calculate live outcome
  const bookingTimeMs = booking.bookingTime ? new Date(booking.bookingTime).getTime() : Date.now() + 3600000;
  const nowMs = Date.now();
  const deltaMinutes = (bookingTimeMs - nowMs) / (1000 * 60);
  const isBeforeCutoff = deltaMinutes >= config.freeCancellationWindowMinutes;
  const isPaid = booking.isPaid || booking.paymentStatus === 'paid' || booking.status === 'paid';
  const price = Number(booking.price || 0);

  let previewTitle = 'Free Cancellation Window';
  let previewBadgeColor = '#059669';
  let previewBadgeBg = '#d1fae5';
  let previewIcon = 'check-circle';
  let refundText = 'No payment collected';
  let penaltyText = 'No fine or Fixi points deduction';

  if (isBeforeCutoff) {
    previewTitle = `🟢 Before ${config.freeCancellationWindowMinutes} Mins Cutoff`;
    if (isPaid) {
      refundText = `₹${price.toFixed(2)} (100% Full Refund via Ticket)`;
    } else {
      refundText = '₹0.00 (Unpaid / COD)';
    }
    penaltyText = '₹0 Fine • 0 Fixi Points Penalty';
  } else {
    previewTitle = `🔴 Within ${config.freeCancellationWindowMinutes} Mins Cutoff (Late)`;
    previewBadgeColor = '#dc2626';
    previewBadgeBg = '#fee2e2';
    previewIcon = 'warning';

    if (isCustomer) {
      if (isPaid) {
        const fineAmt = Math.round((price * config.customerLateCancelFinePercentage) / 100);
        const refundAmt = Math.max(0, price - fineAmt);
        refundText = `₹${refundAmt.toFixed(2)} (${100 - config.customerLateCancelFinePercentage}% Refund via Ticket)`;
        penaltyText = `₹${fineAmt.toFixed(2)} Fine (${config.customerLateCancelFinePercentage}%)`;
      } else {
        refundText = '₹0.00 (Unpaid / COD)';
        penaltyText = `-${config.customerLateCancelPointsPenalty} Fixi Points ⭐`;
      }
    } else {
      // Technician cancelling late
      if (isPaid) {
        refundText = `₹${price.toFixed(2)} (100% Full Refund to Customer via Ticket)`;
      } else {
        refundText = '₹0.00 (Unpaid / COD)';
      }
      penaltyText = `-${config.techLateCancelPointsPenalty} Fixi Points ⭐`;
    }
  }

  const handleConfirmCancel = () => {
    Alert.alert(
      'Confirm Cancellation',
      `Are you sure you want to cancel this booking? ${penaltyText !== '₹0 Fine • 0 Fixi Points Penalty' ? `\n\nPenalty applied: ${penaltyText}` : ''}`,
      [
        { text: 'Keep Booking', style: 'cancel' },
        {
          text: 'Yes, Cancel Now',
          style: 'destructive',
          onPress: executeCancellation,
        },
      ]
    );
  };

  const executeCancellation = async () => {
    try {
      setSubmitting(true);
      const res = await cancelBookingRequest(booking._id, selectedReason);
      if (res.success) {
        let msg = 'Booking has been cancelled successfully.';
        if (res.refundTicket) {
          msg += `\n\nRefund Ticket #${res.refundTicket._id.slice(-6)} created for ₹${res.refundTicket.refundAmount}. Processed within 24-48 hours.`;
        } if (res.pointsDeducted && res.pointsDeducted > 0) {
          msg += `\n\n-${res.pointsDeducted} Fixi Points deducted as cancellation fee.`;
        }
        Alert.alert('✅ Booking Cancelled', msg);
        if (onSuccess) onSuccess(res);
        onClose();
      } else {
        Alert.alert('Cancellation Failed', res.message || 'Unable to cancel booking at this time.');
      }
    } catch (err: any) {
      Alert.alert(
        'Error',
        err.response?.data?.message || err.message || 'Failed to communicate with cancellation server.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Cancel & Policy Preview</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialIcons name="close" size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {loadingConfig ? (
            <View style={{ padding: Spacing.xl, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
              {/* Policy Status Badge */}
              <View style={[styles.badgeWrap, { backgroundColor: previewBadgeBg }]}>
                <MaterialIcons name={previewIcon as any} size={20} color={previewBadgeColor} />
                <Text style={[styles.badgeText, { color: previewBadgeColor }]}>{previewTitle}</Text>
              </View>

              {/* Live Outcome Calculation Box */}
              <View style={styles.outcomeCard}>
                <Text style={styles.outcomeHeader}>Real-Time Outcome Preview</Text>

                <View style={styles.outcomeRow}>
                  <Text style={styles.outcomeLabel}>Scheduled For:</Text>
                  <Text style={styles.outcomeValue}>
                    {booking.bookingTime ? new Date(booking.bookingTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Soon'}
                  </Text>
                </View>

                <View style={styles.outcomeRow}>
                  <Text style={styles.outcomeLabel}>Payment Status:</Text>
                  <Text style={styles.outcomeValue}>{isPaid ? `Paid (₹${price})` : 'Unpaid / COD'}</Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.outcomeRow}>
                  <Text style={styles.outcomeLabel}>Estimated Refund:</Text>
                  <Text style={[styles.outcomeValue, { color: '#059669' }]}>{refundText}</Text>
                </View>

                <View style={styles.outcomeRow}>
                  <Text style={styles.outcomeLabel}>Applicable Penalty:</Text>
                  <Text style={[styles.outcomeValue, { color: previewBadgeColor }]}>{penaltyText}</Text>
                </View>
              </View>

              {/* Select Reason */}
              <Text style={styles.sectionTitle}>Select Reason for Cancellation</Text>
              <View style={styles.reasonsList}>
                {REASONS.map((reason) => {
                  const isSelected = selectedReason === reason;
                  return (
                    <TouchableOpacity
                      key={reason}
                      style={[styles.reasonChip, isSelected && styles.reasonChipSelected]}
                      onPress={() => setSelectedReason(reason)}
                    >
                      <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                        {isSelected && <View style={styles.radioInnerCircle} />}
                      </View>
                      <Text style={[styles.reasonText, isSelected && styles.reasonTextSelected]}>
                        {reason}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Policy Note Footer */}
              <View style={styles.policyFooter}>
                <MaterialIcons name="info-outline" size={16} color={Colors.textSecondary} />
                <Text style={styles.policyText}>
                  All financial calculations strictly follow live DB rules (`{config.freeCancellationWindowMinutes}m window`). Paid refunds are created as secure tickets credited within 24-48 hours.
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionsRow}>
                <TouchableOpacity style={styles.keepBtn} onPress={onClose} disabled={submitting}>
                  <Text style={styles.keepText}>Keep Booking</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.cancelBtn, submitting && { opacity: 0.7 }]}
                  onPress={handleConfirmCancel}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.cancelText}>Confirm Cancel</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    ...Shadow.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  title: {
    fontSize: Typography.lg,
    fontFamily: 'Manrope-Bold',
    color: Colors.textPrimary,
  },
  closeBtn: {
    padding: 4,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  badgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
    gap: 8,
  },
  badgeText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 14,
    flex: 1,
  },
  outcomeCard: {
    backgroundColor: '#f8fafc',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: Spacing.lg,
  },
  outcomeHeader: {
    fontFamily: 'Manrope-Bold',
    fontSize: 13,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  outcomeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  outcomeLabel: {
    fontSize: Typography.sm,
    fontFamily: 'Manrope-Medium',
    color: Colors.textSecondary,
  },
  outcomeValue: {
    fontFamily: 'Manrope-Bold',
    fontSize: 14,
    color: Colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: Spacing.sm,
  },
  sectionTitle: {
    fontSize: Typography.base,
    fontFamily: 'Manrope-Bold',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  reasonsList: {
    gap: 8,
    marginBottom: Spacing.lg,
  },
  reasonChip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: '#fff',
  },
  reasonChipSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#eff6ff',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  radioCircleSelected: {
    borderColor: Colors.primary,
  },
  radioInnerCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  reasonText: {
    fontSize: Typography.base,
    fontFamily: 'Manrope-Medium',
    color: Colors.textPrimary,
  },
  reasonTextSelected: {
    fontFamily: 'Manrope-Bold',
    color: Colors.primary,
  },
  policyFooter: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f1f5f9',
    padding: Spacing.md,
    borderRadius: Radius.md,
    gap: 8,
    marginBottom: Spacing.lg,
  },
  policyText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: 'Manrope-Medium',
    flex: 1,
    lineHeight: 18,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  keepBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'center',
  },
  keepText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 15,
    color: Colors.textPrimary,
  },
  cancelBtn: {
    flex: 1.3,
    paddingVertical: 14,
    borderRadius: Radius.md,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    ...Shadow.md,
  },
  cancelText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 15,
    color: '#fff',
  },
});
