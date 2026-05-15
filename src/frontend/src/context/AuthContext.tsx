import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
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
import {
  initiateGoogleLogin,
  completeZkLoginFromCallback,
  clearEphemeralData,
  isZkLoginCallback,
} from "../services/zkLoginService";

// Re-export types for backward compatibility
export type { LocationStatus, Location, ManualFields };

interface AuthContextType {
  authClient: AuthClient | null;
  isAuthenticated: boolean;
  identity: Identity | null;
  firebaseUser: FirebaseUser | null;
  login: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  completeZkLogin: () => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
  profileStatus: { hasProfile: boolean; needsProfile: boolean } | null;
  isExplicitLogin: boolean;
  loginMethod: "ii" | "zklogin" | null;
  email: string | null;
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
const updateAllActors = (_identity: Identity | null) => {
  try {
    // Reputation uses Firebase now
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
  const [loginMethod, setLoginMethod] = useState<"ii" | "zklogin" | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [isRefreshingSession, setIsRefreshingSession] = useState(false);
  const isRefreshingFirebase = useRef(false);
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
        !isRefreshingFirebase.current
      ) {
        try {
          const needsRefresh = await sessionManager.needsRefresh();
          if (needsRefresh) {
            // Use stored principal — the Cloud Function doesn't verify
            // the IC delegation, so this works even after delegation expiry.
            const storedSession = await sessionManager.getSession();
            const principal =
              storedSession?.principal ?? identity?.getPrincipal().toString();
            if (principal) {
              const sessionDuration =
                getRecommendedSessionDuration() / (1000 * 1000);
              await signInWithInternetIdentity(principal, sessionDuration, storedSession?.email);
              await sessionManager.updateLastRefresh();
            }
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
      if (
        isRefreshingSession ||
        isRefreshingFirebase.current ||
        !isAuthenticated
      )
        return;

      setIsRefreshingSession(true);
      try {
        // Use stored principal — works even if IC delegation has expired
        const storedSession = await sessionManager.getSession();
        const principal =
          storedSession?.principal ?? identity?.getPrincipal().toString();
        if (!principal) {
          setIsRefreshingSession(false);
          return;
        }
        const sessionDuration = getRecommendedSessionDuration() / (1000 * 1000);
        await signInWithInternetIdentity(principal, sessionDuration, storedSession?.email);
        await sessionManager.updateLastRefresh();
      } catch (error) {
        // Retry in 60 seconds — Cloud Function doesn't verify IC delegation,
        // so this is likely a transient network error, not an auth failure
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent("session-refresh-needed"));
        }, 60000);
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
      // Guard against recursive calls — signInWithCustomToken triggers
      // onAuthStateChanged(signOut) then onAuthStateChanged(signIn),
      // which would otherwise re-enter this handler mid-refresh
      if (isRefreshingFirebase.current) return;

      // If Firebase session expired but we're still authenticated, refresh.
      // Use stored principal as fallback when identity object is unavailable
      // (e.g. IC delegation expired but session data persists).
      if (!user && isAuthenticated) {
        isRefreshingFirebase.current = true;
        try {
          const storedSession = await sessionManager.getSession();
          const principal =
            storedSession?.principal ?? identity?.getPrincipal().toString();
          if (!principal) {
            setFirebaseUser(null);
            return;
          }
          const result = await signInWithInternetIdentity(principal, undefined, storedSession?.email);
          setFirebaseUser(result.user);
        } catch (error) {
          // Only null out if refresh genuinely failed
          setFirebaseUser(null);
        } finally {
          isRefreshingFirebase.current = false;
        }
      } else {
        setFirebaseUser(user);
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
        // Check if we're returning from a zkLogin OAuth callback.
        // If so, skip II initialization — the callback page will call
        // completeZkLogin() to finalize the auth flow.
        if (isZkLoginCallback()) {
          setIsLoading(false);
          return;
        }

        const client = await AuthClient.create({
          idleOptions: { disableIdle: true },
        });
        setAuthClient(client);
        const isAuth = await client.isAuthenticated();

        if (isAuth) {
          const identity = client.getIdentity();
          setIsAuthenticated(true);
          setIdentity(identity);
          setLoginMethod("ii");
          updateAllActors(identity);
          // Restore isExplicitLogin if it was persisted before a reload/redirect
          if (sessionStorage.getItem("isExplicitLogin") === "true") {
            setIsExplicitLogin(true);
          }
        } else {
          // IC delegation expired — try to restore from stored session.
          // The principal is permanent and the Cloud Function doesn't verify
          // the IC delegation, so we can re-authenticate with Firebase using
          // the stored principal alone.
          const storedSession = await sessionManager.getSession();
          if (storedSession?.principal) {
            try {
              const sessionDuration =
                getRecommendedSessionDuration() / (1000 * 1000);
              const signInWithTimeout = Promise.race([
                signInWithInternetIdentity(
                  storedSession.principal,
                  sessionDuration,
                  storedSession.email,
                ),
                new Promise<never>((_, reject) =>
                  setTimeout(
                    () => reject(new Error("Session restoration timed out")),
                    15000,
                  ),
                ),
              ]);
              const result = await signInWithTimeout;
              setFirebaseUser(result.user);
              setIsAuthenticated(true);
              setLoginMethod(storedSession.loginMethod ?? "ii");
              if (storedSession.email) {
                setEmail(storedSession.email);
              }
              // Only set II identity if the session was II-based
              if (!storedSession.loginMethod || storedSession.loginMethod === "ii") {
                setIdentity(client.getIdentity());
              }
              setProfileStatus({
                hasProfile: result.hasProfile,
                needsProfile: result.needsProfile,
              });
              // Restore isExplicitLogin if it was persisted before a reload/redirect
              if (sessionStorage.getItem("isExplicitLogin") === "true") {
                setIsExplicitLogin(true);
              }
            } catch {
              await sessionManager.clearSession();
              updateAllActors(null);
            }
          } else {
            updateAllActors(null);
          }
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
    sessionStorage.setItem("isExplicitLogin", "true");
    setLoginMethod("ii");
    setEmail(null); // II doesn't provide email

    try {
      // Get platform-specific session duration
      const sessionDurationNs = getRecommendedSessionDuration();
      const sessionDurationMs = sessionDurationNs / (1000 * 1000); // Convert ns to ms

      await authClient.login({
        identityProvider:
          `https://id.ai`,
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
            // Tag session with login method
            const session = await sessionManager.getSession();
            if (session) {
              session.loginMethod = "ii";
              await sessionManager.storeSession(session);
            }
            setFirebaseUser(result.user);
            // Store profile status from backend response (avoids race condition with Firestore)
            setProfileStatus({
              hasProfile: result.hasProfile,
              needsProfile: result.needsProfile,
            });
            if (result.hasProfile) {
              try {
                await authCanisterService.updateUserActiveStatus(true);
              } catch (error) {}
            }
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

  // Login with Google via zkLogin: generates ephemeral keys, redirects to Google OAuth
  const loginWithGoogle = async () => {
    setIsLoading(true);
    setError(null);
    setIsExplicitLogin(true);
    sessionStorage.setItem("isExplicitLogin", "true");
    setLoginMethod("zklogin");

    try {
      await initiateGoogleLogin();
      // The browser will redirect to Google OAuth — no further code runs here.
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to start Google sign-in. Please try again.",
      );
      setIsLoading(false);
    }
  };

  // Complete zkLogin flow after OAuth callback redirect
  const completeZkLogin = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const session = await completeZkLoginFromCallback();
      const sessionDurationNs = getRecommendedSessionDuration();
      const sessionDurationMs = sessionDurationNs / (1000 * 1000);

      // Bridge to Firebase using the zkLogin address as the identifier.
      // The Cloud Function accepts any stable string — it doesn't verify
      // whether it's an IC principal or a Sui address.
      const result = await signInWithInternetIdentity(
        session.address,
        sessionDurationMs,
        session.email,
      );

      // Tag session with login method and email
      const storedSession = await sessionManager.getSession();
      if (storedSession) {
        storedSession.loginMethod = "zklogin";
        if (session.email) {
          storedSession.email = session.email;
        }
        await sessionManager.storeSession(storedSession);
      }

      setFirebaseUser(result.user);
      setIsAuthenticated(true);
      if (session.email) {
        setEmail(session.email);
      }
      setProfileStatus({
        hasProfile: result.hasProfile,
        needsProfile: result.needsProfile,
      });

      if (result.hasProfile) {
        try {
          await authCanisterService.updateUserActiveStatus(true);
        } catch {}
      }

      // Clear the ephemeral key data from sessionStorage
      clearEphemeralData();
    } catch (err) {
      console.error("[AuthContext] completeZkLogin failed:", err);
      clearEphemeralData();
      setError(
        err instanceof Error
          ? err.message
          : "Authentication failed. Please try again.",
      );
      throw err; // Re-throw so the callback page can handle it
    } finally {
      setIsLoading(false);
    }
  }, [
    completeZkLoginFromCallback,
    sessionManager,
    signInWithInternetIdentity,
    authCanisterService,
    clearEphemeralData,
    getRecommendedSessionDuration,
    setFirebaseUser,
    setIsAuthenticated,
    setProfileStatus,
    setError,
    setIsLoading,
  ]);

  // Logout: updates online status, clears Firebase/IC sessions, resets state
  const logout = async () => {
    // Update user active status to false before logout
    try {
      await authCanisterService.updateUserActiveStatus(false);
    } catch (error) {}

    // Clear session from SessionManager
    await sessionManager.clearSession();

    // Clear stored IC custom token (legacy)
    clearICCustomToken();

    // Clear zkLogin ephemeral data
    clearEphemeralData();

    // Clear persisted explicit login flag
    sessionStorage.removeItem("isExplicitLogin");

    // Logout from Firebase
    const auth = getFirebaseAuth();
    try {
      await firebaseSignOut(auth).catch(() => {});
    } catch (error) {}

    // Logout from Internet Identity (if II client is available)
    if (authClient) {
      await authClient.logout();
    }

    // Clear profile status
    setProfileStatus(null);
    setIsAuthenticated(false);
    setIdentity(null);
    setFirebaseUser(null);
    setLoginMethod(null);
    setEmail(null);
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
    loginWithGoogle,
    completeZkLogin,
    logout,
    isLoading,
    error,
    profileStatus,
    isExplicitLogin,
    loginMethod,
    email,
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
