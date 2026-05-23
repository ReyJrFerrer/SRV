import { Text, View, Pressable, StyleSheet } from "react-native";
import { Link } from "expo-router";

export default function Index() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>SRV</Text>
      <Text style={styles.subtitle}>Service Marketplace</Text>
      <View style={styles.buttons}>
        <Link href="/client/home" asChild>
          <Pressable style={styles.button}>
            <Text style={styles.buttonText}>Client</Text>
          </Pressable>
        </Link>
        <Link href="/provider/home" asChild>
          <Pressable style={styles.button}>
            <Text style={styles.buttonText}>Provider</Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    gap: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 32,
  },
  buttons: {
    gap: 12,
  },
  button: {
    backgroundColor: "#eee",
    paddingHorizontal: 48,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
