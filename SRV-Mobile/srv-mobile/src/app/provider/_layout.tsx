import { Stack } from "expo-router";
import { View, StyleSheet } from "react-native";
import BottomNavBar from "@/components/provider/bottom-nav-bar";

export default function ProviderLayout() {
  return (
    <View style={styles.container}>
      <View style={styles.stackWrapper}>
        <Stack
          screenOptions={{
            headerBackVisible: false,
            headerTitleAlign: "center",
          }}
        >
          <Stack.Screen name="home" options={{ headerShown: false }} />
          <Stack.Screen name="bookings" options={{ title: "My Bookings" }} />
          <Stack.Screen name="chat" options={{ title: "Chat" }} />
          <Stack.Screen name="profile" options={{ title: "Profile" }} />
          <Stack.Screen name="help" options={{ title: "Help" }} />
          <Stack.Screen name="settings" options={{ title: "Settings" }} />
          <Stack.Screen
            name="notifications"
            options={{ title: "Notifications" }}
          />
          <Stack.Screen name="wallet" options={{ title: "Wallet" }} />
          <Stack.Screen name="report" options={{ title: "Report" }} />
          <Stack.Screen
            name="terms"
            options={{ title: "Terms & Conditions" }}
          />
          <Stack.Screen
            name="payout-settings"
            options={{ title: "Payout Settings" }}
          />
          <Stack.Screen
            name="services/index"
            options={{ title: "My Services" }}
          />
          <Stack.Screen
            name="services/add"
            options={{ title: "Add Service" }}
          />
          <Stack.Screen
            name="booking/[id]"
            options={{ title: "Booking Details" }}
          />
          <Stack.Screen name="review/[id]" options={{ title: "Review" }} />
          <Stack.Screen
            name="receipt/[bookingId]"
            options={{ title: "Receipt" }}
          />
          <Stack.Screen
            name="rate-client/[bookingId]"
            options={{ title: "Rate Client" }}
          />
          <Stack.Screen
            name="directions/[bookingId]"
            options={{ title: "Directions" }}
          />
          <Stack.Screen
            name="active-service/[bookingId]"
            options={{ title: "Active Service" }}
          />
          <Stack.Screen
            name="complete-service/[bookingId]"
            options={{ title: "Complete Service" }}
          />
        </Stack>
      </View>
      <BottomNavBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  stackWrapper: {
    flex: 1,
  },
});
