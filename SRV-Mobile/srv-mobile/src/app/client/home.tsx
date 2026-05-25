import { Text, ScrollView, StyleSheet } from "react-native";
import ClientHeader from "@/components/client/header";

export default function ClientHome() {
  return (
    <ScrollView
      style={styles.screen}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
    >
      <ClientHeader />
      <Text style={styles.bodyText}>Client Home</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
  bodyText: {
    fontSize: 16,
    color: "#374151",
    textAlign: "center",
    paddingVertical: 32,
  },
});
