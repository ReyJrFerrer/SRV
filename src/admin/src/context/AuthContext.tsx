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
import { getFirebaseAuth } from "../services/firebaseApp";
import { signInWithInternetIdentity } from "../services/identityBridge";
import { updateAdminActor } from "../services/adminServiceCanister";
import { updateMediaActor } from "../services/mediaServiceCanister";
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
  updateMediaActor();
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

  // Listen to Firebase auth state changes
  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        console.log("[Admin] Firebase user authenticated:", user.uid);

        // Check if user has admin custom claim
        try {
          const tokenResult = await user.getIdTokenResult(true); // Force refresh to get latest claims
          const isAdminUser = tokenResult.claims.isAdmin === true;
          setIsAdmin(isAdminUser);
          console.log("[Admin] Admin status from token:", isAdminUser);
        } catch (error) {
          console.error("[Admin] Error checking admin status:", error);
          setIsAdmin(false);
        }
      } else {
        console.log("[Admin] No Firebase user");
        setIsAdmin(false);
      }
    });

    return () => unsubscribe();
  }, []);

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

            console.log(
              "✅ [Admin] Successfully authenticated with Internet Identity",
            );
            console.log(
              "[Admin] Principal:",
              identity.getPrincipal().toString(),
            );

            // Get the principal and exchange for Firebase token
            try {
              const principal = identity.getPrincipal().toString();
              console.log(
                "🔄 [Admin] Attempting to authenticate with Firebase...",
              );

              const result = await signInWithInternetIdentity(principal);
              setFirebaseUser(result.user);

              console.log(
                "✅ [Admin] Successfully authenticated with Firebase!",
              );
              console.log("[Admin] Firebase UID:", result.user.uid);

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
                console.log(
                  "🔧 [Admin] Auto-creating admin profile and granting role...",
                );

                // Create admin profile with UID and principal
                const adminResult = await createAdminProfile(
                  result.user.uid,
                  principal,
                  "Admin User",
                  "",
                );

                console.log("✅ [Admin] Admin profile created successfully!");

                // Force token refresh to get updated claims
                if (adminResult.success) {
                  console.log(
                    "🔄 [Admin] Refreshing token to get admin claims...",
                  );
                  await result.user.getIdToken(true); // Force refresh
                  console.log("✅ [Admin] Token refreshed with admin claims!");

                  // Update admin status immediately
                  setIsAdmin(true);
                } else {
                  console.warn(
                    "⚠️ [Admin] Admin profile creation failed:",
                    adminResult.message,
                  );
                  setIsAdmin(true);
                }
              } catch (adminError) {
                console.warn(
                  "⚠️ [Admin] Could not auto-create admin profile:",
                  adminError,
                );
                setIsAdmin(true);
              }
              // }

              // Notify user if they need to create a profile
              if (result.needsProfile) {
                console.log(
                  "📝 [Admin] New user detected - profile creation required",
                );
                console.log("[Admin] Message:", result.message);
              } else {
                console.log("👤 [Admin] User has existing profile");
              }
            } catch (fbError) {
              console.error(
                "❌ [Admin] Failed to authenticate with Firebase:",
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
          console.error("❌ [Admin] Login error:", err);
          setError(err || "Login failed");
          setIsLoading(false);
        },
      });
    } catch (e) {
      console.error("❌ [Admin] Login exception:", e);
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
    await authClient.logout();
    setIsAuthenticated(false);
    setIdentity(null);
    setFirebaseUser(null);
    setIsAdmin(false);
    updateAllAdminActors(null);
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
