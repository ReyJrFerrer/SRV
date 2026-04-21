// Booking Service (Firebase Cloud Functions)
import { Principal } from "@dfinity/principal";
import { httpsCallable } from "firebase/functions";
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  Unsubscribe,
} from "firebase/firestore";
import { getFirebaseFunctions, getFirebaseFirestore } from "./firebaseApp";

// Get Firebase instances using proper helpers
const getFunctions = () => getFirebaseFunctions();
const getDb = () => getFirebaseFirestore();

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
  servicePackageId: string[]; // Array of package IDs for multiple package bookings (frontend field name)
  servicePackageIds?: string[]; // Backend field name (optional for compatibility)
  status: BookingStatus;
  requestedDate: string;
  scheduledDate: string;
  startedDate?: string; // When service status changed to InProgress
  completedDate?: string;
  price: number;
  amountPaid?: number; // Total amount paid by client (cash received)
  serviceTime?: number; // Duration in nanoseconds from started to completed
  location: Location;
  evidence?: Evidence;
  attachments?: string[];
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

// Helper function to map backend field names to frontend interface
const mapBookingFields = (booking: any): Booking => ({
  ...booking,
  servicePackageId: booking.servicePackageIds || booking.servicePackageId || [],
});

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
    scheduledDate: Date, // End time of the booking slot
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
      scheduledDate, // Pass the end time
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
    scheduledDate: Date, // End time of the booking slot
    servicePackageIds: string[] = [], // Array of package IDs for multiple package bookings
    notes?: string,
    amountToPay?: number,
    paymentMethod: PaymentMethod = "CashOnHand",
    paymentId?: string,
    locationDetection: "automatic" | "manual" = "manual",
    attachments?: string[],
  ): Promise<Booking | null> {
    try {
      const createBookingFn = httpsCallable(getFunctions(), "createBooking");

      const result = await createBookingFn({
        serviceId,
        providerId: providerId.toString(),
        price,
        location,
        requestedDate: requestedDate.toISOString(),
        scheduledDate: scheduledDate.toISOString(), // Send the end time to backend
        servicePackageIds,
        notes,
        attachments,
        amountToPay,
        paymentMethod,
        paymentId,
        locationDetection,
      });

      const responseData = (result.data as { success: boolean; data: Booking })
        .data;
      return responseData;
    } catch (error) {
      throw new Error(`Failed to create booking: ${error}`);
    }
  },

  /**
   * Get a specific booking by ID
   */
  async getBooking(bookingId: string): Promise<Booking | null> {
    try {
      const getBookingFn = httpsCallable(getFunctions(), "getBooking");

      const result = await getBookingFn({ bookingId });
      const responseData = (
        result.data as { success: boolean; data: Booking | null }
      ).data;

      // Map servicePackageIds (from backend) to servicePackageId (frontend interface)
      if (responseData) {
        return mapBookingFields(responseData);
      }

      return responseData;
    } catch (error) {
      throw new Error(`Failed to fetch booking: ${error}`);
    }
  },

  /**
   * Get all bookings for a client
   */
  async getClientBookings(clientId: Principal): Promise<Booking[]> {
    try {
      const getClientBookingsFn = httpsCallable(
        getFunctions(),
        "getClientBookings",
      );

      const result = await getClientBookingsFn({
        clientId: clientId.toString(),
      });
      const responseData = (
        result.data as { success: boolean; data: Booking[] }
      ).data;

      // Map servicePackageIds (from backend) to servicePackageId (frontend interface)
      const mappedBookings = (responseData || []).map(mapBookingFields);

      return mappedBookings;
    } catch (error) {
      return []; // Return empty array on error to prevent .map() issues
    }
  },

  /**
   * Get all bookings for a provider
   */
  async getProviderBookings(providerId: Principal): Promise<Booking[]> {
    try {
      const getProviderBookingsFn = httpsCallable(
        getFunctions(),
        "getProviderBookings",
      );

      const result = await getProviderBookingsFn({
        providerId: providerId.toString(),
      });
      const responseData = (
        result.data as { success: boolean; data: Booking[] }
      ).data;

      // Map servicePackageIds (from backend) to servicePackageId (frontend interface)
      const mappedBookings = (responseData || []).map(mapBookingFields);

      return mappedBookings;
    } catch (error) {
      return [];
    }
  },

  /**
   * Get bookings by status
   */
  async getBookingsByStatus(status: BookingStatus): Promise<Booking[]> {
    try {
      const getBookingsByStatusFn = httpsCallable(
        getFunctions(),
        "getBookingsByStatus",
      );

      const result = await getBookingsByStatusFn({ status });
      const responseData = (
        result.data as { success: boolean; data: Booking[] }
      ).data;
      // Map servicePackageIds (from backend) to servicePackageId (frontend interface)
      const mappedBookings = (responseData || []).map(mapBookingFields);

      return mappedBookings;
    } catch (error) {
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
    try {
      const acceptBookingFn = httpsCallable(getFunctions(), "acceptBooking");

      const result = await acceptBookingFn({
        bookingId,
        scheduledDate: scheduledDate.toISOString(),
      });

      const responseData = (result.data as { success: boolean; data: Booking })
        .data;
      return mapBookingFields(responseData);
    } catch (error) {
      throw new Error(`Failed to accept booking: ${error}`);
    }
  },

  /**
   * Decline a booking
   */
  async declineBooking(bookingId: string): Promise<Booking | null> {
    try {
      const declineBookingFn = httpsCallable(getFunctions(), "declineBooking");

      const result = await declineBookingFn({ bookingId });
      const responseData = (result.data as { success: boolean; data: Booking })
        .data;
      return mapBookingFields(responseData);
    } catch (error) {
      throw new Error(`Failed to decline booking: ${error}`);
    }
  },

  /**
   * Cancel a booking
   * @param bookingId The ID of the booking to cancel
   * @param cancelReason The reason for cancellation (required)
   */
  async cancelBooking(
    bookingId: string,
    cancelReason: string,
  ): Promise<Booking | null> {
    try {
      const cancelBookingFn = httpsCallable(getFunctions(), "cancelBooking");

      if (!cancelReason || cancelReason.trim() === "") {
        throw new Error("A reason for cancellation is required");
      }

      const result = await cancelBookingFn({
        bookingId,
        cancelReason: cancelReason.trim(),
      });
      const responseData = (result.data as { success: boolean; data: Booking })
        .data;
      return mapBookingFields(responseData);
    } catch (error) {
      throw new Error(`Failed to cancel booking: ${error}`);
    }
  },

  /**
   * Start a booking (mark as in progress)
   */
  async startBooking(bookingId: string): Promise<Booking | null> {
    try {
      const startBookingFn = httpsCallable(getFunctions(), "startBooking");

      const result = await startBookingFn({ bookingId });
      const responseData = (result.data as { success: boolean; data: Booking })
        .data;
      return mapBookingFields(responseData);
    } catch (error) {
      throw new Error(`Failed to start booking: ${error}`);
    }
  },

  /**
   * Start navigation
   */
  async startNavigation(bookingId: string): Promise<Booking | null> {
    try {
      const startNavigationFn = httpsCallable(
        getFunctions(),
        "startNavigation",
      );

      const result = await startNavigationFn({ bookingId });
      const responseData = (result.data as { success: boolean; data: Booking })
        .data;
      return mapBookingFields(responseData);
    } catch (error) {
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
    try {
      const completeBookingFn = httpsCallable(
        getFunctions(),
        "completeBooking",
      );

      const result = await completeBookingFn({
        bookingId,
        amountPaid,
      });
      const responseData = (result.data as { success: boolean; data: Booking })
        .data;
      return mapBookingFields(responseData);
    } catch (error) {
      throw new Error(`Failed to complete booking: ${error}`);
    }
  },

  /**
   * Dispute a booking
   */
  async disputeBooking(bookingId: string): Promise<Booking | null> {
    try {
      const disputeBookingFn = httpsCallable(getFunctions(), "disputeBooking");

      const result = await disputeBookingFn({ bookingId });
      const responseData = (result.data as { success: boolean; data: Booking })
        .data;
      return mapBookingFields(responseData);
    } catch (error) {
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
    try {
      const getServiceAvailableSlotsFn = httpsCallable(
        getFunctions(),
        "getServiceAvailableSlots",
      );

      const result = await getServiceAvailableSlotsFn({
        serviceId,
        date: date.toISOString(),
      });

      const responseData = (
        result.data as { success: boolean; data: AvailableSlot[] }
      ).data;

      return responseData || [];
    } catch (error) {
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
    try {
      const checkServiceAvailabilityFn = httpsCallable(
        getFunctions(),
        "checkServiceAvailability",
      );

      const result = await checkServiceAvailabilityFn({
        serviceId,
        requestedDateTime: requestedDateTime.toISOString(),
      });

      const responseData = (
        result.data as { success: boolean; data: { available: boolean } }
      ).data;
      return responseData?.available || false;
    } catch (error) {
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
    try {
      const getClientAnalyticsFn = httpsCallable(
        getFunctions(),
        "getClientAnalytics",
      );

      const result = await getClientAnalyticsFn({
        clientId: clientId.toString(),
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
      });

      const responseData = (
        result.data as { success: boolean; data: ClientAnalytics }
      ).data;
      return responseData;
    } catch (error) {
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
    try {
      const releasePaymentFn = httpsCallable(getFunctions(), "releasePayment");

      const result = await releasePaymentFn({
        bookingId,
        paymentId,
        releasedAmount,
        commissionRetained,
        payoutId,
      });

      const responseData = (result.data as { success: boolean; data: Booking })
        .data;
      return responseData;
    } catch (error) {
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

  // ==================== REALTIME SUBSCRIPTION FUNCTIONS ====================

  // Shared listeners cache to prevent Firebase Web SDK 'Unexpected state' crashes
  // caused by rapid/overlapping exact same queries being initiated.

  /**
   * Subscribe to all bookings for a client with realtime updates
   */
  subscribeToClientBookings(
    clientId: Principal,
    callback: (bookings: Booking[]) => void,
  ): Unsubscribe {
    const listenerId = `client-${clientId.toString()}`;
    const q = query(
      collection(getDb(), "bookings"),
      where("clientId", "==", clientId.toString()),
    );
    return createSharedBookingListener(listenerId, q, callback);
  },

  /**
   * Subscribe to all bookings for a provider with realtime updates
   */
  subscribeToProviderBookings(
    providerId: Principal,
    callback: (bookings: Booking[]) => void,
  ): Unsubscribe {
    const listenerId = `provider-${providerId.toString()}`;
    const q = query(
      collection(getDb(), "bookings"),
      where("providerId", "==", providerId.toString()),
    );
    return createSharedBookingListener(listenerId, q, callback);
  },

  /**
   * Subscribe to a single booking with realtime updates
   */
  subscribeToBooking(
    bookingId: string,
    callback: (booking: Booking | null) => void,
  ): Unsubscribe {
    const listenerId = `booking-${bookingId}`;
    const bookingRef = doc(getDb(), "bookings", bookingId);

    let listener = sharedBookingListeners.get(listenerId);

    if (listener) {
      listener.callbacks.add(callback);
      if (listener.lastData !== undefined) {
        callback(listener.lastData);
      }
      return () => {
        const l = sharedBookingListeners.get(listenerId);
        if (l) {
          l.callbacks.delete(callback);
          if (l.callbacks.size === 0) {
            setTimeout(() => {
              const currentL = sharedBookingListeners.get(listenerId);
              if (currentL && currentL.callbacks.size === 0) {
                currentL.unsubscribe();
                sharedBookingListeners.delete(listenerId);
              }
            }, 1000);
          }
        }
      };
    }

    const notifyAll = (booking: Booking | null) => {
      const currentListener = sharedBookingListeners.get(listenerId);
      if (currentListener) {
        currentListener.lastData = booking;
        currentListener.callbacks.forEach((cb) => cb(booking));
      }
    };

    const unsubscribe = onSnapshot(
      bookingRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = { id: snapshot.id, ...snapshot.data() } as Booking;
          notifyAll(mapBookingFields(data));
        } else {
          notifyAll(null);
        }
      },
      () => {
        notifyAll(null);
      },
    );

    sharedBookingListeners.set(listenerId, {
      unsubscribe,
      callbacks: new Set([callback]),
      lastData: undefined,
    });

    return () => {
      const l = sharedBookingListeners.get(listenerId);
      if (l) {
        l.callbacks.delete(callback);
        if (l.callbacks.size === 0) {
          // Delay actual unsubscription to prevent rapid mount/unmount issues in Firestore
          setTimeout(() => {
            const currentL = sharedBookingListeners.get(listenerId);
            if (currentL && currentL.callbacks.size === 0) {
              currentL.unsubscribe();
              sharedBookingListeners.delete(listenerId);
            }
          }, 1000);
        }
      }
    };
  },

  /**
   * Subscribe to bookings by status with realtime updates
   */
  subscribeToBookingsByStatus(
    status: BookingStatus,
    callback: (bookings: Booking[]) => void,
  ): Unsubscribe {
    const listenerId = `status-${status}`;
    const q = query(
      collection(getDb(), "bookings"),
      where("status", "==", status),
    );
    return createSharedBookingListener(listenerId, q, callback);
  },
};

// Global cache for shared listeners
const sharedBookingListeners = new Map<
  string,
  {
    unsubscribe: Unsubscribe;
    callbacks: Set<Function>;
    lastData: any;
  }
>();

// Helper to create or reuse a listener that expects an array of Bookings
function createSharedBookingListener(
  listenerId: string,
  q: any,
  callback: (bookings: Booking[]) => void,
): Unsubscribe {
  let listener = sharedBookingListeners.get(listenerId);

  if (listener) {
    listener.callbacks.add(callback);
    if (listener.lastData !== undefined) {
      callback(listener.lastData);
    }
    return () => {
      const l = sharedBookingListeners.get(listenerId);
      if (l) {
        l.callbacks.delete(callback);
        if (l.callbacks.size === 0) {
          // Delay actual unsubscription to prevent rapid mount/unmount issues in Firestore
          setTimeout(() => {
            const currentL = sharedBookingListeners.get(listenerId);
            if (currentL && currentL.callbacks.size === 0) {
              currentL.unsubscribe();
              sharedBookingListeners.delete(listenerId);
            }
          }, 1000);
        }
      }
    };
  }

  const notifyAll = (bookings: Booking[]) => {
    const currentListener = sharedBookingListeners.get(listenerId);
    if (currentListener) {
      currentListener.lastData = bookings;
      currentListener.callbacks.forEach((cb) => cb(bookings));
    }
  };

  const unsubscribe = onSnapshot(
    q,
    (snapshot: any) => {
      const bookings: Booking[] = [];
      snapshot.forEach((doc: any) => {
        const data = { id: doc.id, ...doc.data() } as Booking;
        bookings.push(mapBookingFields(data));
      });
      notifyAll(bookings);
    },
    () => {
      notifyAll([]);
    },
  );

  sharedBookingListeners.set(listenerId, {
    unsubscribe,
    callbacks: new Set([callback]),
    lastData: undefined,
  });

  return () => {
    const l = sharedBookingListeners.get(listenerId);
    if (l) {
      l.callbacks.delete(callback);
      if (l.callbacks.size === 0) {
        setTimeout(() => {
          const currentL = sharedBookingListeners.get(listenerId);
          if (currentL && currentL.callbacks.size === 0) {
            currentL.unsubscribe();
            sharedBookingListeners.delete(listenerId);
          }
        }, 1000);
      }
    }
  };
}

// Firebase functions don't require actor management or reset functionality

export default bookingCanisterService;
