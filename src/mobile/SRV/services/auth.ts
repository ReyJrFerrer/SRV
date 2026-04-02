import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

// Required for web browser
WebBrowser.maybeCompleteAuthSession();

const IDENTITY_URL = "https://identity.ic0.app";

export async function loginWithInternetIdentity() {
  try {
    const redirectUrl = Linking.createURL("/auth-callback");

    // Construct the login URL for Internet Identity
    // In a real app, you would pass a session public key to be signed by II
    const loginUrl = `${IDENTITY_URL}/#authorize`;

    const result = await WebBrowser.openAuthSessionAsync(loginUrl, redirectUrl);

    if (result.type === "success") {
      // Parse the result URL to get the delegation or token
      // This requires setting up a middleman page or handling the specific II protocol
      const url = result.url;
      // Extract token/principal here based on your bridge implementation
      console.log("Login success:", url);

      // Store token securely
      await SecureStore.setItemAsync("icp_auth_token", "dummy_token_for_now");
      return true;
    }

    return false;
  } catch (error) {
    console.error("Auth error:", error);
    return false;
  }
}

export async function getAuthToken() {
  return await SecureStore.getItemAsync("icp_auth_token");
}

export async function logout() {
  await SecureStore.deleteItemAsync("icp_auth_token");
}
