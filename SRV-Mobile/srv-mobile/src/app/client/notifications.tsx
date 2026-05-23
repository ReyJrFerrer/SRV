import { Text, View, StyleSheet } from "react-native";

export default function ClientNotifications() {
  return (
    <View style={styles.container}>
      <Text>Client Notifications</Text>
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
