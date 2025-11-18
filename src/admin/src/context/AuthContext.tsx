import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { AuthClient } from "@dfinity/auth-client";
import { Identity } from "@dfinity/agent";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { getFirebaseAuth, getFirebaseFirestore } from "../services/firebaseApp";
import { signInWithInternetIdentity } from "../services/identityBridge";
import { updateAdminActor } from "../services/adminServiceCanister";
import { createAdminProfile } from "../services/adminAuthHelper";
import { updateReputationActor } from "../../../frontend/src/services/reputationCanisterService";

interface AuthContextType {
  authClient: AuthClient | null;
  isAuthenticated: boolean;
  identity: Identity | null;
  firebaseUser: FirebaseUser | null;
  login: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Updates all canister actors with the current admin identity
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

  // Listen to Firebase auth state changes and check admin status
  useEffect(() => {
    const auth = getFirebaseAuth();
    let firestoreUnsubscribe: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
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
          setIsAdmin(isAdminUser);

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
        setIsAdmin(false);
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
  }, []);

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

  // Login: authenticates with Internet Identity, then bridges to Firebase
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

            try {
              const principal = identity.getPrincipal().toString();

              const result = await signInWithInternetIdentity(principal);
              setFirebaseUser(result.user);

              try {
                const adminResult = await createAdminProfile(
                  result.user.uid,
                  principal,
                  undefined,
                  "",
                );

                if (adminResult.success) {
                  await result.user.getIdToken(true);
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
    isLoading,
    error,
    isAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
