import { Text, ScrollView, StyleSheet } from "react-native";

export default function ClientHome() {
  return (
    <ScrollView
      style={styles.screen}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
    >
      <Text>Client Home</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
