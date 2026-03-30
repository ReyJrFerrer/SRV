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
import { mockProfile } from "../../mock/data";

interface MenuItemProps {
  icon: string;
  title: string;
  onPress?: () => void;
  showSwitch?: boolean;
  switchValue?: boolean;
  onSwitchChange?: (value: boolean) => void;
  showChevron?: boolean;
  danger?: boolean;
}

function MenuItem({
  icon,
  title,
  onPress,
  showSwitch,
  switchValue,
  onSwitchChange,
  showChevron = true,
  danger = false,
}: MenuItemProps) {
  return (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
      disabled={showSwitch}
    >
      <View style={styles.menuItemLeft}>
        <Ionicons
          name={icon as any}
          size={22}
          color={danger ? Colors.light.red : Colors.light.blue400}
        />
        <Text
          style={[styles.menuItemTitle, danger && styles.menuItemTitleDanger]}
        >
          {title}
        </Text>
      </View>
      {showSwitch && onSwitchChange ? (
        <Switch
          value={switchValue}
          onValueChange={onSwitchChange}
          trackColor={{
            false: Colors.light.gray300,
            true: Colors.light.blue400,
          }}
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

export default function SettingsScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleProfilePress = () => {
    router.push("/settings/profile");
  };

  const handleSwitchToClient = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  const menuItems = [
    {
      icon: "notifications-outline",
      title: "Push Notifications",
      showSwitch: true,
      switchValue: notificationsEnabled,
      onSwitchChange: setNotificationsEnabled,
      showChevron: false,
    },
    {
      icon: "phone-portrait-outline",
      title: "Install App",
      onPress: () => {},
    },
    {
      icon: "document-text-outline",
      title: "Terms & Conditions",
      onPress: () => router.push("/settings/terms"),
    },
    {
      icon: "flag-outline",
      title: "Report a Problem",
      onPress: () => router.push("/settings/report"),
    },
    {
      icon: "help-circle-outline",
      title: "Help & Support",
      onPress: () => router.push("/settings/help"),
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <TouchableOpacity
          style={styles.profileSection}
          onPress={handleProfilePress}
        >
          <Image
            source={{
              uri:
                mockProfile.profileImageUrl ||
                "https://i.pravatar.cc/150?img=68",
            }}
            style={styles.profileImage}
          />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{mockProfile.name}</Text>
            <Text style={styles.profileViewText}>View Profile</Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={24}
            color={Colors.light.gray400}
          />
        </TouchableOpacity>

        {/* Switch to Client Button */}
        <TouchableOpacity
          style={styles.switchButton}
          onPress={handleSwitchToClient}
          disabled={isLoading}
        >
          <View style={styles.switchButtonContent}>
            <Ionicons
              name="swap-horizontal"
              size={24}
              color={Colors.light.white}
              style={isLoading ? styles.spinning : undefined}
            />
            <Text style={styles.switchButtonText}>
              {isLoading ? "Switching..." : "Switch to Client"}
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={Colors.light.white}
          />
        </TouchableOpacity>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          {menuItems.map((item, index) => (
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
              {index < menuItems.length - 1 && (
                <View style={styles.menuDivider} />
              )}
            </View>
          ))}
        </View>

        {/* Logout */}
        <View style={styles.logoutSection}>
          <TouchableOpacity style={styles.logoutButton}>
            <Ionicons
              name="log-out-outline"
              size={22}
              color={Colors.light.red}
            />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </View>

        {/* App Version */}
        <View style={styles.versionSection}>
          <Text style={styles.versionText}>SRV Provider v1.0.0</Text>
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
  profileSection: {
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
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: Colors.light.blue100,
  },
  profileInfo: {
    flex: 1,
    marginLeft: 14,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.light.blue900,
  },
  profileViewText: {
    fontSize: 14,
    color: Colors.light.gray500,
    marginTop: 2,
  },
  switchButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.light.blue600,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
  },
  switchButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  switchButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.white,
  },
  spinning: {
    opacity: 0.7,
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
  menuItemTitleDanger: {
    color: Colors.light.red,
  },
  menuDivider: {
    height: 1,
    backgroundColor: Colors.light.gray100,
    marginLeft: 52,
  },
  logoutSection: {
    backgroundColor: Colors.light.white,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.light.gray100,
    overflow: "hidden",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  logoutText: {
    fontSize: 16,
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
