/**
 * Firebase Cloud Functions service
 * Handles HTTP requests to Firebase Cloud Functions for payment operations
 */

import { httpsCallable } from "firebase/functions";
import { getFirebaseFunctions } from "./firebaseApp";

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
    const functions = getFirebaseFunctions();
    const createDirectPaymentFn = httpsCallable<
      DirectPaymentRequest,
      PaymentResponse
    >(functions, "createDirectPayment");

    const result = await createDirectPaymentFn(request);
    return result.data;
  } catch (error: any) {
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
    const functions = getFirebaseFunctions();
    const createTopupInvoiceFn = httpsCallable<
      TopupInvoiceRequest,
      PaymentResponse
    >(functions, "createTopupInvoice");

    const result = await createTopupInvoiceFn(request);
    return result.data;
  } catch (error: any) {
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
    const functions = getFirebaseFunctions();
    const onboardProviderFn = httpsCallable<
      OnboardProviderRequest,
      ProviderOnboardingResponse
    >(functions, "onboardProvider");

    const result = await onboardProviderFn(request);
    return result.data;
  } catch (error: any) {
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
    const functions = getFirebaseFunctions();
    const checkProviderOnboardingFn = httpsCallable<
      { providerId: string },
      ProviderOnboardingResponse
    >(functions, "checkProviderOnboarding");

    const result = await checkProviderOnboardingFn({ providerId });
    const onboardingResult = result.data;

    if (!onboardingResult.success) {
      return false;
    }

    return onboardingResult.isOnboarded || false;
  } catch (error: any) {
    // Fallback to localStorage check for backwards compatibility
    try {
      return localStorage.getItem("provider_onboarded") === "true";
    } catch (storageError) {
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
    const functions = getFirebaseFunctions();
    const checkProviderOnboardingFn = httpsCallable<
      { providerId: string },
      ProviderOnboardingResponse
    >(functions, "checkProviderOnboarding");

    const result = await checkProviderOnboardingFn({ providerId });
    return result.data;
  } catch (error: any) {
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
    const functions = getFirebaseFunctions();
    const getPaymentDataFn = httpsCallable<
      { invoiceId: string },
      PaymentDataResponse
    >(functions, "getPaymentData");

    const result = await getPaymentDataFn({ invoiceId });
    return result.data;
  } catch (error: any) {
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
  credited?: boolean;
  alreadyCredited?: boolean;
  creditError?: string;
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
    const functions = getFirebaseFunctions();
    const checkInvoiceStatusFn = httpsCallable<
      { invoiceId: string },
      InvoiceStatusResponse
    >(functions, "checkInvoiceStatus");

    const result = await checkInvoiceStatusFn({ invoiceId });
    return result.data;
  } catch (error: any) {
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
    const functions = getFirebaseFunctions();
    const releaseHeldPaymentFn = httpsCallable<
      ReleasePaymentRequest,
      ReleasePaymentResponse
    >(functions, "releaseHeldPayment");

    const result = await releaseHeldPaymentFn(request);
    return result.data;
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to release held payment",
    };
  }
}
