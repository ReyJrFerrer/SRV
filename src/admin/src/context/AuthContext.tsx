import React, {
  createContext,
  useContext,
  useState,
  useEffect,
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
import { getFirebaseAuth, getFirebaseFirestore } from "../services/firebaseApp";
import { signInWithInternetIdentity } from "../services/identityBridge";
import { updateAdminActor } from "../services/adminServiceCanister";
import { createAdminProfile } from "../services/adminAuthHelper";
import authCanisterService from "../../../frontend/src/services/authCanisterService";
import { updateReputationActor } from "../../../frontend/src/services/reputationCanisterService";

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const updateAllAdminActors = (identity: Identity | null) => {
  updateAdminActor(identity);
  updateReputationActor(identity);
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

  // Logout function (defined early so it can be used in useEffect)
  // Using useCallback to make it stable
  const logout = useCallback(async () => {
    // Get current authClient from state when called
    const currentAuthClient = authClient;
    if (!currentAuthClient) return;

    // Update user active status to false before logout
    try {
      await authCanisterService.updateUserActiveStatus(false);
    } catch (error) {
      console.error(
        "[Admin] Error updating user active status on logout:",
        error,
      );
      // Continue with logout even if this fails
    }

    // Logout from Firebase
    const auth = getFirebaseAuth();
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error("[Admin] Error signing out from Firebase:", error);
    }

    // Logout from Internet Identity
    if (currentAuthClient) {
      await currentAuthClient.logout();
    }
    setIsAuthenticated(false);
    setIdentity(null);
    setFirebaseUser(null);
    setIsAdmin(false);
    updateAllAdminActors(null);
  }, [authClient]);

  // Listen to Firebase auth state changes
  useEffect(() => {
    const auth = getFirebaseAuth();
    let firestoreUnsubscribe: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        // Clean up previous listener if exists
        if (firestoreUnsubscribe) {
          firestoreUnsubscribe();
          firestoreUnsubscribe = null;
        }

        // Check if user is disabled (suspended) - try to get token, if it fails, user is disabled
        try {
          await user.getIdToken(true); // This will throw if user is disabled

          // Check if user has admin custom claim
          const tokenResult = await user.getIdTokenResult(true);
          const isAdminUser = tokenResult.claims.isAdmin === true;
          setIsAdmin(isAdminUser);

          // Set up real-time listener for Firestore locked status
          // Note: This is a backup listener - NavigationGuard also has one
          try {
            const db = getFirebaseFirestore();
            // Use modular API from firebase/firestore
            const { doc, onSnapshot } = await import("firebase/firestore");
            const userRef = doc(db, "users", user.uid);

            firestoreUnsubscribe = onSnapshot(
              userRef,
              (snapshot) => {
                if (snapshot.exists()) {
                  const userData = snapshot.data();
                  if (userData?.locked === true) {
                    // Suspension is handled by NavigationGuard, which shows the modal
                    // No automatic logout here
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
          // If getIdToken fails, user might be disabled
          if (
            error?.code === "auth/user-disabled" ||
            error?.message?.includes("disabled")
          ) {
            // Suspension is handled by NavigationGuard, which shows the modal
            // No automatic logout here
            return;
          }
          console.error("[Admin] Error checking admin status:", error);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
        // Clean up listener when user logs out
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
  }, [logout]); // Include logout in dependencies

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
          updateAllAdminActors(identity);
        } else {
          updateAllAdminActors(null);
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
            ? `https://id.ai`
            : `http://rdmx6-jaaaa-aaaaa-aaadq-cai.localhost:4943`,
        onSuccess: async () => {
          try {
            const identity = authClient.getIdentity();

            setIsAuthenticated(true);
            setIdentity(identity);
            updateAllAdminActors(identity);

            // Get the principal and exchange for Firebase token
            try {
              const principal = identity.getPrincipal().toString();

              const result = await signInWithInternetIdentity(principal);
              setFirebaseUser(result.user);

              // Update user active status to true on successful login
              try {
                await authCanisterService.updateUserActiveStatus(true);
              } catch (error) {
                console.error(
                  "[Admin] Error updating user active status on login:",
                  error,
                );
                // Continue with login even if this fails
              }

              // Auto-grant admin role for testing (development only)
              // if (import.meta.env.DEV) {
              try {
                // Create admin profile with UID and principal
                // Don't pass name - let the backend generate sequential admin name (admin00, admin01, etc.)
                const adminResult = await createAdminProfile(
                  result.user.uid,
                  principal,
                  undefined, // Let backend generate sequential name
                  "",
                );

                // Force token refresh to get updated claims
                if (adminResult.success) {
                  await result.user.getIdToken(true); // Force refresh

                  // Update admin status immediately
                  setIsAdmin(true);
                } else {
                  console.warn(
                    "[Admin] Admin profile creation failed:",
                    adminResult.message,
                  );
                  setIsAdmin(true);
                }
              } catch (adminError) {
                console.warn(
                  "[Admin] Could not auto-create admin profile:",
                  adminError,
                );
                setIsAdmin(true);
              }
              // }

              // Notify user if they need to create a profile
              // Profile creation handled by backend
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
