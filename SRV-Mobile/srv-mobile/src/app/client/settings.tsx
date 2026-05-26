import { Text, View, StyleSheet } from "react-native";

export default function ClientSettings() {
  return (
    <View style={styles.container}>
      <Text>Client Settings</Text>
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
