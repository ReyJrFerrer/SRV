import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../../constants/Colors";
import { Booking } from "../../mock/data";

interface BookingItemCardProps {
  booking: Booking;
  onPress?: () => void;
  onChatPress?: () => void;
}

const getStatusStyle = (status: Booking["status"]) => {
  switch (status) {
    case "Requested":
      return { bg: Colors.light.yellow100, color: "#92400e", text: "Pending" };
    case "Accepted":
      return {
        bg: Colors.light.blue50,
        color: Colors.light.blue600,
        text: "Confirmed",
      };
    case "InProgress":
      return {
        bg: Colors.light.green100,
        color: Colors.light.green,
        text: "In Progress",
      };
    case "Completed":
      return {
        bg: Colors.light.green500,
        color: Colors.light.white,
        text: "Completed",
      };
    case "Cancelled":
      return {
        bg: Colors.light.red100,
        color: Colors.light.red600,
        text: "Cancelled",
      };
    default:
      return {
        bg: Colors.light.gray100,
        color: Colors.light.gray600,
        text: status,
      };
  }
};

export default function BookingItemCard({
  booking,
  onPress,
  onChatPress,
}: BookingItemCardProps) {
  const statusStyle = getStatusStyle(booking.status);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <Image
          source={{ uri: booking.clientImage || "https://i.pravatar.cc/100" }}
          style={styles.avatar}
        />
        <View style={styles.headerInfo}>
          <Text style={styles.clientName}>{booking.clientName}</Text>
          <Text style={styles.serviceTitle}>{booking.serviceTitle}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
          <Text style={[styles.statusText, { color: statusStyle.color }]}>
            {statusStyle.text}
          </Text>
        </View>
      </View>

      <View style={styles.details}>
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
        <View style={styles.detailRow}>
          <Ionicons name="cash" size={16} color={Colors.light.gray500} />
          <Text style={styles.detailText}>
            ₱{booking.price.toLocaleString()} · {booking.packageName}
          </Text>
        </View>
      </View>

      {booking.status === "Requested" && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.acceptButton}>
            <Text style={styles.acceptButtonText}>Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.declineButton}>
            <Text style={styles.declineButtonText}>Decline</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.chatButton} onPress={onChatPress}>
            <Ionicons
              name="chatbubbles"
              size={20}
              color={Colors.light.blue600}
            />
          </TouchableOpacity>
        </View>
      )}

      {(booking.status === "Accepted" || booking.status === "InProgress") && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.startButton}>
            <Text style={styles.startButtonText}>Start Service</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.chatButton} onPress={onChatPress}>
            <Ionicons
              name="chatbubbles"
              size={20}
              color={Colors.light.blue600}
            />
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.light.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.blue900,
  },
  serviceTitle: {
    fontSize: 13,
    color: Colors.light.indigo,
    fontWeight: "600",
    marginTop: 2,
    textTransform: "uppercase",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  details: {
    borderTopWidth: 1,
    borderTopColor: Colors.light.gray100,
    paddingTop: 12,
    gap: 6,
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
  actions: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.light.gray100,
    gap: 8,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: Colors.light.green,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  acceptButtonText: {
    color: Colors.light.white,
    fontWeight: "700",
    fontSize: 14,
  },
  declineButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.light.red,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  declineButtonText: {
    color: Colors.light.red,
    fontWeight: "700",
    fontSize: 14,
  },
  startButton: {
    flex: 1,
    backgroundColor: Colors.light.blue600,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  startButtonText: {
    color: Colors.light.white,
    fontWeight: "700",
    fontSize: 14,
  },
  chatButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.blue600,
    alignItems: "center",
    justifyContent: "center",
  },
});
