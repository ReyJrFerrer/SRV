import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { AuthClient } from "@dfinity/auth-client";
import { Identity } from "@dfinity/agent";
import { updateAuthActor } from "../services/authCanisterService";
import { updateBookingActor } from "../services/bookingCanisterService";
import { updateServiceActor } from "../services/serviceCanisterService";
import { updateReviewActor } from "../services/reviewCanisterService";
import { updateReputationActor } from "../services/reputationCanisterService";
import { updateChatActor } from "../services/chatCanisterService";
import { updateRemittanceActor } from "../services/remittanceCanisterService";
import {
  initializeCanisterReferences,
  shouldInitializeCanisters,
} from "../services/canisterInitService";

// --- NEW: Types for Location State ---
type LocationStatus = "not_set" | "allowed" | "denied" | "unsupported";
interface Location {
  latitude: number;
  longitude: number;
}
// --- Shared manual address fields ---
export interface ManualFields {
  barangay: string;
  street: string;
  houseNumber: string;
  landmark?: string;
  municipality?: string;
  province?: string;
}

interface AuthContextType {
  authClient: AuthClient | null;
  isAuthenticated: boolean;
  identity: Identity | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
  // --- Location properties ---
  location: Location | null;
  locationStatus: LocationStatus;
  setLocation: (status: LocationStatus, location?: Location | null) => void;
  // --- Shared address state ---
  addressMode: "context" | "manual";
  setAddressMode: (mode: "context" | "manual") => void;
  displayAddress: string;
  setDisplayAddress: (address: string) => void;
  manualFields: ManualFields;
  setManualFields: (fields: ManualFields) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const updateAllActors = (identity: Identity | null) => {
  updateAuthActor(identity);
  updateBookingActor(identity);
  updateServiceActor(identity);
  updateReviewActor(identity);
  updateReputationActor(identity);
  updateChatActor(identity);
  updateRemittanceActor(identity);
};

const initializeCanisters = async (
  isAuthenticated: boolean,
  identity: Identity | null,
) => {
  if (shouldInitializeCanisters(isAuthenticated, identity)) {
    try {
      await initializeCanisterReferences();
    } catch (error) {
      // console.warn("Failed to initialize canister references:", error);
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
  // Initialize location from GPS location stored in localStorage on mount
  useEffect(() => {
    // Check for stored GPS location first
    const storedLocation = localStorage.getItem("userLocation");
    const storedPermission = localStorage.getItem("locationPermission");

    if (storedLocation && storedPermission === "allowed") {
      try {
        const location = JSON.parse(storedLocation);
        setLocationState(location);
        setLocationStatus("allowed");
      } catch {
        // If parsing fails, clear invalid data
        localStorage.removeItem("userLocation");
        localStorage.removeItem("locationPermission");
      }
    }
  }, []);
  const [authClient, setAuthClient] = useState<AuthClient | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Location state ---
  const [location, setLocationState] = useState<Location | null>(null);
  const [locationStatus, setLocationStatus] =
    useState<LocationStatus>("not_set");
  // --- Shared address state ---
  const [addressMode, setAddressMode] = useState<"context" | "manual">(
    "context",
  );
  const [displayAddress, setDisplayAddress] = useState<string>(
    "Detecting location...",
  );
  const [manualFields, setManualFields] = useState<ManualFields>({
    barangay: "",
    street: "",
    houseNumber: "",
    landmark: "",
    municipality: "",
    province: "",
  });

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
          await initializeCanisters(isAuth, identity);
        } else {
          updateAllActors(null);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "An unknown error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // --- Function to update location state ---
  const setLocation = (
    status: LocationStatus,
    newLocation?: Location | null,
  ) => {
    setLocationStatus(status);
    if (newLocation) {
      setLocationState(newLocation);
      // Store location in localStorage for persistence
      localStorage.setItem("userLocation", JSON.stringify(newLocation));
    } else if (status !== "allowed") {
      // Clear stored location if status is not allowed
      localStorage.removeItem("userLocation");
      setLocationState(null);
    }
    // Store the permission status to avoid asking on every visit
    localStorage.setItem("locationPermission", status);
  };

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
          const identity = authClient.getIdentity();
          setIsAuthenticated(true);
          setIdentity(identity);
          updateAllActors(identity);
          await initializeCanisters(true, identity);
          setIsLoading(false);
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
    updateAllActors(null);
  };

  const value = {
    authClient,
    isAuthenticated,
    identity,
    login,
    logout,
    isLoading,
    error,
    location,
    locationStatus,
    setLocation,
    addressMode,
    setAddressMode,
    displayAddress,
    setDisplayAddress,
    manualFields,
    setManualFields,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
