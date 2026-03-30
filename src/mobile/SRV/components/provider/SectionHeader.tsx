import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../../constants/Colors";

interface SectionHeaderProps {
  title: string;
  actionText?: string;
  onActionPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  color?: string;
}

export default function SectionHeader({
  title,
  actionText,
  onActionPress,
  icon,
  color = Colors.light.blue900,
}: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      {icon && (
        <Ionicons name={icon} size={20} color={color} style={styles.icon} />
      )}
      <Text style={[styles.title, { color }]}>{title}</Text>
      {actionText && onActionPress && (
        <TouchableOpacity onPress={onActionPress}>
          <Text style={styles.actionText}>{actionText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  icon: {
    marginRight: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    flex: 1,
  },
  actionText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.blue600,
  },
});
