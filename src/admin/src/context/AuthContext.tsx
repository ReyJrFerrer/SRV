import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { AuthClient } from "@dfinity/auth-client";
import { Identity } from "@dfinity/agent";
import { updateAdminActor } from "../services/adminServiceCanister";
import { updateRemittanceActor } from "../services/remittanceServiceCanister";
import { updateMediaActor } from "../services/mediaServiceCanister";
import {
  initializeCanisterReferences,
  shouldInitializeCanisters,
} from "../services/canisterInitService";

interface AuthContextType {
  authClient: AuthClient | null;
  isAuthenticated: boolean;
  identity: Identity | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const updateAllAdminActors = (identity: Identity | null) => {
  updateAdminActor(identity);
  updateRemittanceActor(identity);
  updateMediaActor(identity);
};

const initializeCanisters = async (
  isAuthenticated: boolean,
  identity: Identity | null,
) => {
  if (shouldInitializeCanisters(isAuthenticated, identity)) {
    try {
      await initializeCanisterReferences();
    } catch (error) {
      // //console.warn("Failed to initialize canister references:", error);
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
  const [authClient, setAuthClient] = useState<AuthClient | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

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
          await initializeCanisters(isAuth, identity);

          // Check if user has admin privileges - COMMENTED OUT FOR NOW
          // try {
          //   // Import the admin service function to check admin role
          //   const { checkAdminRole } = await import(
          //     "../services/adminServiceCanister"
          //   );
          //   const hasAdminRole = await checkAdminRole(principalText);
          //   setIsAdmin(hasAdminRole);
          // } catch (adminError) {
          //   //console.warn("Failed to check admin role:", adminError);
          //   setIsAdmin(false);
          // }

          // Temporarily set all authenticated users as admin for testing
          setIsAdmin(true);
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
          process.env.DFX_NETWORK === "ic"
            ? "https://identity.ic0.app"
            : `http://rdmx6-jaaaa-aaaaa-aaadq-cai.localhost:4943`,
        onSuccess: async () => {
          try {
            const identity = authClient.getIdentity();

            setIsAuthenticated(true);
            setIdentity(identity);
            updateAllAdminActors(identity);
            await initializeCanisters(true, identity);

            // Check admin privileges after login - COMMENTED OUT FOR NOW
            // try {
            //   const { checkAdminRole } = await import(
            //     "../services/adminServiceCanister"
            //   );
            //   const hasAdminRole = await checkAdminRole(principalText);
            //   setIsAdmin(hasAdminRole);

            //   if (!hasAdminRole) {
            //     setError("Access denied: Admin privileges required");
            //     await logout();
            //     return;
            //   }
            // } catch (adminError) {
            //   //console.error("Failed to verify admin privileges:", adminError);
            //   setError("Failed to verify admin privileges");
            //   await logout();
            //   return;
            // }

            // Temporarily set all authenticated users as admin for testing
            setIsAdmin(true);

            setIsLoading(false);
          } catch (onSuccessError) {
            //console.error("Error in onSuccess callback:", onSuccessError);
            setError("Authentication succeeded but failed to initialize");
            setIsLoading(false);
          }
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
    setIsAdmin(false);
    updateAllAdminActors(null);
  };

  const value = {
    authClient,
    isAuthenticated,
    identity,
    login,
    logout,
    isLoading,
    error,
    isAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
