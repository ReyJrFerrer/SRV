import { Text, View, StyleSheet } from "react-native";

export default function ClientChat() {
  return (
    <View style={styles.container}>
      <Text>Client Chat</Text>
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
