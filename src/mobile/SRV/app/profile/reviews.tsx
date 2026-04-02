import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../../constants/Colors";
import { mockClientReviews, ReviewStats, ReviewItem } from "../../mock/data";

const reviewData: ReviewStats = mockClientReviews;
const maxCount = Math.max(...reviewData.ratingDistribution.map((d) => d.count));

function StarRow({ rating, size = 16 }: { rating: number; size?: number }) {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <Ionicons
        key={i}
        name={i <= rating ? "star" : "star-outline"}
        size={size}
        color={Colors.light.yellow}
      />,
    );
  }
  return <View style={styles.starRow}>{stars}</View>;
}

function RatingBar({ stars, count }: { stars: number; count: number }) {
  const fillPercent = maxCount > 0 ? (count / maxCount) * 100 : 0;
  return (
    <View style={styles.ratingBarRow}>
      <Text style={styles.ratingBarLabel}>{stars}</Text>
      <Ionicons name="star" size={14} color={Colors.light.yellow} />
      <View style={styles.ratingBarTrack}>
        <View style={[styles.ratingBarFill, { width: `${fillPercent}%` }]} />
      </View>
      <Text style={styles.ratingBarCount}>{count}</Text>
    </View>
  );
}

function ReviewCard({ review }: { review: ReviewItem }) {
  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <Image
          source={{ uri: review.clientImage }}
          style={styles.reviewerAvatar}
        />
        <View style={styles.reviewerInfo}>
          <Text style={styles.reviewerName}>{review.clientName}</Text>
          <Text style={styles.reviewDate}>{review.date}</Text>
        </View>
      </View>
      <StarRow rating={review.rating} />
      {review.serviceTitle && (
        <Text style={styles.reviewService}>
          {review.serviceTitle}
          {review.packageName ? ` - ${review.packageName}` : ""}
        </Text>
      )}
      <Text style={styles.reviewComment}>{review.comment}</Text>
    </View>
  );
}

export default function ClientReviewsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.light.blue900} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Reviews</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Rating Overview Card */}
        <View style={styles.overviewCard}>
          <Text style={styles.averageRating}>
            {reviewData.averageRating.toFixed(1)}
          </Text>
          <StarRow rating={5} size={22} />
          <Text style={styles.basedOnText}>
            Based on {reviewData.totalReviews} reviews
          </Text>
        </View>

        {/* Rating Distribution Bars */}
        <View style={styles.distributionCard}>
          {reviewData.ratingDistribution.map((item) => (
            <RatingBar key={item.stars} stars={item.stars} count={item.count} />
          ))}
        </View>

        {/* Reviews List */}
        <View style={styles.reviewsSection}>
          <Text style={styles.sectionTitle}>Reviews</Text>
          {reviewData.reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </View>

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
    backgroundColor: Colors.light.white,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.gray100,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.gray50,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.light.blue900,
  },
  headerSpacer: {
    width: 40,
  },
  overviewCard: {
    backgroundColor: Colors.light.white,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.light.gray100,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  averageRating: {
    fontSize: 56,
    fontWeight: "800",
    color: Colors.light.blue900,
  },
  starRow: {
    flexDirection: "row",
    gap: 4,
    marginTop: 8,
  },
  basedOnText: {
    fontSize: 14,
    color: Colors.light.gray500,
    marginTop: 8,
  },
  distributionCard: {
    backgroundColor: Colors.light.white,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.light.gray100,
  },
  ratingBarRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 6,
  },
  ratingBarLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.gray700,
    width: 12,
    textAlign: "right",
  },
  ratingBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.light.gray200,
    borderRadius: 4,
    overflow: "hidden",
  },
  ratingBarFill: {
    height: "100%",
    backgroundColor: Colors.light.green,
    borderRadius: 4,
  },
  ratingBarCount: {
    fontSize: 13,
    color: Colors.light.gray500,
    width: 28,
    textAlign: "right",
  },
  reviewsSection: {
    marginTop: 12,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.light.blue900,
    marginBottom: 12,
  },
  reviewCard: {
    backgroundColor: Colors.light.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.light.gray100,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  reviewerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  reviewerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  reviewerName: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.light.blue900,
  },
  reviewDate: {
    fontSize: 13,
    color: Colors.light.gray400,
    marginTop: 2,
  },
  reviewService: {
    fontSize: 13,
    color: Colors.light.gray600,
    marginBottom: 6,
  },
  reviewComment: {
    fontSize: 14,
    color: Colors.light.gray700,
    lineHeight: 20,
  },
  bottomPadding: {
    height: 40,
  },
});
