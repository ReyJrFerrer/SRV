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
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Colors from "../../constants/Colors";
import { mockProviderServices, Service } from "../../mock/data";

const screenWidth = Dimensions.get("window").width;
const CARD_WIDTH = (screenWidth - 48) / 2;

export default function ViewAllServicesScreen() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredServices = mockProviderServices.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const getLowestPrice = (service: Service) =>
    Math.min(...service.packages.map((p) => p.price));

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
        <Text style={styles.headerTitle}>All Services</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={Colors.light.gray400} />
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
      </View>

      {/* Service Grid */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.gridContainer}
      >
        <View style={styles.grid}>
          {filteredServices.map((service) => (
            <TouchableOpacity
              key={service.id}
              style={styles.card}
              activeOpacity={0.8}
              onPress={() => router.push(`/service/${service.id}`)}
            >
              <Image
                source={{
                  uri:
                    service.imageUrl ||
                    "https://images.unsplash.com/photo-1581578731548-c64695b69535?w=400",
                }}
                style={styles.cardImage}
              />
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {service.title}
                </Text>
                <Text style={styles.cardCategory}>{service.category}</Text>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={14} color={Colors.light.yellow} />
                  <Text style={styles.ratingText}>
                    {service.rating} ({service.reviewCount})
                  </Text>
                </View>
                <Text style={styles.cardPrice}>
                  From ₱{getLowestPrice(service).toLocaleString()}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {filteredServices.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="search" size={48} color={Colors.light.gray300} />
            <Text style={styles.emptyTitle}>No services found</Text>
            <Text style={styles.emptyText}>
              Try searching with different keywords
            </Text>
          </View>
        )}

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
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.gray100,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  searchContainer: {
    backgroundColor: Colors.light.white,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.gray100,
  },
  searchBar: {
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
  gridContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: Colors.light.white,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardImage: {
    width: "100%",
    height: 110,
    backgroundColor: Colors.light.gray100,
  },
  cardContent: {
    padding: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.light.blue900,
  },
  cardCategory: {
    fontSize: 12,
    color: Colors.light.gray500,
    marginTop: 4,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  ratingText: {
    fontSize: 12,
    color: Colors.light.gray600,
  },
  cardPrice: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.light.green,
    marginTop: 8,
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
    height: 40,
  },
});
