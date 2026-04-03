import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../../constants/Colors";
import { mockBookings, mockProfile } from "../../mock/data";

function formatCurrency(amount: number): string {
  return `₱${amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

const STAR_LABELS = ["Poor", "Fair", "Good", "Very Good", "Excellent"];

const QUICK_FEEDBACK = [
  "Paid on Time",
  "Polite and Respectful",
  "Easy to Coordinate",
];

export default function RateClientScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const booking =
    mockBookings.find((b) => b.id === bookingId) || mockBookings[0];

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [selectedFeedback, setSelectedFeedback] = useState<Set<string>>(
    new Set(),
  );
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const toggleFeedback = (item: string) => {
    setSelectedFeedback((prev) => {
      const next = new Set(prev);
      if (next.has(item)) {
        next.delete(item);
      } else {
        next.add(item);
      }
      return next;
    });
  };

  const handleSubmit = () => {
    if (rating === 0) {
      setError("Please select a rating");
      return;
    }
    setError("");
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons
              name="checkmark-circle"
              size={72}
              color={Colors.light.green}
            />
          </View>
          <Text style={styles.successTitle}>Thank You!</Text>
          <Text style={styles.successMessage}>
            Your review helps other providers make informed decisions about
            accepting bookings.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.replace("/(provider-tabs)")}
          >
            <Text style={styles.primaryButtonText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={Colors.light.blue900}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rate Client</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {error ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={18} color={Colors.light.red} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Booking Details */}
        <View style={styles.bookingCard}>
          <View style={styles.bookingRow}>
            <Ionicons
              name="person-circle-outline"
              size={36}
              color={Colors.light.blue600}
            />
            <View style={styles.bookingInfo}>
              <Text style={styles.clientName}>{booking.clientName}</Text>
              <Text style={styles.serviceName}>{booking.serviceTitle}</Text>
            </View>
          </View>
          <View style={styles.bookingMeta}>
            <View style={styles.metaItem}>
              <Ionicons
                name="briefcase-outline"
                size={14}
                color={Colors.light.gray500}
              />
              <Text style={styles.metaText}>{booking.packageName}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons
                name="cash-outline"
                size={14}
                color={Colors.light.gray500}
              />
              <Text style={styles.metaText}>
                {formatCurrency(booking.price)}
              </Text>
            </View>
          </View>
        </View>

        {/* Star Rating */}
        <View style={styles.ratingSection}>
          <Text style={styles.sectionTitle}>How was your experience?</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setRating(star)}
                style={styles.starButton}
              >
                <Ionicons
                  name={star <= rating ? "star" : "star-outline"}
                  size={44}
                  color={
                    star <= rating
                      ? Colors.light.yellow400
                      : Colors.light.gray300
                  }
                />
              </TouchableOpacity>
            ))}
          </View>
          {rating > 0 && (
            <Text style={styles.starLabel}>{STAR_LABELS[rating - 1]}</Text>
          )}
        </View>

        {/* Quick Feedback */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Feedback</Text>
          <View style={styles.feedbackRow}>
            {QUICK_FEEDBACK.map((item) => {
              const isSelected = selectedFeedback.has(item);
              return (
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.feedbackChip,
                    isSelected && styles.feedbackChipActive,
                  ]}
                  onPress={() => toggleFeedback(item)}
                >
                  <Ionicons
                    name={
                      isSelected
                        ? "checkmark-circle"
                        : "checkmark-circle-outline"
                    }
                    size={16}
                    color={
                      isSelected ? Colors.light.blue600 : Colors.light.gray400
                    }
                  />
                  <Text
                    style={[
                      styles.feedbackText,
                      isSelected && styles.feedbackTextActive,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Comment */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Additional Comments (Optional)
          </Text>
          <TextInput
            style={styles.textArea}
            placeholder="Share your experience with this client..."
            placeholderTextColor={Colors.light.gray400}
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={500}
          />
          <Text style={styles.charCount}>{comment.length}/500</Text>
        </View>

        {/* Submit */}
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Ionicons name="star" size={20} color={Colors.light.yellow400} />
          <Text style={styles.submitButtonText}>Submit Review</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => router.back()}
        >
          <Text style={styles.skipButtonText}>Skip for Now</Text>
        </TouchableOpacity>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.gray50,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 12,
    backgroundColor: Colors.light.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.gray100,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.light.blue900,
  },
  headerSpacer: {
    width: 44,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.red100,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    color: Colors.light.red,
    fontWeight: "500",
    flex: 1,
  },
  bookingCard: {
    backgroundColor: Colors.light.white,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  bookingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  bookingInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.light.blue900,
  },
  serviceName: {
    fontSize: 14,
    color: Colors.light.gray600,
    marginTop: 2,
  },
  bookingMeta: {
    flexDirection: "row",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.light.gray100,
    gap: 20,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: Colors.light.gray600,
    fontWeight: "500",
  },
  ratingSection: {
    alignItems: "center",
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.blue900,
    marginBottom: 14,
  },
  starsRow: {
    flexDirection: "row",
    gap: 8,
  },
  starButton: {
    padding: 4,
  },
  starLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.yellow400,
    marginTop: 8,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  feedbackRow: {
    gap: 8,
  },
  feedbackChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.white,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.light.gray200,
    gap: 10,
  },
  feedbackChipActive: {
    backgroundColor: Colors.light.blue50,
    borderColor: Colors.light.blue600,
  },
  feedbackText: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.light.gray600,
  },
  feedbackTextActive: {
    color: Colors.light.blue600,
    fontWeight: "600",
  },
  textArea: {
    backgroundColor: Colors.light.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.light.blue900,
    borderWidth: 1,
    borderColor: Colors.light.gray200,
    minHeight: 100,
  },
  charCount: {
    fontSize: 11,
    color: Colors.light.gray400,
    textAlign: "right",
    marginTop: 6,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.light.blue900,
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.white,
  },
  skipButton: {
    alignItems: "center",
    paddingVertical: 14,
    marginTop: 8,
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.gray500,
  },
  successContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    backgroundColor: Colors.light.gray50,
  },
  successIcon: {
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: Colors.light.blue900,
    marginBottom: 12,
  },
  successMessage: {
    fontSize: 15,
    color: Colors.light.gray600,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  primaryButton: {
    backgroundColor: Colors.light.blue600,
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 12,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.white,
  },
  bottomPadding: {
    height: 40,
  },
});
