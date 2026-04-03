import React, { useState } from "react";
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
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../../constants/Colors";
import { mockProfile, mockReputationBreakdown } from "../../mock/data";

function getTrustLevelColor(level: string): string {
  switch (level) {
    case "New":
      return Colors.light.gray400;
    case "Building Trust":
      return Colors.light.yellow400;
    case "Reliable":
      return Colors.light.blue600;
    case "Trusted":
      return Colors.light.green;
    case "Premium":
      return Colors.light.purple;
    default:
      return Colors.light.gray400;
  }
}

function getTrustLevelIcon(level: string): keyof typeof Ionicons.glyphMap {
  switch (level) {
    case "New":
      return "shield-outline";
    case "Building Trust":
      return "shield-half-outline";
    case "Reliable":
      return "shield-checkmark-outline";
    case "Trusted":
      return "shield-checkmark";
    case "Premium":
      return "diamond";
    default:
      return "shield-outline";
  }
}

export default function ProfileScreen() {
  const [isEditing, setIsEditing] = useState(false);
  const rep = mockReputationBreakdown;

  const handleSwitchToClient = () => {
    Alert.alert("Switch to Client", "Switching to client view...", [
      { text: "Cancel", style: "cancel" },
      { text: "Switch", onPress: () => console.log("Switched to client") },
    ]);
  };

  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: () => console.log("Logged out"),
      },
    ]);
  };

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
        <Text style={styles.headerTitle}>My Profile</Text>
        <TouchableOpacity
          onPress={() => setIsEditing(!isEditing)}
          style={styles.editToggle}
        >
          <Text style={styles.editToggleText}>
            {isEditing ? "Save" : "Edit"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: mockProfile.profileImageUrl }}
              style={styles.avatar}
            />
            {isEditing && (
              <TouchableOpacity style={styles.cameraButton}>
                <Ionicons name="camera" size={16} color={Colors.light.white} />
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.profileName}>{mockProfile.name}</Text>
          <Text style={styles.profilePhone}>{mockProfile.phone}</Text>
          {mockProfile.email && (
            <Text style={styles.profileEmail}>{mockProfile.email}</Text>
          )}
          <View style={styles.locationRow}>
            <Ionicons
              name="location-outline"
              size={14}
              color={Colors.light.gray500}
            />
            <Text style={styles.locationText}>{mockProfile.location}</Text>
          </View>
        </View>

        {/* Reputation Score */}
        <View style={styles.repSection}>
          <Text style={styles.sectionTitle}>Reputation Score</Text>
          <View style={styles.repCard}>
            <View style={styles.scoreGauge}>
              <View style={styles.scoreCircle}>
                <Text style={styles.scoreValue}>{rep.score}</Text>
                <Text style={styles.scoreLabel}>/ 100</Text>
              </View>
              <View style={styles.scoreBar}>
                <View
                  style={[
                    styles.scoreFill,
                    {
                      width: `${rep.score}%`,
                      backgroundColor: getTrustLevelColor(rep.level),
                    },
                  ]}
                />
              </View>
            </View>

            <View style={styles.trustBadge}>
              <Ionicons
                name={getTrustLevelIcon(rep.level)}
                size={20}
                color={getTrustLevelColor(rep.level)}
              />
              <Text
                style={[
                  styles.trustBadgeText,
                  { color: getTrustLevelColor(rep.level) },
                ]}
              >
                {rep.level}
              </Text>
            </View>

            <View style={styles.repStats}>
              <View style={styles.repStatItem}>
                <Text style={styles.repStatValue}>{rep.completedBookings}</Text>
                <Text style={styles.repStatLabel}>Completed</Text>
              </View>
              <View style={styles.repStatDivider} />
              <View style={styles.repStatItem}>
                <Text style={styles.repStatValue}>{rep.averageRating}</Text>
                <Text style={styles.repStatLabel}>Avg Rating</Text>
              </View>
              <View style={styles.repStatDivider} />
              <View style={styles.repStatItem}>
                <Text style={styles.repStatValue}>{rep.totalReviews}</Text>
                <Text style={styles.repStatLabel}>Reviews</Text>
              </View>
            </View>

            <View style={styles.repMetrics}>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Response Rate</Text>
                <Text style={styles.metricValue}>{rep.responseRate}%</Text>
              </View>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Completion Rate</Text>
                <Text style={styles.metricValue}>{rep.completionRate}%</Text>
              </View>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Total Bookings</Text>
                <Text style={styles.metricValue}>{rep.totalBookings}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Switch to Client */}
        <TouchableOpacity
          style={styles.switchButton}
          onPress={handleSwitchToClient}
        >
          <Ionicons
            name="swap-horizontal"
            size={22}
            color={Colors.light.blue900}
          />
          <Text style={styles.switchButtonText}>Switch to Client</Text>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={Colors.light.gray400}
          />
        </TouchableOpacity>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color={Colors.light.red} />
          <Text style={styles.logoutButtonText}>Log Out</Text>
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
  editToggle: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  editToggleText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.light.blue600,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  profileCard: {
    alignItems: "center",
    backgroundColor: Colors.light.white,
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderRadius: 16,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 16,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.light.gray200,
  },
  cameraButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.light.blue600,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: Colors.light.white,
  },
  profileName: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.light.blue900,
  },
  profilePhone: {
    fontSize: 14,
    color: Colors.light.gray600,
    marginTop: 4,
  },
  profileEmail: {
    fontSize: 13,
    color: Colors.light.gray500,
    marginTop: 2,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 4,
  },
  locationText: {
    fontSize: 13,
    color: Colors.light.gray500,
  },
  repSection: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.gray500,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  repCard: {
    backgroundColor: Colors.light.white,
    borderRadius: 16,
    padding: 20,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  scoreGauge: {
    alignItems: "center",
    marginBottom: 16,
  },
  scoreCircle: {
    alignItems: "center",
    marginBottom: 12,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: "800",
    color: Colors.light.blue900,
  },
  scoreLabel: {
    fontSize: 14,
    color: Colors.light.gray500,
    fontWeight: "500",
  },
  scoreBar: {
    width: "100%",
    height: 8,
    backgroundColor: Colors.light.gray100,
    borderRadius: 4,
    overflow: "hidden",
  },
  scoreFill: {
    height: "100%",
    borderRadius: 4,
  },
  trustBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: Colors.light.gray50,
    borderRadius: 20,
    alignSelf: "center",
  },
  trustBadgeText: {
    fontSize: 15,
    fontWeight: "700",
  },
  repStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.light.gray100,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.gray100,
  },
  repStatItem: {
    alignItems: "center",
  },
  repStatValue: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.light.blue900,
  },
  repStatLabel: {
    fontSize: 11,
    color: Colors.light.gray500,
    fontWeight: "500",
    marginTop: 4,
  },
  repStatDivider: {
    width: 1,
    backgroundColor: Colors.light.gray100,
  },
  repMetrics: {
    marginTop: 16,
    gap: 10,
  },
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metricLabel: {
    fontSize: 14,
    color: Colors.light.gray600,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.light.blue900,
  },
  switchButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.white,
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  switchButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.blue900,
    marginLeft: 12,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.light.white,
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.red100,
    gap: 8,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.red,
  },
  bottomPadding: {
    height: 40,
  },
});
