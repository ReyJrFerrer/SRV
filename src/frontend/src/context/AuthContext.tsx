import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { AuthClient } from "@dfinity/auth-client";
import { Identity } from "@dfinity/agent";
import {
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import { getFirebaseAuth, clearICCustomToken } from "../services/firebaseApp";
import { updateReputationActor } from "../services/reputationCanisterService";

import {
  useLocationStore,
  type LocationStatus,
  type Location,
  type ManualFields,
} from "../store/locationStore";
import { usePWA, PWAState } from "../hooks/usePWA";
import { signInWithInternetIdentity } from "../services/identityBridge";
import authCanisterService from "../services/authCanisterService";


// Re-export types for backward compatibility
export type { LocationStatus, Location, ManualFields };

interface AuthContextType {
  authClient: AuthClient | null;
  isAuthenticated: boolean;
  identity: Identity | null;
  firebaseUser: FirebaseUser | null;
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
  // Post-login location prompt controls (moved UI to pages that want to render it)
  postLoginLocationPromptVisible: boolean;
  requestLocationFromPrompt: () => Promise<void>;
  skipPostLoginLocationPrompt: () => void;
  postLoginBlockedModalVisible: boolean;
  acknowledgePostLoginBlockedModal: () => void;
  showPostLoginLocationPrompt: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const updateAllActors = (identity: Identity | null) => {
  try {
    updateReputationActor(identity);
  } catch (error) {
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
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Post-login location prompt state
  const [postLoginLocationPromptVisible, setPostLoginLocationPromptVisible] =
    useState(false);
  const [postLoginBlockedModalVisible, setPostLoginBlockedModalVisible] =
    useState(false);
  const [awaitingGeoResult, setAwaitingGeoResult] = useState(false);

  // Initialize location store on mount (does not auto-request geolocation)
  useEffect(() => {
    locationStore.initialize();
  }, [locationStore]);

  useEffect(() => {
    let mounted = true;
    if (typeof navigator !== "undefined" && (navigator as any).permissions) {
      try {
        (navigator as any).permissions
          .query({ name: "geolocation" })
          .then((p: any) => {
            if (!mounted) return;
            if (p && p.state === "granted") {
              // Only request if the store doesn't already have an allowed state
              if (locationStore.locationStatus !== "allowed") {
                try {
                  locationStore.requestLocation().catch(() => {});
                } catch {}
              }
            }

            // Listen for permission changes while the app is open
            if (p && typeof p.onchange === "function") {
              p.onchange = () => {
                if (!mounted) return;
                try {
                  if (
                    p.state === "granted" &&
                    locationStore.locationStatus !== "allowed"
                  ) {
                    locationStore.requestLocation().catch(() => {});
                  }
                } catch {}
              };
            }
          })
          .catch(() => {
          });
      } catch {
      }
    }
    return () => {
      mounted = false;
    };
  }, [locationStore]);

  // Listen to Firebase auth state changes
  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
    });

    return () => unsubscribe();
  }, []);

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
          await enablePushNotificationsPWA(userId);
        
        } catch (error) {
          // Silently fail auto-enable - user can still enable manually if desired
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

  // After login, show a friendly modal asking to enable location access (once per session)
  // Only show the prompt when the permission state is truly unknown ("not_set").
  // If permission is already "allowed", "denied" or "unsupported", do not prompt.
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) return;

    const alreadyShown = sessionStorage.getItem(
      "post_login_location_prompt_shown",
    );
    if (!alreadyShown && locationStore.locationStatus === "not_set") {
      setPostLoginLocationPromptVisible(true);
      sessionStorage.setItem("post_login_location_prompt_shown", "1");
    }
  }, [isLoading, isAuthenticated, locationStore.locationStatus]);

  // Watch for geolocation result after the user chose "Enable location"
  useEffect(() => {
    if (!awaitingGeoResult) return;
    const status = locationStore.locationStatus;
    if (status === "denied") {
      setPostLoginBlockedModalVisible(true);
      setAwaitingGeoResult(false);
    } else if (status === "allowed" || status === "unsupported") {
      setAwaitingGeoResult(false);
    }
  }, [awaitingGeoResult, locationStore.locationStatus]);

  useEffect(() => {
    if (!postLoginLocationPromptVisible) return;
    const status = locationStore.locationStatus;
    if (status !== "not_set") {
      setPostLoginLocationPromptVisible(false);
    }
  }, [postLoginLocationPromptVisible, locationStore.locationStatus]);

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
          // await initializeCanisters(isAuth, identity);
        } else {
          updateAllActors(null);
        }
      } catch (e) {
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
            ? `https://id.ai`
            : `http://rdmx6-jaaaa-aaaaa-aaadq-cai.localhost:4943`,

        onSuccess: async () => {
          const identity = authClient.getIdentity();
          setIsAuthenticated(true);
          setIdentity(identity);

          // Update actors (with error handling)
          updateAllActors(identity);

          // Get the principal and exchange for Firebase token
          try {
            const principal = identity.getPrincipal().toString();
            const result = await signInWithInternetIdentity(principal);
            setFirebaseUser(result.user);
            try {
              await authCanisterService.updateUserActiveStatus(true);
            } catch (error) {
            }
          } catch (fbError) {
          }

          setIsLoading(false);
        },
        onError: (err?: string) => {
          setError(err || "Login failed");
          setIsLoading(false);
        },
      });
    } catch (e) {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    if (!authClient) return;

    // Update user active status to false before logout
    try {
      await authCanisterService.updateUserActiveStatus(false);
    } catch (error) {
    }

    // Clear stored IC custom token
    clearICCustomToken();

    // Logout from Firebase
    const auth = getFirebaseAuth();
    try {
      await firebaseSignOut(auth).catch(() => {
      });
    } catch (error) {
    }

    // Logout from Internet Identity
    await authClient.logout();
    setIsAuthenticated(false);
    setIdentity(null);
    setFirebaseUser(null);
    updateAllActors(null);
  };


  // Helpers exposed for pages to render the post-login prompt UI
  const requestLocationFromPrompt = async () => {
    setPostLoginLocationPromptVisible(false);
    setAwaitingGeoResult(true);
    try {
      await locationStore.requestLocation();
    } catch {
      // ignore - store handles errors
    }
  };

  const skipPostLoginLocationPrompt = () => {
    setPostLoginLocationPromptVisible(false);
    // Show the blocked/manual selection modal so the user can pick an address
    setPostLoginBlockedModalVisible(true);
  };

  const acknowledgePostLoginBlockedModal = () => {
    setPostLoginBlockedModalVisible(false);
  };

  const showPostLoginLocationPrompt = () => {
    // Only show the prompt when we truly don't have a permission state.
    // This prevents callers (e.g. navigation state or other flows) from forcing
    // the prompt when the user already allowed/denied location.
    if (locationStore.locationStatus !== "not_set") {
      return;
    }
    try {
      sessionStorage.setItem("post_login_location_prompt_shown", "1");
    } catch {}
    setPostLoginLocationPromptVisible(true);
  };

  const value = {
    authClient,
    isAuthenticated,
    identity,
    firebaseUser,
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
    // Post-login prompt controls (UI lives in pages)
    postLoginLocationPromptVisible,
    requestLocationFromPrompt,
    skipPostLoginLocationPrompt,
    postLoginBlockedModalVisible,
    acknowledgePostLoginBlockedModal,
    showPostLoginLocationPrompt,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      {/* Post-login location prompt UI is rendered by pages (e.g. Home) using
          the exposed flags and helpers from the context value. */}
    </AuthContext.Provider>
  );
};
