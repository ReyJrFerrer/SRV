import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import "react-native-reanimated";

import { useColorScheme } from "@/components/useColorScheme";

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from "expo-router";

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: "(client-tabs)",
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(client-tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(provider-tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: "modal" }} />
        <Stack.Screen
          name="wallet"
          options={{ title: "Wallet", headerBackTitle: "Back" }}
        />
        <Stack.Screen name="notifications" options={{ headerShown: false }} />
        <Stack.Screen name="book/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="booking/[id]" options={{ headerShown: false }} />
        <Stack.Screen
          name="booking/confirmation"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="booking/payment-pending"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="booking/receipt/[id]"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="categories/[slug]"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="service/view-all"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="service/reviews/[id]"
          options={{ headerShown: false }}
        />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="help" options={{ headerShown: false }} />
        <Stack.Screen name="profile/reviews" options={{ headerShown: false }} />
        <Stack.Screen
          name="tracking/[bookingId]"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="active-service/[bookingId]"
          options={{ title: "Active Service", headerBackTitle: "Back" }}
        />
        <Stack.Screen
          name="complete-service/[bookingId]"
          options={{ title: "Complete Service", headerBackTitle: "Back" }}
        />
        <Stack.Screen
          name="receipt/[bookingId]"
          options={{ title: "Receipt", headerBackTitle: "Back" }}
        />
        <Stack.Screen
          name="rate-client/[bookingId]"
          options={{ title: "Rate Client", headerBackTitle: "Back" }}
        />
        <Stack.Screen
          name="directions/[bookingId]"
          options={{ title: "Directions", headerBackTitle: "Back" }}
        />
        <Stack.Screen name="review/[id]" options={{ headerShown: false }} />
        <Stack.Screen
          name="payout-settings"
          options={{ title: "Payout Settings", headerBackTitle: "Back" }}
        />
        <Stack.Screen
          name="service-details/[id]"
          options={{ title: "Service Details", headerBackTitle: "Back" }}
        />
        <Stack.Screen
          name="service-add"
          options={{ title: "Add Service", headerBackTitle: "Back" }}
        />
        <Stack.Screen
          name="service-reviews/[id]"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="service-details/reviews/[id]"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="settings/profile"
          options={{ title: "Profile", headerBackTitle: "Back" }}
        />
        <Stack.Screen name="settings/help" options={{ headerShown: false }} />
        <Stack.Screen name="settings/terms" options={{ headerShown: false }} />
        <Stack.Screen name="settings/report" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}
