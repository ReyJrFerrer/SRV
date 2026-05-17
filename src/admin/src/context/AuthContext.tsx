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
  onAuthStateChanged,
  User as FirebaseUser,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { getFirebaseAuth, getFirebaseFirestore } from "../services/firebaseApp";
import { signInWithInternetIdentity } from "../services/identityBridge";
import { updateAdminActor } from "../services/adminServiceCanister";
import { createAdminProfile } from "../services/adminAuthHelper";
import {
  sessionManager,
  getRecommendedSessionDuration,
} from "../utils/sessionPersistence";

import { httpsCallable } from "firebase/functions";
import { getFirebaseFunctions } from "../services/firebaseApp";

interface AuthContextType {
  authClient: AuthClient | null;
  isAuthenticated: boolean;
  identity: Identity | null;
  firebaseUser: FirebaseUser | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
  isAdmin: boolean;
  showPasswordPrompt: boolean;
  verifyPasswordAndProceed: (password: string) => Promise<void>;
  cancelPasswordPrompt: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Updates all canister actors with the current admin identity
const updateAllAdminActors = (identity: Identity | null) => {
  updateAdminActor(identity);
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
  const [authClient, setAuthClient] = useState<AuthClient | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasAdminClaim, setHasAdminClaim] = useState(false);
  const [hasVerifiedPassword, setHasVerifiedPassword] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [pendingAuthState, setPendingAuthState] = useState<{
    identity: Identity;
    firebaseUser: FirebaseUser;
    principal: string;
  } | null>(null);
  const [isRefreshingSession, setIsRefreshingSession] = useState(false);
  const isRefreshingFirebase = useRef(false);

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
            const storedSession = await sessionManager.getSession();
            const principal =
              storedSession?.principal ?? identity?.getPrincipal().toString();
            if (principal) {
              const sessionDuration =
                getRecommendedSessionDuration() / (1000 * 1000);
              await signInWithInternetIdentity(principal, sessionDuration);
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
        const storedSession = await sessionManager.getSession();
        const principal =
          storedSession?.principal ?? identity?.getPrincipal().toString();
        if (!principal) {
          setIsRefreshingSession(false);
          return;
        }
        const sessionDuration = getRecommendedSessionDuration() / (1000 * 1000);
        await signInWithInternetIdentity(principal, sessionDuration);
        await sessionManager.updateLastRefresh();
      } catch (error) {
        // Retry in 60 seconds
        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent("admin-session-refresh-needed"),
          );
        }, 60000);
      } finally {
        setIsRefreshingSession(false);
      }
    };

    window.addEventListener("admin-session-refresh-needed", handleSessionRefresh);
    return () => {
      window.removeEventListener(
        "admin-session-refresh-needed",
        handleSessionRefresh,
      );
    };
  }, [isAuthenticated, identity, isRefreshingSession, authClient]);

  const logout = useCallback(async () => {
    await sessionManager.clearSession();

    if (authClient) {
      try {
        await authClient.logout();
      } catch (error) {}
    }
    try {
      const auth = getFirebaseAuth();
      await firebaseSignOut(auth);
    } catch (error) {}

    setIsAuthenticated(false);
    setIdentity(null);
    setFirebaseUser(null);
    setIsAdmin(false);
    setHasAdminClaim(false);
    setHasVerifiedPassword(false);
    updateAllAdminActors(null);
  }, [authClient]);

  // Listen to Firebase auth state changes and check admin status
  useEffect(() => {
    const auth = getFirebaseAuth();
    let firestoreUnsubscribe: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // Guard against recursive calls during Firebase refresh
      if (isRefreshingFirebase.current) return;

      // If Firebase session expired but we're still authenticated, refresh.
      // Use stored principal as fallback when identity object is unavailable.
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
          const sessionDuration =
            getRecommendedSessionDuration() / (1000 * 1000);
          const result = await signInWithInternetIdentity(
            principal,
            sessionDuration,
          );
          setFirebaseUser(result.user);
        } catch (refreshError) {
          setFirebaseUser(null);
        } finally {
          isRefreshingFirebase.current = false;
        }
        return;
      }

      setFirebaseUser(user);

      if (user) {
        if (firestoreUnsubscribe) {
          firestoreUnsubscribe();
          firestoreUnsubscribe = null;
        }

        try {
          await user.getIdToken(true);

          const tokenResult = await user.getIdTokenResult(true);
          const isAdminUser = tokenResult.claims.isAdmin === true;
          setHasAdminClaim(isAdminUser);

          try {
            const db = getFirebaseFirestore();
            const { doc, onSnapshot } = await import("firebase/firestore");
            const userRef = doc(db, "users", user.uid);

            firestoreUnsubscribe = onSnapshot(
              userRef,
              (snapshot) => {
                if (snapshot.exists()) {
                  const userData = snapshot.data();
                  if (userData?.locked === true) {
                  }
                }
              },
              (error: any) => {
                console.error("[Admin] Error listening to lock status:", error);
              },
            );
          } catch (firestoreError: any) {
            console.error(
              "[Admin] Error setting up lock status listener:",
              firestoreError,
            );
          }
        } catch (error: any) {
          if (
            error?.code === "auth/user-disabled" ||
            error?.message?.includes("disabled")
          ) {
            return;
          }
          console.error("[Admin] Error checking admin status:", error);
          setIsAdmin(false);
        }
      } else {
        setHasAdminClaim(false);
        if (firestoreUnsubscribe) {
          firestoreUnsubscribe();
          firestoreUnsubscribe = null;
        }
      }
    });

    return () => {
      unsubscribe();
      if (firestoreUnsubscribe) {
        firestoreUnsubscribe();
      }
    };
  }, [isAuthenticated, identity, logout]);

  // Initialize IC auth client on mount and check if already authenticated
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const client = await AuthClient.create({
          idleOptions: { disableIdle: true },
        });
        setAuthClient(client);
        const isAuth = await client.isAuthenticated();

        if (isAuth) {
          const identity = client.getIdentity();
          setIsAuthenticated(true);
          setIdentity(identity);
          updateAllAdminActors(identity);

          const sessionDurationNs = getRecommendedSessionDuration();
          const sessionDurationMs = sessionDurationNs / (1000 * 1000);
          const principal = identity.getPrincipal().toString();
          const existingSession = await sessionManager.getSession();

          try {
            const result = await signInWithInternetIdentity(
              principal,
              sessionDurationMs,
            );
            setFirebaseUser(result.user);
            await checkAdminClaim(result.user);
            const tokenResult = await result.user.getIdTokenResult();
            if (tokenResult.claims.isAdmin === true) {
              setHasVerifiedPassword(true);
            }
            await sessionManager.storeSession({
              principal,
              firebaseToken: await result.user.getIdToken(),
              expiresAt: Date.now() + sessionDurationMs,
              lastRefresh: Date.now(),
              lastFirebaseRefresh: Date.now(),
              hasProfile: result.hasProfile,
              needsProfile: result.needsProfile,
              sessionDuration: sessionDurationMs,
            });
          } catch (e) {
            if (existingSession) {
              const result = await signInWithInternetIdentity(
                existingSession.principal,
                sessionDurationMs,
              );
              setFirebaseUser(result.user);
              await checkAdminClaim(result.user);
            } else {
              setError("Failed to restore session");
            }
          }
        } else {
          // IC delegation expired — try to restore from stored session.
          // The principal is permanent and the Cloud Function doesn't verify
          // the IC delegation, so we can re-authenticate with Firebase using
          // the stored principal alone.
          const storedSession = await sessionManager.getSession();
          if (storedSession?.principal) {
            try {
              const sessionDurationNs = getRecommendedSessionDuration();
              const sessionDurationMs = sessionDurationNs / (1000 * 1000);
              const signInWithTimeout = Promise.race([
                signInWithInternetIdentity(
                  storedSession.principal,
                  sessionDurationMs,
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
              await checkAdminClaim(result.user);
              setIsAuthenticated(true);
              setIdentity(client.getIdentity());
              const tokenResult = await result.user.getIdTokenResult();
              if (tokenResult.claims.isAdmin === true) {
                setHasVerifiedPassword(true);
              }
              // Update stored session
              await sessionManager.storeSession({
                principal: storedSession.principal,
                firebaseToken: await result.user.getIdToken(),
                expiresAt: Date.now() + sessionDurationMs,
                lastRefresh: Date.now(),
                lastFirebaseRefresh: Date.now(),
                hasProfile: result.hasProfile,
                needsProfile: result.needsProfile,
                sessionDuration: sessionDurationMs,
              });
            } catch {
              await sessionManager.clearSession();
              updateAllAdminActors(null);
            }
          } else {
            updateAllAdminActors(null);
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "An unknown error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  useEffect(() => {
    setIsAdmin(hasAdminClaim && hasVerifiedPassword);
  }, [hasAdminClaim, hasVerifiedPassword]);

  // Login: authenticates with Internet Identity, then bridges to Firebase
  const login = async () => {
    if (!authClient) return;

    setIsLoading(true);
    setError(null);
    setHasVerifiedPassword(false);

    try {
      // Get platform-specific session duration
      const sessionDurationNs = getRecommendedSessionDuration();
      const sessionDurationMs = sessionDurationNs / (1000 * 1000);

      await authClient.login({
        identityProvider: `https://id.ai`,
        maxTimeToLive: BigInt(sessionDurationNs),
        onSuccess: async () => {
          try {
            const identity = authClient.getIdentity();

            setIsAuthenticated(true);
            setIdentity(identity);
            updateAllAdminActors(identity);

            try {
              const principal = identity.getPrincipal().toString();

              const result = await signInWithInternetIdentity(
                principal,
                sessionDurationMs,
              );
              setFirebaseUser(result.user);

              // Store session for persistence
              await sessionManager.storeSession({
                principal,
                firebaseToken: await result.user.getIdToken(),
                expiresAt: Date.now() + sessionDurationMs,
                lastRefresh: Date.now(),
                lastFirebaseRefresh: Date.now(),
                hasProfile: result.hasProfile,
                needsProfile: result.needsProfile,
                sessionDuration: sessionDurationMs,
              });

try {
                  const functions = getFirebaseFunctions();
                  const isPasswordSetFn = httpsCallable(
                    functions,
                    "isAdminPasswordSet",
                  );
                  const passwordCheckResult = await isPasswordSetFn();
                  const passwordData = passwordCheckResult.data as {
                    success: boolean;
                    isSet: boolean;
                  };

                  if (passwordData.isSet) {
                    setPendingAuthState({
                      identity,
                      firebaseUser: result.user,
                      principal,
                    });
                    setShowPasswordPrompt(true);
                    setIsLoading(false);
                    return;
                  }

                  setHasVerifiedPassword(true);
                  await proceedWithAdminProfileCreation(result.user, principal);
                  await checkAdminClaim(result.user);
                } catch (checkError: any) {
                  setHasVerifiedPassword(true);
                  await proceedWithAdminProfileCreation(result.user, principal);
                  await checkAdminClaim(result.user);
                }
            } catch (fbError) {
              console.error(
                "[Admin] Failed to authenticate with Firebase:",
                fbError,
              );
            }

            setIsLoading(false);
          } catch (onSuccessError) {
            console.error(
              "[Admin] Error in onSuccess callback:",
              onSuccessError,
            );
            setError("Authentication succeeded but failed to initialize");
            setIsLoading(false);
          }
        },
        onError: (err?: string) => {
          console.error("[Admin] Login error:", err);
          setError(err || "Login failed");
          setIsLoading(false);
        },
      });
    } catch (e) {
      console.error("[Admin] Login exception:", e);
      setError(
        e instanceof Error
          ? e.message
          : "Failed to connect to Internet Identity",
      );
      setIsLoading(false);
    }
  };

  const verifyPasswordAndProceed = async (password: string) => {
    if (!pendingAuthState) return;

    setIsLoading(true);
    setError(null);

    try {
      const functions = getFirebaseFunctions();
      const verifyPasswordFn = httpsCallable(functions, "verifyAdminPassword");
      const verifyResult = await verifyPasswordFn({ password });
      const verifyData = verifyResult.data as {
        success: boolean;
        verified: boolean;
        message: string;
      };

      if (!verifyData.verified) {
        setError("Incorrect password. Please try again.");
        setIsLoading(false);
        return;
      }

      setShowPasswordPrompt(false);
      setHasVerifiedPassword(true);
      await proceedWithAdminProfileCreation(
        pendingAuthState.firebaseUser,
        pendingAuthState.principal,
      );
      await checkAdminClaim(pendingAuthState.firebaseUser);
      setPendingAuthState(null);
    } catch (error: any) {
      setError(error?.message || "Failed to verify password");
      setIsLoading(false);
    }
  };

  const checkAdminClaim = async (user: FirebaseUser) => {
    try {
      await user.getIdToken(true);
      const tokenResult = await user.getIdTokenResult();
      const isAdminUser = tokenResult.claims.isAdmin === true;
      setHasAdminClaim(isAdminUser);
      if (isAdminUser) {
        setHasVerifiedPassword(true);
      }
    } catch (error) {
      console.error("[Admin] Error checking admin claim:", error);
    }
  };

  const proceedWithAdminProfileCreation = async (
    firebaseUser: FirebaseUser,
    principal: string,
  ) => {
    try {
      const adminResult = await createAdminProfile(
        firebaseUser.uid,
        principal,
        undefined,
        "",
      );

      if (adminResult.success) {
        await firebaseUser.getIdToken(true);
      } else {
        console.warn(
          "[Admin] Admin profile creation failed:",
          adminResult.message,
        );
      }
    } catch (adminError: any) {
      if (adminError?.code === "permission-denied") {
        setError(
          adminError.message || "You are not authorized for admin access.",
        );
        try {
          if (authClient) {
            await authClient.logout();
          }
          await sessionManager.clearSession();
          setFirebaseUser(null);
          setIsAuthenticated(false);
        } catch (logoutError) {}
        setHasVerifiedPassword(false);
        setHasAdminClaim(false);
      } else {
        console.warn(
          "[Admin] Could not auto-create admin profile:",
          adminError,
        );
      }
    } finally {
      setIsLoading(false);
    }
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
    isAdmin,
    showPasswordPrompt,
    verifyPasswordAndProceed,
    cancelPasswordPrompt: () => {
      setShowPasswordPrompt(false);
      setPendingAuthState(null);
      logout();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
