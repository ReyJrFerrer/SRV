import { View, Pressable, Text, StyleSheet } from "react-native";
import { Link, usePathname, type Href } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface NavItem {
  to: Href;
  path: string;
  label: string;
  icon: { ios: string; android: string; web: string };
}

const navItems: NavItem[] = [
  { to: "/client/home" as Href, path: "/client/home", label: "Home", icon: { ios: "house.fill", android: "home", web: "home" } },
  { to: "/client/booking" as Href, path: "/client/booking", label: "Booking", icon: { ios: "calendar", android: "calendar_month", web: "calendar_month" } },
  { to: "/client/chat" as Href, path: "/client/chat", label: "Chat", icon: { ios: "message.fill", android: "chat", web: "chat" } },
  { to: "/client/notifications" as Href, path: "/client/notifications", label: "Notifications", icon: { ios: "bell.fill", android: "notifications", web: "notifications" } },
  { to: "/client/profile" as Href, path: "/client/profile", label: "Profile", icon: { ios: "person.circle.fill", android: "person", web: "person" } },
];

export default function BottomNavBar() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {navItems.map((item) => {
        const isActive = pathname.startsWith(item.path);
        return (
          <Link key={item.label} href={item.to} asChild>
            <Pressable style={styles.item}>
              <SymbolView
                name={item.icon}
                weight="semibold"
                size={24}
                tintColor={isActive ? "#007AFF" : "#8E8E93"}
              />
              <Text
                style={[
                  styles.label,
                  isActive && styles.labelActive,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          </Link>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#C6C6C8",
    backgroundColor: "#FFFFFF",
    paddingTop: 8,
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 4,
  },
  label: {
    fontSize: 10,
    color: "#8E8E93",
  },
  labelActive: {
    color: "#007AFF",
    fontWeight: "600",
  },
});
