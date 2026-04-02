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
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../../constants/Colors";
import { mockBookings } from "../../mock/data";

function formatCurrency(amount: number): string {
  return `₱${amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

export default function ActiveServiceScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const booking = mockBookings.find((b) => b.id === bookingId);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const formatElapsedTime = (minutes: number): string => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins} min`;
  };

  if (!booking) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorState}>
          <Ionicons
            name="alert-circle"
            size={64}
            color={Colors.light.gray300}
          />
          <Text style={styles.errorText}>Service not found</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleCompleteService = () => {
    router.push(`/complete-service/${booking.id}`);
  };

  const handleGetDirections = () => {
    router.push(`/directions/${booking.id}`);
  };

  const handleMessageClient = () => {
    if (booking.clientId) {
      router.push(`/chat/${booking.clientId}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Timer Banner */}
        <View style={styles.timerBanner}>
          <View style={styles.timerContent}>
            <Ionicons name="time" size={24} color={Colors.light.white} />
            <View style={styles.timerText}>
              <Text style={styles.timerLabel}>Service in Progress</Text>
              <Text style={styles.timerValue}>
                {formatElapsedTime(elapsedTime)}
              </Text>
            </View>
          </View>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>

        {/* Client Info */}
        <View style={styles.card}>
          <View style={styles.clientHeader}>
            <Image
              source={{
                uri: booking.clientImage || "https://i.pravatar.cc/150",
              }}
              style={styles.clientImage}
            />
            <View style={styles.clientInfo}>
              <Text style={styles.clientName}>{booking.clientName}</Text>
              <View style={styles.locationRow}>
                <Ionicons
                  name="location"
                  size={14}
                  color={Colors.light.gray500}
                />
                <Text style={styles.locationText}>{booking.location}</Text>
              </View>
            </View>
          </View>
          <View style={styles.clientActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleMessageClient}
            >
              <Ionicons
                name="chatbubble"
                size={20}
                color={Colors.light.blue600}
              />
              <Text style={styles.actionButtonText}>Message</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleGetDirections}
            >
              <Ionicons name="navigate" size={20} color={Colors.light.green} />
              <Text style={styles.actionButtonText}>Directions</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Service Details */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Service Details</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Service</Text>
            <Text style={styles.detailValue}>{booking.serviceTitle}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Package</Text>
            <Text style={styles.detailValue}>{booking.packageName}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Duration</Text>
            <Text style={styles.detailValue}>{booking.duration}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Scheduled</Text>
            <Text style={styles.detailValue}>
              {booking.scheduledDate} at {booking.scheduledTime}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Address</Text>
            <Text style={styles.detailValue}>
              {booking.address || booking.location}
            </Text>
          </View>
        </View>

        {/* Payment Summary */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Payment Summary</Text>

          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Service Fee</Text>
            <Text style={styles.paymentValue}>
              {formatCurrency(booking.price)}
            </Text>
          </View>

          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Your Commission (10%)</Text>
            <Text style={styles.commissionValue}>
              +{formatCurrency(booking.commission)}
            </Text>
          </View>

          <View style={styles.paymentDivider} />

          <View style={styles.paymentRow}>
            <Text style={styles.totalLabel}>Total to Collect</Text>
            <Text style={styles.totalValue}>
              {formatCurrency(booking.price)}
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.completeButton}
            onPress={handleCompleteService}
          >
            <Ionicons
              name="checkmark-circle"
              size={22}
              color={Colors.light.white}
            />
            <Text style={styles.completeButtonText}>Complete Service</Text>
          </TouchableOpacity>
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
  timerBanner: {
    backgroundColor: Colors.light.purple,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  timerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  timerText: {
    marginLeft: 12,
  },
  timerLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
  },
  timerValue: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.light.white,
    marginTop: 2,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.light.red,
    marginRight: 6,
  },
  liveText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.light.white,
  },
  card: {
    margin: 16,
    marginTop: 0,
    marginBottom: 0,
    backgroundColor: Colors.light.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  clientHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  clientImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  clientInfo: {
    flex: 1,
    marginLeft: 12,
  },
  clientName: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.light.blue900,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  locationText: {
    fontSize: 13,
    color: Colors.light.gray500,
    marginLeft: 4,
  },
  clientActions: {
    flexDirection: "row",
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.light.gray50,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.light.gray50,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.blue900,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.blue900,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.gray50,
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.light.gray500,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.light.blue900,
    flex: 1,
    textAlign: "right",
  },
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  paymentLabel: {
    fontSize: 14,
    color: Colors.light.gray500,
  },
  paymentValue: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.light.blue900,
  },
  commissionValue: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.green,
  },
  paymentDivider: {
    height: 1,
    backgroundColor: Colors.light.gray100,
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.blue900,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.light.green,
  },
  actionsContainer: {
    padding: 16,
    marginTop: 8,
  },
  completeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.light.green,
    borderRadius: 12,
    paddingVertical: 18,
    gap: 10,
  },
  completeButtonText: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.light.white,
  },
  errorState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  errorText: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.light.gray500,
    marginTop: 16,
  },
  backButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: Colors.light.blue600,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.white,
  },
  bottomPadding: {
    height: 40,
  },
});
