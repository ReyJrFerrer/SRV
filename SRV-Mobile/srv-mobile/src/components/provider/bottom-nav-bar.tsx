import { View, Pressable, Text, StyleSheet } from "react-native";
import { Link, usePathname, type Href } from "expo-router";
import { SymbolView, type SFSymbol } from "expo-symbols";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface NavItem {
  to: Href;
  path: string;
  label: string;
  icon: SFSymbol;
}

const navItems: NavItem[] = [
  { to: "/provider/home" as Href, path: "/provider/home", label: "Home", icon: "house.fill" as SFSymbol },
  { to: "/provider/bookings" as Href, path: "/provider/bookings", label: "Booking", icon: "calendar" as SFSymbol },
  { to: "/provider/chat" as Href, path: "/provider/chat", label: "Chat", icon: "message.fill" as SFSymbol },
  { to: "/provider/services" as Href, path: "/provider/services", label: "Services", icon: "wrench.fill" as SFSymbol },
  { to: "/provider/notifications" as Href, path: "/provider/notifications", label: "Notifications", icon: "bell.fill" as SFSymbol },
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
