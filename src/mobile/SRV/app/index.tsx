import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../constants/Colors";

export default function RoleSwitchScreen() {
  const handleProviderPress = () => {
    router.replace("/(provider-tabs)");
  };

  const handleClientPress = () => {
    router.replace("/(client-tabs)");
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.light.white} />
      <View style={styles.content}>
        <View style={styles.logoSection}>
          <View style={styles.logoIcon}>
            <Ionicons name="briefcase" size={48} color={Colors.light.white} />
          </View>
          <Text style={styles.appName}>SRV</Text>
          <Text style={styles.tagline}>Service at Your Fingertips</Text>
        </View>

        <View style={styles.titleSection}>
          <Text style={styles.title}>Choose Your Role</Text>
          <Text style={styles.subtitle}>Select how you want to use SRV</Text>
        </View>

        <View style={styles.rolesSection}>
          {/* Provider Card */}
          <TouchableOpacity
            style={styles.roleCard}
            onPress={handleProviderPress}
          >
            <View
              style={[
                styles.roleIcon,
                { backgroundColor: Colors.light.blue600 },
              ]}
            >
              <Ionicons name="construct" size={32} color={Colors.light.white} />
            </View>
            <View style={styles.roleInfo}>
              <Text style={styles.roleTitle}>Service Provider</Text>
              <Text style={styles.roleDesc}>
                Manage services, handle bookings, and grow your business
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={24}
              color={Colors.light.blue400}
            />
          </TouchableOpacity>

          {/* Client Card */}
          <TouchableOpacity style={styles.roleCard} onPress={handleClientPress}>
            <View
              style={[styles.roleIcon, { backgroundColor: Colors.light.green }]}
            >
              <Ionicons name="person" size={32} color={Colors.light.white} />
            </View>
            <View style={styles.roleInfo}>
              <Text style={styles.roleTitle}>Client</Text>
              <Text style={styles.roleDesc}>
                Find services, book appointments, and get things done
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={24}
              color={Colors.light.green}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.featuresSection}>
          <View style={styles.featureRow}>
            <View style={styles.featureItem}>
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={Colors.light.green}
              />
              <Text style={styles.featureText}>Verified Providers</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={Colors.light.green}
              />
              <Text style={styles.featureText}>Secure Payments</Text>
            </View>
          </View>
          <View style={styles.featureRow}>
            <View style={styles.featureItem}>
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={Colors.light.green}
              />
              <Text style={styles.featureText}>Real-time Tracking</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={Colors.light.green}
              />
              <Text style={styles.featureText}>24/7 Support</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.versionText}>SRV v1.0.0</Text>
          <TouchableOpacity style={styles.switchRoleLink}>
            <Text style={styles.switchRoleText}>
              Switch between roles anytime in Settings
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.white,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "space-between",
  },
  logoSection: {
    alignItems: "center",
    paddingTop: 60,
  },
  logoIcon: {
    width: 90,
    height: 90,
    borderRadius: 22,
    backgroundColor: Colors.light.blue600,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: Colors.light.blue600,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  appName: {
    fontSize: 40,
    fontWeight: "900",
    color: Colors.light.blue900,
    letterSpacing: 4,
  },
  tagline: {
    fontSize: 16,
    fontWeight: "500",
    color: Colors.light.gray500,
    marginTop: 4,
  },
  titleSection: {
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.light.blue900,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: Colors.light.gray600,
    textAlign: "center",
    marginTop: 8,
  },
  rolesSection: {
    gap: 16,
  },
  roleCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.gray50,
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: Colors.light.gray100,
  },
  roleIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  roleInfo: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.light.blue900,
  },
  roleDesc: {
    fontSize: 13,
    color: Colors.light.gray600,
    marginTop: 4,
    lineHeight: 18,
  },
  featuresSection: {
    backgroundColor: Colors.light.blue50,
    borderRadius: 16,
    padding: 16,
  },
  featureRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 8,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  featureText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.light.gray700,
  },
  footer: {
    alignItems: "center",
    paddingBottom: 24,
  },
  versionText: {
    fontSize: 12,
    color: Colors.light.gray400,
    marginBottom: 8,
  },
  switchRoleLink: {
    paddingVertical: 8,
  },
  switchRoleText: {
    fontSize: 13,
    color: Colors.light.blue600,
    fontWeight: "500",
  },
});
