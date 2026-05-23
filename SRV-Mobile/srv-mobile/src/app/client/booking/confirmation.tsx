import { Text, View, StyleSheet } from "react-native";

export default function ClientBookingConfirmation() {
  return (
    <View style={styles.container}>
      <Text>Client Booking Confirmation</Text>
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
