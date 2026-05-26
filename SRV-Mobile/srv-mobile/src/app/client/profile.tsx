import { Text, View, StyleSheet } from "react-native";

export default function ClientProfile() {
  return (
    <View style={styles.container}>
      <Text>Client Profile</Text>
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
