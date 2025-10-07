// Booking Service (Firebase Cloud Functions)
import { Principal } from "@dfinity/principal";
import { httpsCallable } from "firebase/functions";
import { initializeFirebase } from "./firebaseApp";

// Initialize Firebase
const { functions } = initializeFirebase();

// Firebase authentication will be handled automatically by httpsCallable functions

// Type mappings for frontend compatibility
export type BookingStatus =
  | "Requested"
  | "Accepted"
  | "Declined"
  | "Cancelled"
  | "InProgress"
  | "Completed"
  | "Disputed";

export type PaymentMethod = "CashOnHand" | "GCash" | "SRVWallet";

export type DayOfWeek =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

export interface TimeSlot {
  startTime: string;
  endTime: string;
}

export interface DayAvailability {
  isAvailable: boolean;
  slots: TimeSlot[];
}

export interface VacationPeriod {
  id: string;
  startDate: string;
  endDate: string;
  reason?: string;
  createdAt: string;
}

export interface ProviderAvailability {
  providerId: Principal;
  isActive: boolean;
  instantBookingEnabled: boolean;
  bookingNoticeHours: number;
  maxBookingsPerDay: number;
  weeklySchedule: Array<{ day: DayOfWeek; availability: DayAvailability }>;
  // Note: vacationDates removed to match backend implementation
  createdAt: string;
  updatedAt: string;
}

export interface ProviderAnalytics {
  providerId: Principal;
  totalJobs: number;
  completedJobs: number;
  cancelledJobs: number;
  totalEarnings: number;
  completionRate: number;
  packageBreakdown: Array<[string, number]>;
  startDate?: string;
  endDate?: string;
}

export interface ClientAnalytics {
  clientId: Principal;
  totalBookings: number;
  servicesCompleted: number;
  totalSpent: number;
  memberSince: string;
  packageBreakdown: Array<[string, number]>;
  startDate?: string;
  endDate?: string;
}

export interface AvailableSlot {
  date: string;
  timeSlot: TimeSlot;
  isAvailable: boolean;
  conflictingBookings: string[];
}

export interface Location {
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}

export interface Evidence {
  id: string;
  bookingId: string;
  submitterId: Principal;
  description: string;
  fileUrls: string[];
  qualityScore?: number;
  createdAt: string;
}

export interface Booking {
  id: string;
  clientId: Principal;
  providerId: Principal;
  serviceId: string;
  servicePackageId: string[]; // Array of package IDs for multiple package bookings
  status: BookingStatus;
  requestedDate: string;
  scheduledDate?: string;
  startedDate?: string; // When service status changed to InProgress
  completedDate?: string;
  price: number;
  amountPaid?: number; // Total amount paid by client (cash received)
  serviceTime?: number; // Duration in nanoseconds from started to completed
  location: Location;
  evidence?: Evidence;
  notes?: string;
  paymentMethod: PaymentMethod;
  paymentId?: string; // Reference to external payment (Xendit invoice ID)
  createdAt: string;
  updatedAt: string;
  // Additional UI fields
  serviceName?: string;
  serviceImage?: string;
  providerName?: string;
  bookingDate?: string;
  bookingTime?: string;
  duration?: string;
  priceDisplay?: string;
  serviceSlug?: string;
}

// Firebase booking data is already in the correct format, no conversion needed

// Booking Canister Service Functions
export const bookingCanisterService = {
  /**
   * Create a new booking with a single package (backwards compatibility)
   */
  async createBookingWithPackage(
    serviceId: string,
    providerId: Principal,
    price: number,
    location: Location,
    requestedDate: Date,
    servicePackageId: string,
    notes?: string,
    amountToPay?: number,
    paymentMethod: PaymentMethod = "CashOnHand",
    paymentId?: string,
  ): Promise<Booking | null> {
    return this.createBooking(
      serviceId,
      providerId,
      price,
      location,
      requestedDate,
      [servicePackageId], // Convert single package to array
      notes,
      amountToPay,
      paymentMethod,
      paymentId,
    );
  },

  /**
   * Create a new booking
   */
  async createBooking(
    serviceId: string,
    providerId: Principal,
    price: number,
    location: Location,
    requestedDate: Date,
    servicePackageIds: string[] = [], // Array of package IDs for multiple package bookings
    notes?: string,
    amountToPay?: number,
    paymentMethod: PaymentMethod = "CashOnHand",
    paymentId?: string,
  ): Promise<Booking | null> {
    console.log("🚀 [bookingCanisterService] createBooking called with:", {
      serviceId,
      providerId: providerId.toString(),
      price,
      servicePackageIds,
    });
    try {
      const createBookingFn = httpsCallable(functions, "createBooking");

      const result = await createBookingFn({
        serviceId,
        providerId: providerId.toString(),
        price,
        location,
        requestedDate: requestedDate.toISOString(),
        servicePackageIds,
        notes,
        amountToPay,
        paymentMethod,
        paymentId,
      });

      console.log(
        "✅ [bookingCanisterService] createBooking raw result:",
        result,
      );
      const responseData = (result.data as { success: boolean; data: Booking })
        .data;
      console.log(
        "✅ [bookingCanisterService] createBooking extracted data:",
        responseData,
      );
      return responseData;
    } catch (error) {
      console.error(
        "❌ [bookingCanisterService] Error creating booking:",
        error,
      );
      throw new Error(`Failed to create booking: ${error}`);
    }
  },

  /**
   * Get a specific booking by ID
   */
  async getBooking(bookingId: string): Promise<Booking | null> {
    console.log("🚀 [bookingCanisterService] getBooking called with:", {
      bookingId,
    });
    try {
      const getBookingFn = httpsCallable(functions, "getBooking");

      const result = await getBookingFn({ bookingId });
      console.log("✅ [bookingCanisterService] getBooking raw result:", result);
      const responseData = (
        result.data as { success: boolean; data: Booking | null }
      ).data;
      console.log(
        "✅ [bookingCanisterService] getBooking extracted data:",
        responseData,
      );
      return responseData;
    } catch (error) {
      console.error(
        "❌ [bookingCanisterService] Error fetching booking:",
        error,
      );
      throw new Error(`Failed to fetch booking: ${error}`);
    }
  },

  /**
   * Get all bookings for a client
   */
  async getClientBookings(clientId: Principal): Promise<Booking[]> {
    console.log(
      "🚀 [bookingCanisterService] getClientBookings called for client:",
      clientId.toString(),
    );
    try {
      const getClientBookingsFn = httpsCallable(functions, "getClientBookings");

      const result = await getClientBookingsFn({
        clientId: clientId.toString(),
      });
      console.log(
        "✅ [bookingCanisterService] getClientBookings raw result:",
        result,
      );
      const responseData = (
        result.data as { success: boolean; data: Booking[] }
      ).data;
      console.log(
        `✅ [bookingCanisterService] getClientBookings extracted ${responseData?.length ?? 0} bookings.`,
      );
      return responseData || [];
    } catch (error) {
      console.error(
        "❌ [bookingCanisterService] Error fetching client bookings:",
        error,
      );
      return []; // Return empty array on error to prevent .map() issues
    }
  },

  /**
   * Get all bookings for a provider
   */
  async getProviderBookings(providerId: Principal): Promise<Booking[]> {
    console.log(
      "🚀 [bookingCanisterService] getProviderBookings called for provider:",
      providerId.toString(),
    );
    try {
      const getProviderBookingsFn = httpsCallable(
        functions,
        "getProviderBookings",
      );

      const result = await getProviderBookingsFn({
        providerId: providerId.toString(),
      });
      console.log(
        "✅ [bookingCanisterService] getProviderBookings raw result:",
        result,
      );
      const responseData = (
        result.data as { success: boolean; data: Booking[] }
      ).data;
      console.log(
        `✅ [bookingCanisterService] getProviderBookings extracted ${responseData?.length ?? 0} bookings.`,
      );
      return responseData || [];
    } catch (error) {
      console.error(
        "❌ [bookingCanisterService] Error fetching provider bookings:",
        error,
      );
      return []; // Return empty array on error to prevent .map() issues
    }
  },

  /**
   * Get bookings by status
   */
  async getBookingsByStatus(status: BookingStatus): Promise<Booking[]> {
    console.log(
      "🚀 [bookingCanisterService] getBookingsByStatus called with status:",
      status,
    );
    try {
      const getBookingsByStatusFn = httpsCallable(
        functions,
        "getBookingsByStatus",
      );

      const result = await getBookingsByStatusFn({ status });
      console.log(
        "✅ [bookingCanisterService] getBookingsByStatus raw result:",
        result,
      );
      const responseData = (
        result.data as { success: boolean; data: Booking[] }
      ).data;
      console.log(
        `✅ [bookingCanisterService] getBookingsByStatus extracted ${responseData?.length ?? 0} bookings.`,
      );
      return responseData || [];
    } catch (error) {
      console.error(
        "❌ [bookingCanisterService] Error fetching bookings by status:",
        error,
      );
      return []; // Return empty array on error to prevent .map() issues
    }
  },

  /**
   * Accept a booking
   */
  async acceptBooking(
    bookingId: string,
    scheduledDate: Date,
  ): Promise<Booking | null> {
    console.log(
      "🚀 [bookingCanisterService] acceptBooking called for booking:",
      bookingId,
    );
    try {
      const acceptBookingFn = httpsCallable(functions, "acceptBooking");

      const result = await acceptBookingFn({
        bookingId,
        scheduledDate: scheduledDate.toISOString(),
      });

      console.log(
        "✅ [bookingCanisterService] acceptBooking raw result:",
        result,
      );
      const responseData = (result.data as { success: boolean; data: Booking })
        .data;
      console.log(
        "✅ [bookingCanisterService] acceptBooking extracted data:",
        responseData,
      );
      return responseData;
    } catch (error) {
      console.error(
        "❌ [bookingCanisterService] Error accepting booking:",
        error,
      );
      throw new Error(`Failed to accept booking: ${error}`);
    }
  },

  /**
   * Decline a booking
   */
  async declineBooking(bookingId: string): Promise<Booking | null> {
    console.log(
      "🚀 [bookingCanisterService] declineBooking called for booking:",
      bookingId,
    );
    try {
      const declineBookingFn = httpsCallable(functions, "declineBooking");

      const result = await declineBookingFn({ bookingId });
      console.log(
        "✅ [bookingCanisterService] declineBooking raw result:",
        result,
      );
      const responseData = (result.data as { success: boolean; data: Booking })
        .data;
      console.log(
        "✅ [bookingCanisterService] declineBooking extracted data:",
        responseData,
      );
      return responseData;
    } catch (error) {
      console.error(
        "❌ [bookingCanisterService] Error declining booking:",
        error,
      );
      throw new Error(`Failed to decline booking: ${error}`);
    }
  },

  /**
   * Cancel a booking
   */
  async cancelBooking(bookingId: string): Promise<Booking | null> {
    console.log(
      "🚀 [bookingCanisterService] cancelBooking called for booking:",
      bookingId,
    );
    try {
      const cancelBookingFn = httpsCallable(functions, "cancelBooking");

      const result = await cancelBookingFn({ bookingId });
      console.log(
        "✅ [bookingCanisterService] cancelBooking raw result:",
        result,
      );
      const responseData = (result.data as { success: boolean; data: Booking })
        .data;
      console.log(
        "✅ [bookingCanisterService] cancelBooking extracted data:",
        responseData,
      );
      return responseData;
    } catch (error) {
      console.error(
        "❌ [bookingCanisterService] Error cancelling booking:",
        error,
      );
      throw new Error(`Failed to cancel booking: ${error}`);
    }
  },

  /**
   * Start a booking (mark as in progress)
   */
  async startBooking(bookingId: string): Promise<Booking | null> {
    console.log(
      "🚀 [bookingCanisterService] startBooking called for booking:",
      bookingId,
    );
    try {
      const startBookingFn = httpsCallable(functions, "startBooking");

      const result = await startBookingFn({ bookingId });
      console.log(
        "✅ [bookingCanisterService] startBooking raw result:",
        result,
      );
      const responseData = (result.data as { success: boolean; data: Booking })
        .data;
      console.log(
        "✅ [bookingCanisterService] startBooking extracted data:",
        responseData,
      );
      return responseData;
    } catch (error) {
      console.error(
        "❌ [bookingCanisterService] Error starting booking:",
        error,
      );
      throw new Error(`Failed to start booking: ${error}`);
    }
  },

  /**
   * Complete a booking
   */
  async completeBooking(
    bookingId: string,
    amountPaid?: number,
  ): Promise<Booking | null> {
    console.log(
      "🚀 [bookingCanisterService] completeBooking called for booking:",
      bookingId,
    );
    try {
      const completeBookingFn = httpsCallable(functions, "completeBooking");

      const result = await completeBookingFn({
        bookingId,
        amountPaid,
      });

      console.log(
        "✅ [bookingCanisterService] completeBooking raw result:",
        result,
      );
      const responseData = (result.data as { success: boolean; data: Booking })
        .data;
      console.log(
        "✅ [bookingCanisterService] completeBooking extracted data:",
        responseData,
      );
      return responseData;
    } catch (error) {
      console.error(
        "❌ [bookingCanisterService] Error completing booking:",
        error,
      );
      throw new Error(`Failed to complete booking: ${error}`);
    }
  },

  /**
   * Dispute a booking
   */
  async disputeBooking(bookingId: string): Promise<Booking | null> {
    console.log(
      "🚀 [bookingCanisterService] disputeBooking called for booking:",
      bookingId,
    );
    try {
      const disputeBookingFn = httpsCallable(functions, "disputeBooking");

      const result = await disputeBookingFn({ bookingId });
      console.log(
        "✅ [bookingCanisterService] disputeBooking raw result:",
        result,
      );
      const responseData = (result.data as { success: boolean; data: Booking })
        .data;
      console.log(
        "✅ [bookingCanisterService] disputeBooking extracted data:",
        responseData,
      );
      return responseData;
    } catch (error) {
      console.error(
        "❌ [bookingCanisterService] Error disputing booking:",
        error,
      );
      throw new Error(`Failed to dispute booking: ${error}`);
    }
  },

  // NEW SERVICE-BASED AVAILABILITY FUNCTIONS (RECOMMENDED)

  /**
   * Get service's available time slots for a specific date
   */
  async getServiceAvailableSlots(
    serviceId: string,
    date: Date,
  ): Promise<AvailableSlot[] | null> {
    console.log(
      "🚀 [bookingCanisterService] getServiceAvailableSlots called for service:",
      serviceId,
    );
    try {
      const getServiceAvailableSlotsFn = httpsCallable(
        functions,
        "getServiceAvailableSlots",
      );

      const result = await getServiceAvailableSlotsFn({
        serviceId,
        date: date.toISOString(),
      });

      console.log(
        "✅ [bookingCanisterService] getServiceAvailableSlots raw result:",
        result,
      );
      const responseData = (
        result.data as { success: boolean; data: AvailableSlot[] }
      ).data;
      console.log(
        `✅ [bookingCanisterService] getServiceAvailableSlots extracted ${responseData?.length ?? 0} slots.`,
      );
      return responseData || [];
    } catch (error) {
      console.error(
        "❌ [bookingCanisterService] Error fetching service available slots:",
        error,
      );
      return [];
    }
  },

  /**
   * Check if service is available for booking at specific date/time
   */
  async checkServiceAvailability(
    serviceId: string,
    requestedDateTime: Date,
  ): Promise<boolean | null> {
    console.log(
      "🚀 [bookingCanisterService] checkServiceAvailability called for service:",
      serviceId,
    );
    try {
      const checkServiceAvailabilityFn = httpsCallable(
        functions,
        "checkServiceAvailability",
      );

      const result = await checkServiceAvailabilityFn({
        serviceId,
        requestedDateTime: requestedDateTime.toISOString(),
      });

      console.log(
        "✅ [bookingCanisterService] checkServiceAvailability raw result:",
        result,
      );
      const responseData = (
        result.data as { success: boolean; data: { available: boolean } }
      ).data;
      console.log(
        "✅ [bookingCanisterService] checkServiceAvailability extracted data:",
        responseData,
      );
      return responseData?.available || false;
    } catch (error) {
      console.error(
        "❌ [bookingCanisterService] Error checking service availability:",
        error,
      );
      throw new Error(`Failed to check service availability: ${error}`);
    }
  },

  /**
   * Get client analytics
   */
  async getClientAnalytics(
    clientId: Principal,
    startDate?: Date,
    endDate?: Date,
  ): Promise<ClientAnalytics | null> {
    console.log(
      "🚀 [bookingCanisterService] getClientAnalytics called for client:",
      clientId.toString(),
    );
    try {
      const getClientAnalyticsFn = httpsCallable(
        functions,
        "getClientAnalytics",
      );

      const result = await getClientAnalyticsFn({
        clientId: clientId.toString(),
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
      });

      console.log(
        "✅ [bookingCanisterService] getClientAnalytics raw result:",
        result,
      );
      const responseData = (
        result.data as { success: boolean; data: ClientAnalytics }
      ).data;
      console.log(
        "✅ [bookingCanisterService] getClientAnalytics extracted data:",
        responseData,
      );
      return responseData;
    } catch (error) {
      console.error(
        "❌ [bookingCanisterService] Error fetching client analytics:",
        error,
      );
      throw new Error(`Failed to fetch client analytics: ${error}`);
    }
  },

  /**
   * Release held payment for a completed booking
   * This function is called after the Firebase Cloud Function has processed the payment release
   */
  async releasePayment(
    bookingId: string,
    paymentId?: string,
    releasedAmount?: number,
    commissionRetained?: number,
    payoutId?: string,
  ): Promise<Booking | null> {
    console.log(
      "🚀 [bookingCanisterService] releasePayment called for booking:",
      bookingId,
    );
    try {
      const releasePaymentFn = httpsCallable(functions, "releasePayment");

      const result = await releasePaymentFn({
        bookingId,
        paymentId,
        releasedAmount,
        commissionRetained,
        payoutId,
      });

      console.log(
        "✅ [bookingCanisterService] releasePayment raw result:",
        result,
      );
      const responseData = (result.data as { success: boolean; data: Booking })
        .data;
      console.log(
        "✅ [bookingCanisterService] releasePayment extracted data:",
        responseData,
      );
      return responseData;
    } catch (error) {
      console.error(
        "❌ [bookingCanisterService] Error releasing payment:",
        error,
      );
      throw new Error(`Failed to release payment: ${error}`);
    }
  },

  // Utility functions for working with multiple packages
  /**
   * Utility function to check if a booking has a specific package
   */
  hasPackage(booking: Booking, packageId: string): boolean {
    return booking.servicePackageId.includes(packageId);
  },

  /**
   * Utility function to get the first package ID (for backwards compatibility)
   */
  getFirstPackageId(booking: Booking): string | undefined {
    return booking.servicePackageId.length > 0
      ? booking.servicePackageId[0]
      : undefined;
  },

  /**
   * Utility function to check if a booking has multiple packages
   */
  hasMultiplePackages(booking: Booking): boolean {
    return booking.servicePackageId.length > 1;
  },

  /**
   * Utility function to get all package IDs as a formatted string
   */
  getPackageIdsDisplay(booking: Booking): string {
    if (booking.servicePackageId.length === 0) {
      return "No packages";
    }
    return booking.servicePackageId.join(", ");
  },
};

// Firebase functions don't require actor management or reset functionality

export default bookingCanisterService;
