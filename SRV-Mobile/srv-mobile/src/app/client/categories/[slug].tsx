import { Text, View, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";

export default function ClientCategory() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  return (
    <View style={styles.container}>
      <Text>Client Category: {slug}</Text>
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
