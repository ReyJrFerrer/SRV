import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../constants/Colors";
import { mockNotificationsDetailed, Notification } from "../mock/data";

const TABS = ["All", "Bookings", "Ratings", "System", "Admin"] as const;
type Tab = (typeof TABS)[number];

const TAB_TYPE_MAP: Record<string, Notification["type"]> = {
  Bookings: "booking",
  Ratings: "rating",
  System: "system",
  Admin: "admin",
};

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getTypeIcon(
  type: Notification["type"],
): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case "booking":
      return "calendar";
    case "rating":
      return "star";
    case "system":
      return "information-circle";
    case "admin":
      return "shield-checkmark";
  }
}

function getTypeBgColor(type: Notification["type"]): string {
  switch (type) {
    case "booking":
      return Colors.light.blue100;
    case "rating":
      return Colors.light.yellow100;
    case "system":
      return Colors.light.gray100;
    case "admin":
      return Colors.light.green100;
  }
}

function getTypeIconColor(type: Notification["type"]): string {
  switch (type) {
    case "booking":
      return Colors.light.blue600;
    case "rating":
      return Colors.light.yellow400;
    case "system":
      return Colors.light.gray600;
    case "admin":
      return Colors.light.green;
  }
}

export default function NotificationsScreen() {
  const [activeTab, setActiveTab] = useState<Tab>("All");
  const [editMode, setEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filtered =
    activeTab === "All"
      ? mockNotificationsDetailed
      : mockNotificationsDetailed.filter(
          (n) => n.type === TAB_TYPE_MAP[activeTab],
        );

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleMarkAsRead = () => {
    setSelectedIds(new Set());
    setEditMode(false);
  };

  const handleDelete = () => {
    setSelectedIds(new Set());
    setEditMode(false);
  };

  const handleCancel = () => {
    setEditMode(false);
    setSelectedIds(new Set());
  };

  const handleItemPress = (item: Notification) => {
    if (editMode) {
      toggleSelect(item.id);
    } else if (item.href) {
      router.push(item.href as any);
    }
  };

  const renderItem = ({ item }: { item: Notification }) => {
    const isSelected = selectedIds.has(item.id);

    return (
      <TouchableOpacity
        style={[styles.card, !item.isRead && styles.unreadCard]}
        onPress={() => handleItemPress(item)}
        activeOpacity={0.7}
      >
        {!item.isRead && <View style={styles.unreadDot} />}

        <View
          style={[
            styles.iconCircle,
            { backgroundColor: getTypeBgColor(item.type) },
          ]}
        >
          <Ionicons
            name={getTypeIcon(item.type)}
            size={20}
            color={getTypeIconColor(item.type)}
          />
        </View>

        <View style={styles.cardBody}>
          <Text
            style={[styles.cardTitle, !item.isRead && styles.cardTitleUnread]}
          >
            {item.title}
          </Text>
          <Text style={styles.cardText} numberOfLines={2}>
            {item.body}
          </Text>
          <Text style={styles.cardTime}>
            {formatRelativeTime(item.createdAt)}
          </Text>
        </View>

        {editMode ? (
          <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
            {isSelected && (
              <Ionicons name="checkmark" size={16} color={Colors.light.white} />
            )}
          </View>
        ) : (
          item.href && (
            <Ionicons
              name="chevron-forward"
              size={16}
              color={Colors.light.gray400}
            />
          )
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerBtn}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.light.blue900} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity
          onPress={editMode ? handleCancel : () => setEditMode(true)}
          style={styles.headerBtn}
        >
          <Text style={styles.editText}>{editMode ? "Cancel" : "Edit"}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabsRow}>
        <FlatList
          data={[...TABS]}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(t) => t}
          contentContainerStyle={styles.tabsContent}
          renderItem={({ item: tab }) => {
            const active = tab === activeTab;
            return (
              <TouchableOpacity
                style={styles.tab}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>
                  {tab}
                </Text>
                {active && <View style={styles.tabIndicator} />}
              </TouchableOpacity>
            );
          }}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons
              name="notifications-off-outline"
              size={48}
              color={Colors.light.gray300}
            />
            <Text style={styles.emptyText}>No notifications</Text>
          </View>
        }
      />

      {editMode && selectedIds.size > 0 && (
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.readBtn} onPress={handleMarkAsRead}>
            <Ionicons
              name="checkmark-done"
              size={18}
              color={Colors.light.blue600}
            />
            <Text style={styles.readBtnText}>Mark as Read</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={18} color={Colors.light.red} />
            <Text style={styles.deleteBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
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
  headerBtn: {
    width: 60,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.light.blue900,
  },
  editText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.light.blue600,
  },
  tabsRow: {
    backgroundColor: Colors.light.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.gray100,
  },
  tabsContent: {
    paddingHorizontal: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
    position: "relative",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.light.gray500,
  },
  tabTextActive: {
    fontWeight: "700",
    color: Colors.light.blue600,
  },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    left: 16,
    right: 16,
    height: 3,
    backgroundColor: Colors.light.blue600,
    borderRadius: 2,
  },
  listContent: {
    padding: 16,
    gap: 8,
  },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: Colors.light.white,
    borderRadius: 12,
    padding: 14,
    paddingLeft: 18,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  unreadCard: {
    backgroundColor: Colors.light.blue50,
    borderWidth: 1,
    borderColor: Colors.light.blue200,
  },
  unreadDot: {
    position: "absolute",
    left: 6,
    top: 22,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.light.blue600,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.light.gray800,
  },
  cardTitleUnread: {
    fontWeight: "700",
    color: Colors.light.blue900,
  },
  cardText: {
    fontSize: 13,
    color: Colors.light.gray600,
    marginTop: 4,
    lineHeight: 18,
  },
  cardTime: {
    fontSize: 11,
    color: Colors.light.gray400,
    marginTop: 6,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.light.gray300,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
    marginTop: 2,
  },
  checkboxActive: {
    backgroundColor: Colors.light.blue600,
    borderColor: Colors.light.blue600,
  },
  empty: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.light.gray400,
    marginTop: 12,
  },
  bottomBar: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 24,
    backgroundColor: Colors.light.white,
    borderTopWidth: 1,
    borderTopColor: Colors.light.gray100,
  },
  readBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: Colors.light.blue50,
    borderRadius: 10,
    paddingVertical: 12,
  },
  readBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.blue600,
  },
  deleteBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: Colors.light.red100,
    borderRadius: 10,
    paddingVertical: 12,
  },
  deleteBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.red,
  },
});
