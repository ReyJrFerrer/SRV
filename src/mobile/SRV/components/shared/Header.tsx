import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { mockProfile } from "../../mock/data";
import { SvgXml } from "react-native-svg";
import { logoSvgString } from "./LogoSvgString";

interface HeaderProps {
  name?: string;
  location?: string;
  profileImageUrl?: string;
  onProfilePress?: () => void;
}

export default function Header({
  name,
  location,
  profileImageUrl,
  onProfilePress,
}: HeaderProps) {
  // Use mockProfile or provided name. Using full name or just first name depending on what is passed.
  // The web version uses name.split(" ")[0], but the mockProfile has "Juan dela Cruz", and the reference image says "Welcome Back, Juan dela Cruz". Let's use full name or whatever is passed.
  const displayName = name ?? mockProfile.name;
  const displayLocation = location ?? mockProfile.location;

  return (
    <View style={styles.container}>
      <View style={styles.topSection}>
        <View style={styles.headerRow}>
          <TouchableOpacity activeOpacity={0.7}>
            <View style={styles.logoContainer}>
              <SvgXml xml={logoSvgString} width="100%" height="100%" />
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onProfilePress}
            style={styles.profileButton}
            activeOpacity={0.7}
          >
            <Ionicons name="person-circle" size={48} color="#2563eb" />
          </TouchableOpacity>
        </View>
        <View style={styles.divider} />
        <View style={styles.welcomeRow}>
          <Text style={styles.welcomeText}>Welcome Back,</Text>
          <Text style={styles.nameText}>{displayName}</Text>
        </View>
      </View>

      <View style={styles.locationCard}>
        <TouchableOpacity style={styles.locationButton} activeOpacity={0.7}>
          <Ionicons name="location" size={24} color="#2563eb" />
          <Text style={styles.locationLabel}>My Location</Text>
        </TouchableOpacity>
        <Text style={styles.locationAddress}>{displayLocation}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: Platform.OS === "ios" ? 12 : 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderWidth: 1,
    borderColor: "#dbeafe", // blue-100
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  topSection: {
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logoContainer: {
    width: 64,
    height: 48,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  profileButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#fefce8", // light yellow/white gradient mix equivalent to match the icon background
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  divider: {
    height: 1,
    backgroundColor: "#dbeafe", // blue-100
    marginVertical: 16,
  },
  welcomeRow: {
    flexDirection: "row",
    alignItems: "baseline",
    flexWrap: "wrap",
    gap: 6,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1d4ed8", // blue-700
    letterSpacing: 0.5,
  },
  nameText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f2937", // gray-800
  },
  locationCard: {
    backgroundColor: "#fef08a", // yellow-200
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "#dbeafe", // blue-100
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  locationButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  locationLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937", // gray-800
    marginLeft: 8,
  },
  locationAddress: {
    fontSize: 14,
    color: "#1f2937", // gray-800
    marginLeft: 4,
  },
});
