import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, router } from "expo-router";
import Colors from "../../constants/Colors";
import {
  mockProviderServices,
  mockDetailedCategories,
  Category,
  Service,
} from "../../mock/data";

type SortBy = "rating" | "price-asc" | "price-desc";

export default function CategoryServicesScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("rating");

  const category = mockDetailedCategories.find((c) => c.slug === slug);

  const categoryServices = mockProviderServices.filter(
    (s) => s.categorySlug === slug,
  );

  const filtered = categoryServices.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "rating") return b.rating - a.rating;
    const priceA = a.packages.length > 0 ? a.packages[0].price : 0;
    const priceB = b.packages.length > 0 ? b.packages[0].price : 0;
    if (sortBy === "price-asc") return priceA - priceB;
    return priceB - priceA;
  });

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= Math.round(rating) ? "star" : "star-outline"}
          size={14}
          color={Colors.light.yellow}
        />,
      );
    }
    return stars;
  };

  const getStartingPrice = (service: Service) => {
    if (service.packages.length === 0) return 0;
    return Math.min(...service.packages.map((p) => p.price));
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.light.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {category?.name ?? "Category"}
        </Text>
        {category && (
          <View style={styles.headerBadge}>
            <Ionicons
              name={category.icon as any}
              size={18}
              color={Colors.light.white}
            />
          </View>
        )}
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={20}
          color={Colors.light.gray400}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search services..."
          placeholderTextColor={Colors.light.gray400}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons
              name="close-circle"
              size={20}
              color={Colors.light.gray400}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Sort Chips */}
      <View style={styles.sortContainer}>
        <TouchableOpacity
          style={[
            styles.sortChip,
            sortBy === "rating" && styles.sortChipActive,
          ]}
          onPress={() => setSortBy("rating")}
        >
          <Ionicons
            name="star"
            size={14}
            color={
              sortBy === "rating" ? Colors.light.white : Colors.light.gray500
            }
          />
          <Text
            style={[
              styles.sortChipText,
              sortBy === "rating" && styles.sortChipTextActive,
            ]}
          >
            Rating
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.sortChip,
            sortBy === "price-asc" && styles.sortChipActive,
          ]}
          onPress={() => setSortBy("price-asc")}
        >
          <Ionicons
            name="arrow-up"
            size={14}
            color={
              sortBy === "price-asc" ? Colors.light.white : Colors.light.gray500
            }
          />
          <Text
            style={[
              styles.sortChipText,
              sortBy === "price-asc" && styles.sortChipTextActive,
            ]}
          >
            Price: Low
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.sortChip,
            sortBy === "price-desc" && styles.sortChipActive,
          ]}
          onPress={() => setSortBy("price-desc")}
        >
          <Ionicons
            name="arrow-down"
            size={14}
            color={
              sortBy === "price-desc"
                ? Colors.light.white
                : Colors.light.gray500
            }
          />
          <Text
            style={[
              styles.sortChipText,
              sortBy === "price-desc" && styles.sortChipTextActive,
            ]}
          >
            Price: High
          </Text>
        </TouchableOpacity>
      </View>

      {/* Service List */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {sorted.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="search-outline"
              size={64}
              color={Colors.light.gray300}
            />
            <Text style={styles.emptyTitle}>No services found</Text>
            <Text style={styles.emptySubtitle}>
              Try adjusting your search or filters
            </Text>
          </View>
        ) : (
          sorted.map((service) => {
            const startingPrice = getStartingPrice(service);
            return (
              <TouchableOpacity
                key={service.id}
                style={styles.card}
                activeOpacity={0.8}
                onPress={() => router.push(`/service/${service.id}`)}
              >
                {service.imageUrl ? (
                  <Image
                    source={{ uri: service.imageUrl }}
                    style={styles.cardImage}
                  />
                ) : (
                  <View style={styles.cardImagePlaceholder}>
                    <Ionicons
                      name="image-outline"
                      size={32}
                      color={Colors.light.gray300}
                    />
                  </View>
                )}
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {service.title}
                  </Text>
                  <View style={styles.cardBadge}>
                    <Text style={styles.cardBadgeText}>{service.category}</Text>
                  </View>
                  <View style={styles.ratingRow}>
                    <View style={styles.starsRow}>
                      {renderStars(service.rating)}
                    </View>
                    <Text style={styles.ratingText}>
                      {service.rating.toFixed(1)} ({service.reviewCount})
                    </Text>
                  </View>
                  <View style={styles.cardFooter}>
                    <Text style={styles.priceText}>
                      From ₱{startingPrice.toLocaleString()}
                    </Text>
                    <TouchableOpacity
                      style={styles.viewButton}
                      onPress={() => router.push(`/service/${service.id}`)}
                    >
                      <Text style={styles.viewButtonText}>View</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
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
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: Colors.light.white,
  },
  headerBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.white,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.light.gray200,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 15,
    color: Colors.light.gray800,
  },
  sortContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  sortChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.light.white,
    borderWidth: 1,
    borderColor: Colors.light.gray200,
  },
  sortChipActive: {
    backgroundColor: Colors.light.green,
    borderColor: Colors.light.green,
  },
  sortChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.light.gray500,
  },
  sortChipTextActive: {
    color: Colors.light.white,
  },
  scrollArea: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.light.gray600,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.light.gray400,
  },
  card: {
    backgroundColor: Colors.light.white,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.light.gray200,
  },
  cardImage: {
    width: "100%",
    height: 160,
  },
  cardImagePlaceholder: {
    width: "100%",
    height: 160,
    backgroundColor: Colors.light.gray100,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: {
    padding: 14,
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.gray900,
  },
  cardBadge: {
    alignSelf: "flex-start",
    backgroundColor: Colors.light.blue50,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cardBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.light.primary,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  starsRow: {
    flexDirection: "row",
    gap: 2,
  },
  ratingText: {
    fontSize: 13,
    color: Colors.light.gray500,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  priceText: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.light.green,
  },
  viewButton: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.light.white,
  },
});
