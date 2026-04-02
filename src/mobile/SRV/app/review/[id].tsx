import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../../constants/Colors";
import { mockDetailedBookings } from "../../mock/data";

const RATING_LABELS = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

const FEEDBACK_CHIPS = [
  "Very Professional",
  "Arrived On Time",
  "Highly Recommended",
  "Great Communication",
  "Quality Work",
  "Friendly",
];

export default function RateProviderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const booking = mockDetailedBookings[0];

  const [rating, setRating] = useState(0);
  const [selectedFeedback, setSelectedFeedback] = useState<string[]>([]);
  const [comment, setComment] = useState("");

  const toggleFeedback = (chip: string) => {
    setSelectedFeedback((prev) =>
      prev.includes(chip) ? prev.filter((c) => c !== chip) : [...prev, chip],
    );
  };

  const handleSubmit = () => {
    console.log("Rating:", rating);
    console.log("Feedback Chips:", selectedFeedback);
    console.log("Comment:", comment);
    Alert.alert("Thank you!", "Your review has been submitted", [
      { text: "OK", onPress: () => router.back() },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={Colors.light.blue900}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Rate Provider</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.providerCard}>
            <Image
              source={{ uri: booking.providerImage }}
              style={styles.providerAvatar}
            />
            <Text style={styles.providerName}>{booking.providerName}</Text>
            <Text style={styles.serviceTitle}>{booking.serviceTitle}</Text>
          </View>

          <View style={styles.starSelector}>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRating(star)}
                  style={styles.starButton}
                >
                  <Ionicons
                    name={star <= rating ? "star" : "star-outline"}
                    size={32}
                    color={
                      star <= rating
                        ? Colors.light.yellow
                        : Colors.light.gray300
                    }
                  />
                </TouchableOpacity>
              ))}
            </View>
            {rating > 0 && (
              <Text style={styles.ratingLabel}>{RATING_LABELS[rating]}</Text>
            )}
          </View>

          <View style={styles.feedbackSection}>
            <Text style={styles.sectionTitle}>Quick Feedback</Text>
            <View style={styles.chipsGrid}>
              {FEEDBACK_CHIPS.map((chip) => {
                const isSelected = selectedFeedback.includes(chip);
                return (
                  <TouchableOpacity
                    key={chip}
                    style={[
                      styles.feedbackChip,
                      isSelected && styles.feedbackChipSelected,
                    ]}
                    onPress={() => toggleFeedback(chip)}
                  >
                    <Text
                      style={[
                        styles.feedbackChipText,
                        isSelected && styles.feedbackChipTextSelected,
                      ]}
                    >
                      {chip}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.commentSection}>
            <Text style={styles.sectionTitle}>Your Comment</Text>
            <TextInput
              style={styles.commentInput}
              placeholder="Share your experience (optional)"
              placeholderTextColor={Colors.light.gray400}
              multiline
              maxLength={500}
              value={comment}
              onChangeText={setComment}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{comment.length}/500</Text>
          </View>

          <TouchableOpacity
            style={[
              styles.submitButton,
              rating === 0 && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={rating === 0}
          >
            <Text style={styles.submitButtonText}>Submit Review</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.gray50,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.light.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.gray100,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.gray100,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.light.blue900,
  },
  headerSpacer: {
    width: 40,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  providerCard: {
    backgroundColor: Colors.light.white,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  providerAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.light.gray200,
    marginBottom: 12,
  },
  providerName: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.light.blue900,
    marginBottom: 4,
  },
  serviceTitle: {
    fontSize: 14,
    color: Colors.light.gray500,
  },
  starSelector: {
    backgroundColor: Colors.light.white,
    borderRadius: 16,
    padding: 24,
    marginTop: 16,
    alignItems: "center",
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  starsRow: {
    flexDirection: "row",
    gap: 8,
  },
  starButton: {
    padding: 4,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.green,
    marginTop: 8,
  },
  feedbackSection: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.blue900,
    marginBottom: 12,
  },
  chipsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  feedbackChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.light.gray100,
  },
  feedbackChipSelected: {
    backgroundColor: Colors.light.green,
  },
  feedbackChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.light.gray600,
  },
  feedbackChipTextSelected: {
    color: Colors.light.white,
  },
  commentSection: {
    marginTop: 20,
  },
  commentInput: {
    backgroundColor: Colors.light.white,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: Colors.light.gray800,
    minHeight: 120,
    borderWidth: 1,
    borderColor: Colors.light.gray200,
  },
  charCount: {
    fontSize: 12,
    color: Colors.light.gray400,
    textAlign: "right",
    marginTop: 6,
  },
  submitButton: {
    backgroundColor: Colors.light.green,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 24,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.white,
  },
});
