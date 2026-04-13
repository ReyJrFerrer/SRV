import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../../constants/Colors";
import BookingItemCard from "../../components/provider/BookingItemCard";
import { mockBookings, Booking } from "../../mock/data";

type BookingTimingFilter = "Same Day" | "Scheduled";
type BookingStatusFilter =
  | "All"
  | "Requested"
  | "Accepted"
  | "InProgress"
  | "Completed"
  | "Cancelled";

export default function MyBookingsScreen() {
  const [searchTerm, setSearchTerm] = useState("");
  const [timingFilter, setTimingFilter] =
    useState<BookingTimingFilter>("Scheduled");
  const [statusFilter, setStatusFilter] = useState<BookingStatusFilter>("All");

  const getStatusPriority = (status: string) => {
    const s = status.toLowerCase();
    if (s === "inprogress") return 0;
    if (s === "requested") return 1;
    if (s === "accepted" || s === "confirmed") return 2;
    if (s === "completed") return 3;
    if (s === "cancelled" || s === "declined") return 4;
    return 5;
  };

  const filteredBookings = useMemo(() => {
    let filtered = [...mockBookings];

    if (statusFilter !== "All") {
      filtered = filtered.filter((b) => {
        if (statusFilter === "Requested") {
          return b.status === "Requested";
        }
        if (statusFilter === "Accepted") {
          return b.status === "Accepted";
        }
        if (statusFilter === "InProgress") {
          return b.status === "InProgress";
        }
        return b.status.toLowerCase() === statusFilter.toLowerCase();
      });
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.serviceTitle.toLowerCase().includes(q) ||
          b.clientName.toLowerCase().includes(q) ||
          b.packageName.toLowerCase().includes(q) ||
          b.location.toLowerCase().includes(q),
      );
    }

    filtered.sort((a, b) => {
      const priorityA = getStatusPriority(a.status);
      const priorityB = getStatusPriority(b.status);
      if (priorityA !== priorityB) return priorityA - priorityB;
      const dateA = new Date(a.scheduledDate).getTime();
      const dateB = new Date(b.scheduledDate).getTime();
      return dateA - dateB;
    });

    return filtered;
  }, [statusFilter, searchTerm]);

  const { sameDayBookings, scheduledBookings } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sameDay: Booking[] = [];
    const scheduled: Booking[] = [];

    filteredBookings.forEach((b) => {
      const bookingDate = new Date(b.scheduledDate);
      if (isNaN(bookingDate.getTime())) {
        scheduled.push(b);
        return;
      }
      const day = new Date(bookingDate);
      day.setHours(0, 0, 0, 0);

      if (day.getTime() === today.getTime()) {
        sameDay.push(b);
      } else {
        scheduled.push(b);
      }
    });

    scheduled.sort(
      (a, b) =>
        new Date(a.scheduledDate).getTime() -
        new Date(b.scheduledDate).getTime(),
    );

    return { sameDayBookings: sameDay, scheduledBookings: scheduled };
  }, [filteredBookings]);

  const handleBookingPress = (bookingId: string) => {
    // @ts-ignore
    router.push(`/booking/${bookingId}`);
  };

  const statusChips: { label: string; value: BookingStatusFilter }[] = [
    { label: "All", value: "All" },
    { label: "Pending", value: "Requested" },
    { label: "Confirmed", value: "Accepted" },
    { label: "In Progress", value: "InProgress" },
    { label: "Completed", value: "Completed" },
    { label: "Cancelled", value: "Cancelled" },
  ];

  const renderStatusChip = (chip: {
    label: string;
    value: BookingStatusFilter;
  }) => {
    const isSelected = statusFilter === chip.value;
    return (
      <TouchableOpacity
        key={chip.value}
        style={[styles.chip, isSelected && styles.chipSelected]}
        onPress={() => setStatusFilter(chip.value)}
      >
        <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
          {chip.label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderBookingList = (bookings: Booking[], isSameDay: boolean) => {
    if (bookings.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            No bookings found with the current filters.
          </Text>
        </View>
      );
    }

    return (
      <View
        style={[styles.bookingList, isSameDay && styles.sameDayBookingList]}
      >
        {bookings.map((booking) => (
          <BookingItemCard
            key={booking.id}
            booking={booking}
            onPress={() => handleBookingPress(booking.id)}
          />
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Bookings</Text>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons
              name="search"
              size={20}
              color={Colors.light.gray400}
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search bookings..."
              placeholderTextColor={Colors.light.gray400}
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
            {searchTerm.length > 0 && (
              <TouchableOpacity onPress={() => setSearchTerm("")}>
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={Colors.light.gray400}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              timingFilter === "Same Day" && styles.toggleButtonActive,
            ]}
            onPress={() => setTimingFilter("Same Day")}
          >
            <Ionicons
              name="time"
              size={16}
              color={
                timingFilter === "Same Day"
                  ? Colors.light.white
                  : Colors.light.gray600
              }
            />
            <Text
              style={[
                styles.toggleText,
                timingFilter === "Same Day" && styles.toggleTextActive,
              ]}
            >
              Same Day
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              timingFilter === "Scheduled" && styles.toggleButtonActiveBlue,
            ]}
            onPress={() => setTimingFilter("Scheduled")}
          >
            <Ionicons
              name="calendar"
              size={16}
              color={
                timingFilter === "Scheduled"
                  ? Colors.light.white
                  : Colors.light.gray600
              }
            />
            <Text
              style={[
                styles.toggleText,
                timingFilter === "Scheduled" && styles.toggleTextActiveBlue,
              ]}
            >
              Scheduled
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipContainer}
          contentContainerStyle={styles.chipContent}
        >
          {statusChips.map(renderStatusChip)}
        </ScrollView>

        <View style={styles.content}>
          {timingFilter === "Same Day" && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons
                  name="sparkles"
                  size={20}
                  color={Colors.light.yellow400}
                />
                <Text style={styles.sectionTitle}>Same Day Bookings</Text>
              </View>
              {renderBookingList(sameDayBookings, true)}
            </View>
          )}

          {timingFilter === "Scheduled" && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons
                  name="calendar"
                  size={20}
                  color={Colors.light.blue600}
                />
                <Text style={styles.sectionTitleBlue}>Scheduled Bookings</Text>
              </View>
              {renderBookingList(scheduledBookings, false)}
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
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.light.blue900,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.white,
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
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.light.gray800,
  },
  toggleContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  toggleButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.light.white,
    borderWidth: 1,
    borderColor: Colors.light.gray200,
    gap: 8,
  },
  toggleButtonActive: {
    backgroundColor: Colors.light.yellow400,
    borderColor: Colors.light.yellow400,
  },
  toggleButtonActiveBlue: {
    backgroundColor: Colors.light.blue600,
    borderColor: Colors.light.blue600,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.light.gray600,
  },
  toggleTextActive: {
    color: Colors.light.white,
  },
  toggleTextActiveBlue: {
    color: Colors.light.white,
  },
  chipContainer: {
    marginBottom: 8,
  },
  chipContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.light.white,
    borderWidth: 1,
    borderColor: Colors.light.gray200,
  },
  chipSelected: {
    backgroundColor: Colors.light.blue600,
    borderColor: Colors.light.blue600,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.light.gray600,
  },
  chipTextSelected: {
    color: Colors.light.white,
  },
  content: {
    paddingHorizontal: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#92400e",
  },
  sectionTitleBlue: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.light.blue700,
  },
  sameDayBookingList: {
    backgroundColor: Colors.light.yellow50,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.light.yellow200,
  },
  bookingList: {
    backgroundColor: Colors.light.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.light.blue100,
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 15,
    color: Colors.light.gray500,
    textAlign: "center",
  },
  bottomPadding: {
    height: 100,
  },
});
