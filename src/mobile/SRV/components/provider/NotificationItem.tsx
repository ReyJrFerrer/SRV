import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../../constants/Colors";
import { Notification } from "../../mock/data";

interface NotificationItemProps {
  notification: Notification;
  onPress?: () => void;
}

const getIcon = (
  type: Notification["type"],
): keyof typeof Ionicons.glyphMap => {
  switch (type) {
    case "booking":
      return "calendar";
    case "rating":
      return "star";
    case "system":
      return "settings";
    case "admin":
      return "shield-checkmark";
    default:
      return "notifications";
  }
};

const getIconColor = (type: Notification["type"]) => {
  switch (type) {
    case "booking":
      return Colors.light.blue600;
    case "rating":
      return Colors.light.yellow;
    case "system":
      return Colors.light.gray500;
    case "admin":
      return Colors.light.green;
    default:
      return Colors.light.primary;
  }
};

const formatTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

export default function NotificationItem({
  notification,
  onPress,
}: NotificationItemProps) {
  const iconName = getIcon(notification.type);
  const iconColor = getIconColor(notification.type);

  return (
    <TouchableOpacity
      style={[styles.container, !notification.isRead && styles.unreadContainer]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View
        style={[styles.iconContainer, { backgroundColor: `${iconColor}20` }]}
      >
        <Ionicons name={iconName} size={20} color={iconColor} />
      </View>
      <View style={styles.content}>
        <Text
          style={[styles.title, !notification.isRead && styles.unreadTitle]}
        >
          {notification.title}
        </Text>
        <Text style={styles.body} numberOfLines={2}>
          {notification.body}
        </Text>
        <Text style={styles.time}>{formatTime(notification.createdAt)}</Text>
      </View>
      {!notification.isRead && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: Colors.light.white,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.gray100,
  },
  unreadContainer: {
    backgroundColor: Colors.light.blue50,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.light.gray800,
  },
  unreadTitle: {
    color: Colors.light.blue900,
    fontWeight: "700",
  },
  body: {
    fontSize: 13,
    color: Colors.light.gray600,
    marginTop: 4,
  },
  time: {
    fontSize: 12,
    color: Colors.light.gray400,
    marginTop: 6,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.light.blue600,
    marginLeft: 8,
    marginTop: 4,
  },
});
