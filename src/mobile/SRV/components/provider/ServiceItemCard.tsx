import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../../constants/Colors";
import { Service } from "../../mock/data";

interface ServiceItemCardProps {
  service: Service;
  onPress?: () => void;
  onToggleStatus?: () => void;
  onDelete?: () => void;
  hasActiveBookings?: boolean;
}

export default function ServiceItemCard({
  service,
  onPress,
  onToggleStatus,
  onDelete,
  hasActiveBookings = false,
}: ServiceItemCardProps) {
  const isActive = service.status === "Available";

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{
            uri:
              service.imageUrl ||
              "https://images.unsplash.com/photo-1581578731548-c64695b69535?w=200",
          }}
          style={styles.image}
        />
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: isActive
                ? Colors.light.green100
                : Colors.light.gray100,
            },
          ]}
        >
          <Text
            style={{
              fontSize: 10,
              fontWeight: "700",
              color: isActive ? Colors.light.green : Colors.light.gray600,
            }}
          >
            {isActive ? "ACTIVE" : "INACTIVE"}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {service.title}
        </Text>

        <View style={styles.ratingRow}>
          <Ionicons name="star" size={14} color={Colors.light.yellow} />
          <Text style={styles.ratingText}>
            {service.rating} / 5{" "}
            <Text style={styles.reviewCount}>({service.reviewCount})</Text>
          </Text>
        </View>

        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>From</Text>
          <Text style={styles.priceValue}>
            ₱
            {Math.min(...service.packages.map((p) => p.price)).toLocaleString()}
          </Text>
        </View>

        <View style={styles.categoryRow}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{service.category}</Text>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            isActive ? styles.deactivateButton : styles.activateButton,
          ]}
          onPress={onToggleStatus}
          disabled={hasActiveBookings}
        >
          <Text style={styles.toggleButtonText}>
            {isActive ? "Deactivate" : "Activate"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={onDelete}
          disabled={hasActiveBookings}
        >
          <Ionicons name="trash" size={16} color={Colors.light.red} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.light.white,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 16,
  },
  imageContainer: {
    position: "relative",
    height: 120,
  },
  image: {
    width: "100%",
    height: "100%",
    backgroundColor: Colors.light.gray100,
  },
  statusBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  content: {
    padding: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.light.blue900,
    marginBottom: 6,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 6,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.light.blue900,
  },
  reviewCount: {
    color: Colors.light.gray500,
    fontWeight: "400",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 6,
  },
  priceLabel: {
    fontSize: 12,
    color: Colors.light.gray500,
  },
  priceValue: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.light.green,
  },
  categoryRow: {
    flexDirection: "row",
  },
  categoryBadge: {
    backgroundColor: Colors.light.yellow100,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.light.gray700,
  },
  actions: {
    flexDirection: "row",
    padding: 12,
    paddingTop: 0,
    gap: 8,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  activateButton: {
    backgroundColor: Colors.light.green,
  },
  deactivateButton: {
    backgroundColor: Colors.light.yellow400,
  },
  toggleButtonText: {
    color: Colors.light.white,
    fontWeight: "700",
    fontSize: 13,
  },
  deleteButton: {
    width: 40,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.red,
    alignItems: "center",
    justifyContent: "center",
  },
});
