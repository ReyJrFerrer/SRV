import { Text, View, StyleSheet } from "react-native";

export default function ClientServiceViewAll() {
  return (
    <View style={styles.container}>
      <Text>Client Service View All</Text>
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
