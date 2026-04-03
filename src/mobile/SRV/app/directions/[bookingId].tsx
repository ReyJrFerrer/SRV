import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Dimensions,
  Platform,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../../constants/Colors";
import { mockDirectionsBooking } from "../../mock/data";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function DirectionsScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const booking = mockDirectionsBooking;
  const [inNavigation, setInNavigation] = useState(false);
  const [followMe, setFollowMe] = useState(false);

  const handleStartService = () => {
    // @ts-ignore
    router.push(`/active-service/${booking.bookingId}`);
  };

  const handleCallClient = () => {
    Alert.alert("Calling Client", `Calling ${booking.clientPhone}...`);
  };

  const handleMessageClient = () => {
    // @ts-ignore
    router.push(`/chat/${booking.bookingId}`);
  };

  if (inNavigation) {
    return (
      <View style={styles.mapContainer}>
        {/* Mock Map Background */}
        <View style={styles.mockMap}>
          <Ionicons name="map" size={80} color={Colors.light.gray300} />
          <Text style={styles.mockMapText}>Map View</Text>
        </View>

        {/* Navigation Overlay */}
        <View style={styles.navOverlay}>
          <View style={styles.navCard}>
            <View style={styles.navInfo}>
              <Text style={styles.navDestination}>
                {booking.location.address}
              </Text>
              <View style={styles.navRow}>
                <Ionicons name="time" size={14} color={Colors.light.gray500} />
                <Text style={styles.navTime}>12 min away</Text>
                <Ionicons
                  name="car-sport"
                  size={14}
                  color={Colors.light.gray500}
                  style={{ marginLeft: 12 }}
                />
                <Text style={styles.navDistance}>4.2 km</Text>
              </View>
            </View>
          </View>

          {/* Navigation Controls */}
          <View style={styles.navControls}>
            <TouchableOpacity style={styles.controlButton}>
              <Ionicons
                name="locate"
                size={24}
                color={followMe ? Colors.light.blue600 : Colors.light.gray600}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => setInNavigation(false)}
            >
              <Ionicons name="close" size={24} color={Colors.light.gray600} />
            </TouchableOpacity>
          </View>

          {/* Bottom Action */}
          <View style={styles.navBottom}>
            <TouchableOpacity
              style={styles.endNavButton}
              onPress={() => setInNavigation(false)}
            >
              <Text style={styles.endNavText}>End Navigation</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

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
        <Text style={styles.headerTitle}>Directions</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Map Area */}
      <View style={styles.mapSection}>
        <View style={styles.mockMap}>
          <Ionicons name="map" size={64} color={Colors.light.gray300} />
          <Text style={styles.mapLabel}>Map View</Text>
          <Text style={styles.mapAddress}>{booking.location.address}</Text>
        </View>

        {/* Route Info */}
        <View style={styles.routeCard}>
          <View style={styles.routeRow}>
            <View style={styles.routeDot}>
              <Ionicons name="location" size={16} color={Colors.light.green} />
            </View>
            <View style={styles.routeLine}>
              <View style={styles.routeLineDot} />
              <View style={styles.routeLineDot} />
            </View>
            <View style={styles.routeDot}>
              <Ionicons name="flag" size={16} color={Colors.light.blue600} />
            </View>
          </View>
          <View style={styles.routeInfo}>
            <View>
              <Text style={styles.routeLabel}>Distance</Text>
              <Text style={styles.routeValue}>4.2 km</Text>
            </View>
            <View>
              <Text style={styles.routeLabel}>Est. Time</Text>
              <Text style={styles.routeValue}>12 min</Text>
            </View>
            <View>
              <Text style={styles.routeLabel}>Traffic</Text>
              <Text style={[styles.routeValue, { color: Colors.light.green }]}>
                Light
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Booking Details */}
      <View style={styles.detailsCard}>
        <View style={styles.detailsHeader}>
          <Text style={styles.detailsTitle}>Booking Details</Text>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  booking.status === "Accepted"
                    ? Colors.light.green50
                    : Colors.light.yellow100,
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                {
                  color:
                    booking.status === "Accepted"
                      ? Colors.light.green
                      : Colors.light.yellow400,
                },
              ]}
            >
              {booking.status}
            </Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <View style={styles.detailIcon}>
            <Ionicons
              name="person-circle-outline"
              size={20}
              color={Colors.light.blue600}
            />
          </View>
          <View style={styles.detailInfo}>
            <Text style={styles.detailLabel}>Client</Text>
            <Text style={styles.detailValue}>{booking.clientName}</Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <View style={styles.detailIcon}>
            <Ionicons
              name="briefcase-outline"
              size={20}
              color={Colors.light.blue600}
            />
          </View>
          <View style={styles.detailInfo}>
            <Text style={styles.detailLabel}>Service</Text>
            <Text style={styles.detailValue}>
              {booking.serviceTitle} - {booking.packageName}
            </Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <View style={styles.detailIcon}>
            <Ionicons
              name="calendar-outline"
              size={20}
              color={Colors.light.blue600}
            />
          </View>
          <View style={styles.detailInfo}>
            <Text style={styles.detailLabel}>Scheduled</Text>
            <Text style={styles.detailValue}>
              {booking.scheduledDate} at {booking.scheduledTime}
            </Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <View style={styles.detailIcon}>
            <Ionicons
              name="cash-outline"
              size={20}
              color={Colors.light.blue600}
            />
          </View>
          <View style={styles.detailInfo}>
            <Text style={styles.detailLabel}>Price</Text>
            <Text style={styles.detailValue}>
              ₱{booking.price.toLocaleString()} ({booking.paymentMethod})
            </Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleCallClient}
        >
          <Ionicons
            name="call-outline"
            size={22}
            color={Colors.light.blue600}
          />
          <Text style={styles.actionText}>Call</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleMessageClient}
        >
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={22}
            color={Colors.light.blue600}
          />
          <Text style={styles.actionText}>Message</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setInNavigation(true)}
        >
          <Ionicons
            name="navigate-outline"
            size={22}
            color={Colors.light.blue600}
          />
          <Text style={styles.actionText}>Navigate</Text>
        </TouchableOpacity>
      </View>

      {/* Start Service */}
      <TouchableOpacity style={styles.startButton} onPress={handleStartService}>
        <Ionicons name="play" size={22} color={Colors.light.white} />
        <Text style={styles.startButtonText}>Start Service</Text>
      </TouchableOpacity>
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
  mapSection: {
    height: 260,
    position: "relative",
  },
  mockMap: {
    flex: 1,
    backgroundColor: Colors.light.gray100,
    alignItems: "center",
    justifyContent: "center",
  },
  mapLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.gray500,
    marginTop: 8,
  },
  mapAddress: {
    fontSize: 12,
    color: Colors.light.gray400,
    marginTop: 4,
  },
  mockMapText: {
    marginTop: 8,
  },
  routeCard: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: Colors.light.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  routeDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.light.gray100,
    alignItems: "center",
    justifyContent: "center",
  },
  routeLine: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 4,
  },
  routeLineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.light.gray300,
    marginVertical: 2,
  },
  routeInfo: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  routeLabel: {
    fontSize: 11,
    color: Colors.light.gray500,
    textAlign: "center",
  },
  routeValue: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.light.blue900,
    textAlign: "center",
  },
  detailsCard: {
    backgroundColor: Colors.light.white,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  detailsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.blue900,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  detailIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.light.blue50,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  detailInfo: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: Colors.light.gray500,
    fontWeight: "500",
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.blue900,
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 16,
    gap: 10,
  },
  actionButton: {
    flex: 1,
    alignItems: "center",
    backgroundColor: Colors.light.white,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.gray200,
  },
  actionText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.light.blue600,
    marginTop: 4,
  },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.light.green,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 24,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  startButtonText: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.light.white,
  },
  mapContainer: {
    flex: 1,
    backgroundColor: Colors.light.gray100,
  },
  navOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "space-between",
    padding: 16,
    paddingTop: 50,
  },
  navCard: {
    backgroundColor: Colors.light.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  navInfo: {
    gap: 4,
  },
  navDestination: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.blue900,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  navTime: {
    fontSize: 13,
    color: Colors.light.gray500,
  },
  navDistance: {
    fontSize: 13,
    color: Colors.light.gray500,
  },
  navControls: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.light.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  navBottom: {
    alignItems: "center",
  },
  endNavButton: {
    backgroundColor: Colors.light.white,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  endNavText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.light.red,
  },
});
