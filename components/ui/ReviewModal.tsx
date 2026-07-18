import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, TextInput,
  ActivityIndicator, Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Radius, Shadow, Spacing } from '@/constants/Theme';
import { submitReview } from '@/services/reviewService';

interface ReviewModalProps {
  visible: boolean;
  onClose: () => void;
  bookingId: string;
  technicianId: string;
  technicianName?: string;
  onReviewSubmitted?: () => void;
}

export default function ReviewModal({
  visible,
  onClose,
  bookingId,
  technicianId,
  technicianName = 'Technician',
  onReviewSubmitted,
}: ReviewModalProps) {
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async () => {
    if (!rating || rating < 1) {
      Alert.alert('Rating Required', 'Please select a star rating (1-5).');
      return;
    }

    try {
      setLoading(true);
      const res = await submitReview({
        bookingId,
        technicianId,
        rating,
        comment: comment.trim(),
      });

      if (res.success) {
        Alert.alert(
          '⭐ Review Submitted!',
          `Thank you for your feedback! You earned +${res.pointsEarned || 20} Fixi Points.`
        );
        onReviewSubmitted?.();
        onClose();
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to submit review. Please try again.';
      Alert.alert('Submission Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} disabled={loading}>
            <MaterialIcons name="close" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <MaterialIcons name="star" size={32} color={Colors.star} />
            </View>
            <Text style={styles.title}>Rate Your Experience</Text>
            <Text style={styles.subtitle}>How was your service with {technicianName}?</Text>
          </View>

          {/* Points Reward Banner */}
          <View style={styles.rewardBanner}>
            <MaterialIcons name="military-tech" size={20} color="#d97706" />
            <Text style={styles.rewardText}>Earn +20 Fixi Points ⭐ upon submitting feedback!</Text>
          </View>

          {/* Star Rating Picker */}
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setRating(star)}
                activeOpacity={0.7}
                style={styles.starBtn}
              >
                <MaterialIcons
                  name={star <= rating ? 'star' : 'star-border'}
                  size={38}
                  color={star <= rating ? Colors.star : '#cbd5e1'}
                />
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.ratingLabel}>
            {rating === 5 ? 'Excellent ⭐⭐⭐⭐⭐' : rating === 4 ? 'Good ⭐⭐⭐⭐' : rating === 3 ? 'Average ⭐⭐⭐' : rating === 2 ? 'Poor ⭐⭐' : 'Very Bad ⭐'}
          </Text>

          {/* Comment Input */}
          <TextInput
            style={styles.input}
            placeholder="Write a brief comment (optional)..."
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={3}
            value={comment}
            onChangeText={setComment}
            editable={!loading}
          />

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialIcons name="send" size={18} color="#fff" />
                <Text style={styles.submitBtnText}>Submit Review & Claim Points</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center', padding: Spacing.base,
  },
  card: {
    width: '100%', maxWidth: 400, backgroundColor: Colors.surface,
    borderRadius: Radius.xl, padding: Spacing.lg, ...Shadow.lg,
  },
  closeBtn: {
    position: 'absolute', top: 16, right: 16, zIndex: 10,
    padding: 4, borderRadius: Radius.full, backgroundColor: Colors.surfaceAlt,
  },
  header: { alignItems: 'center', marginBottom: Spacing.base },
  iconCircle: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: '#fef3c7',
    justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.sm,
  },
  title: { fontSize: Typography.lg, fontFamily: 'Manrope-Bold', color: Colors.textPrimary },
  subtitle: { fontSize: Typography.sm, fontFamily: 'Manrope-Medium', color: Colors.textSecondary, textAlign: 'center', marginTop: 2 },
  rewardBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a',
    borderRadius: Radius.md, padding: 10, marginBottom: Spacing.base,
  },
  rewardText: { fontSize: 13, fontFamily: 'Manrope-Bold', color: '#b45309', flex: 1 },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 6 },
  starBtn: { padding: 2 },
  ratingLabel: { fontSize: Typography.sm, fontFamily: 'Manrope-Bold', color: Colors.textPrimary, textAlign: 'center', marginBottom: Spacing.base },
  input: {
    backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, padding: Spacing.base,
    fontSize: Typography.sm, fontFamily: 'Manrope-Medium', color: Colors.textPrimary,
    minHeight: 80, textAlignVertical: 'top', marginBottom: Spacing.base,
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, paddingVertical: 14, borderRadius: Radius.full,
    ...Shadow.sm,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: Typography.base, fontFamily: 'Manrope-Bold', color: '#fff' },
});
