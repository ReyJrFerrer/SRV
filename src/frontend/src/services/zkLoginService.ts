/**
 * zkLogin Service
 *
 * Handles the Sui zkLogin authentication flow:
 * 1. Generate ephemeral key pair
 * 2. Compute nonce from ephemeral public key
 * 3. Build Google OAuth URL with nonce
 * 4. Parse JWT from OAuth callback
 * 5. Derive deterministic user salt via HMAC-SHA256
 * 6. Compute zkLogin Sui address from JWT + salt
 */

import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import {
  generateNonce,
  generateRandomness,
  jwtToAddress,
} from "@mysten/sui/zklogin";
import { jwtDecode } from "jwt-decode";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SESSION_STORAGE_KEY = "zklogin_ephemeral";
const FULLNODE_URL = "https://fullnode.testnet.sui.io:443";
const NETWORK = "testnet" as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ZkLoginJwtPayload {
  iss: string;
  sub: string;
  aud: string | string[];
  exp?: number;
  iat?: number;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

export interface EphemeralKeyData {
  secretKey: string; // Sui-formatted secret key string
  maxEpoch: number;
  randomness: string;
}

export interface ZkLoginSession {
  address: string;
  jwt: string;
  decodedJwt: ZkLoginJwtPayload;
  maxEpoch: number;
  email?: string;
}

// ---------------------------------------------------------------------------
// Deterministic Salt Derivation
// ---------------------------------------------------------------------------

/**
 * Derive a deterministic user salt from the JWT's `sub` and `iss` using
 * HMAC-SHA256 with an application-level secret. The result is truncated to
 * 128 bits and returned as a bigint string.
 */
export async function deriveUserSalt(
  sub: string,
  iss: string,
): Promise<string> {
  const secret = import.meta.env.VITE_ZKLOGIN_SALT_SECRET;
  if (!secret) {
    throw new Error(
      "VITE_ZKLOGIN_SALT_SECRET is not configured. Add it to your .env file.",
    );
  }

  const keyData = new TextEncoder().encode(secret);
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const message = new TextEncoder().encode(`${sub}:${iss}`);
  const signature = await crypto.subtle.sign("HMAC", key, message);
  const hashArray = new Uint8Array(signature);

  // Take first 16 bytes (128 bits) and convert to bigint
  let salt = 0n;
  for (let i = 0; i < 16; i++) {
    salt = (salt << 8n) | BigInt(hashArray[i]);
  }

  return salt.toString();
}

// ---------------------------------------------------------------------------
// Ephemeral Key Pair Management
// ---------------------------------------------------------------------------

/**
 * Generate a new ephemeral key pair, compute the nonce, and persist the key
 * data in sessionStorage so the callback page can retrieve it.
 */
export async function generateEphemeralKeyPair(): Promise<{
  nonce: string;
  maxEpoch: number;
  randomness: string;
}> {
  const suiClient = new SuiGrpcClient({
    baseUrl: FULLNODE_URL,
    network: NETWORK,
  });

  const { systemState } = await suiClient.core.getCurrentSystemState();
  const maxEpoch = Number(systemState.epoch) + 2;

  const ephemeralKeyPair = new Ed25519Keypair();
  const randomness = generateRandomness();
  const nonce = generateNonce(
    ephemeralKeyPair.getPublicKey(),
    maxEpoch,
    randomness,
  );

  // Persist the secret key so the callback can reconstruct the key pair
  const keyData: EphemeralKeyData = {
    secretKey: ephemeralKeyPair.getSecretKey(),
    maxEpoch,
    randomness,
  };
  sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(keyData));

  return { nonce, maxEpoch, randomness };
}

/**
 * Retrieve the stored ephemeral key data from sessionStorage.
 * Returns null if no data is found (e.g., direct navigation to callback).
 */
export function getStoredEphemeralData(): EphemeralKeyData | null {
  try {
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as EphemeralKeyData;
  } catch {
    return null;
  }
}

/**
 * Clear stored ephemeral key data from sessionStorage.
 */
export function clearEphemeralData(): void {
  sessionStorage.removeItem(SESSION_STORAGE_KEY);
}

// ---------------------------------------------------------------------------
// Google OAuth URL
// ---------------------------------------------------------------------------

/**
 * Build the Google OAuth URL with the zkLogin nonce.
 * Uses response_type=id_token so the JWT is returned directly in the
 * redirect URL query params (no token exchange step needed).
 *
 * Redirect URI is a path-based route (not hash-based) because Google
 * does not allow hash fragments in redirect URIs.
 */
export function buildGoogleOAuthUrl(nonce: string): string {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error(
      "VITE_GOOGLE_CLIENT_ID is not configured. Add it to your .env file.",
    );
  }

  // Google returns the id_token in the URL fragment (hash) when using
  // response_type=id_token (implicit flow). We redirect to the app root
  // so main.tsx can detect the hash-based callback before HashRouter renders.
  // Fragment example: <origin>/#id_token=<JWT>
  const redirectUri = window.location.origin;

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "id_token",
    redirect_uri: redirectUri,
    scope: "openid email profile",
    nonce,
    prompt: "select_account",
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

// ---------------------------------------------------------------------------
// JWT Parsing
// ---------------------------------------------------------------------------

/**
 * Extract the `id_token` from the current URL.
 *
 * Google redirects to the origin with the token in the URL fragment (hash):
 *   http://localhost:5173/#id_token=<JWT>
 *
 * So `window.location.hash` contains: #id_token=<JWT>
 */
export function parseJwtFromCallbackUrl(): string | null {
  const hash = window.location.hash;
  if (!hash) return null;

  // Remove leading '#' and parse as search params
  const params = new URLSearchParams(hash.slice(1));
  return params.get("id_token");
}

/**
 * Check if the current URL is a zkLogin OAuth callback.
 * Used by main.tsx to intercept before HashRouter renders.
 *
 * Google returns the id_token in the URL fragment (hash), e.g.:
 *   http://localhost:5173/#id_token=<JWT>
 */
export function isZkLoginCallback(): boolean {
  return !!new URLSearchParams(window.location.hash.slice(1)).get("id_token");
}

/**
 * Decode and validate a JWT. Returns the typed payload.
 */
export function decodeJwtPayload(jwt: string): ZkLoginJwtPayload {
  const decoded = jwtDecode<ZkLoginJwtPayload>(jwt);

  if (!decoded.sub || !decoded.iss) {
    throw new Error("Invalid JWT: missing required claims (sub, iss)");
  }

  return decoded;
}

// ---------------------------------------------------------------------------
// Address Derivation
// ---------------------------------------------------------------------------

/**
 * Derive the zkLogin Sui address from a JWT and user salt.
 */
export function deriveZkLoginAddress(jwt: string, userSalt: string): string {
  return jwtToAddress(jwt, userSalt, false);
}

// ---------------------------------------------------------------------------
// Full Flow Helpers
// ---------------------------------------------------------------------------

/**
 * Initiate the zkLogin + Google OAuth login flow.
 * Generates ephemeral keys, builds the OAuth URL, and redirects the browser.
 */
export async function initiateGoogleLogin(): Promise<void> {
  const { nonce } = await generateEphemeralKeyPair();
  const authUrl = buildGoogleOAuthUrl(nonce);
  window.location.href = authUrl;
}

/**
 * Complete the zkLogin flow after the OAuth callback.
 * Parses the JWT from the URL, derives the address, and returns the session
 * info needed to sign in to Firebase.
 */
export async function completeZkLoginFromCallback(): Promise<ZkLoginSession> {
  const jwt = parseJwtFromCallbackUrl();
  if (!jwt) {
    throw new Error("No id_token found in callback URL.");
  }

  // Immediately strip the id_token from the URL so the app is not
  // re-detected as a callback on reloads or re-renders.
  if (typeof history !== "undefined" && history.replaceState) {
    history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search,
    );
  }

  const decodedJwt = decodeJwtPayload(jwt);
  const userSalt = await deriveUserSalt(decodedJwt.sub, decodedJwt.iss);
  const address = deriveZkLoginAddress(jwt, userSalt);

  // Retrieve stored ephemeral data for potential future transaction signing
  const ephemeralData = getStoredEphemeralData();

  return {
    address,
    jwt,
    decodedJwt,
    maxEpoch: ephemeralData?.maxEpoch ?? 0,
    email: decodedJwt.email,
  };
}
