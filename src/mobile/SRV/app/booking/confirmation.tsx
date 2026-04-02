import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Colors from "../../constants/Colors";
import { mockDetailedBookings } from "../../mock/data";

export default function BookingConfirmationScreen() {
  const booking = mockDetailedBookings[0];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Success Animation Area */}
        <View style={styles.successArea}>
          <View style={styles.checkCircle}>
            <Ionicons
              name="checkmark-circle"
              size={80}
              color={Colors.light.green}
            />
          </View>
          <Text style={styles.successTitle}>Booking Confirmed!</Text>
          <Text style={styles.successSubtitle}>
            Your booking has been successfully created. The provider will
            confirm shortly.
          </Text>
        </View>

        {/* Booking Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            {booking.providerImage ? (
              <Image
                source={{ uri: booking.providerImage }}
                style={styles.providerAvatar}
              />
            ) : (
              <View style={[styles.providerAvatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarInitial}>
                  {booking.providerName?.charAt(0)}
                </Text>
              </View>
            )}
            <View style={styles.providerInfo}>
              <Text style={styles.providerName}>{booking.providerName}</Text>
              <Text style={styles.serviceLabel}>
                {booking.serviceTitle} - {booking.packageName}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailItem}>
            <Ionicons
              name="calendar-outline"
              size={18}
              color={Colors.light.gray500}
            />
            <Text style={styles.detailText}>
              {booking.scheduledDate} at {booking.scheduledTime}
            </Text>
          </View>

          <View style={styles.detailItem}>
            <Ionicons
              name="location-outline"
              size={18}
              color={Colors.light.gray500}
            />
            <Text style={styles.detailText}>{booking.location}</Text>
          </View>

          <View style={styles.detailItem}>
            <Ionicons
              name="card-outline"
              size={18}
              color={Colors.light.gray500}
            />
            <Text style={styles.detailText}>{booking.paymentMethod}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Total</Text>
            <Text style={styles.priceValue}>
              ₱{booking.price.toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.viewDetailsButton}
            onPress={() => {
              console.log("Navigate to booking detail", booking.id);
              router.push(`/booking/${booking.id}`);
            }}
          >
            <Text style={styles.viewDetailsButtonText}>
              View Booking Details
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.homeButton}
            onPress={() => {
              console.log("Navigate to home");
              router.push("/(client-tabs)");
            }}
          >
            <Text style={styles.homeButtonText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.white,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  successArea: {
    alignItems: "center",
    marginBottom: 32,
  },
  checkCircle: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.light.blue900,
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 14,
    color: Colors.light.gray500,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  summaryCard: {
    backgroundColor: Colors.light.gray50,
    borderRadius: 16,
    padding: 16,
    marginBottom: 32,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  providerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.light.gray200,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.gray600,
  },
  providerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  providerName: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.blue900,
  },
  serviceLabel: {
    fontSize: 13,
    color: Colors.light.gray500,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.light.gray200,
    marginVertical: 12,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  detailText: {
    fontSize: 14,
    color: Colors.light.gray700,
    flex: 1,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.gray600,
  },
  priceValue: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.light.green,
  },
  actions: {
    gap: 12,
  },
  viewDetailsButton: {
    backgroundColor: Colors.light.green,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  viewDetailsButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.white,
  },
  homeButton: {
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.light.gray300,
    alignItems: "center",
  },
  homeButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.gray700,
  },
});
