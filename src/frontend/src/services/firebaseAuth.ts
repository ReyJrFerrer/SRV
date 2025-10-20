import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import {
  getAuth,
  Auth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  signOut,
  signInWithCustomToken,
} from "firebase/auth";
import { getStoredICCustomToken } from "./firebaseApp";

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId: string;
  appId: string;
}

class FirebaseAuthService {
  private app: FirebaseApp | null = null;
  private auth: Auth | null = null;
  private recaptchaVerifier: RecaptchaVerifier | null = null;

  /**
   * Initialize Firebase Auth service
   */
  initialize(): boolean {
    try {
      // Check if Firebase is already initialized
      if (getApps().length > 0) {
        this.app = getApps()[0];
        this.auth = getAuth(this.app);
        return true;
      }

      // Firebase configuration from environment variables
      const firebaseConfig: FirebaseConfig = {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID,
      };

      // Validate required config
      if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
        console.error("Firebase config missing required fields");
        return false;
      }

      // Initialize Firebase
      this.app = initializeApp(firebaseConfig);
      this.auth = getAuth(this.app);

      // Set language code for SMS (optional)
      this.auth.languageCode = "en";

      console.log("Firebase Auth initialized successfully");
      return true;
    } catch (error) {
      console.error("Failed to initialize Firebase Auth:", error);
      return false;
    }
  }

  /**
   * Setup reCAPTCHA verifier for phone authentication
   */
  setupRecaptcha(containerId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        if (!this.auth) {
          reject(new Error("Firebase Auth not initialized"));
          return;
        }

        // Clear existing recaptcha completely
        this.clearRecaptcha();

        // Check if container exists and clear its content
        const container = document.getElementById(containerId);
        if (!container) {
          reject(new Error(`Container ${containerId} not found`));
          return;
        }

        // Clear any existing content in the container
        container.innerHTML = "";

        // Wait a bit to ensure DOM is clean
        setTimeout(() => {
          try {
            this.recaptchaVerifier = new RecaptchaVerifier(
              this.auth!,
              containerId,
              {
                size: "invisible",
                callback: () => {
                  console.log("reCAPTCHA solved");
                  resolve();
                },
                "expired-callback": () => {
                  console.log("reCAPTCHA expired");
                  reject(new Error("reCAPTCHA expired"));
                },
              },
            );

            // Render the recaptcha
            this.recaptchaVerifier
              .render()
              .then(() => {
                console.log("reCAPTCHA rendered successfully");
                resolve();
              })
              .catch((error: any) => {
                console.error("reCAPTCHA render error:", error);
                this.clearRecaptcha();
                reject(
                  new Error(
                    "Service temporarily unavailable. Please reload the page and try again.",
                  ),
                );
              });
          } catch (error) {
            console.error("reCAPTCHA setup error:", error);
            this.clearRecaptcha();
            reject(
              new Error(
                "Service temporarily unavailable. Please reload the page and try again.",
              ),
            );
          }
        }, 100);
      } catch (error) {
        console.error("reCAPTCHA setup error:", error);
        reject(
          new Error(
            "Service temporarily unavailable. Please reload the page and try again.",
          ),
        );
      }
    });
  }

  /**
   * Send OTP to phone number
   */
  async sendOTP(phoneNumber: string): Promise<ConfirmationResult> {
    if (!this.auth) {
      throw new Error("Firebase Auth not initialized");
    }

    if (!this.recaptchaVerifier) {
      throw new Error("reCAPTCHA not initialized");
    }

    try {
      // Format phone number to international format
      const formattedPhone = this.formatPhoneNumber(phoneNumber);

      console.log("Sending OTP to:", formattedPhone);

      const confirmationResult = await signInWithPhoneNumber(
        this.auth,
        formattedPhone,
        this.recaptchaVerifier,
      );

      console.log("OTP sent successfully");
      return confirmationResult;
    } catch (error: any) {
      console.error("Error sending OTP:", error);

      // Reset reCAPTCHA on error
      if (this.recaptchaVerifier) {
        this.recaptchaVerifier.clear();
        this.recaptchaVerifier = null;
      }

      throw this.handleFirebaseError(error);
    }
  }

  /**
   * Verify OTP code
   */
  async verifyOTP(
    confirmationResult: ConfirmationResult,
    otpCode: string,
  ): Promise<boolean> {
    try {
      const result = await confirmationResult.confirm(otpCode);

      if (result.user) {
        console.log("✅ Phone number verified successfully");

        // CRITICAL: Restore the IC-based Firebase session
        // Phone verification creates a separate Firebase user, so we need to
        // restore the original IC-based session for profile creation
        const icToken = getStoredICCustomToken();
        if (icToken && this.auth) {
          console.log(
            "🔄 Restoring IC-based Firebase session after phone verification...",
          );
          try {
            await signInWithCustomToken(this.auth, icToken);
            console.log("✅ IC-based Firebase session restored successfully");
          } catch (restoreError) {
            console.error(
              "❌ Failed to restore IC Firebase session:",
              restoreError,
            );
            throw new Error(
              "Failed to restore authentication session. Please refresh and try again.",
            );
          }
        } else {
          console.warn(
            "⚠️ No IC custom token found to restore. User may need to re-authenticate.",
          );
        }

        return true;
      }

      return false;
    } catch (error: any) {
      // Don't log expected validation errors
      if (error.code === "auth/invalid-verification-code") {
        // Silent - this is expected when user enters wrong code
      } else if (error.code === "auth/invalid-verification-id") {
        console.log("⚠️ Verification session expired or invalid");
      } else if (error.code === "auth/code-expired") {
        console.log("⚠️ Verification code expired");
      } else {
        // Log unexpected errors
        console.error("❌ Error verifying OTP:", error);
      }

      throw this.handleFirebaseError(error);
    }
  }

  /**
   * Sign out the current user
   */
  async signOut(): Promise<void> {
    if (this.auth && this.auth.currentUser) {
      await signOut(this.auth);
    }
  }

  /**
   * Format phone number to international format
   */
  private formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    const digits = phoneNumber.replace(/\D/g, "");

    // Handle Philippine phone numbers
    if (digits.startsWith("09") && digits.length === 11) {
      return `+63${digits.substring(1)}`;
    }

    // If already starts with +63
    if (digits.startsWith("63") && digits.length === 12) {
      return `+${digits}`;
    }

    // Default: assume it's already in correct format or add +63
    if (digits.length === 10) {
      return `+63${digits}`;
    }

    return phoneNumber; // Return as-is if can't determine format
  }

  /**
   * Handle Firebase errors and provide user-friendly messages
   */
  private handleFirebaseError(error: any): Error {
    let message = "An error occurred during phone verification";
    let shouldReload = false;

    switch (error.code) {
      case "auth/invalid-phone-number":
        message = "Invalid phone number format";
        break;
      case "auth/missing-phone-number":
        message = "Phone number is required";
        break;
      case "auth/invalid-verification-code":
        message = "Invalid verification code. Please try again.";
        break;
      case "auth/invalid-verification-id":
        message = "Verification session expired. Please request a new code.";
        break;
      case "auth/code-expired":
        message = "Verification code has expired. Please request a new code.";
        break;
      case "auth/too-many-requests":
        message =
          "Too many attempts. Please wait a moment before trying again.";
        break;
      // Firebase service issues - suggest reload
      case "auth/quota-exceeded":
      case "auth/recaptcha-not-enabled":
      case "auth/network-request-failed":
      case "auth/internal-error":
        message =
          "Service temporarily unavailable. Please reload the page and try again.";
        shouldReload = true;
        break;
      default:
        // Hide Firebase-specific errors and suggest reload for unknown issues
        if (error.message && error.message.includes("recaptcha")) {
          message =
            "Service temporarily unavailable. Please reload the page and try again.";
          shouldReload = true;
        } else if (error.code && error.code.startsWith("auth/")) {
          message =
            "Service temporarily unavailable. Please reload the page and try again.";
          shouldReload = true;
        } else {
          message = "An unexpected error occurred. Please try again.";
        }
        break;
    }

    const errorWithReload = new Error(message);
    (errorWithReload as any).shouldReload = shouldReload;
    return errorWithReload;
  }

  /**
   * Clear reCAPTCHA verifier
   */
  clearRecaptcha(): void {
    try {
      if (this.recaptchaVerifier) {
        this.recaptchaVerifier.clear();
        this.recaptchaVerifier = null;
      }
    } catch (error) {
      console.error("Error clearing reCAPTCHA:", error);
      this.recaptchaVerifier = null;
    }
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.auth !== null;
  }
}

// Export singleton instance
export const firebaseAuthService = new FirebaseAuthService();
export type { ConfirmationResult };
