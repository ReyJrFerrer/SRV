import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../../../constants/Colors";
import { mockDetailedBookings, BookingDetail } from "../../../mock/data";

export default function ReceiptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const booking: BookingDetail =
    mockDetailedBookings.find((b) => b.id === id) || mockDetailedBookings[0];

  const subtotal = booking.price;
  const serviceFee = Math.round(subtotal * 0.1);
  const total = subtotal + serviceFee;

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Ionicons
        key={i}
        name={i < rating ? "star" : "star-outline"}
        size={20}
        color={i < rating ? Colors.light.yellow : Colors.light.gray300}
      />
    ));
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.light.blue900} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Receipt</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.receiptCard}>
          <Text style={styles.receiptTitle}>Payment Receipt</Text>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Service</Text>
            <Text style={styles.detailValue}>{booking.serviceTitle}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Package</Text>
            <Text style={styles.detailValue}>{booking.packageName}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date & Time</Text>
            <Text style={styles.detailValue}>
              {booking.scheduledDate} at {booking.scheduledTime}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Duration</Text>
            <Text style={styles.detailValue}>{booking.duration}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Subtotal</Text>
            <Text style={styles.detailValue}>₱{subtotal.toLocaleString()}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Service Fee</Text>
            <Text style={styles.detailValue}>
              ₱{serviceFee.toLocaleString()}
            </Text>
          </View>

          <View style={[styles.detailRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>₱{total.toLocaleString()}</Text>
          </View>

          <View style={styles.paymentBadge}>
            <Ionicons
              name={
                booking.paymentMethod === "GCash" ? "phone-portrait" : "cash"
              }
              size={16}
              color={Colors.light.blue600}
            />
            <Text style={styles.paymentBadgeText}>{booking.paymentMethod}</Text>
          </View>
        </View>

        {booking.rated && booking.rating != null && (
          <View style={styles.ratingCard}>
            <Text style={styles.ratingLabel}>Your Rating</Text>
            <View style={styles.starsRow}>{renderStars(booking.rating)}</View>
          </View>
        )}

        <TouchableOpacity
          style={styles.shareButton}
          onPress={() => console.log("Share receipt", booking.id)}
        >
          <Ionicons
            name="share-outline"
            size={20}
            color={Colors.light.blue600}
          />
          <Text style={styles.shareButtonText}>Share Receipt</Text>
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
    backgroundColor: Colors.light.white,
    paddingHorizontal: 16,
    paddingVertical: 16,
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
    flex: 1,
    fontSize: 20,
    fontWeight: "800",
    color: Colors.light.blue900,
    textAlign: "center",
  },
  headerSpacer: {
    width: 40,
  },
  scrollContent: {
    padding: 16,
  },
  receiptCard: {
    backgroundColor: Colors.light.white,
    borderRadius: 16,
    padding: 20,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  receiptTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.light.blue900,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.light.gray200,
    marginVertical: 16,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.light.gray500,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.gray800,
    flex: 1,
    textAlign: "right",
  },
  totalRow: {
    marginTop: 4,
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.light.blue900,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.light.green,
  },
  paymentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    marginTop: 16,
    backgroundColor: Colors.light.blue50,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  paymentBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.light.blue600,
  },
  ratingCard: {
    backgroundColor: Colors.light.white,
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  ratingLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.gray600,
    marginBottom: 8,
  },
  starsRow: {
    flexDirection: "row",
    gap: 4,
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.blue600,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.blue600,
  },
  bottomPadding: {
    height: 40,
  },
});
