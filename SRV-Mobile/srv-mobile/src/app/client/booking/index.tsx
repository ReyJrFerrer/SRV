import { Text, View, StyleSheet } from "react-native";
import BottomNavBar from "@/components/client/bottom-nav-bar";

export default function ClientMyBookings() {
  return (
    <View style={styles.container}>
      <Text>Client My Bookings</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
