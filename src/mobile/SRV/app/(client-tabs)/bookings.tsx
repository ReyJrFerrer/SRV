import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../../constants/Colors";
import { Booking, mockBookings } from "../../mock/data";

export default function MyBookingsScreen() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase();
    if (s === "requested" || s === "pending")
      return { bg: Colors.light.yellow100, color: "#92400e" };
    if (s === "accepted" || s === "confirmed")
      return { bg: Colors.light.blue100, color: Colors.light.blue700 };
    if (s === "inprogress" || s === "in_progress")
      return { bg: Colors.light.green100, color: Colors.light.green };
    if (s === "completed")
      return { bg: Colors.light.green100, color: Colors.light.green };
    if (s === "cancelled" || s === "declined")
      return { bg: Colors.light.red100, color: Colors.light.red };
    return { bg: Colors.light.gray100, color: Colors.light.gray600 };
  };

  const filteredBookings = useMemo(() => {
    let filtered = [...mockBookings];

    if (statusFilter !== "All") {
      filtered = filtered.filter((b) => {
        const s = b.status?.toLowerCase();
        if (statusFilter === "Upcoming") {
          return s === "accepted" || s === "confirmed";
        }
        if (statusFilter === "Pending") {
          return s === "requested" || s === "pending";
        }
        if (statusFilter === "Completed") {
          return s === "completed";
        }
        if (statusFilter === "Cancelled") {
          return s === "cancelled" || s === "declined";
        }
        return true;
      });
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.serviceTitle?.toLowerCase().includes(q) ||
          b.clientName?.toLowerCase().includes(q),
      );
    }

    return filtered;
  }, [statusFilter, searchTerm]);

  const statusOptions = [
    "All",
    "Upcoming",
    "Pending",
    "Completed",
    "Cancelled",
  ];

  const renderBookingCard = (booking: Booking) => {
    const statusColors = getStatusColor(booking.status);
    const statusText =
      booking.status === "Requested"
        ? "Pending"
        : booking.status === "InProgress"
          ? "In Progress"
          : booking.status;

    return (
      <TouchableOpacity
        key={booking.id}
        style={styles.bookingCard}
        // @ts-ignore
        onPress={() => router.push(`/booking/${booking.id}`)}
      >
        <View style={styles.bookingHeader}>
          <View
            style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}
          >
            <Text style={[styles.statusText, { color: statusColors.color }]}>
              {statusText}
            </Text>
          </View>
          <Text style={styles.bookingId}>#{booking.id}</Text>
        </View>

        <Text style={styles.serviceTitle}>{booking.serviceTitle}</Text>

        <View style={styles.providerRow}>
          <View style={styles.providerAvatar}>
            <Text style={styles.providerInitial}>
              {booking.clientName?.charAt(0)}
            </Text>
          </View>
          <View style={styles.providerInfo}>
            <Text style={styles.providerName}>{booking.clientName}</Text>
            <Text style={styles.packageName}>{booking.packageName}</Text>
          </View>
        </View>

        <View style={styles.detailsSection}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar" size={16} color={Colors.light.gray500} />
            <Text style={styles.detailText}>
              {booking.scheduledDate} at {booking.scheduledTime}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="location" size={16} color={Colors.light.gray500} />
            <Text style={styles.detailText} numberOfLines={1}>
              {booking.location}
            </Text>
          </View>
        </View>

        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Total</Text>
          <Text style={styles.priceValue}>
            ₱{booking.price.toLocaleString()}
          </Text>
        </View>

        <View style={styles.actionsRow}>
          {booking.status === "Requested" && (
            <>
              <TouchableOpacity style={styles.cancelButton}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.detailsButton}
                // @ts-ignore
                onPress={() => router.push(`/booking/${booking.id}`)}
              >
                <Text style={styles.detailsButtonText}>View Details</Text>
              </TouchableOpacity>
            </>
          )}
          {booking.status === "Accepted" ||
            (booking.status === "Confirmed" && (
              <>
                <TouchableOpacity
                  style={styles.trackButton}
                  // @ts-ignore
                  onPress={() => router.push(`/tracking/${booking.id}`)}
                >
                  <Ionicons
                    name="navigate"
                    size={16}
                    color={Colors.light.white}
                  />
                  <Text style={styles.trackButtonText}>Track</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.chatButton}
                  // @ts-ignore
                  onPress={() => router.push("/chat/conv-1")}
                >
                  <Ionicons
                    name="chatbubbles"
                    size={16}
                    color={Colors.light.green}
                  />
                </TouchableOpacity>
              </>
            ))}
          {booking.status === "Completed" && (
            <TouchableOpacity
              style={styles.reviewButton}
              // @ts-ignore
              onPress={() => router.push(`/review/${booking.id}`)}
            >
              <Ionicons name="star" size={16} color={Colors.light.yellow} />
              <Text style={styles.reviewButtonText}>Leave Review</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Bookings</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={Colors.light.gray400} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search bookings..."
            placeholderTextColor={Colors.light.gray400}
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>
      </View>

      {/* Status Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.statusTabsContainer}
        contentContainerStyle={styles.statusTabs}
      >
        {statusOptions.map((status) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.statusTab,
              statusFilter === status && styles.statusTabActive,
            ]}
            onPress={() => setStatusFilter(status)}
          >
            <Text
              style={[
                styles.statusTabText,
                statusFilter === status && styles.statusTabTextActive,
              ]}
            >
              {status}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false}>
        {filteredBookings.length > 0 ? (
          <View style={styles.bookingsList}>
            {filteredBookings.map(renderBookingCard)}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons
              name="calendar-outline"
              size={64}
              color={Colors.light.gray300}
            />
            <Text style={styles.emptyTitle}>No bookings yet</Text>
            <Text style={styles.emptyText}>
              When you book a service, it will appear here.
            </Text>
            <TouchableOpacity style={styles.browseButton}>
              <Text style={styles.browseButtonText}>Browse Services</Text>
            </TouchableOpacity>
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
    backgroundColor: Colors.light.white,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.gray100,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.light.blue900,
  },
  searchContainer: {
    backgroundColor: Colors.light.white,
    paddingHorizontal: 16,
    paddingBottom: 12,
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
  statusTabsContainer: {
    backgroundColor: Colors.light.white,
  },
  statusTabs: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  statusTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.light.gray100,
  },
  statusTabActive: {
    backgroundColor: Colors.light.green,
  },
  statusTabText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.light.gray600,
  },
  statusTabTextActive: {
    color: Colors.light.white,
  },
  bookingsList: {
    padding: 16,
    gap: 16,
  },
  bookingCard: {
    backgroundColor: Colors.light.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  bookingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  bookingId: {
    fontSize: 12,
    color: Colors.light.gray500,
  },
  serviceTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.light.blue900,
    marginBottom: 12,
  },
  providerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  providerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.gray200,
    alignItems: "center",
    justifyContent: "center",
  },
  providerInitial: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.gray600,
  },
  providerInfo: {
    marginLeft: 12,
  },
  providerName: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.blue900,
  },
  packageName: {
    fontSize: 12,
    color: Colors.light.gray500,
  },
  detailsSection: {
    borderTopWidth: 1,
    borderTopColor: Colors.light.gray100,
    paddingTop: 12,
    gap: 8,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: Colors.light.gray600,
    flex: 1,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.light.gray100,
  },
  priceLabel: {
    fontSize: 14,
    color: Colors.light.gray600,
  },
  priceValue: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.light.green,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.red,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.red,
  },
  detailsButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.light.blue600,
    alignItems: "center",
  },
  detailsButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.white,
  },
  trackButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.light.green,
  },
  trackButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.white,
  },
  chatButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.green,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.light.yellow100,
  },
  reviewButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#92400e",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
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
    textAlign: "center",
  },
  browseButton: {
    marginTop: 20,
    backgroundColor: Colors.light.green,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  browseButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.light.white,
  },
  bottomPadding: {
    height: 100,
  },
});
