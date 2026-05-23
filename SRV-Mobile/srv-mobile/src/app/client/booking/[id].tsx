import { Text, View, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";

export default function ClientBookingDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <View style={styles.container}>
      <Text>Client Booking Details: {id}</Text>
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
