import { Text, View, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";

export default function ClientBookService() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <View style={styles.container}>
      <Text>Client Book Service: {id}</Text>
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
