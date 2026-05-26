import { Text, View, StyleSheet } from "react-native";

export default function ClientPaymentPending() {
  return (
    <View style={styles.container}>
      <Text>Client Payment Pending</Text>
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
