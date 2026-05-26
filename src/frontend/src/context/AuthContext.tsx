import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import {
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import { getFirebaseAuth } from "../services/firebaseApp";

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
import { exchangeForFirebaseToken } from "../services/identityBridge";
import authCanisterService from "../services/authCanisterService";
import {
  initiateGoogleLogin,
  completeZkLoginFromCallback,
  clearEphemeralData,
  isZkLoginCallback,
} from "../services/zkLoginService";

export type { LocationStatus, Location, ManualFields };

interface AuthContextType {
  isAuthenticated: boolean;
  firebaseUser: FirebaseUser | null;
  login: () => Promise<void>;
  completeZkLogin: () => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
  profileStatus: { hasProfile: boolean; needsProfile: boolean } | null;
  email: string | null;
  location: Location | null;
  locationStatus: LocationStatus;
  setLocation: (status: LocationStatus, location?: Location | null) => void;
  addressMode: "context" | "manual";
  setAddressMode: (mode: "context" | "manual") => void;
  displayAddress: string;
  setDisplayAddress: (address: string) => void;
  manualFields: ManualFields;
  setManualFields: (fields: ManualFields) => void;
  pwaState: PWAState;
  enablePushNotifications: (userId: string) => Promise<boolean>;
  disablePushNotifications: (userId: string) => Promise<boolean>;
  postLoginLocationPromptVisible: boolean;
  requestLocationFromPrompt: () => Promise<void>;
  skipPostLoginLocationPrompt: () => void;
  postLoginBlockedModalVisible: boolean;
  acknowledgePostLoginBlockedModal: () => void;
  showPostLoginLocationPrompt: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
  const locationStore = useLocationStore();

  const {
    pwaState,
    enablePushNotifications: enablePushNotificationsPWA,
    disablePushNotifications: disablePushNotificationsPWA,
  } = usePWA();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileStatus, setProfileStatus] = useState<{
    hasProfile: boolean;
    needsProfile: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [postLoginLocationPromptVisible, setPostLoginLocationPromptVisible] =
    useState(false);
  const [postLoginBlockedModalVisible, setPostLoginBlockedModalVisible] =
    useState(false);
  const [awaitingGeoResult, setAwaitingGeoResult] = useState(false);

  useEffect(() => {
    locationStore.initialize();
  }, [locationStore]);

  useEffect(() => {
    sessionManager.initialize().catch(() => {});
  }, []);

  useEffect(() => {
    let mounted = true;
    if (typeof navigator !== "undefined" && (navigator as any).permissions) {
      try {
        (navigator as any).permissions
          .query({ name: "geolocation" })
          .then((p: any) => {
            if (!mounted) return;
            if (p && p.state === "granted") {
              if (locationStore.locationStatus !== "allowed") {
                try {
                  locationStore.requestLocation().catch(() => {});
                } catch {}
              }
            }
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

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isAuthenticated && firebaseUser) {
      setIsAuthenticated(!!firebaseUser);
    }
  }, [firebaseUser]);

  useEffect(() => {
    const autoEnablePushNotifications = async () => {
      if (
        !isLoading &&
        isAuthenticated &&
        firebaseUser &&
        pwaState.pushNotificationSupported &&
        pwaState.pushPermission !== "denied" &&
        !pwaState.pushSubscribed
      ) {
        try {
          await enablePushNotificationsPWA(firebaseUser.uid);
        } catch {}
      }
    };
    autoEnablePushNotifications();
  }, [
    isLoading,
    isAuthenticated,
    firebaseUser,
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
        if (isZkLoginCallback()) {
          setIsLoading(false);
          return;
        }

        const storedSession = await sessionManager.getSession();
        if (storedSession?.principal) {
          try {
            const sessionDuration =
              getRecommendedSessionDuration() / (1000 * 1000);
            const result = await Promise.race([
              exchangeForFirebaseToken(
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
            setFirebaseUser(result.user);
            setIsAuthenticated(true);
            if (storedSession.email) {
              setEmail(storedSession.email);
            }
            setProfileStatus({
              hasProfile: result.hasProfile,
              needsProfile: result.needsProfile,
            });
          } catch {
            await sessionManager.clearSession();
          }
        }
      } catch {}
      finally {
        setIsLoading(false);
      }
    };
    initializeAuth();
  }, []);

  const clearAuthStorage = async () => {
    try {
      await sessionManager.clearSession();
    } catch {}
    try {
      const auth = getFirebaseAuth();
      await firebaseSignOut(auth);
    } catch {}
    try {
      sessionStorage.removeItem("post_login_location_prompt_shown");
    } catch {}
    try {
      clearEphemeralData();
    } catch {}
  };

  const login = async () => {
    await clearAuthStorage();

    setIsLoading(true);
    setError(null);
    sessionStorage.setItem("just_logged_in", "1");

    try {
      await initiateGoogleLogin();
    } catch (err) {
      sessionStorage.removeItem("just_logged_in");
      setError(
        err instanceof Error
          ? err.message
          : "Failed to start Google sign-in. Please try again.",
      );
      setIsLoading(false);
    }
  };

  const completeZkLogin = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const session = await completeZkLoginFromCallback();
      const sessionDurationNs = getRecommendedSessionDuration();
      const sessionDurationMs = sessionDurationNs / (1000 * 1000);

      const result = await exchangeForFirebaseToken(
        session.address,
        sessionDurationMs,
        session.email,
      );

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

      clearEphemeralData();
    } catch (err) {
      clearEphemeralData();
      setError(
        err instanceof Error
          ? err.message
          : "Authentication failed. Please try again.",
      );
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = async () => {
    try {
      await authCanisterService.updateUserActiveStatus(false);
    } catch {}

    await sessionManager.clearSession();
    clearEphemeralData();

    const auth = getFirebaseAuth();
    try {
      await firebaseSignOut(auth).catch(() => {});
    } catch {}

    setProfileStatus(null);
    setIsAuthenticated(false);
    setFirebaseUser(null);
    setEmail(null);
  };

  const requestLocationFromPrompt = async () => {
    setPostLoginLocationPromptVisible(false);
    setAwaitingGeoResult(true);
    try {
      await locationStore.requestLocation();
    } catch {}
  };

  const skipPostLoginLocationPrompt = () => {
    setPostLoginLocationPromptVisible(false);
    setPostLoginBlockedModalVisible(true);
  };

  const acknowledgePostLoginBlockedModal = () => {
    setPostLoginBlockedModalVisible(false);
  };

  const showPostLoginLocationPrompt = () => {
    if (locationStore.locationStatus !== "not_set") {
      return;
    }
    try {
      sessionStorage.setItem("post_login_location_prompt_shown", "1");
    } catch {}
    setPostLoginLocationPromptVisible(true);
  };

  const value = {
    isAuthenticated,
    firebaseUser,
    login,
    completeZkLogin,
    logout,
    isLoading,
    error,
    profileStatus,
    email,
    location: locationStore.location,
    locationStatus: locationStore.locationStatus,
    setLocation: locationStore.setLocation,
    addressMode: locationStore.addressMode,
    setAddressMode: locationStore.setAddressMode,
    displayAddress: locationStore.displayAddress,
    setDisplayAddress: locationStore.setDisplayAddress,
    manualFields: locationStore.manualFields,
    setManualFields: locationStore.setManualFields,
    pwaState,
    enablePushNotifications: enablePushNotificationsPWA,
    disablePushNotifications: disablePushNotificationsPWA,
    postLoginLocationPromptVisible,
    requestLocationFromPrompt,
    skipPostLoginLocationPrompt,
    postLoginBlockedModalVisible,
    acknowledgePostLoginBlockedModal,
    showPostLoginLocationPrompt,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
