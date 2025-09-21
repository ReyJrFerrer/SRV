import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { AuthClient } from "@dfinity/auth-client";
import { Identity } from "@dfinity/agent";
import { updateAuthActor } from "../services/authCanisterService";
import { updateBookingActor } from "../services/bookingCanisterService";
import { updateServiceActor } from "../services/serviceCanisterService";
import { updateReviewActor } from "../services/reviewCanisterService";
import { updateReputationActor } from "../services/reputationCanisterService";
import { updateChatActor } from "../services/chatCanisterService";
import {
  initializeCanisterReferences,
  shouldInitializeCanisters,
} from "../services/canisterInitService";
import {
  useLocationStore,
  type LocationStatus,
  type Location,
  type ManualFields,
} from "../store/locationStore";
import { usePWA, PWAState } from "../hooks/usePWA";

// Re-export types for backward compatibility
export type { LocationStatus, Location, ManualFields };

interface AuthContextType {
  authClient: AuthClient | null;
  isAuthenticated: boolean;
  identity: Identity | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
  // --- Location properties (now delegated to Zustand store) ---
  location: Location | null;
  locationStatus: LocationStatus;
  setLocation: (status: LocationStatus, location?: Location | null) => void;
  // --- Shared address state (now delegated to Zustand store) ---
  addressMode: "context" | "manual";
  setAddressMode: (mode: "context" | "manual") => void;
  displayAddress: string;
  setDisplayAddress: (address: string) => void;
  manualFields: ManualFields;
  setManualFields: (fields: ManualFields) => void;
  // --- PWA properties ---
  pwaState: PWAState;
  enablePushNotifications: (userId: string) => Promise<boolean>;
  disablePushNotifications: (userId: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const updateAllActors = (identity: Identity | null) => {
  updateAuthActor(identity);
  updateBookingActor(identity);
  updateServiceActor(identity);
  updateReviewActor(identity);
  updateReputationActor(identity);
  updateChatActor(identity);
};

const initializeCanisters = async (
  isAuthenticated: boolean,
  identity: Identity | null,
) => {
  if (shouldInitializeCanisters(isAuthenticated, identity)) {
    try {
      await initializeCanisterReferences();
    } catch (error) {
      // console.warn("Failed to initialize canister references:", error);
    }
  }
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // --- Use Zustand location store instead of local state ---
  const locationStore = useLocationStore();

  // --- Use PWA hook for push notification management ---
  const {
    pwaState,
    enablePushNotifications: enablePushNotificationsPWA,
    disablePushNotifications: disablePushNotificationsPWA,
  } = usePWA();

  const [authClient, setAuthClient] = useState<AuthClient | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize location store on mount
  useEffect(() => {
    locationStore.initialize();
  }, [locationStore]);

  // Auto-enable push notifications when user authenticates
  useEffect(() => {
    const autoEnablePushNotifications = async () => {
      // Only attempt auto-enable if:
      // 1. User is authenticated
      // 2. PWA state is loaded (not loading)
      // 3. Push notifications are supported
      // 4. User hasn't explicitly denied permissions
      // 5. Not already subscribed
      if (
        isAuthenticated &&
        identity &&
        !pwaState.pushSubscribed &&
        pwaState.pushNotificationSupported &&
        pwaState.pushPermission !== "denied" &&
        pwaState.browserInfo.canReceivePushNotifications
      ) {
        try {
          const userId = identity.getPrincipal().toString();
          const success = await enablePushNotificationsPWA(userId);
          if (success) {
            // console.log("✅ Auto-enabled push notifications for user:", userId);
          }
        } catch (error) {
          // Silently fail auto-enable - user can still enable manually if desired
          // console.log("ℹ️ Auto-enable push notifications failed (this is normal):", error);
        }
      }
    };

    // Only run auto-enable after initial PWA state is loaded
    if (!isLoading && isAuthenticated) {
      autoEnablePushNotifications();
    }
  }, [
    isAuthenticated,
    identity,
    pwaState.pushSubscribed,
    pwaState.pushNotificationSupported,
    pwaState.pushPermission,
    pwaState.browserInfo.canReceivePushNotifications,
    isLoading,
    enablePushNotificationsPWA,
  ]);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const client = await AuthClient.create();
        setAuthClient(client);
        const isAuth = await client.isAuthenticated();
        setIsAuthenticated(isAuth);
        if (isAuth) {
          const identity = client.getIdentity();
          setIdentity(identity);
          updateAllActors(identity);
          await initializeCanisters(isAuth, identity);
        } else {
          updateAllActors(null);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "An unknown error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async () => {
    if (!authClient) return;

    setIsLoading(true);
    setError(null);

    try {
      await authClient.login({
        identityProvider:
          process.env.DFX_NETWORK === "ic" ||
          process.env.DFX_NETWORK === "playground"
            ? "https://identity.ic0.app"
            : `http://rdmx6-jaaaa-aaaaa-aaadq-cai.localhost:4943`,
        onSuccess: async () => {
          const identity = authClient.getIdentity();
          setIsAuthenticated(true);
          setIdentity(identity);
          updateAllActors(identity);
          await initializeCanisters(true, identity);
          setIsLoading(false);
        },
        onError: (err?: string) => {
          setError(err || "Login failed");
          setIsLoading(false);
        },
      });
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Failed to connect to Internet Identity",
      );
      setIsLoading(false);
    }
  };

  const logout = async () => {
    if (!authClient) return;
    await authClient.logout();
    setIsAuthenticated(false);
    setIdentity(null);
    updateAllActors(null);
  };

  const value = {
    authClient,
    isAuthenticated,
    identity,
    login,
    logout,
    isLoading,
    error,
    // Delegate location properties to Zustand store
    location: locationStore.location,
    locationStatus: locationStore.locationStatus,
    setLocation: locationStore.setLocation,
    addressMode: locationStore.addressMode,
    setAddressMode: locationStore.setAddressMode,
    displayAddress: locationStore.displayAddress,
    setDisplayAddress: locationStore.setDisplayAddress,
    manualFields: locationStore.manualFields,
    setManualFields: locationStore.setManualFields,
    // PWA properties
    pwaState,
    enablePushNotifications: enablePushNotificationsPWA,
    disablePushNotifications: disablePushNotificationsPWA,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
