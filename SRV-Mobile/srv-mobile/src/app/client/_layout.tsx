import { Stack } from "expo-router";
import { View, StyleSheet } from "react-native";
import BottomNavBar from "@/components/client/bottom-nav-bar";

export default function ClientLayout() {
  return (
    <View style={styles.container}>
      <View style={styles.stackWrapper}>
        <Stack />
      </View>
      <BottomNavBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  stackWrapper: {
    flex: 1,
  },
});
