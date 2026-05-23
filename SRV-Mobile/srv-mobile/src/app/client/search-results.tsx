import { Text, View, StyleSheet } from "react-native";

export default function ClientSearchResults() {
  return (
    <View style={styles.container}>
      <Text>Client Search Results</Text>
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
