import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../../constants/Colors";
import { mockTrackingData, mockDetailedBookings } from "../../mock/data";

let MapView: any = null;
let Marker: any = null;
let mapAvailable = false;

try {
  const maps = require("react-native-maps");
  MapView = maps.default || maps.MapView;
  Marker = maps.Marker;
  mapAvailable = true;
} catch {
  mapAvailable = false;
}

const tracking = mockTrackingData;
const booking = mockDetailedBookings[2];

const statusConfig: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  traveling: {
    label: "On The Way",
    color: Colors.light.blue600,
    bgColor: Colors.light.blue50,
  },
  arrived: {
    label: "Arrived",
    color: Colors.light.green,
    bgColor: Colors.light.green50,
  },
  in_progress: {
    label: "In Progress",
    color: "#f59e0b",
    bgColor: "#fffbeb",
  },
};

const currentStatus = statusConfig[tracking.status] || statusConfig.traveling;

const region = {
  latitude: (tracking.latitude + tracking.destinationLatitude) / 2,
  longitude: (tracking.longitude + tracking.destinationLongitude) / 2,
  latitudeDelta:
    Math.abs(tracking.latitude - tracking.destinationLatitude) * 2 + 0.01,
  longitudeDelta:
    Math.abs(tracking.longitude - tracking.destinationLongitude) * 2 + 0.01,
};

export default function TrackingScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();

  const renderMap = () => {
    if (mapAvailable && MapView) {
      return (
        <MapView style={styles.map} initialRegion={region}>
          <Marker
            coordinate={{
              latitude: tracking.latitude,
              longitude: tracking.longitude,
            }}
            title="Provider"
            description={tracking.providerName}
          >
            <View style={styles.providerMarker}>
              <Ionicons name="person" size={18} color={Colors.light.white} />
            </View>
          </Marker>
          <Marker
            coordinate={{
              latitude: tracking.destinationLatitude,
              longitude: tracking.destinationLongitude,
            }}
            title="Destination"
            description={booking.address}
          >
            <View style={styles.destinationMarker}>
              <Ionicons name="location" size={18} color={Colors.light.white} />
            </View>
          </Marker>
        </MapView>
      );
    }

    return (
      <View style={styles.mapPlaceholder}>
        <View style={styles.mapPlaceholderInner}>
          <Ionicons name="map-outline" size={64} color={Colors.light.gray300} />
          <Text style={styles.mapPlaceholderTitle}>Live Tracking Map</Text>
          <Text style={styles.mapPlaceholderCoords}>
            Provider: {tracking.latitude.toFixed(4)},{" "}
            {tracking.longitude.toFixed(4)}
          </Text>
          <Text style={styles.mapPlaceholderCoords}>
            Destination: {tracking.destinationLatitude.toFixed(4)},{" "}
            {tracking.destinationLongitude.toFixed(4)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {renderMap()}

      {/* Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color={Colors.light.blue900} />
      </TouchableOpacity>

      {/* Tracking Info Card */}
      <View style={styles.trackingCard}>
        {/* Provider Info */}
        <View style={styles.providerRow}>
          <Image
            source={{ uri: tracking.providerImage }}
            style={styles.providerAvatar}
          />
          <View style={styles.providerInfo}>
            <Text style={styles.providerName}>{tracking.providerName}</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: currentStatus.bgColor },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: currentStatus.color },
                ]}
              />
              <Text style={[styles.statusText, { color: currentStatus.color }]}>
                {currentStatus.label}
              </Text>
            </View>
          </View>
        </View>

        {/* ETA and Distance */}
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Ionicons
              name="time-outline"
              size={18}
              color={Colors.light.blue600}
            />
            <Text style={styles.infoText}>ETA: {tracking.eta}</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons
              name="navigate-outline"
              size={18}
              color={Colors.light.blue600}
            />
            <Text style={styles.infoText}>{tracking.distance} away</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.chatButton}
            onPress={() => router.push("/chat/conv-1")}
          >
            <Ionicons name="chatbubble" size={18} color={Colors.light.white} />
            <Text style={styles.chatButtonText}>Chat</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.outlineButton}
            onPress={() => console.log("Call pressed")}
          >
            <Ionicons name="call" size={18} color={Colors.light.blue600} />
            <Text style={styles.outlineButtonText}>Call</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.outlineButton}
            onPress={() => console.log("Recenter pressed")}
          >
            <Ionicons name="locate" size={18} color={Colors.light.blue600} />
            <Text style={styles.outlineButtonText}>Recenter</Text>
          </TouchableOpacity>
        </View>

        {/* Booking Context */}
        <View style={styles.bookingContext}>
          <Text style={styles.bookingService}>{booking.serviceTitle}</Text>
          <Text style={styles.bookingPackage}>{booking.packageName}</Text>
          <Text style={styles.bookingLocation}>
            <Ionicons
              name="location-outline"
              size={13}
              color={Colors.light.gray500}
            />{" "}
            {booking.location}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.gray100,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.light.gray100,
    alignItems: "center",
    justifyContent: "center",
  },
  mapPlaceholderInner: {
    backgroundColor: Colors.light.white,
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    marginHorizontal: 40,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  mapPlaceholderTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.light.blue900,
    marginTop: 12,
  },
  mapPlaceholderCoords: {
    fontSize: 13,
    color: Colors.light.gray500,
    marginTop: 6,
  },
  backButton: {
    position: "absolute",
    top: Platform.OS === "ios" ? 56 : 16,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.light.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  trackingCard: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.light.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === "ios" ? 36 : 20,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  providerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  providerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: Colors.light.gray200,
  },
  providerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  providerName: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.light.blue900,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "600",
  },
  infoRow: {
    flexDirection: "row",
    gap: 24,
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.light.gray50,
    borderRadius: 12,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.gray700,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  chatButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.light.blue600,
    paddingVertical: 12,
    borderRadius: 12,
  },
  chatButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.light.white,
  },
  outlineButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.light.white,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.light.blue600,
  },
  outlineButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.light.blue600,
  },
  bookingContext: {
    borderTopWidth: 1,
    borderTopColor: Colors.light.gray100,
    paddingTop: 12,
  },
  bookingService: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.blue900,
  },
  bookingPackage: {
    fontSize: 13,
    color: Colors.light.gray600,
    marginTop: 2,
  },
  bookingLocation: {
    fontSize: 13,
    color: Colors.light.gray500,
    marginTop: 4,
  },
  providerMarker: {
    backgroundColor: Colors.light.blue600,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: Colors.light.white,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  destinationMarker: {
    backgroundColor: Colors.light.red500,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: Colors.light.white,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
