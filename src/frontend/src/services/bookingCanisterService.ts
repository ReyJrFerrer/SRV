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
  servicePackageId: string[];
  servicePackageIds?: string[];
  status: BookingStatus;
  requestedDate: string;
  scheduledDate: string;
  startedDate?: string;
  completedDate?: string;
  price: number;
  amountPaid?: number;
  serviceTime?: number;
  location: Location;
  evidence?: Evidence;
  attachments?: string[];
  providerAttachments?: string[];
  notes?: string;
  paymentMethod: PaymentMethod;
  paymentId?: string;
  createdAt: string;
  updatedAt: string;
  serviceName?: string;
  serviceImage?: string;
  providerName?: string;
  bookingDate?: string;
  bookingTime?: string;
  duration?: string;
  priceDisplay?: string;
  serviceSlug?: string;
}

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
    providerId: string,
    price: number,
    location: Location,
    requestedDate: Date,
    scheduledDate: Date,
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
      scheduledDate,
      [servicePackageId],
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
    providerId: string,
    price: number,
    location: Location,
    requestedDate: Date,
    scheduledDate: Date,
    servicePackageIds: string[] = [],
    notes?: string,
    amountToPay?: number,
    paymentMethod: PaymentMethod = "CashOnHand",
    paymentId?: string,
    locationDetection: "automatic" | "manual" = "manual",
    attachments?: string[],
  ): Promise<Booking | null> {
    try {
      const bookingActionFn = httpsCallable(getFunctions(), "bookingAction");

      const result = await bookingActionFn({
        action: "createBooking",
        data: {
          serviceId,
          providerId: providerId.toString(),
          price,
          location,
          requestedDate: requestedDate.toISOString(),
          scheduledDate: scheduledDate.toISOString(),
          servicePackageIds,
          notes,
          attachments,
          amountToPay,
          paymentMethod,
          paymentId,
          locationDetection,
        },
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
      const bookingActionFn = httpsCallable(getFunctions(), "bookingAction");

      const result = await bookingActionFn({
        action: "getBooking",
        data: { bookingId },
      });
      const responseData = (
        result.data as { success: boolean; data: Booking | null }
      ).data;

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
  async getClientBookings(clientId: string): Promise<Booking[]> {
    try {
      const bookingActionFn = httpsCallable(
        getFunctions(),
        "bookingAction",
      );

      const result = await bookingActionFn({
        action: "getClientBookings",
        data: { clientId: clientId.toString() },
      });
      const responseData = (
        result.data as { success: boolean; data: Booking[] }
      ).data;

      const mappedBookings = (responseData || []).map(mapBookingFields);

      return mappedBookings;
    } catch (error) {
      return [];
    }
  },

  /**
   * Get all bookings for a provider
   */
  async getProviderBookings(providerId: string): Promise<Booking[]> {
    try {
      const bookingActionFn = httpsCallable(
        getFunctions(),
        "bookingAction",
      );

      const result = await bookingActionFn({
        action: "getProviderBookings",
        data: { providerId: providerId.toString() },
      });
      const responseData = (
        result.data as { success: boolean; data: Booking[] }
      ).data;

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
      const bookingActionFn = httpsCallable(
        getFunctions(),
        "bookingAction",
      );

      const result = await bookingActionFn({
        action: "getBookingsByStatus",
        data: { status },
      });
      const responseData = (
        result.data as { success: boolean; data: Booking[] }
      ).data;
      const mappedBookings = (responseData || []).map(mapBookingFields);

      return mappedBookings;
    } catch (error) {
      return [];
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
      const bookingActionFn = httpsCallable(getFunctions(), "bookingAction");

      const result = await bookingActionFn({
        action: "acceptBooking",
        data: {
          bookingId,
          scheduledDate: scheduledDate.toISOString(),
        },
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
      const bookingActionFn = httpsCallable(getFunctions(), "bookingAction");

      const result = await bookingActionFn({
        action: "declineBooking",
        data: { bookingId },
      });
      const responseData = (result.data as { success: boolean; data: Booking })
        .data;
      return mapBookingFields(responseData);
    } catch (error) {
      throw new Error(`Failed to decline booking: ${error}`);
    }
  },

  /**
   * Cancel a booking
   */
  async cancelBooking(
    bookingId: string,
    cancelReason: string,
  ): Promise<Booking | null> {
    try {
      const bookingActionFn = httpsCallable(getFunctions(), "bookingAction");

      if (!cancelReason || cancelReason.trim() === "") {
        throw new Error("A reason for cancellation is required");
      }

      const result = await bookingActionFn({
        action: "cancelBooking",
        data: {
          bookingId,
          cancelReason: cancelReason.trim(),
        },
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
      const bookingActionFn = httpsCallable(getFunctions(), "bookingAction");

      const result = await bookingActionFn({
        action: "startBooking",
        data: { bookingId },
      });
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
      const bookingActionFn = httpsCallable(
        getFunctions(),
        "bookingAction",
      );

      const result = await bookingActionFn({
        action: "startNavigation",
        data: { bookingId },
      });
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
      const bookingActionFn = httpsCallable(
        getFunctions(),
        "bookingAction",
      );

      const result = await bookingActionFn({
        action: "completeBooking",
        data: {
          bookingId,
          amountPaid,
        },
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
      const bookingActionFn = httpsCallable(getFunctions(), "bookingAction");

      const result = await bookingActionFn({
        action: "disputeBooking",
        data: { bookingId },
      });
      const responseData = (result.data as { success: boolean; data: Booking })
        .data;
      return mapBookingFields(responseData);
    } catch (error) {
      throw new Error(`Failed to dispute booking: ${error}`);
    }
  },

  /**
   * Get service's available time slots for a specific date
   */
  async getServiceAvailableSlots(
    serviceId: string,
    date: Date,
  ): Promise<AvailableSlot[] | null> {
    try {
      const bookingActionFn = httpsCallable(
        getFunctions(),
        "bookingAction",
      );

      const result = await bookingActionFn({
        action: "getServiceAvailableSlots",
        data: {
          serviceId,
          date: date.toISOString(),
        },
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
      const bookingActionFn = httpsCallable(
        getFunctions(),
        "bookingAction",
      );

      const result = await bookingActionFn({
        action: "checkServiceAvailability",
        data: {
          serviceId,
          requestedDateTime: requestedDateTime.toISOString(),
        },
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
    clientId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<ClientAnalytics | null> {
    try {
      const bookingActionFn = httpsCallable(
        getFunctions(),
        "bookingAction",
      );

      const result = await bookingActionFn({
        action: "getClientAnalytics",
        data: {
          clientId: clientId.toString(),
          startDate: startDate?.toISOString(),
          endDate: endDate?.toISOString(),
        },
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
   */
  async releasePayment(
    bookingId: string,
    paymentId?: string,
    releasedAmount?: number,
    commissionRetained?: number,
    payoutId?: string,
  ): Promise<Booking | null> {
    try {
      const bookingActionFn = httpsCallable(getFunctions(), "bookingAction");

      const result = await bookingActionFn({
        action: "releasePayment",
        data: {
          bookingId,
          paymentId,
          releasedAmount,
          commissionRetained,
          payoutId,
        },
      });

      const responseData = (result.data as { success: boolean; data: Booking })
        .data;
      return responseData;
    } catch (error) {
      throw new Error(`Failed to release payment: ${error}`);
    }
  },

  /**
   * Update provider service proof images
   */
  async updateProviderAttachments(
    bookingId: string,
    newAttachmentUrls: string[],
  ): Promise<void> {
    try {
      const bookingRef = doc(getDb(), "bookings", bookingId);
      const { updateDoc, arrayUnion } = await import("firebase/firestore");
      await updateDoc(bookingRef, {
        providerAttachments: arrayUnion(...newAttachmentUrls),
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      throw new Error(`Failed to update provider attachments: ${error}`);
    }
  },

  // Utility functions for working with multiple packages
  hasPackage(booking: Booking, packageId: string): boolean {
    return booking.servicePackageId.includes(packageId);
  },

  getFirstPackageId(booking: Booking): string | undefined {
    return booking.servicePackageId.length > 0
      ? booking.servicePackageId[0]
      : undefined;
  },

  hasMultiplePackages(booking: Booking): boolean {
    return booking.servicePackageId.length > 1;
  },

  getPackageIdsDisplay(booking: Booking): string {
    if (booking.servicePackageId.length === 0) {
      return "No packages";
    }
    return booking.servicePackageId.join(", ");
  },

  // ==================== REALTIME SUBSCRIPTION FUNCTIONS ====================

  subscribeToClientBookings(
    clientId: string,
    callback: (bookings: Booking[]) => void,
  ): Unsubscribe {
    const listenerId = `client-${clientId}`;
    const q = query(
      collection(getDb(), "bookings"),
      where("clientId", "==", clientId),
    );
    return createSharedBookingListener(listenerId, q, callback);
  },

  subscribeToProviderBookings(
    providerId: string,
    callback: (bookings: Booking[]) => void,
  ): Unsubscribe {
    const listenerId = `provider-${providerId}`;
    const q = query(
      collection(getDb(), "bookings"),
      where("providerId", "==", providerId.toString()),
    );
    return createSharedBookingListener(listenerId, q, callback);
  },

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
      if (snapshot.metadata?.fromCache && snapshot.empty) {
        return;
      }
      const bookings: Booking[] = [];
      snapshot.forEach((doc: any) => {
        const data = { id: doc.id, ...doc.data() } as Booking;
        bookings.push(mapBookingFields(data));
      });
      notifyAll(bookings);
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

export default bookingCanisterService;