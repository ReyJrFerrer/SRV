import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Switch,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../../constants/Colors";

interface MenuItemProps {
  icon: string;
  title: string;
  onPress?: () => void;
  showSwitch?: boolean;
  switchValue?: boolean;
  onSwitchChange?: (value: boolean) => void;
  showChevron?: boolean;
}

function MenuItem({
  icon,
  title,
  onPress,
  showSwitch,
  switchValue,
  onSwitchChange,
  showChevron = true,
}: MenuItemProps) {
  return (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
      disabled={showSwitch}
    >
      <View style={styles.menuItemLeft}>
        <Ionicons name={icon as any} size={22} color={Colors.light.blue400} />
        <Text style={styles.menuItemTitle}>{title}</Text>
      </View>
      {showSwitch && onSwitchChange ? (
        <Switch
          value={switchValue}
          onValueChange={onSwitchChange}
          trackColor={{ false: Colors.light.gray300, true: Colors.light.green }}
          thumbColor={Colors.light.white}
        />
      ) : showChevron ? (
        <Ionicons
          name="chevron-forward"
          size={20}
          color={Colors.light.gray400}
        />
      ) : null}
    </TouchableOpacity>
  );
}

export default function ClientProfileScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);

  const menuItems = [
    {
      icon: "person-outline",
      title: "Edit Profile",
      onPress: () => {},
    },
    {
      icon: "location-outline",
      title: "Saved Addresses",
      onPress: () => {},
    },
    {
      icon: "notifications-outline",
      title: "Push Notifications",
      showSwitch: true,
      switchValue: notificationsEnabled,
      onSwitchChange: setNotificationsEnabled,
      showChevron: false,
    },
    {
      icon: "globe-outline",
      title: "Location Services",
      showSwitch: true,
      switchValue: locationEnabled,
      onSwitchChange: setLocationEnabled,
      showChevron: false,
    },
    {
      icon: "card-outline",
      title: "Payment Methods",
      onPress: () => {},
    },
    {
      icon: "heart-outline",
      title: "Favorite Providers",
      onPress: () => {},
    },
    {
      icon: "time-outline",
      title: "Booking History",
      onPress: () => {},
    },
    {
      icon: "help-circle-outline",
      title: "Help & Support",
      onPress: () => {},
    },
    {
      icon: "document-text-outline",
      title: "Terms & Conditions",
      onPress: () => {},
    },
    {
      icon: "shield-checkmark-outline",
      title: "Privacy Policy",
      onPress: () => {},
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity style={styles.settingsButton}>
          <Ionicons
            name="settings-outline"
            size={24}
            color={Colors.light.blue900}
          />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <Image
            source={{ uri: "https://i.pravatar.cc/150?img=1" }}
            style={styles.profileImage}
          />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>Juan Client</Text>
            <Text style={styles.profileEmail}>juan.client@email.com</Text>
            <TouchableOpacity style={styles.editProfileButton}>
              <Text style={styles.editProfileText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <TouchableOpacity style={styles.statItem}>
            <Text style={styles.statValue}>5</Text>
            <Text style={styles.statLabel}>Bookings</Text>
          </TouchableOpacity>
          <View style={styles.statDivider} />
          <TouchableOpacity style={styles.statItem}>
            <Text style={styles.statValue}>3</Text>
            <Text style={styles.statLabel}>Favorites</Text>
          </TouchableOpacity>
          <View style={styles.statDivider} />
          <TouchableOpacity style={styles.statItem}>
            <Text style={styles.statValue}>2</Text>
            <Text style={styles.statLabel}>Reviews</Text>
          </TouchableOpacity>
        </View>

        {/* Menu Section - Account */}
        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>Account</Text>
          {menuItems.slice(0, 4).map((item, index) => (
            <View key={item.title}>
              <MenuItem
                icon={item.icon}
                title={item.title}
                onPress={item.onPress}
                showSwitch={item.showSwitch}
                switchValue={item.switchValue}
                onSwitchChange={item.onSwitchChange}
                showChevron={item.showChevron}
              />
              {index < 3 && <View style={styles.menuDivider} />}
            </View>
          ))}
        </View>

        {/* Menu Section - Payments */}
        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>Payments & Favorites</Text>
          {menuItems.slice(4, 7).map((item, index) => (
            <View key={item.title}>
              <MenuItem
                icon={item.icon}
                title={item.title}
                onPress={item.onPress}
                showSwitch={item.showSwitch}
                switchValue={item.switchValue}
                onSwitchChange={item.onSwitchChange}
                showChevron={item.showChevron}
              />
              {index < 2 && <View style={styles.menuDivider} />}
            </View>
          ))}
        </View>

        {/* Menu Section - Support */}
        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>Support</Text>
          {menuItems.slice(7).map((item, index) => (
            <View key={item.title}>
              <MenuItem
                icon={item.icon}
                title={item.title}
                onPress={item.onPress}
                showSwitch={item.showSwitch}
                switchValue={item.switchValue}
                onSwitchChange={item.onSwitchChange}
                showChevron={item.showChevron}
              />
              {index < 2 && <View style={styles.menuDivider} />}
            </View>
          ))}
        </View>

        {/* Switch to Provider */}
        <TouchableOpacity style={styles.switchButton}>
          <Ionicons
            name="swap-horizontal"
            size={20}
            color={Colors.light.blue600}
          />
          <Text style={styles.switchButtonText}>Switch to Provider</Text>
        </TouchableOpacity>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={22} color={Colors.light.red} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        {/* App Version */}
        <View style={styles.versionSection}>
          <Text style={styles.versionText}>SRV Client v1.0.0</Text>
          <Text style={styles.copyrightText}>
            © 2026 SRV. All rights reserved.
          </Text>
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
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.light.white,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.gray100,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.light.blue900,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.gray50,
    alignItems: "center",
    justifyContent: "center",
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.white,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.light.gray100,
  },
  profileImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: Colors.light.green,
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  profileName: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.light.blue900,
  },
  profileEmail: {
    fontSize: 14,
    color: Colors.light.gray500,
    marginTop: 2,
  },
  editProfileButton: {
    backgroundColor: Colors.light.green100,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: "flex-start",
    marginTop: 8,
  },
  editProfileText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.light.green,
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: Colors.light.white,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.light.gray100,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.light.blue900,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.light.gray500,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.light.gray100,
  },
  menuSection: {
    backgroundColor: Colors.light.white,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.light.gray100,
    overflow: "hidden",
  },
  menuSectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.light.gray500,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
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
    gap: 14,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: Colors.light.blue900,
  },
  menuDivider: {
    height: 1,
    backgroundColor: Colors.light.gray100,
    marginLeft: 52,
  },
  switchButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.light.blue50,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.blue100,
  },
  switchButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.light.blue600,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.light.white,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.red100,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.light.red,
  },
  versionSection: {
    alignItems: "center",
    marginTop: 24,
    marginBottom: 16,
  },
  versionText: {
    fontSize: 13,
    color: Colors.light.gray500,
  },
  copyrightText: {
    fontSize: 12,
    color: Colors.light.gray400,
    marginTop: 4,
  },
  bottomPadding: {
    height: 100,
  },
});
