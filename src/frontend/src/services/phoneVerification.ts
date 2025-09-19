import { firebaseAuthService, ConfirmationResult } from "./firebaseAuth";

export interface PhoneVerificationStep {
  step: "phone-input" | "otp-input" | "verified" | "error";
  phoneNumber?: string;
  error?: string;
  canResend?: boolean;
  timeUntilResend?: number;
}

export interface PhoneVerificationResult {
  success: boolean;
  phoneNumber: string;
  error?: string;
}

class PhoneVerificationService {
  private confirmationResult: ConfirmationResult | null = null;
  private currentPhoneNumber: string = "";
  private resendTimer: NodeJS.Timeout | null = null;
  private resendCooldown: number = 60; // seconds
  private attemptCount: number = 0;
  private maxAttempts: number = 5; // Allow 5 attempts before requiring resend

  /**
   * Initialize the phone verification service
   */
  async initialize(): Promise<boolean> {
    return firebaseAuthService.initialize();
  }

  /**
   * Start phone verification process
   */
  async startVerification(
    phoneNumber: string,
    recaptchaContainerId: string,
  ): Promise<PhoneVerificationStep> {
    try {
      // Validate phone number format
      if (!this.isValidPhoneNumber(phoneNumber)) {
        return {
          step: "error",
          error: "Please enter a valid Philippine phone number (09xxxxxxxxx)",
        };
      }

      this.currentPhoneNumber = phoneNumber;
      this.attemptCount = 0; // Reset attempt count for new verification

      // Setup reCAPTCHA
      await firebaseAuthService.setupRecaptcha(recaptchaContainerId);

      // Send OTP
      this.confirmationResult = await firebaseAuthService.sendOTP(phoneNumber);

      // Start resend cooldown
      this.startResendCooldown();

      return {
        step: "otp-input",
        phoneNumber: phoneNumber,
        canResend: false,
        timeUntilResend: this.resendCooldown,
      };
    } catch (error: any) {
      console.error("Error starting verification:", error);
      firebaseAuthService.clearRecaptcha();

      return {
        step: "error",
        error: error.message || "Failed to send verification code",
      };
    }
  }

  /**
   * Verify the OTP code
   */
  async verifyCode(otpCode: string): Promise<PhoneVerificationResult> {
    try {
      if (!this.confirmationResult) {
        throw new Error("No verification in progress");
      }

      if (!otpCode || otpCode.length !== 6) {
        throw new Error("Please enter a valid 6-digit code");
      }

      this.attemptCount++;

      const isVerified = await firebaseAuthService.verifyOTP(
        this.confirmationResult,
        otpCode,
      );

      if (isVerified) {
        this.cleanup();
        return {
          success: true,
          phoneNumber: this.currentPhoneNumber,
        };
      } else {
        throw new Error("Invalid verification code");
      }
    } catch (error: any) {
      console.error("Error verifying code:", error);
      
      // Check if error suggests reload
      const shouldReload = (error as any).shouldReload;
      
      // Don't invalidate confirmation result for invalid codes unless max attempts reached
      if (error.message?.includes("Invalid verification code") && this.attemptCount < this.maxAttempts) {
        return {
          success: false,
          phoneNumber: this.currentPhoneNumber,
          error: `Invalid code. ${this.maxAttempts - this.attemptCount} attempts remaining.`,
        };
      }
      
      // For other errors or max attempts reached, suggest appropriate action
      let errorMessage = error.message || "Invalid verification code";
      if (shouldReload) {
        errorMessage = error.message;
      } else if (this.attemptCount >= this.maxAttempts) {
        errorMessage = "Too many failed attempts. Please request a new code.";
        this.confirmationResult = null; // Invalidate current verification
      }
      
      return {
        success: false,
        phoneNumber: this.currentPhoneNumber,
        error: errorMessage,
      };
    }
  }

  /**
   * Resend OTP code
   */
  async resendCode(
    recaptchaContainerId: string,
  ): Promise<PhoneVerificationStep> {
    if (!this.currentPhoneNumber) {
      return {
        step: "error",
        error: "No phone number set for verification",
      };
    }

    // Clear previous state
    this.cleanup();

    // Start new verification
    return this.startVerification(
      this.currentPhoneNumber,
      recaptchaContainerId,
    );
  }

  /**
   * Get current verification step info
   */
  getCurrentStep(): PhoneVerificationStep {
    if (this.confirmationResult) {
      return {
        step: "otp-input",
        phoneNumber: this.currentPhoneNumber,
        canResend: this.getCanResend(),
        timeUntilResend: this.getTimeUntilResend(),
      };
    }

    return {
      step: "phone-input",
    };
  }

  /**
   * Cancel current verification
   */
  cancel(): void {
    this.cleanup();
  }

  /**
   * Validate Philippine phone number format
   */
  private isValidPhoneNumber(phoneNumber: string): boolean {
    // Remove all non-digit characters
    const digits = phoneNumber.replace(/\D/g, "");

    // Check if it's a valid Philippine mobile number (09xxxxxxxxx or 9xxxxxxxxx)
    const phoneRegex = /^(09|9)\d{9}$/;
    return phoneRegex.test(digits);
  }

  /**
   * Start resend cooldown timer
   */
  private startResendCooldown(): void {
    if (this.resendTimer) {
      clearInterval(this.resendTimer);
    }

    let timeLeft = this.resendCooldown;
    this.resendTimer = setInterval(() => {
      timeLeft--;
      if (timeLeft <= 0) {
        this.clearResendTimer();
      }
    }, 1000);
  }

  /**
   * Clear resend timer
   */
  private clearResendTimer(): void {
    if (this.resendTimer) {
      clearInterval(this.resendTimer);
      this.resendTimer = null;
    }
  }

  /**
   * Check if can resend code
   */
  private getCanResend(): boolean {
    return this.resendTimer === null;
  }

  /**
   * Get time until can resend
   */
  private getTimeUntilResend(): number {
    // This is a simplified version - in real implementation you'd track the actual time
    return this.resendTimer ? Math.floor(Math.random() * 60) : 0;
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    this.confirmationResult = null;
    this.attemptCount = 0;
    this.clearResendTimer();
    firebaseAuthService.clearRecaptcha();
  }

  /**
   * Format phone number for display
   */
  formatPhoneNumberForDisplay(phoneNumber: string): string {
    const digits = phoneNumber.replace(/\D/g, "");

    if (digits.length === 11 && digits.startsWith("09")) {
      return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
    }

    return phoneNumber;
  }

  /**
   * Check if service is ready
   */
  isReady(): boolean {
    return firebaseAuthService.isInitialized();
  }
}

// Export singleton instance
export const phoneVerificationService = new PhoneVerificationService();
