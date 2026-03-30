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
import Colors from "../../constants/Colors";
import { mockServices, mockCategories } from "../../mock/data";

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = [
    { id: "1", name: "All", icon: "apps" },
    { id: "2", name: "Cleaning", icon: "sparkles" },
    { id: "3", name: "Plumbing", icon: "water" },
    { id: "4", name: "Electrical", icon: "flash" },
    { id: "5", name: "Aircon", icon: "snow" },
    { id: "6", name: "Carpentry", icon: "hammer" },
    { id: "7", name: "Painting", icon: "color-palette" },
    { id: "8", name: "Gardening", icon: "leaf" },
  ];

  const filteredServices = mockServices.filter((service) => {
    const matchesSearch = searchQuery
      ? service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.category.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    const matchesCategory = selectedCategory
      ? selectedCategory === "All" || service.category === selectedCategory
      : true;
    return matchesSearch && matchesCategory;
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchHeader}>
        <View style={styles.searchBarContainer}>
          <Ionicons name="search" size={20} color={Colors.light.gray400} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search services, providers..."
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
      </View>

      {/* Categories Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
        contentContainerStyle={styles.categoriesContent}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryChip,
              (selectedCategory === category.name ||
                (category.name === "All" && !selectedCategory)) &&
                styles.categoryChipActive,
            ]}
            onPress={() =>
              setSelectedCategory(
                category.name === "All" ? null : category.name,
              )
            }
          >
            <Ionicons
              name={category.icon as any}
              size={16}
              color={
                selectedCategory === category.name ||
                (category.name === "All" && !selectedCategory)
                  ? Colors.light.white
                  : Colors.light.gray600
              }
            />
            <Text
              style={[
                styles.categoryChipText,
                (selectedCategory === category.name ||
                  (category.name === "All" && !selectedCategory)) &&
                  styles.categoryChipTextActive,
              ]}
            >
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Recent Searches */}
        {searchQuery.length === 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Searches</Text>
              <TouchableOpacity>
                <Text style={styles.clearText}>Clear</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.recentSearches}>
              {["Home Cleaning", "Plumbing Repair", "Aircon Service"].map(
                (item, index) => (
                  <TouchableOpacity key={index} style={styles.recentItem}>
                    <Ionicons
                      name="time-outline"
                      size={16}
                      color={Colors.light.gray500}
                    />
                    <Text style={styles.recentItemText}>{item}</Text>
                  </TouchableOpacity>
                ),
              )}
            </View>
          </View>
        )}

        {/* Popular Services */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {searchQuery ? "Search Results" : "Popular Services"}
            </Text>
            <Text style={styles.resultCount}>
              {filteredServices.length} found
            </Text>
          </View>

          {filteredServices.length > 0 ? (
            <View style={styles.resultsList}>
              {filteredServices.map((service) => (
                <TouchableOpacity key={service.id} style={styles.resultCard}>
                  <Image
                    source={{
                      uri:
                        service.imageUrl ||
                        "https://images.unsplash.com/photo-1581578731548-c64695b69535?w=200",
                    }}
                    style={styles.resultImage}
                  />
                  <View style={styles.resultContent}>
                    <Text style={styles.resultTitle} numberOfLines={2}>
                      {service.title}
                    </Text>
                    <View style={styles.resultRating}>
                      <Ionicons
                        name="star"
                        size={14}
                        color={Colors.light.yellow}
                      />
                      <Text style={styles.resultRatingText}>
                        {service.rating} ({service.reviewCount} reviews)
                      </Text>
                    </View>
                    <View style={styles.resultCategory}>
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryBadgeText}>
                          {service.category}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.resultFooter}>
                      <Text style={styles.resultPrice}>
                        From ₱
                        {Math.min(
                          ...service.packages.map((p) => p.price),
                        ).toLocaleString()}
                      </Text>
                      <TouchableOpacity style={styles.bookButton}>
                        <Text style={styles.bookButtonText}>Book Now</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="search" size={48} color={Colors.light.gray300} />
              <Text style={styles.emptyTitle}>No results found</Text>
              <Text style={styles.emptyText}>
                Try searching with different keywords
              </Text>
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
  searchHeader: {
    backgroundColor: Colors.light.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.gray100,
  },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.gray100,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: Colors.light.gray800,
  },
  categoriesContainer: {
    backgroundColor: Colors.light.white,
    maxHeight: 60,
  },
  categoriesContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.light.gray100,
    gap: 6,
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: Colors.light.green,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.light.gray600,
  },
  categoryChipTextActive: {
    color: Colors.light.white,
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.light.blue900,
  },
  clearText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.gray500,
  },
  resultCount: {
    fontSize: 13,
    color: Colors.light.gray500,
  },
  recentSearches: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  recentItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.light.gray200,
    gap: 8,
  },
  recentItemText: {
    fontSize: 13,
    color: Colors.light.gray600,
  },
  resultsList: {
    gap: 16,
  },
  resultCard: {
    backgroundColor: Colors.light.white,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  resultImage: {
    width: "100%",
    height: 140,
    backgroundColor: Colors.light.gray100,
  },
  resultContent: {
    padding: 16,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.blue900,
  },
  resultRating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  resultRatingText: {
    fontSize: 13,
    color: Colors.light.gray600,
  },
  resultCategory: {
    flexDirection: "row",
    marginTop: 8,
  },
  categoryBadge: {
    backgroundColor: Colors.light.gray100,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: "500",
    color: Colors.light.gray600,
  },
  resultFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  resultPrice: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.light.green,
  },
  bookButton: {
    backgroundColor: Colors.light.green,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  bookButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.light.white,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.light.gray700,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.light.gray500,
    marginTop: 8,
  },
  bottomPadding: {
    height: 100,
  },
});
