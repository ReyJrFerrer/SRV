import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import {
  getAuth,
  Auth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  signOut,
} from "firebase/auth";

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

        // Clear existing recaptcha
        if (this.recaptchaVerifier) {
          this.recaptchaVerifier.clear();
        }

        this.recaptchaVerifier = new RecaptchaVerifier(this.auth, containerId, {
          size: "invisible", // or 'normal' for visible recaptcha
          callback: () => {
            console.log("reCAPTCHA solved");
            resolve();
          },
          "expired-callback": () => {
            console.log("reCAPTCHA expired");
            reject(new Error("reCAPTCHA expired"));
          },
        });

        // Render the recaptcha
        this.recaptchaVerifier
          .render()
          .then(() => {
            console.log("reCAPTCHA rendered successfully");
            resolve();
          })
          .catch((error) => {
            console.error("reCAPTCHA render error:", error);
            reject(error);
          });
      } catch (error) {
        console.error("reCAPTCHA setup error:", error);
        reject(error);
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
        console.log("Phone number verified successfully");

        // Sign out the user since we only need verification
        await this.signOut();

        return true;
      }

      return false;
    } catch (error: any) {
      console.error("Error verifying OTP:", error);
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

    switch (error.code) {
      case "auth/invalid-phone-number":
        message = "Invalid phone number format";
        break;
      case "auth/missing-phone-number":
        message = "Phone number is required";
        break;
      case "auth/quota-exceeded":
        message = "SMS quota exceeded. Please try again later";
        break;
      case "auth/user-disabled":
        message = "This phone number has been disabled";
        break;
      case "auth/invalid-verification-code":
        message = "Invalid verification code";
        break;
      case "auth/code-expired":
        message = "Verification code has expired";
        break;
      case "auth/too-many-requests":
        message = "Too many attempts. Please try again later";
        break;
      case "auth/recaptcha-not-enabled":
        message = "reCAPTCHA not enabled for this project";
        break;
      default:
        if (error.message) {
          message = error.message;
        }
        break;
    }

    return new Error(message);
  }

  /**
   * Clear reCAPTCHA verifier
   */
  clearRecaptcha(): void {
    if (this.recaptchaVerifier) {
      this.recaptchaVerifier.clear();
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
