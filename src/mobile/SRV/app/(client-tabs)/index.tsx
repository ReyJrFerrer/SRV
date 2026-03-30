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
import { mockServices, mockCategories, mockProfile } from "../../mock/data";

const CATEGORIES = [
  { id: "1", name: "Cleaning", icon: "sparkles", color: "#FACC15" },
  { id: "2", name: "Plumbing", icon: "water", color: "#3B82F6" },
  { id: "3", name: "Electrical", icon: "flash", color: "#F97316" },
  { id: "4", name: "Aircon", icon: "snow", color: "#06B6D4" },
  { id: "5", name: "Carpentry", icon: "hammer", color: "#8B5CF6" },
  { id: "6", name: "Painting", icon: "color-palette", color: "#EC4899" },
  { id: "7", name: "Gardening", icon: "leaf", color: "#22C55E" },
  { id: "8", name: "Appliance", icon: "construct", color: "#6366F1" },
];

export default function ClientHomeScreen() {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = () => {
    // Navigate to search results
  };

  const handleCategoryPress = (category: any) => {
    // Navigate to category
  };

  const handleServicePress = (serviceId: string) => {
    // Navigate to service detail
  };

  const handleNotificationPress = () => {
    // Navigate to notifications
  };

  const handleSeeAllServices = () => {
    // Navigate to all services
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity style={styles.locationSelector}>
              <Ionicons name="location" size={18} color={Colors.light.green} />
              <Text style={styles.locationText}>Quezon City</Text>
              <Ionicons
                name="chevron-down"
                size={16}
                color={Colors.light.gray500}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.notificationButton}
              onPress={handleNotificationPress}
            >
              <Ionicons
                name="notifications-outline"
                size={24}
                color={Colors.light.blue900}
              />
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>2</Text>
              </View>
            </TouchableOpacity>
          </View>
          <View style={styles.welcomeRow}>
            <View>
              <Text style={styles.greeting}>Good day!</Text>
              <Text style={styles.welcomeText}>How can we help you today?</Text>
            </View>
            <TouchableOpacity style={styles.profileButton}>
              <Image
                source={{ uri: "https://i.pravatar.cc/150?img=1" }}
                style={styles.profileImage}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <TouchableOpacity style={styles.searchBar} onPress={handleSearch}>
          <Ionicons name="search" size={20} color={Colors.light.gray400} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for services..."
            placeholderTextColor={Colors.light.gray400}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <View style={styles.searchIconBg}>
            <Ionicons name="options" size={18} color={Colors.light.white} />
          </View>
        </TouchableOpacity>

        {/* Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesScroll}
          >
            {CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={styles.categoryItem}
                onPress={() => handleCategoryPress(category)}
              >
                <View
                  style={[
                    styles.categoryIcon,
                    { backgroundColor: category.color + "20" },
                  ]}
                >
                  <Ionicons
                    name={category.icon as any}
                    size={24}
                    color={category.color}
                  />
                </View>
                <Text style={styles.categoryName}>{category.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Featured Services */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Featured Services</Text>
            <TouchableOpacity onPress={handleSeeAllServices}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.servicesScroll}
          >
            {mockServices.slice(0, 5).map((service) => (
              <TouchableOpacity
                key={service.id}
                style={styles.serviceCard}
                onPress={() => handleServicePress(service.id)}
              >
                <Image
                  source={{
                    uri:
                      service.imageUrl ||
                      "https://images.unsplash.com/photo-1581578731548-c64695b69535?w=200",
                  }}
                  style={styles.serviceImage}
                />
                <View style={styles.serviceContent}>
                  <Text style={styles.serviceTitle} numberOfLines={2}>
                    {service.title}
                  </Text>
                  <View style={styles.serviceRating}>
                    <Ionicons
                      name="star"
                      size={12}
                      color={Colors.light.yellow}
                    />
                    <Text style={styles.serviceRatingText}>
                      {service.rating} ({service.reviewCount})
                    </Text>
                  </View>
                  <Text style={styles.serviceCategory}>{service.category}</Text>
                  <Text style={styles.servicePrice}>
                    From ₱
                    {Math.min(
                      ...service.packages.map((p) => p.price),
                    ).toLocaleString()}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Popular Services */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Popular Near You</Text>
            <TouchableOpacity onPress={handleSeeAllServices}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.popularList}>
            {mockServices.slice(0, 3).map((service) => (
              <TouchableOpacity
                key={service.id}
                style={styles.popularItem}
                onPress={() => handleServicePress(service.id)}
              >
                <Image
                  source={{
                    uri:
                      service.imageUrl ||
                      "https://images.unsplash.com/photo-1581578731548-c64695b69535?w=200",
                  }}
                  style={styles.popularImage}
                />
                <View style={styles.popularContent}>
                  <Text style={styles.popularTitle} numberOfLines={1}>
                    {service.title}
                  </Text>
                  <View style={styles.popularRating}>
                    <Ionicons
                      name="star"
                      size={12}
                      color={Colors.light.yellow}
                    />
                    <Text style={styles.popularRatingText}>
                      {service.rating} • {service.reviewCount} reviews
                    </Text>
                  </View>
                  <Text style={styles.popularCategory}>{service.category}</Text>
                  <View style={styles.popularPriceRow}>
                    <Text style={styles.popularPrice}>
                      ₱
                      {Math.min(
                        ...service.packages.map((p) => p.price),
                      ).toLocaleString()}
                    </Text>
                    <TouchableOpacity style={styles.bookButton}>
                      <Text style={styles.bookButtonText}>Book</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Become a Provider CTA */}
        <TouchableOpacity style={styles.providerCta}>
          <View style={styles.ctaContent}>
            <Ionicons name="briefcase" size={24} color={Colors.light.blue600} />
            <View style={styles.ctaText}>
              <Text style={styles.ctaTitle}>Become a Service Provider</Text>
              <Text style={styles.ctaDesc}>Earn by offering your services</Text>
            </View>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={Colors.light.blue600}
          />
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
    backgroundColor: Colors.light.white,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  locationSelector: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.gray700,
  },
  notificationButton: {
    position: "relative",
  },
  notifBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: Colors.light.red500,
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  notifBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.light.white,
  },
  welcomeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greeting: {
    fontSize: 14,
    color: Colors.light.gray500,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.light.blue900,
    marginTop: 2,
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: "hidden",
  },
  profileImage: {
    width: "100%",
    height: "100%",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.white,
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: Colors.light.gray800,
  },
  searchIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.light.blue600,
    alignItems: "center",
    justifyContent: "center",
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
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
  seeAllText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.green,
  },
  categoriesScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  categoryItem: {
    alignItems: "center",
    marginRight: 20,
    width: 64,
  },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.light.gray700,
  },
  servicesScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  serviceCard: {
    width: 180,
    backgroundColor: Colors.light.white,
    borderRadius: 16,
    marginRight: 12,
    overflow: "hidden",
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  serviceImage: {
    width: "100%",
    height: 110,
    backgroundColor: Colors.light.gray100,
  },
  serviceContent: {
    padding: 12,
  },
  serviceTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.light.blue900,
    height: 36,
  },
  serviceRating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  serviceRatingText: {
    fontSize: 11,
    color: Colors.light.gray500,
  },
  serviceCategory: {
    fontSize: 11,
    color: Colors.light.gray500,
    marginTop: 4,
  },
  servicePrice: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.light.green,
    marginTop: 8,
  },
  popularList: {
    gap: 12,
  },
  popularItem: {
    flexDirection: "row",
    backgroundColor: Colors.light.white,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  popularImage: {
    width: 120,
    height: 120,
    backgroundColor: Colors.light.gray100,
  },
  popularContent: {
    flex: 1,
    padding: 12,
    justifyContent: "space-between",
  },
  popularTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.light.blue900,
  },
  popularRating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  popularRatingText: {
    fontSize: 12,
    color: Colors.light.gray500,
  },
  popularCategory: {
    fontSize: 12,
    color: Colors.light.gray500,
    marginTop: 2,
  },
  popularPriceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  popularPrice: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.light.green,
  },
  bookButton: {
    backgroundColor: Colors.light.green,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  bookButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.light.white,
  },
  providerCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.light.blue50,
    marginHorizontal: 16,
    marginTop: 20,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.light.blue100,
  },
  ctaContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  ctaText: {},
  ctaTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.light.blue700,
  },
  ctaDesc: {
    fontSize: 13,
    color: Colors.light.gray600,
  },
  bottomPadding: {
    height: 100,
  },
});
