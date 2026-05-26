import { Text, View, StyleSheet } from "react-native";

export default function ClientRatings() {
  return (
    <View style={styles.container}>
      <Text>Client Ratings</Text>
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
