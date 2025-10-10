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
          const tokenResult = await user.getIdTokenResult();
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

          // Check if user has admin role from Firebase custom claims
          // The assignRole function will be called during login
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
            ? "https://identity.ic0.app"
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

              // Auto-grant admin role for testing (development only)
              if (import.meta.env.DEV) {
                try {
                  console.log(
                    "🔧 [Admin] Auto-creating admin profile and granting role...",
                  );
                  
                  // Create admin profile with UID and principal
                  await createAdminProfile(
                    result.user.uid,
                    principal,
                    "Admin User",
                    ""
                  );
                  
                  console.log(
                    "✅ [Admin] Admin profile created successfully! Please sign out and sign in again to refresh your token.",
                  );
                  
                  // Alert user to refresh
                  alert("Admin profile created! Please sign out and sign in again to activate admin privileges.");
                  
                  setIsAdmin(true);
                } catch (adminError) {
                  console.warn(
                    "⚠️ [Admin] Could not auto-create admin profile:",
                    adminError,
                  );
                  // Still set admin locally for testing
                  setIsAdmin(true);
                }
              }

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
              // Don't fail the login if Firebase auth fails
              // The user is still authenticated with IC
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
