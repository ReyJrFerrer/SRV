import { Text, View, StyleSheet } from "react-native";

export default function ClientHelp() {
  return (
    <View style={styles.container}>
      <Text>Client Help & Support</Text>
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
