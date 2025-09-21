/**
 * Firebase Cloud Functions service
 * Handles HTTP requests to Firebase Cloud Functions for payment operations
 */

const FIREBASE_PROJECT_ID = "devsrv-rey";
const FIREBASE_REGION = "us-central1";

// Use local emulator in development, production URL in production
const BASE_URL =
 `https://${FIREBASE_REGION}-${FIREBASE_PROJECT_ID}.cloudfunctions.net`;

export interface DirectPaymentRequest {
  bookingId: string;
  clientId: string;
  providerId: string;
  packages: Array<{
    id: string;
    title: string; // Changed from name to title to match component structure
    description: string;
    price: number;
    commissionFee?: number; // Made optional to match component structure
    checked: boolean;
    category?: any;
  }>; // Changed from amount to packages array
  serviceTitle: string;
  category: string;
  // Add full booking data for storage
  bookingData?: {
    serviceId: string;
    serviceName: string;
    packages: Array<{
      id: string;
      title: string;
      description: string;
      price: number;
      commissionFee?: number;
    }>;
    totalPrice: number;
    bookingType: "sameday" | "scheduled";
    scheduledDate?: Date;
    scheduledTime?: string;
    location: string; // Always string in this context
    notes?: string;
    amountToPay?: number;
    paymentMethod: "CashOnHand" | "GCash" | "SRVWallet";
  };
}

export interface TopupInvoiceRequest {
  providerId: string;
  amount: number;
  paymentMethods?: string[];
}

export interface PaymentResponse {
  success: boolean;
  invoiceUrl?: string;
  invoiceId?: string;
  message?: string;
  error?: string;
}

export interface PaymentDataResponse {
  success: boolean;
  bookingData?: {
    serviceId: string;
    serviceName: string;
    providerId: string;
    packages: Array<{
      id: string;
      title: string;
      description: string;
      price: number;
      commissionFee?: number;
    }>;
    totalPrice: number;
    bookingType: "sameday" | "scheduled";
    scheduledDate?: string; // ISO string
    scheduledTime?: string;
    location: string;
    notes?: string;
    amountToPay?: number;
    paymentMethod: "CashOnHand" | "GCash" | "SRVWallet";
  };
  error?: string;
}

/**
 * Create a direct payment invoice for service bookings
 * This will automatically deduct commission and pay provider directly
 */
export async function createDirectPayment(
  request: DirectPaymentRequest,
): Promise<PaymentResponse> {
  try {
    const response = await fetch(`https://createdirectpayment-s4ulenxusq-uc.a.run.app`, {
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
export async function createTopupInvoice(
  request: TopupInvoiceRequest,
): Promise<PaymentResponse> {
  try {
    const response = await fetch(`https://createtopupinvoice-s4ulenxusq-uc.a.run.app`, {
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

export interface OnboardProviderRequest {
  providerId: string;
  gcashNumber: string;
  gcashName: string;
  businessName?: string;
  businessType: "INDIVIDUAL" | "CORPORATION" | "PARTNERSHIP";
  email: string;
  phoneNumber?: string;
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
  message?: string;
}

/**
 * Onboard a provider for direct payments
 * This creates a Xendit customer and sets up payout information
 */
export async function onboardProvider(
  request: OnboardProviderRequest,
): Promise<ProviderOnboardingResponse> {
  try {
    const response = await fetch(`https://onboardprovider-s4ulenxusq-uc.a.run.app`, {
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
    console.error("Error onboarding provider:", error);
    return {
      success: false,
      isOnboarded: false,
      providerId: request.providerId,
      error: error.message || "Failed to onboard provider",
    };
  }
}

/**
 * Check if a provider is onboarded for direct payments
 * Uses the Cloud Function to check both Xendit and Firestore records
 */
export async function checkProviderOnboarding(
  providerId: string,
): Promise<boolean> {
  try {
    const response = await fetch(`https://checkprovideronboarding-s4ulenxusq-uc.a.run.app`, {
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
      console.error(
        "Provider onboarding check failed:",
        onboardingResult.error,
      );
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
export async function getProviderOnboardingDetails(
  providerId: string,
): Promise<ProviderOnboardingResponse> {
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

/**
 * Get payment/booking data from Firestore using invoice ID
 * This retrieves the booking data that was stored when the invoice was created
 */
export async function getPaymentData(
  invoiceId: string,
): Promise<PaymentDataResponse> {
  try {
    const response = await fetch(`https://getpaymentdata-s4ulenxusq-uc.a.run.app`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: { invoiceId },
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.result || result;
  } catch (error: any) {
    console.error("Error getting payment data:", error);
    return {
      success: false,
      error: error.message || "Failed to retrieve payment data",
    };
  }
}

export interface InvoiceStatusResponse {
  success: boolean;
  status?: "PENDING" | "PAID" | "SETTLED" | "EXPIRED";
  description?: string;
  paidAmount?: number;
  paidAt?: string;
  paymentMethod?: string;
  paymentChannel?: string;
  error?: string;
}

export interface ReleasePaymentRequest {
  bookingId: string;
  invoiceId?: string; // Xendit invoice ID for payment lookup
  reason?: string;
  // Add support for ICP-based bookings
  skipValidation?: boolean;
  bookingData?: {
    id: string;
    clientId: string;
    providerId: string;
    status: string;
    paymentMethod: string;
    price: number;
    completedAt?: string;
  };
}

export interface ReleasePaymentResponse {
  success: boolean;
  message?: string;
  payoutData?: {
    payoutId: string;
    amount: number;
    commissionRetained: number;
    netProviderAmount: number;
    status: string;
    channelCode: string;
    accountHolderName: string;
    accountNumber: string;
  };
  bookingData?: {
    bookingId: string;
    paymentReleased: boolean;
    releasedAt: string;
    releasedAmount: number;
    commissionRetained: number;
    payoutId: string;
  };
  error?: string;
}

/**
 * Check the real payment status of an invoice from Xendit
 * This provides accurate payment status instead of relying on localStorage
 */
export async function checkInvoiceStatus(
  invoiceId: string,
): Promise<InvoiceStatusResponse> {
  try {
    const response = await fetch(`https://checkinvoicestatus-s4ulenxusq-uc.a.run.app`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: { invoiceId },
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.result || result;
  } catch (error: any) {
    console.error("Error checking invoice status:", error);
    return {
      success: false,
      error: error.message || "Failed to check invoice status",
    };
  }
}

/**
 * Release held payment for a completed booking
 * This triggers the payout to the provider after commission deduction
 */
export async function releaseHeldPayment(
  request: ReleasePaymentRequest,
): Promise<ReleasePaymentResponse> {
  try {
    console.log("🔄 Releasing held payment:", request);

    const response = await fetch(`https://releaseheldpayment-s4ulenxusq-uc.a.run.app`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: request, // Wrap in data object to match other functions
      }),
    });

    console.log("📡 Response status:", response.status);

    if (!response.ok) {
      // Try to get error details from response
      let errorDetails;
      try {
        errorDetails = await response.json();
        console.error("❌ Server error response:", errorDetails);
      } catch (e) {
        console.error("❌ Failed to parse error response");
      }

      throw new Error(
        `HTTP error! status: ${response.status}${
          errorDetails?.error ? ` - ${errorDetails.error}` : ""
        }${errorDetails?.details ? ` (${errorDetails.details})` : ""}`,
      );
    }

    const result = await response.json();
    console.log("✅ Payment release response:", result);
    return result.result || result;
  } catch (error: any) {
    console.error("❌ Error releasing held payment:", error);
    return {
      success: false,
      error: error.message || "Failed to release held payment",
    };
  }
}
