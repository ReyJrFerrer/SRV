import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../../../constants/Colors";
import {
  mockServiceReviews,
  ServiceReview,
  mockReviewData,
} from "../../../mock/data";

type SortBy = "newest" | "oldest" | "highest" | "lowest";

export default function ServiceReviewsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [sortBy, setSortBy] = useState<SortBy>("newest");

  const sortedReviews = [...mockServiceReviews].sort((a, b) => {
    switch (sortBy) {
      case "newest":
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      case "oldest":
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      case "highest":
        return b.rating - a.rating;
      case "lowest":
        return a.rating - b.rating;
      default:
        return 0;
    }
  });

  const sortChips: { label: string; value: SortBy }[] = [
    { label: "Newest", value: "newest" },
    { label: "Oldest", value: "oldest" },
    { label: "Highest", value: "highest" },
    { label: "Lowest", value: "lowest" },
  ];

  const ratingLabels = ["Excellent", "Very Good", "Good", "Fair", "Poor"];

  const renderStars = (rating: number, size: number = 16) => {
    return (
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= rating ? "star" : "star-outline"}
            size={size}
            color={star <= rating ? Colors.light.yellow : Colors.light.gray300}
          />
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
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
          <Text style={styles.headerTitle}>Reviews</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.ratingOverviewCard}>
          <View style={styles.ratingOverviewTop}>
            <Text style={styles.averageRating}>
              {mockReviewData.averageRating}
            </Text>
            <View style={styles.ratingOverviewInfo}>
              {renderStars(Math.round(mockReviewData.averageRating), 20)}
              <Text style={styles.totalReviewsText}>
                {mockReviewData.totalReviews} reviews
              </Text>
            </View>
          </View>

          <View style={styles.distributionContainer}>
            {mockReviewData.ratingDistribution.map((item) => {
              const maxCount = Math.max(
                ...mockReviewData.ratingDistribution.map((d) => d.count),
              );
              const barWidth = maxCount > 0 ? (item.count / maxCount) * 100 : 0;

              return (
                <View key={item.stars} style={styles.distributionRow}>
                  <Text style={styles.distributionStars}>{item.stars}</Text>
                  <Ionicons
                    name="star"
                    size={14}
                    color={Colors.light.yellow}
                    style={styles.distributionStarIcon}
                  />
                  <View style={styles.barBackground}>
                    <View style={[styles.barFill, { width: `${barWidth}%` }]} />
                  </View>
                  <Text style={styles.distributionCount}>{item.count}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.sortChipsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sortChipsContent}
          >
            {sortChips.map((chip) => (
              <TouchableOpacity
                key={chip.value}
                style={[
                  styles.sortChip,
                  sortBy === chip.value && styles.sortChipActive,
                ]}
                onPress={() => setSortBy(chip.value)}
              >
                <Text
                  style={[
                    styles.sortChipText,
                    sortBy === chip.value && styles.sortChipTextActive,
                  ]}
                >
                  {chip.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.reviewsList}>
          {sortedReviews.map((review) => (
            <View key={review.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <View style={styles.reviewClientInfo}>
                  <Image
                    source={{ uri: review.clientImage }}
                    style={styles.clientAvatar}
                  />
                  <Text style={styles.clientName}>{review.clientName}</Text>
                </View>
                <Text style={styles.reviewDate}>{review.date}</Text>
              </View>

              <View style={styles.reviewRatingRow}>
                {renderStars(review.rating)}
              </View>

              <View style={styles.reviewServiceInfo}>
                <Text style={styles.serviceTitle}>{review.serviceTitle}</Text>
                <Text style={styles.packageName}>{review.packageName}</Text>
              </View>

              <Text style={styles.reviewComment}>{review.comment}</Text>
            </View>
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
  ratingOverviewCard: {
    backgroundColor: Colors.light.white,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  ratingOverviewTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  averageRating: {
    fontSize: 48,
    fontWeight: "800",
    color: Colors.light.blue900,
    marginRight: 16,
  },
  ratingOverviewInfo: {
    flex: 1,
  },
  totalReviewsText: {
    fontSize: 14,
    color: Colors.light.gray500,
    marginTop: 4,
  },
  starsRow: {
    flexDirection: "row",
    gap: 2,
  },
  distributionContainer: {
    gap: 8,
  },
  distributionRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  distributionStars: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.gray700,
    width: 12,
  },
  distributionStarIcon: {
    marginRight: 8,
  },
  barBackground: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.light.gray100,
    borderRadius: 4,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    backgroundColor: Colors.light.yellow,
    borderRadius: 4,
  },
  distributionCount: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.light.gray500,
    marginLeft: 8,
    width: 24,
    textAlign: "right",
  },
  sortChipsContainer: {
    marginTop: 16,
  },
  sortChipsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  sortChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.light.gray100,
  },
  sortChipActive: {
    backgroundColor: Colors.light.green,
  },
  sortChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.gray600,
  },
  sortChipTextActive: {
    color: Colors.light.white,
  },
  reviewsList: {
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 12,
  },
  reviewCard: {
    backgroundColor: Colors.light.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  reviewClientInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  clientAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.light.gray200,
  },
  clientName: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.light.blue900,
  },
  reviewDate: {
    fontSize: 13,
    color: Colors.light.gray400,
  },
  reviewRatingRow: {
    marginBottom: 8,
  },
  reviewServiceInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  serviceTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.light.blue600,
  },
  packageName: {
    fontSize: 13,
    color: Colors.light.gray500,
  },
  reviewComment: {
    fontSize: 14,
    color: Colors.light.gray700,
    lineHeight: 20,
  },
  bottomPadding: {
    height: 32,
  },
});
