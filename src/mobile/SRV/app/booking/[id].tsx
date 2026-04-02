import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, router } from "expo-router";
import Colors from "../../constants/Colors";
import { mockDetailedBookings, BookingDetail } from "../../mock/data";

const PROGRESS_STEPS = ["Requested", "Confirmed", "InProgress", "Completed"];

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const booking: BookingDetail =
    mockDetailedBookings.find((b) => b.id === id) || mockDetailedBookings[0];

  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase();
    if (s === "completed") return Colors.light.green;
    if (s === "confirmed" || s === "accepted") return Colors.light.blue600;
    if (s === "pending" || s === "requested") return Colors.light.yellow;
    if (s === "inprogress" || s === "in_progress") return "#f97316";
    if (s === "cancelled" || s === "declined") return Colors.light.red;
    return Colors.light.gray500;
  };

  const getStatusBgColor = (status: string) => {
    const s = status?.toLowerCase();
    if (s === "completed") return Colors.light.green100;
    if (s === "confirmed" || s === "accepted") return Colors.light.blue100;
    if (s === "pending" || s === "requested") return Colors.light.yellow100;
    if (s === "inprogress" || s === "in_progress") return "#fff7ed";
    if (s === "cancelled" || s === "declined") return Colors.light.red100;
    return Colors.light.gray100;
  };

  const getStatusLabel = (status: string) => {
    const s = status?.toLowerCase();
    if (s === "inprogress" || s === "in_progress") return "In Progress";
    return status;
  };

  const getProgressIndex = (status: string) => {
    const s = status?.toLowerCase();
    if (s === "requested" || s === "pending") return 0;
    if (s === "confirmed" || s === "accepted") return 1;
    if (s === "inprogress" || s === "in_progress") return 2;
    if (s === "completed") return 3;
    return -1;
  };

  const progressIndex = getProgressIndex(booking.status);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            console.log("Navigate back");
            router.back();
          }}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.light.blue900} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Booking Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Service Card */}
        <View style={styles.card}>
          {booking.serviceImage && (
            <Image
              source={{ uri: booking.serviceImage }}
              style={styles.serviceImage}
            />
          )}
          <View style={styles.serviceInfo}>
            <Text style={styles.serviceTitle}>{booking.serviceTitle}</Text>
            <Text style={styles.packageName}>{booking.packageName}</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusBgColor(booking.status) },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: getStatusColor(booking.status) },
                ]}
              >
                {getStatusLabel(booking.status)}
              </Text>
            </View>
          </View>
        </View>

        {/* Provider Info Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Provider</Text>
          <View style={styles.providerRow}>
            {booking.providerImage ? (
              <Image
                source={{ uri: booking.providerImage }}
                style={styles.providerAvatar}
              />
            ) : (
              <View
                style={[
                  styles.providerAvatar,
                  styles.providerAvatarPlaceholder,
                ]}
              >
                <Text style={styles.providerInitial}>
                  {booking.providerName?.charAt(0)}
                </Text>
              </View>
            )}
            <View style={styles.providerInfo}>
              <Text style={styles.providerName}>{booking.providerName}</Text>
              <View style={styles.phoneRow}>
                <Ionicons
                  name="call-outline"
                  size={14}
                  color={Colors.light.gray500}
                />
                <Text style={styles.phoneText}>{booking.providerPhone}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.chatButton}
              onPress={() =>
                console.log("Chat with provider", booking.providerId)
              }
            >
              <Ionicons
                name="chatbubble-outline"
                size={18}
                color={Colors.light.blue600}
              />
              <Text style={styles.chatButtonText}>Chat</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Booking Details Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Booking Details</Text>

          <View style={styles.detailRow}>
            <Ionicons
              name="time-outline"
              size={20}
              color={Colors.light.gray500}
            />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Scheduled Date & Time</Text>
              <Text style={styles.detailValue}>
                {booking.scheduledDate} at {booking.scheduledTime}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Ionicons
              name="location-outline"
              size={20}
              color={Colors.light.gray500}
            />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Location</Text>
              <Text style={styles.detailValue}>{booking.location}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Ionicons
              name="hourglass-outline"
              size={20}
              color={Colors.light.gray500}
            />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Duration</Text>
              <Text style={styles.detailValue}>{booking.duration}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Ionicons
              name="card-outline"
              size={20}
              color={Colors.light.gray500}
            />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Payment Method</Text>
              <Text style={styles.detailValue}>{booking.paymentMethod}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Ionicons
              name="pricetag-outline"
              size={20}
              color={Colors.light.green}
            />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Price</Text>
              <Text style={styles.priceValue}>
                ₱{booking.price.toLocaleString()}
              </Text>
            </View>
          </View>

          {booking.notes && (
            <View style={styles.detailRow}>
              <Ionicons
                name="document-text-outline"
                size={20}
                color={Colors.light.gray500}
              />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Notes</Text>
                <Text style={styles.detailValue}>{booking.notes}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Progress Tracker */}
        {progressIndex >= 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Progress</Text>
            <View style={styles.progressContainer}>
              {PROGRESS_STEPS.map((step, index) => {
                const isCompleted = index <= progressIndex;
                const isCurrent = index === progressIndex;
                return (
                  <View key={step} style={styles.progressStep}>
                    <View style={styles.progressDotsRow}>
                      <View
                        style={[
                          styles.progressDot,
                          isCompleted && styles.progressDotActive,
                          isCurrent && styles.progressDotCurrent,
                        ]}
                      >
                        {isCompleted && (
                          <Ionicons
                            name="checkmark"
                            size={12}
                            color={Colors.light.white}
                          />
                        )}
                      </View>
                      {index < PROGRESS_STEPS.length - 1 && (
                        <View
                          style={[
                            styles.progressLine,
                            index < progressIndex && styles.progressLineActive,
                          ]}
                        />
                      )}
                    </View>
                    <Text
                      style={[
                        styles.progressLabel,
                        isCompleted && styles.progressLabelActive,
                      ]}
                    >
                      {step === "InProgress" ? "In Progress" : step}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {booking.status?.toLowerCase() === "completed" && !booking.rated && (
            <TouchableOpacity
              style={styles.rateButton}
              onPress={() => console.log("Rate provider", booking.id)}
            >
              <Ionicons name="star" size={20} color={Colors.light.white} />
              <Text style={styles.rateButtonText}>Rate Provider</Text>
            </TouchableOpacity>
          )}

          {booking.status?.toLowerCase() === "completed" && booking.rated && (
            <View style={styles.ratingDisplay}>
              <Text style={styles.ratingLabel}>Your Rating</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons
                    key={star}
                    name={
                      star <= (booking.rating || 0) ? "star" : "star-outline"
                    }
                    size={24}
                    color={Colors.light.yellow}
                  />
                ))}
              </View>
            </View>
          )}

          {(booking.status?.toLowerCase() === "pending" ||
            booking.status?.toLowerCase() === "requested" ||
            booking.status?.toLowerCase() === "confirmed") && (
            <TouchableOpacity
              style={styles.cancelBookingButton}
              onPress={() => console.log("Cancel booking", booking.id)}
            >
              <Text style={styles.cancelBookingButtonText}>Cancel Booking</Text>
            </TouchableOpacity>
          )}

          {(booking.status?.toLowerCase() === "inprogress" ||
            booking.status?.toLowerCase() === "in_progress") && (
            <TouchableOpacity
              style={styles.trackButton}
              onPress={() => console.log("Track provider", booking.id)}
            >
              <Ionicons name="navigate" size={20} color={Colors.light.white} />
              <Text style={styles.trackButtonText}>Track Provider</Text>
            </TouchableOpacity>
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
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.white,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.gray100,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: Colors.light.blue900,
    textAlign: "center",
  },
  headerSpacer: {
    width: 40,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  card: {
    backgroundColor: Colors.light.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  serviceImage: {
    width: "100%",
    height: 160,
    borderRadius: 12,
    marginBottom: 12,
  },
  serviceInfo: {
    gap: 4,
  },
  serviceTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.light.blue900,
  },
  packageName: {
    fontSize: 14,
    color: Colors.light.gray500,
    marginBottom: 4,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.blue900,
    marginBottom: 12,
  },
  providerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  providerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  providerAvatarPlaceholder: {
    backgroundColor: Colors.light.gray200,
    alignItems: "center",
    justifyContent: "center",
  },
  providerInitial: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.light.gray600,
  },
  providerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  providerName: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.blue900,
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  phoneText: {
    fontSize: 13,
    color: Colors.light.gray500,
  },
  chatButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.light.blue600,
  },
  chatButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.blue600,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.gray100,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: Colors.light.gray500,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.light.gray800,
  },
  priceValue: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.light.green,
  },
  progressContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressStep: {
    flex: 1,
    alignItems: "center",
  },
  progressDotsRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },
  progressDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.light.gray200,
    alignItems: "center",
    justifyContent: "center",
  },
  progressDotActive: {
    backgroundColor: Colors.light.green,
  },
  progressDotCurrent: {
    backgroundColor: Colors.light.green,
    borderWidth: 3,
    borderColor: Colors.light.green100,
  },
  progressLine: {
    flex: 1,
    height: 3,
    backgroundColor: Colors.light.gray200,
  },
  progressLineActive: {
    backgroundColor: Colors.light.green,
  },
  progressLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: Colors.light.gray400,
    marginTop: 6,
    textAlign: "center",
  },
  progressLabelActive: {
    color: Colors.light.green,
  },
  actionsContainer: {
    marginTop: 4,
  },
  rateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.light.green,
    paddingVertical: 14,
    borderRadius: 12,
  },
  rateButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.white,
  },
  ratingDisplay: {
    alignItems: "center",
    backgroundColor: Colors.light.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  ratingLabel: {
    fontSize: 14,
    color: Colors.light.gray500,
    marginBottom: 8,
  },
  starsRow: {
    flexDirection: "row",
    gap: 4,
  },
  cancelBookingButton: {
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.light.red,
    alignItems: "center",
  },
  cancelBookingButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.red,
  },
  trackButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.light.blue600,
    paddingVertical: 14,
    borderRadius: 12,
  },
  trackButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.white,
  },
  bottomPadding: {
    height: 40,
  },
});
