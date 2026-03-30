import React from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../../constants/Colors";

interface ProviderHeaderProps {
  name?: string;
  location?: string;
  profileImageUrl?: string;
  onProfilePress?: () => void;
}

export default function ProviderHeader({
  name = "Provider",
  location = "Metro Manila",
  profileImageUrl,
  onProfilePress,
}: ProviderHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.topSection}>
        <View style={styles.brandSection}>
          <View style={styles.logoContainer}>
            <Ionicons name="construct" size={20} color={Colors.light.blue900} />
            <Text style={styles.logoText}>SRV</Text>
          </View>
          <TouchableOpacity
            onPress={onProfilePress}
            style={styles.profileButton}
          >
            {profileImageUrl ? (
              <Image
                source={{ uri: profileImageUrl }}
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.profilePlaceholder}>
                <Ionicons name="person" size={18} color={Colors.light.white} />
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeText}>Welcome back,</Text>
        <Text style={styles.nameText}>{name}</Text>
      </View>

      <TouchableOpacity style={styles.locationBadge}>
        <Ionicons name="location" size={16} color={Colors.light.blue900} />
        <Text style={styles.locationText}>{location}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.light.white,
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.gray100,
  },
  topSection: {
    marginBottom: 12,
  },
  brandSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.yellow100,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  logoText: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.light.blue900,
    marginLeft: 4,
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
  },
  profileImage: {
    width: 40,
    height: 40,
  },
  profilePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.blue600,
    alignItems: "center",
    justifyContent: "center",
  },
  welcomeSection: {
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 14,
    color: Colors.light.gray500,
  },
  nameText: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.light.blue900,
  },
  locationBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.yellow100,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: "flex-start",
  },
  locationText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.light.blue900,
    marginLeft: 4,
  },
});
