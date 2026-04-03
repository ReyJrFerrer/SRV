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
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../../../constants/Colors";
import {
  mockReviewsDetailed,
  mockServiceDetail,
  ReviewDetailed,
} from "../../../mock/data";

const SORT_OPTIONS = ["Newest", "Oldest", "Highest", "Lowest"] as const;
type SortOption = (typeof SORT_OPTIONS)[number];

export default function ServiceReviewsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const service = mockServiceDetail;
  const [sortBy, setSortBy] = useState<SortOption>("Newest");
  const [filterRating, setFilterRating] = useState<number | null>(null);

  const ratingDistribution = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: mockReviewsDetailed.filter((r) => r.rating === stars).length,
  }));

  const sortedReviews = [...mockReviewsDetailed]
    .filter((r) => filterRating === null || r.rating === filterRating)
    .sort((a, b) => {
      switch (sortBy) {
        case "Newest":
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case "Oldest":
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case "Highest":
          return b.rating - a.rating;
        case "Lowest":
          return a.rating - b.rating;
        default:
          return 0;
      }
    });

  const avgRating =
    mockReviewsDetailed.reduce((sum, r) => sum + r.rating, 0) /
    mockReviewsDetailed.length;

  const renderStars = (rating: number, size: number = 14) => (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Ionicons
          key={s}
          name={s <= rating ? "star" : "star-outline"}
          size={size}
          color={s <= rating ? Colors.light.yellow400 : Colors.light.gray300}
        />
      ))}
    </View>
  );

  const renderReviewItem = (review: ReviewDetailed) => (
    <View key={review.id} style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <Image
          source={{ uri: review.clientImage }}
          style={styles.reviewAvatar}
        />
        <View style={styles.reviewHeaderInfo}>
          <Text style={styles.reviewClientName}>{review.clientName}</Text>
          <Text style={styles.reviewDate}>
            {new Date(review.date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </Text>
        </View>
        {renderStars(review.rating)}
      </View>

      <View style={styles.reviewMeta}>
        <View style={styles.metaBadge}>
          <Text style={styles.metaBadgeText}>{review.packageName}</Text>
        </View>
        <View style={styles.qualityBadge}>
          <Ionicons
            name="shield-checkmark"
            size={12}
            color={Colors.light.green}
          />
          <Text style={styles.qualityText}>
            Quality: {review.qualityScore}%
          </Text>
        </View>
      </View>

      <Text style={styles.reviewComment}>{review.comment}</Text>
    </View>
  );

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
        <Text style={styles.headerTitle}>Service Reviews</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Service Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.serviceTitle}>{service.title}</Text>
          <View style={styles.summaryStats}>
            <Text style={styles.avgRating}>{avgRating.toFixed(1)}</Text>
            <View>
              {renderStars(Math.round(avgRating), 18)}
              <Text style={styles.totalReviews}>
                {mockReviewsDetailed.length} reviews
              </Text>
            </View>
          </View>
        </View>

        {/* Rating Distribution */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rating Breakdown</Text>
          <View style={styles.distributionCard}>
            {ratingDistribution.map((item) => (
              <TouchableOpacity
                key={item.stars}
                style={styles.distRow}
                onPress={() =>
                  setFilterRating(
                    filterRating === item.stars ? null : item.stars,
                  )
                }
              >
                <Text style={styles.distStars}>{item.stars}</Text>
                <Ionicons
                  name="star"
                  size={14}
                  color={Colors.light.yellow400}
                />
                <View style={styles.distBarContainer}>
                  <View
                    style={[
                      styles.distBar,
                      {
                        width: `${
                          mockReviewsDetailed.length > 0
                            ? (item.count / mockReviewsDetailed.length) * 100
                            : 0
                        }%`,
                        backgroundColor:
                          filterRating === item.stars
                            ? Colors.light.blue600
                            : Colors.light.gray200,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.distCount}>{item.count}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Sort & Filter */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sort & Filter</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sortRow}
          >
            {SORT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.sortChip,
                  sortBy === option && styles.sortChipActive,
                ]}
                onPress={() => setSortBy(option)}
              >
                <Text
                  style={[
                    styles.sortChipText,
                    sortBy === option && styles.sortChipTextActive,
                  ]}
                >
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
            {filterRating && (
              <TouchableOpacity
                style={[styles.sortChip, styles.sortChipActive]}
                onPress={() => setFilterRating(null)}
              >
                <Text style={[styles.sortChipText, styles.sortChipTextActive]}>
                  {filterRating}★ Clear
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>

        {/* Reviews List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Reviews ({sortedReviews.length})
          </Text>
          {sortedReviews.length > 0 ? (
            sortedReviews.map(renderReviewItem)
          ) : (
            <View style={styles.emptyState}>
              <Ionicons
                name="chatbubble-outline"
                size={48}
                color={Colors.light.gray300}
              />
              <Text style={styles.emptyText}>No reviews match your filter</Text>
            </View>
          )}
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
  summaryCard: {
    backgroundColor: Colors.light.white,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  serviceTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.light.blue900,
    marginBottom: 12,
  },
  summaryStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avgRating: {
    fontSize: 40,
    fontWeight: "800",
    color: Colors.light.blue900,
  },
  totalReviews: {
    fontSize: 13,
    color: Colors.light.gray500,
    marginTop: 4,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.gray500,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  distributionCard: {
    backgroundColor: Colors.light.white,
    borderRadius: 12,
    padding: 16,
    gap: 8,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  distRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  distStars: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.light.blue900,
    width: 12,
  },
  distBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.light.gray100,
    borderRadius: 4,
    overflow: "hidden",
  },
  distBar: {
    height: "100%",
    borderRadius: 4,
  },
  distCount: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.light.gray500,
    width: 20,
    textAlign: "right",
  },
  sortRow: {
    gap: 8,
  },
  sortChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: Colors.light.white,
    borderWidth: 1.5,
    borderColor: Colors.light.gray200,
  },
  sortChipActive: {
    backgroundColor: Colors.light.blue50,
    borderColor: Colors.light.blue600,
  },
  sortChipText: {
    fontSize: 13,
    fontWeight: "500",
    color: Colors.light.gray600,
  },
  sortChipTextActive: {
    color: Colors.light.blue600,
    fontWeight: "600",
  },
  reviewCard: {
    backgroundColor: Colors.light.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  reviewAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.gray200,
  },
  reviewHeaderInfo: {
    flex: 1,
  },
  reviewClientName: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.light.blue900,
  },
  reviewDate: {
    fontSize: 11,
    color: Colors.light.gray400,
    marginTop: 2,
  },
  reviewMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
  },
  metaBadge: {
    backgroundColor: Colors.light.blue50,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  metaBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.light.blue600,
  },
  qualityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  qualityText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.light.green,
  },
  reviewComment: {
    fontSize: 14,
    color: Colors.light.gray600,
    lineHeight: 20,
    marginTop: 10,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    backgroundColor: Colors.light.white,
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.light.gray500,
    marginTop: 12,
  },
  bottomPadding: {
    height: 40,
  },
});
