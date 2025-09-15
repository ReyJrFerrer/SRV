/**
 * Firebase Cloud Functions service
 * Handles HTTP requests to Firebase Cloud Functions for payment operations
 */

const FIREBASE_PROJECT_ID = "devsrv-rey";
const FIREBASE_REGION = "us-central1";

// Use local emulator in development, production URL in production
const BASE_URL = process.env.NODE_ENV === "development" 
  ? `http://127.0.0.1:5001/${FIREBASE_PROJECT_ID}/${FIREBASE_REGION}`
  : `https://${FIREBASE_REGION}-${FIREBASE_PROJECT_ID}.cloudfunctions.net`;

export interface DirectPaymentRequest {
  bookingId: string;
  clientId: string;
  providerId: string;
  amount: number;
  serviceTitle: string;
  category: string;
}

export interface TopupInvoiceRequest {
  userId: string;
  amount: number;
}

export interface PaymentResponse {
  success: boolean;
  invoiceUrl?: string;
  invoiceId?: string;
  message?: string;
  error?: string;
}

/**
 * Create a direct payment invoice for service bookings
 * This will automatically deduct commission and pay provider directly
 */
export async function createDirectPayment(request: DirectPaymentRequest): Promise<PaymentResponse> {
  try {
    const response = await fetch(`${BASE_URL}/createDirectPayment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: request,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.result || result;
  } catch (error: any) {
    console.error("Error creating direct payment:", error);
    return {
      success: false,
      error: error.message || "Failed to create payment invoice",
    };
  }
}

/**
 * Create a top-up invoice for wallet credits
 */
export async function createTopupInvoice(request: TopupInvoiceRequest): Promise<PaymentResponse> {
  try {
    const response = await fetch(`${BASE_URL}/createTopupInvoice`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: request,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.result || result;
  } catch (error: any) {
    console.error("Error creating topup invoice:", error);
    return {
      success: false,
      error: error.message || "Failed to create topup invoice",
    };
  }
}

export interface ProviderOnboardingResponse {
  success: boolean;
  isOnboarded: boolean;
  providerId: string;
  details?: {
    xenditCustomerId: string;
    xenditReferenceId: string;
    onboardedAt: string;
    payoutInfo: {
      gcashNumber: string;
      accountHolderName: string;
      channelCode: string;
    };
    verificationSources: {
      xendit: boolean;
      firestore: boolean;
    };
  };
  error?: string;
}

/**
 * Check if a provider is onboarded for direct payments
 * Uses the Cloud Function to check both Xendit and Firestore records
 */
export async function checkProviderOnboarding(providerId: string): Promise<boolean> {
  try {
    const response = await fetch(`${BASE_URL}/checkProviderOnboarding`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: { providerId },
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    const onboardingResult = result.result || result;

    if (!onboardingResult.success) {
      console.error("Provider onboarding check failed:", onboardingResult.error);
      return false;
    }

    return onboardingResult.isOnboarded || false;
  } catch (error: any) {
    console.error("Error checking provider onboarding:", error);
    
    // Fallback to localStorage check for backwards compatibility
    try {
      return localStorage.getItem("provider_onboarded") === "true";
    } catch (storageError) {
      console.error("Error accessing localStorage:", storageError);
      return false;
    }
  }
}

/**
 * Get detailed provider onboarding information
 */
export async function getProviderOnboardingDetails(providerId: string): Promise<ProviderOnboardingResponse> {
  try {
    const response = await fetch(`${BASE_URL}/checkProviderOnboarding`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: { providerId },
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.result || result;
  } catch (error: any) {
    console.error("Error getting provider onboarding details:", error);
    return {
      success: false,
      isOnboarded: false,
      providerId: providerId,
      error: error.message || "Failed to check provider onboarding status",
    };
  }
}
