import { Stack } from "expo-router";
import { View, StyleSheet } from "react-native";
import BottomNavBar from "@/components/client/bottom-nav-bar";

export default function ClientLayout() {
  return (
    <View style={styles.container}>
      <View style={styles.stackWrapper}>
        <Stack screenOptions={{ headerBackVisible: false, headerTitleAlign: "center" }}>
          <Stack.Screen name="home" options={{ headerShown: false }} />
          <Stack.Screen name="chat" options={{ title: "Chat" }} />
          <Stack.Screen name="profile" options={{ title: "Profile" }} />
          <Stack.Screen name="help" options={{ title: "Help" }} />
          <Stack.Screen name="settings" options={{ title: "Settings" }} />
          <Stack.Screen name="ratings" options={{ title: "Ratings" }} />
          <Stack.Screen name="notifications" options={{ title: "Notifications" }} />
          <Stack.Screen name="search-results" options={{ title: "Search Results" }} />
          <Stack.Screen name="booking" options={{ title: "My Bookings" }} />
          <Stack.Screen name="booking/confirmation" options={{ title: "Booking Confirmation" }} />
          <Stack.Screen name="booking/payment-pending" options={{ title: "Payment Pending" }} />
          <Stack.Screen name="book/[id]" options={{ title: "Book Service" }} />
          <Stack.Screen name="service/view-all" options={{ title: "All Services" }} />
          <Stack.Screen name="categories/[slug]" options={{ title: "Category" }} />
          <Stack.Screen name="review/[id]" options={{ title: "Review" }} />
          <Stack.Screen name="tracking/[bookingId]" options={{ title: "Tracking" }} />
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
