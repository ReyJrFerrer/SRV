import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Alert,
  Dimensions,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../../constants/Colors";
import { mockServices, Service } from "../../mock/data";

const { width } = Dimensions.get("window");

export default function ServiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [service, setService] = useState<Service | null>(null);

  useEffect(() => {
    const foundService = mockServices.find((s) => s.id === id);
    setService(foundService || mockServices[0]);
  }, [id]);

  const handleToggleStatus = () => {
    if (service) {
      setService((prev) =>
        prev
          ? {
              ...prev,
              status: prev.status === "Available" ? "Unavailable" : "Available",
            }
          : null,
      );
      console.log(
        `Service ${service.status === "Available" ? "deactivated" : "activated"}`,
      );
    }
  };

  const handleDeleteService = () => {
    Alert.alert(
      "Delete Service",
      "Are you sure you want to delete this service?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            console.log("Service deleted");
            // @ts-ignore
            router.back();
          },
        },
      ],
    );
  };

  if (!service) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isAvailable = service.status === "Available";

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          <Image
            source={{
              uri:
                service.imageUrl ||
                "https://images.unsplash.com/photo-1581578731548-c64695b69535?w=400",
            }}
            style={styles.heroImage}
          />
          <View style={styles.heroOverlay} />
          <View style={styles.heroContent}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                // @ts-ignore
                router.back();
              }}
            >
              <Ionicons
                name="arrow-back"
                size={24}
                color={Colors.light.white}
              />
            </TouchableOpacity>
            <Text style={styles.heroTitle}>{service.title}</Text>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{service.category}</Text>
            </View>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={18} color={Colors.light.yellow} />
            <Text style={styles.ratingText}>
              {service.rating} / 5 ({service.reviewCount} reviews)
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: isAvailable
                  ? Colors.light.green100
                  : Colors.light.gray200,
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                {
                  color: isAvailable
                    ? Colors.light.green
                    : Colors.light.gray600,
                },
              ]}
            >
              {isAvailable ? "Available" : "Unavailable"}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Packages</Text>
          {service.packages.map((pkg) => (
            <View key={pkg.id} style={styles.packageCard}>
              <View style={styles.packageHeader}>
                <Text style={styles.packageName}>{pkg.name}</Text>
                <Text style={styles.packagePrice}>
                  ₱{pkg.price.toLocaleString()}
                </Text>
              </View>
              <Text style={styles.packageDescription}>{pkg.description}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location & Availability</Text>
          <View style={styles.infoRow}>
            <Ionicons name="location" size={20} color={Colors.light.blue600} />
            <Text style={styles.infoText}>Quezon City, Metro Manila</Text>
          </View>
          <View style={styles.daysRow}>
            <Text style={styles.daysLabel}>Available Days:</Text>
            <View style={styles.daysContainer}>
              {["Mon", "Tue", "Wed", "Thu", "Fri"].map((day) => (
                <View key={day} style={styles.dayChip}>
                  <Text style={styles.dayChipText}>{day}</Text>
                </View>
              ))}
              {["Sat", "Sun"].map((day) => (
                <View
                  key={day}
                  style={[styles.dayChip, styles.dayChipDisabled]}
                >
                  <Text style={styles.dayChipTextDisabled}>{day}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Certifications</Text>
          <View style={styles.placeholderContainer}>
            <Ionicons name="ribbon" size={32} color={Colors.light.gray300} />
            <Text style={styles.placeholderText}>
              No certifications added yet
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Images</Text>
          <View style={styles.imagesGrid}>
            {[1, 2, 3, 4].map((item) => (
              <View key={item} style={styles.imagePlaceholder}>
                <Ionicons
                  name="image-outline"
                  size={24}
                  color={Colors.light.gray300}
                />
              </View>
            ))}
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            isAvailable ? styles.deactivateButton : styles.activateButton,
          ]}
          onPress={handleToggleStatus}
        >
          <Text style={styles.toggleButtonText}>
            {isAvailable ? "Deactivate" : "Activate"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDeleteService}
        >
          <Text style={styles.deleteButtonText}>Delete Service</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.gray50,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  heroSection: {
    position: "relative",
    height: 200,
  },
  heroImage: {
    width: width,
    height: 200,
    backgroundColor: Colors.light.gray200,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  heroContent: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
  },
  backButton: {
    position: "absolute",
    top: -140,
    left: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.light.white,
    marginBottom: 8,
  },
  categoryBadge: {
    alignSelf: "flex-start",
    backgroundColor: Colors.light.yellow400,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.light.blue900,
  },
  infoCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.light.white,
    marginHorizontal: 16,
    marginTop: -24,
    padding: 16,
    borderRadius: 16,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.gray700,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.light.blue900,
    marginBottom: 12,
  },
  packageCard: {
    backgroundColor: Colors.light.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.light.gray200,
  },
  packageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  packageName: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.blue900,
  },
  packagePrice: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.light.green,
  },
  packageDescription: {
    fontSize: 14,
    color: Colors.light.gray600,
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.light.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: Colors.light.gray700,
  },
  daysRow: {
    backgroundColor: Colors.light.white,
    padding: 16,
    borderRadius: 12,
  },
  daysLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.gray700,
    marginBottom: 12,
  },
  daysContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  dayChip: {
    backgroundColor: Colors.light.green100,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  dayChipDisabled: {
    backgroundColor: Colors.light.gray100,
  },
  dayChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.light.green,
  },
  dayChipTextDisabled: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.light.gray400,
  },
  placeholderContainer: {
    backgroundColor: Colors.light.white,
    padding: 32,
    borderRadius: 12,
    alignItems: "center",
  },
  placeholderText: {
    fontSize: 14,
    color: Colors.light.gray400,
    marginTop: 8,
  },
  imagesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  imagePlaceholder: {
    width: (width - 56) / 2,
    height: 100,
    backgroundColor: Colors.light.gray100,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomPadding: {
    height: 100,
  },
  actionButtons: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    gap: 12,
    padding: 16,
    backgroundColor: Colors.light.white,
    borderTopWidth: 1,
    borderTopColor: Colors.light.gray100,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  activateButton: {
    backgroundColor: Colors.light.green,
  },
  deactivateButton: {
    backgroundColor: Colors.light.yellow400,
  },
  toggleButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.white,
  },
  deleteButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.red,
    alignItems: "center",
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.red,
  },
});
