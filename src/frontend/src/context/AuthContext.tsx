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
  sessionManager,
  getRecommendedSessionDuration,
} from "../utils/sessionPersistence";

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
  profileStatus: { hasProfile: boolean; needsProfile: boolean } | null;
  isExplicitLogin: boolean;
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

// Updates all canister actors with the current user identity
const updateAllActors = (identity: Identity | null) => {
  try {
    updateReputationActor(identity);
  } catch (error) {}
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
  const [profileStatus, setProfileStatus] = useState<{
    hasProfile: boolean;
    needsProfile: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExplicitLogin, setIsExplicitLogin] = useState(false);
  const [isRefreshingSession, setIsRefreshingSession] = useState(false);
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

  // Initialize session manager on mount
  useEffect(() => {
    sessionManager.initialize().catch(() => {});
  }, []);

  // Handle visibility change to refresh session when app becomes visible
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (
        document.visibilityState === "visible" &&
        isAuthenticated &&
        identity
      ) {
        try {
          const needsRefresh = await sessionManager.needsRefresh();
          if (needsRefresh) {
            // Refresh Firebase token
            const principal = identity.getPrincipal().toString();
            const sessionDuration =
              getRecommendedSessionDuration() / (1000 * 1000); // Convert ns to ms
            await signInWithInternetIdentity(principal, sessionDuration);
            await sessionManager.updateLastRefresh();
          }
        } catch (error) {
          // Silent fail - will retry on next visibility change
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isAuthenticated, identity]);

  // Handle automatic session refresh events
  useEffect(() => {
    const handleSessionRefresh = async () => {
      if (isRefreshingSession || !isAuthenticated || !identity) return;

      setIsRefreshingSession(true);
      try {
        const principal = identity.getPrincipal().toString();
        const sessionDuration = getRecommendedSessionDuration() / (1000 * 1000); // Convert ns to ms
        await signInWithInternetIdentity(principal, sessionDuration);
        await sessionManager.updateLastRefresh();
      } catch (error) {
        // If refresh fails, only logout if IC delegation expired
        try {
          const isAuth = await authClient?.isAuthenticated();
          if (!isAuth) {
            await logout();
          }
        } catch {}
      } finally {
        setIsRefreshingSession(false);
      }
    };

    window.addEventListener("session-refresh-needed", handleSessionRefresh);
    return () => {
      window.removeEventListener(
        "session-refresh-needed",
        handleSessionRefresh,
      );
    };
  }, [isAuthenticated, identity, isRefreshingSession, authClient]);

  // Auto-request location if permission already granted
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
          .catch(() => {});
      } catch {}
    }
    return () => {
      mounted = false;
    };
  }, [locationStore]);

  // Listen to Firebase auth state changes and auto-refresh token if IC session still valid
  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);

      // If Firebase session expired but IC session is still valid, refresh
      if (!user && isAuthenticated && identity) {
        try {
          const principal = identity.getPrincipal().toString();
          const result = await signInWithInternetIdentity(principal);
          setFirebaseUser(result.user);
        } catch (error) {
          // Only logout if we truly can't refresh (IC delegation expired)
          await logout();
        }
      }
    });

    return () => unsubscribe();
  }, [isAuthenticated, identity]);

  // Auto-enable push notifications on login if supported and not denied
  useEffect(() => {
    const autoEnablePushNotifications = async () => {
      if (
        !isLoading &&
        isAuthenticated &&
        identity &&
        pwaState.pushNotificationSupported &&
        pwaState.pushPermission !== "denied" &&
        !pwaState.pushSubscribed
      ) {
        try {
          const userId = identity.getPrincipal().toString() || "anonymous";
          await enablePushNotificationsPWA(userId);
        } catch (error) {}
      }
    };

    autoEnablePushNotifications();
  }, [
    isLoading,
    isAuthenticated,
    identity,
    pwaState.pushNotificationSupported,
    pwaState.pushPermission,
    pwaState.pushSubscribed,
    enablePushNotificationsPWA,
  ]);

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

  // Initialize IC auth client on mount and check if already authenticated
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

  // Login: authenticates with Internet Identity, bridges to Firebase, updates online status
  const login = async () => {
    if (!authClient) return;

    setIsLoading(true);
    setError(null);
    setIsExplicitLogin(true);

    try {
      // Get platform-specific session duration
      const sessionDurationNs = getRecommendedSessionDuration();
      const sessionDurationMs = sessionDurationNs / (1000 * 1000); // Convert ns to ms

      await authClient.login({
        identityProvider:
          // NOTE FOR FUTURE REY - the localhost internet identity does not work anymore because  
          // it gives the error value - Response verification failed: Certification values not found
          // Intuition tells me it's the dfx version and since they're we're using the latest localhost internet identity 
          // then it might be deprecated already.
          // process.env.DFX_NETWORK === "ic" ||
          // process.env.DFX_NETWORK === "playground"
          // ?
          `https://id.ai`,
        // : `http://rdmx6-jaaaa-aaaaa-aaadq-cai.localhost:4943`
        // Set session duration based on platform (7 days mobile/PWA, 30 days desktop)
        maxTimeToLive: BigInt(sessionDurationNs),

        onSuccess: async () => {
          const identity = authClient.getIdentity();
          setIsAuthenticated(true);
          setIdentity(identity);

          // Update actors (with error handling)
          updateAllActors(identity);

          // Get the principal and exchange for Firebase token
          try {
            const principal = identity.getPrincipal().toString();
            const result = await signInWithInternetIdentity(
              principal,
              sessionDurationMs,
            );
            setFirebaseUser(result.user);
            // Store profile status from backend response (avoids race condition with Firestore)
            setProfileStatus({
              hasProfile: result.hasProfile,
              needsProfile: result.needsProfile,
            });
            try {
              await authCanisterService.updateUserActiveStatus(true);
            } catch (error) {}
          } catch (fbError) {
            setError("Authentication failed. Please try again.");
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

  // Logout: updates online status, clears Firebase/IC sessions, resets state
  const logout = async () => {
    if (!authClient) return;

    // Update user active status to false before logout
    try {
      await authCanisterService.updateUserActiveStatus(false);
    } catch (error) {}

    // Clear session from SessionManager
    await sessionManager.clearSession();

    // Clear stored IC custom token (legacy)
    clearICCustomToken();

    // Logout from Firebase
    const auth = getFirebaseAuth();
    try {
      await firebaseSignOut(auth).catch(() => {});
    } catch (error) {}

    // Logout from Internet Identity
    await authClient.logout();

    // Clear profile status
    setProfileStatus(null);
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
    profileStatus,
    isExplicitLogin,
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
