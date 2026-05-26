import { Text, View, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";

export default function ClientTracking() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  return (
    <View style={styles.container}>
      <Text>Client Tracking: {bookingId}</Text>
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
