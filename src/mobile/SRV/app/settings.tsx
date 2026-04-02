import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Switch,
  Image,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../constants/Colors";
import { mockClientProfile, ClientProfile } from "../mock/data";

export default function SettingsScreen() {
  const [isNotificationsOn, setIsNotificationsOn] = useState(true);
  const [isLocationOn, setIsLocationOn] = useState(true);

  const handleEditProfile = () => {
    console.log("Edit Profile pressed");
  };

  const handleChangePassword = () => {
    console.log("Change Password pressed");
  };

  const handlePaymentMethods = () => {
    console.log("Payment Methods pressed");
  };

  const handleTerms = () => {
    console.log("Terms & Conditions pressed");
  };

  const handleReportProblem = () => {
    console.log("Report a Problem pressed");
  };

  const handleHelp = () => {
    router.push("/help");
  };

  const handleLogOut = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: () => console.log("Log Out confirmed"),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <TouchableOpacity
          style={styles.profileCard}
          onPress={handleEditProfile}
        >
          <Image
            source={{ uri: mockClientProfile.profileImageUrl }}
            style={styles.profileImage}
          />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{mockClientProfile.name}</Text>
            <Text style={styles.profilePhone}>{mockClientProfile.phone}</Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={22}
            color={Colors.light.gray400}
          />
        </TouchableOpacity>

        {/* Switch to Provider Button */}
        <TouchableOpacity
          style={styles.switchButton}
          onPress={() => console.log("Switch to Provider pressed")}
        >
          <Ionicons
            name="swap-horizontal"
            size={22}
            color={Colors.light.blue900}
          />
          <Text style={styles.switchButtonText}>Switch to Provider</Text>
        </TouchableOpacity>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.sectionCard}>
            <View style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <Ionicons
                  name="notifications-outline"
                  size={22}
                  color={Colors.light.blue600}
                />
                <Text style={styles.menuItemText}>Push Notifications</Text>
              </View>
              <Switch
                value={isNotificationsOn}
                onValueChange={setIsNotificationsOn}
                trackColor={{
                  false: Colors.light.gray300,
                  true: Colors.light.blue600,
                }}
                thumbColor={Colors.light.white}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <Ionicons
                  name="location-outline"
                  size={22}
                  color={Colors.light.blue600}
                />
                <Text style={styles.menuItemText}>Location Services</Text>
              </View>
              <Switch
                value={isLocationOn}
                onValueChange={setIsLocationOn}
                trackColor={{
                  false: Colors.light.gray300,
                  true: Colors.light.blue600,
                }}
                thumbColor={Colors.light.white}
              />
            </View>
          </View>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.sectionCard}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleEditProfile}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons
                  name="person-outline"
                  size={22}
                  color={Colors.light.blue600}
                />
                <Text style={styles.menuItemText}>Edit Profile</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={Colors.light.gray400}
              />
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleChangePassword}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons
                  name="lock-closed-outline"
                  size={22}
                  color={Colors.light.blue600}
                />
                <Text style={styles.menuItemText}>Change Password</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={Colors.light.gray400}
              />
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handlePaymentMethods}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons
                  name="card-outline"
                  size={22}
                  color={Colors.light.blue600}
                />
                <Text style={styles.menuItemText}>Payment Methods</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={Colors.light.gray400}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <View style={styles.sectionCard}>
            <TouchableOpacity style={styles.menuItem} onPress={handleTerms}>
              <View style={styles.menuItemLeft}>
                <Ionicons
                  name="document-text-outline"
                  size={22}
                  color={Colors.light.blue600}
                />
                <Text style={styles.menuItemText}>Terms & Conditions</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={Colors.light.gray400}
              />
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleReportProblem}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons
                  name="alert-circle-outline"
                  size={22}
                  color={Colors.light.blue600}
                />
                <Text style={styles.menuItemText}>Report a Problem</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={Colors.light.gray400}
              />
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.menuItem} onPress={handleHelp}>
              <View style={styles.menuItemLeft}>
                <Ionicons
                  name="help-circle-outline"
                  size={22}
                  color={Colors.light.blue600}
                />
                <Text style={styles.menuItemText}>Help & Support</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={Colors.light.gray400}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Log Out Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogOut}>
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
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.white,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  profileImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.light.gray200,
  },
  profileInfo: {
    flex: 1,
    marginLeft: 14,
  },
  profileName: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.light.blue900,
  },
  profilePhone: {
    fontSize: 14,
    color: Colors.light.gray600,
    marginTop: 4,
  },
  switchButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.light.yellow,
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 10,
  },
  switchButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.blue900,
  },
  section: {
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
  sectionCard: {
    backgroundColor: Colors.light.white,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: "500",
    color: Colors.light.blue900,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.light.gray100,
    marginLeft: 50,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.light.white,
    marginHorizontal: 16,
    marginTop: 24,
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
