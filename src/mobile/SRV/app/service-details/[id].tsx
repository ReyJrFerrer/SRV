import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Dimensions,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../../constants/Colors";
import { mockServiceDetail, mockServices } from "../../mock/data";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

function formatCurrency(amount: number): string {
  return `₱${amount.toLocaleString("en-US", { minimumFractionDigits: 0 })}`;
}

export default function ServiceDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const service = mockServiceDetail;
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const handleReviews = () => {
    // @ts-ignore
    router.push(`/service-details/reviews/${id || service.id}`);
  };

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
        <Text style={styles.headerTitle}>Service Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Image Carousel */}
        <View style={styles.imageSection}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(
                e.nativeEvent.contentOffset.x / SCREEN_WIDTH,
              );
              setActiveImageIndex(index);
            }}
          >
            {service.imageUrls.map((url, idx) => (
              <Image
                key={idx}
                source={{ uri: url }}
                style={styles.heroImage}
                resizeMode="cover"
              />
            ))}
          </ScrollView>
          <View style={styles.imageDots}>
            {service.imageUrls.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === activeImageIndex && styles.dotActive]}
              />
            ))}
          </View>
        </View>

        {/* Title Card */}
        <View style={styles.titleCard}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{service.category}</Text>
          </View>
          <Text style={styles.serviceTitle}>{service.title}</Text>
          <Text style={styles.serviceDescription}>{service.description}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="star" size={16} color={Colors.light.yellow400} />
              <Text style={styles.statValue}>{service.rating}</Text>
              <Text style={styles.statLabel}>
                ({service.reviewCount} reviews)
              </Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor:
                    service.status === "Available"
                      ? Colors.light.green50
                      : Colors.light.red100,
                },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor:
                      service.status === "Available"
                        ? Colors.light.green
                        : Colors.light.red,
                  },
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  {
                    color:
                      service.status === "Available"
                        ? Colors.light.green
                        : Colors.light.red,
                  },
                ]}
              >
                {service.status}
              </Text>
            </View>
          </View>
        </View>

        {/* Packages */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Packages</Text>
          {service.packages.map((pkg, index) => (
            <View key={pkg.id} style={styles.packageCard}>
              <View style={styles.packageHeader}>
                <Text style={styles.packageName}>{pkg.name}</Text>
                <Text style={styles.packagePrice}>
                  {formatCurrency(pkg.price)}
                </Text>
              </View>
              <Text style={styles.packageDesc}>{pkg.description}</Text>
            </View>
          ))}
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          <View style={styles.locationCard}>
            <Ionicons name="location" size={20} color={Colors.light.blue600} />
            <Text style={styles.locationText}>{service.location.address}</Text>
          </View>
        </View>

        {/* Schedule */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weekly Schedule</Text>
          <View style={styles.scheduleCard}>
            {service.weeklySchedule.map((entry, index) => (
              <View key={entry.day} style={styles.scheduleRow}>
                <Text style={styles.dayText}>{entry.day}</Text>
                {entry.isAvailable ? (
                  <View style={styles.slotsContainer}>
                    {entry.slots.map((slot, i) => (
                      <Text key={i} style={styles.slotText}>
                        {slot.start} - {slot.end}
                      </Text>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.unavailableText}>Unavailable</Text>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Certifications */}
        {service.certificateUrls.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Certifications</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.certsContainer}
            >
              {service.certificateUrls.map((url, i) => (
                <Image
                  key={i}
                  source={{ uri: url }}
                  style={styles.certImage}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Reviews CTA */}
        <TouchableOpacity style={styles.reviewsButton} onPress={handleReviews}>
          <View style={styles.reviewsButtonLeft}>
            <Ionicons name="star" size={20} color={Colors.light.yellow400} />
            <Text style={styles.reviewsButtonText}>
              View Reviews ({service.reviewCount})
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={Colors.light.gray400}
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
  imageSection: {
    position: "relative",
  },
  heroImage: {
    width: SCREEN_WIDTH,
    height: 220,
  },
  imageDots: {
    flexDirection: "row",
    position: "absolute",
    bottom: 12,
    alignSelf: "center",
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  dotActive: {
    backgroundColor: Colors.light.white,
    width: 20,
  },
  titleCard: {
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
  categoryBadge: {
    backgroundColor: Colors.light.blue50,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginBottom: 10,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.light.blue600,
  },
  serviceTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.light.blue900,
  },
  serviceDescription: {
    fontSize: 14,
    color: Colors.light.gray600,
    lineHeight: 20,
    marginTop: 8,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.light.blue900,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.light.gray500,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
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
  packageCard: {
    backgroundColor: Colors.light.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  packageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  packageName: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.light.blue900,
    flex: 1,
  },
  packagePrice: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.light.blue600,
  },
  packageDesc: {
    fontSize: 13,
    color: Colors.light.gray500,
    lineHeight: 18,
  },
  locationCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.white,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  locationText: {
    fontSize: 14,
    color: Colors.light.blue900,
    fontWeight: "500",
    flex: 1,
  },
  scheduleCard: {
    backgroundColor: Colors.light.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  scheduleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.gray50,
  },
  dayText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.blue900,
    width: 90,
  },
  slotsContainer: {
    flex: 1,
    alignItems: "flex-end",
  },
  slotText: {
    fontSize: 13,
    color: Colors.light.gray600,
  },
  unavailableText: {
    fontSize: 13,
    color: Colors.light.gray400,
    fontStyle: "italic",
  },
  certsContainer: {
    gap: 10,
  },
  certImage: {
    width: 140,
    height: 100,
    borderRadius: 10,
    backgroundColor: Colors.light.gray200,
  },
  reviewsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.light.white,
    marginHorizontal: 16,
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  reviewsButtonLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  reviewsButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.light.blue900,
  },
  bottomPadding: {
    height: 40,
  },
});
