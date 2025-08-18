// Booking Canister Service
import { Principal } from "@dfinity/principal";
import { canisterId as authCanisterId } from "../../../declarations/auth";
import { createActor, canisterId } from "../../../declarations/booking";
import { canisterId as reviewCanisterId } from "../../../declarations/review";
import { canisterId as reputationCanisterId } from "../../../declarations/reputation";
import { canisterId as serviceCanisterId } from "../../../declarations/service";
import { Identity } from "@dfinity/agent";
import type {
  _SERVICE as BookingService,
  Booking as CanisterBooking,
  BookingStatus as CanisterBookingStatus,
  Location as CanisterLocation,
  Evidence as CanisterEvidence,
  AvailableSlot as CanisterAvailableSlot,
  ClientAnalytics as CanisterClientAnalytics,
  ProviderAvailability as CanisterProviderAvailability,
  ProviderAnalytics as CanisterProviderAnalytics,
  TimeSlot as CanisterTimeSlot,
  DayOfWeek as CanisterDayOfWeek,
  DayAvailability as CanisterDayAvailability,
} from "../../../declarations/booking/booking.did";

/**
 * Creates a booking actor with the provided identity
 * @param identity The user's identity from AuthContext
 * @returns An authenticated BookingService actor
 */
const createBookingActor = (identity?: Identity | null): BookingService => {
  return createActor(canisterId, {
    agentOptions: {
      identity: identity || undefined,
      host:
        process.env.DFX_NETWORK !== "ic"
          ? "http://localhost:4943"
          : "https://ic0.app",
    },
  }) as BookingService;
};

// Singleton actor instance with identity tracking
let bookingActor: BookingService | null = null;
let currentIdentity: Identity | null = null;

/**
 * Updates the booking actor with a new identity
 * This should be called when the user's authentication state changes
 */
export const updateBookingActor = (identity: Identity | null) => {
  if (currentIdentity !== identity) {
    bookingActor = createBookingActor(identity);
    currentIdentity = identity;
  }
};

/**
 * Gets the current booking actor
 * Throws error if no authenticated identity is available for auth-required operations
 */
const getBookingActor = (requireAuth: boolean = false): BookingService => {
  if (requireAuth && !currentIdentity) {
    throw new Error(
      "Authentication required: Please log in to perform this action",
    );
  }

  if (!bookingActor) {
    bookingActor = createBookingActor(currentIdentity);
  }

  return bookingActor;
};

// Type mappings for frontend compatibility
export type BookingStatus =
  | "Requested"
  | "Accepted"
  | "Declined"
  | "Cancelled"
  | "InProgress"
  | "Completed"
  | "Disputed";

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
  servicePackageId?: string;
  status: BookingStatus;
  requestedDate: string;
  scheduledDate?: string;
  completedDate?: string;
  price: number;
  location: Location;
  evidence?: Evidence;
  notes?: string;
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

// Helper functions to convert between canister and frontend types
const convertCanisterBookingStatus = (
  status: CanisterBookingStatus,
): BookingStatus => {
  if ("Requested" in status) return "Requested";
  if ("Accepted" in status) return "Accepted";
  if ("Declined" in status) return "Declined";
  if ("Cancelled" in status) return "Cancelled";
  if ("InProgress" in status) return "InProgress";
  if ("Completed" in status) return "Completed";
  if ("Disputed" in status) return "Disputed";
  return "Requested"; // fallback
};

const convertToCanisterBookingStatus = (
  status: BookingStatus,
): CanisterBookingStatus => {
  switch (status) {
    case "Requested":
      return { Requested: null };
    case "Accepted":
      return { Accepted: null };
    case "Declined":
      return { Declined: null };
    case "Cancelled":
      return { Cancelled: null };
    case "InProgress":
      return { InProgress: null };
    case "Completed":
      return { Completed: null };
    case "Disputed":
      return { Disputed: null };
    default:
      return { Requested: null };
  }
};

const convertCanisterLocation = (location: CanisterLocation): Location => ({
  latitude: location.latitude,
  longitude: location.longitude,
  address: location.address,
  city: location.city,
  state: location.state,
  country: location.country,
  postalCode: location.postalCode,
});

const convertToCanisterLocation = (location: Location): CanisterLocation => ({
  latitude: location.latitude,
  longitude: location.longitude,
  address: location.address,
  city: location.city,
  state: location.state,
  country: location.country,
  postalCode: location.postalCode,
});

const convertCanisterEvidence = (evidence: CanisterEvidence): Evidence => ({
  id: evidence.id,
  bookingId: evidence.bookingId,
  submitterId: evidence.submitterId,
  description: evidence.description,
  fileUrls: evidence.fileUrls,
  qualityScore: evidence.qualityScore[0],
  createdAt: new Date(Number(evidence.createdAt) / 1000000).toISOString(),
});

const convertCanisterDayOfWeek = (day: CanisterDayOfWeek): DayOfWeek => {
  if ("Monday" in day) return "Monday";
  if ("Tuesday" in day) return "Tuesday";
  if ("Wednesday" in day) return "Wednesday";
  if ("Thursday" in day) return "Thursday";
  if ("Friday" in day) return "Friday";
  if ("Saturday" in day) return "Saturday";
  if ("Sunday" in day) return "Sunday";
  return "Monday"; // fallback
};

const convertCanisterTimeSlot = (slot: CanisterTimeSlot): TimeSlot => ({
  startTime: slot.startTime,
  endTime: slot.endTime,
});

const convertCanisterDayAvailability = (
  availability: CanisterDayAvailability,
): DayAvailability => ({
  isAvailable: availability.isAvailable,
  slots: availability.slots.map(convertCanisterTimeSlot),
});

const convertCanisterProviderAvailability = (
  availability: CanisterProviderAvailability,
): ProviderAvailability => ({
  providerId: availability.providerId,
  isActive: availability.isActive,
  instantBookingEnabled: availability.instantBookingEnabled,
  bookingNoticeHours: Number(availability.bookingNoticeHours),
  maxBookingsPerDay: Number(availability.maxBookingsPerDay),
  weeklySchedule: availability.weeklySchedule.map(([day, avail]) => ({
    day: convertCanisterDayOfWeek(day),
    availability: convertCanisterDayAvailability(avail),
  })),
  // Note: vacationDates removed to match backend implementation
  createdAt: new Date(Number(availability.createdAt) / 1000000).toISOString(),
  updatedAt: new Date(Number(availability.updatedAt) / 1000000).toISOString(),
});

const convertCanisterAvailableSlot = (
  slot: CanisterAvailableSlot,
): AvailableSlot => ({
  date: new Date(Number(slot.date) / 1000000).toISOString(),
  timeSlot: convertCanisterTimeSlot(slot.timeSlot),
  isAvailable: slot.isAvailable,
  conflictingBookings: slot.conflictingBookings,
});

const convertCanisterProviderAnalytics = (
  analytics: CanisterProviderAnalytics,
): ProviderAnalytics => ({
  providerId: analytics.providerId,
  totalJobs: Number(analytics.totalJobs),
  completedJobs: Number(analytics.completedJobs),
  cancelledJobs: Number(analytics.cancelledJobs),
  totalEarnings: Number(analytics.totalEarnings),
  completionRate: analytics.completionRate,
  packageBreakdown: analytics.packageBreakdown.map(([pkg, count]) => [
    pkg,
    Number(count),
  ]),
  startDate: analytics.startDate[0]
    ? new Date(Number(analytics.startDate[0]) / 1000000).toISOString()
    : undefined,
  endDate: analytics.endDate[0]
    ? new Date(Number(analytics.endDate[0]) / 1000000).toISOString()
    : undefined,
});

const convertCanisterClientAnalytics = (
  analytics: CanisterClientAnalytics,
): ClientAnalytics => ({
  clientId: analytics.clientId,
  totalBookings: Number(analytics.totalBookings),
  servicesCompleted: Number(analytics.servicesCompleted),
  totalSpent: Number(analytics.totalSpent),
  memberSince: new Date(Number(analytics.memberSince) / 1000000).toISOString(),
  packageBreakdown: analytics.packageBreakdown.map(
    ([pkg, count]: [string, bigint]) => [pkg, Number(count)],
  ),
  startDate: analytics.startDate[0]
    ? new Date(Number(analytics.startDate[0]) / 1000000).toISOString()
    : undefined,
  endDate: analytics.endDate[0]
    ? new Date(Number(analytics.endDate[0]) / 1000000).toISOString()
    : undefined,
});

const convertCanisterBooking = (booking: CanisterBooking): Booking => ({
  id: booking.id,
  clientId: booking.clientId,
  providerId: booking.providerId,
  serviceId: booking.serviceId,
  servicePackageId: booking.servicePackageId[0],
  status: convertCanisterBookingStatus(booking.status),
  requestedDate: new Date(
    Number(booking.requestedDate) / 1000000,
  ).toISOString(),
  scheduledDate: booking.scheduledDate[0]
    ? new Date(Number(booking.scheduledDate[0]) / 1000000).toISOString()
    : undefined,
  completedDate: booking.completedDate[0]
    ? new Date(Number(booking.completedDate[0]) / 1000000).toISOString()
    : undefined,
  price: Number(booking.price),
  location: convertCanisterLocation(booking.location),
  evidence: booking.evidence[0]
    ? convertCanisterEvidence(booking.evidence[0])
    : undefined,
  notes: booking.notes[0],
  createdAt: new Date(Number(booking.createdAt) / 1000000).toISOString(),
  updatedAt: new Date(Number(booking.updatedAt) / 1000000).toISOString(),
});

// Booking Canister Service Functions
export const bookingCanisterService = {
  /**
   * Create a new booking
   */
  async createBooking(
    serviceId: string,
    providerId: Principal,
    price: number,
    location: Location,
    requestedDate: Date,
    servicePackageId?: string,
    notes?: string,
  ): Promise<Booking | null> {
    try {
      const actor = getBookingActor(true); // Requires authentication
      const canisterLocation = convertToCanisterLocation(location);
      const requestedTimestamp = BigInt(requestedDate.getTime() * 1000000); // Convert to nanoseconds

      const result = await actor.createBooking(
        serviceId,
        providerId,
        BigInt(price),
        canisterLocation,
        requestedTimestamp,
        servicePackageId ? [servicePackageId] : [],
        notes ? [notes] : [],
      );

      if ("ok" in result) {
        return convertCanisterBooking(result.ok);
      } else {
        console.error("Error creating booking:", result.err);
        throw new Error(result.err);
      }
    } catch (error) {
      console.error("Error creating booking:", error);
      throw new Error(`Failed to create booking: ${error}`);
    }
  },

  /**
   * Get a specific booking by ID
   */
  async getBooking(bookingId: string): Promise<Booking | null> {
    try {
      const actor = getBookingActor();
      const result = await actor.getBooking(bookingId);

      if ("ok" in result) {
        return convertCanisterBooking(result.ok);
      } else {
        console.error("Error fetching booking:", result.err);
        return null;
      }
    } catch (error) {
      console.error("Error fetching booking:", error);
      throw new Error(`Failed to fetch booking: ${error}`);
    }
  },

  /**
   * Get all bookings for a client
   */
  async getClientBookings(clientId: Principal): Promise<Booking[]> {
    try {
      const actor = getBookingActor();
      const bookings = await actor.getClientBookings(clientId);
      return bookings.map(convertCanisterBooking);
    } catch (error) {
      console.error("Error fetching client bookings:", error);
      throw new Error(`Failed to fetch client bookings: ${error}`);
    }
  },

  /**
   * Get all bookings for a provider
   */
  async getProviderBookings(providerId: Principal): Promise<Booking[]> {
    try {
      const actor = getBookingActor();
      const bookings = await actor.getProviderBookings(providerId);
      return bookings.map(convertCanisterBooking);
    } catch (error) {
      console.error("Error fetching provider bookings:", error);
      throw new Error(`Failed to fetch provider bookings: ${error}`);
    }
  },

  /**
   * Get bookings by status
   */
  async getBookingsByStatus(status: BookingStatus): Promise<Booking[]> {
    try {
      const actor = getBookingActor();
      const canisterStatus = convertToCanisterBookingStatus(status);
      const bookings = await actor.getBookingsByStatus(canisterStatus);
      return bookings.map(convertCanisterBooking);
    } catch (error) {
      console.error("Error fetching bookings by status:", error);
      throw new Error(`Failed to fetch bookings by status: ${error}`);
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
      const actor = getBookingActor();
      const scheduledTimestamp = BigInt(scheduledDate.getTime() * 1000000);

      const result = await actor.acceptBooking(bookingId, scheduledTimestamp);

      if ("ok" in result) {
        return convertCanisterBooking(result.ok);
      } else {
        console.error("Error accepting booking:", result.err);
        throw new Error(result.err);
      }
    } catch (error) {
      console.error("Error accepting booking:", error);
      throw new Error(`Failed to accept booking: ${error}`);
    }
  },

  /**
   * Decline a booking
   */
  async declineBooking(bookingId: string): Promise<Booking | null> {
    try {
      const actor = getBookingActor();
      const result = await actor.declineBooking(bookingId);

      if ("ok" in result) {
        return convertCanisterBooking(result.ok);
      } else {
        console.error("Error declining booking:", result.err);
        throw new Error(result.err);
      }
    } catch (error) {
      console.error("Error declining booking:", error);
      throw new Error(`Failed to decline booking: ${error}`);
    }
  },

  /**
   * Cancel a booking
   */
  async cancelBooking(bookingId: string): Promise<Booking | null> {
    try {
      const actor = getBookingActor();
      const result = await actor.cancelBooking(bookingId);

      if ("ok" in result) {
        return convertCanisterBooking(result.ok);
      } else {
        console.error("Error cancelling booking:", result.err);
        throw new Error(result.err);
      }
    } catch (error) {
      console.error("Error cancelling booking:", error);
      throw new Error(`Failed to cancel booking: ${error}`);
    }
  },

  /**
   * Start a booking (mark as in progress)
   */
  async startBooking(bookingId: string): Promise<Booking | null> {
    try {
      const actor = getBookingActor();
      const result = await actor.startBooking(bookingId);

      if ("ok" in result) {
        return convertCanisterBooking(result.ok);
      } else {
        console.error("Error starting booking:", result.err);
        throw new Error(result.err);
      }
    } catch (error) {
      console.error("Error starting booking:", error);
      throw new Error(`Failed to start booking: ${error}`);
    }
  },

  /**
   * Complete a booking
   */
  async completeBooking(bookingId: string): Promise<Booking | null> {
    try {
      const actor = getBookingActor();
      const result = await actor.completeBooking(bookingId);

      if ("ok" in result) {
        return convertCanisterBooking(result.ok);
      } else {
        console.error("Error completing booking:", result.err);
        throw new Error(result.err);
      }
    } catch (error) {
      console.error("Error completing booking:", error);
      throw new Error(`Failed to complete booking: ${error}`);
    }
  },

  /**
   * Dispute a booking
   */
  async disputeBooking(bookingId: string): Promise<Booking | null> {
    try {
      const actor = getBookingActor();
      const result = await actor.disputeBooking(bookingId);

      if ("ok" in result) {
        return convertCanisterBooking(result.ok);
      } else {
        console.error("Error disputing booking:", result.err);
        throw new Error(result.err);
      }
    } catch (error) {
      console.error("Error disputing booking:", error);
      throw new Error(`Failed to dispute booking: ${error}`);
    }
  },

  /**
   * Submit evidence for a booking
   */
  async submitEvidence(
    bookingId: string,
    description: string,
    fileUrls: string[],
  ): Promise<Evidence | null> {
    try {
      const actor = getBookingActor();
      const result = await actor.submitEvidence(
        bookingId,
        description,
        fileUrls,
      );

      if ("ok" in result) {
        return convertCanisterEvidence(result.ok);
      } else {
        console.error("Error submitting evidence:", result.err);
        throw new Error(result.err);
      }
    } catch (error) {
      console.error("Error submitting evidence:", error);
      throw new Error(`Failed to submit evidence: ${error}`);
    }
  },

  /**
   * Check if a booking is eligible for review
   */
  async isEligibleForReview(
    bookingId: string,
    reviewerId: Principal,
  ): Promise<boolean | null> {
    try {
      const actor = getBookingActor();
      const result = await actor.isEligibleForReview(bookingId, reviewerId);

      if ("ok" in result) {
        return result.ok;
      } else {
        console.error("Error checking review eligibility:", result.err);
        return null;
      }
    } catch (error) {
      console.error("Error checking review eligibility:", error);
      throw new Error(`Failed to check review eligibility: ${error}`);
    }
  },

  /**
   * Get active bookings for a client
   */
  async getClientActiveBookings(clientId: Principal): Promise<Booking[]> {
    try {
      const actor = getBookingActor();
      const bookings = await actor.getClientActiveBookings(clientId);
      return bookings.map(convertCanisterBooking);
    } catch (error) {
      console.error("Error fetching client active bookings:", error);
      throw new Error(`Failed to fetch client active bookings: ${error}`);
    }
  },

  /**
   * Get active bookings for a provider
   */
  async getProviderActiveBookings(providerId: Principal): Promise<Booking[]> {
    try {
      const actor = getBookingActor();
      const bookings = await actor.getProviderActiveBookings(providerId);
      return bookings.map(convertCanisterBooking);
    } catch (error) {
      console.error("Error fetching provider active bookings:", error);
      throw new Error(`Failed to fetch provider active bookings: ${error}`);
    }
  },

  /**
   * Get completed bookings for a client
   */
  async getClientCompletedBookings(clientId: Principal): Promise<Booking[]> {
    try {
      const actor = getBookingActor();
      const bookings = await actor.getClientCompletedBookings(clientId);
      return bookings.map(convertCanisterBooking);
    } catch (error) {
      console.error("Error fetching client completed bookings:", error);
      throw new Error(`Failed to fetch client completed bookings: ${error}`);
    }
  },

  /**
   * Get completed bookings for a provider
   */
  async getProviderCompletedBookings(
    providerId: Principal,
  ): Promise<Booking[]> {
    try {
      const actor = getBookingActor();
      const bookings = await actor.getProviderCompletedBookings(providerId);
      return bookings.map(convertCanisterBooking);
    } catch (error) {
      console.error("Error fetching provider completed bookings:", error);
      throw new Error(`Failed to fetch provider completed bookings: ${error}`);
    }
  },

  /**
   * Get disputed bookings
   */
  async getDisputedBookings(): Promise<Booking[]> {
    try {
      const actor = getBookingActor();
      const bookings = await actor.getDisputedBookings();
      return bookings.map(convertCanisterBooking);
    } catch (error) {
      console.error("Error fetching disputed bookings:", error);
      throw new Error(`Failed to fetch disputed bookings: ${error}`);
    }
  },

  /**
   * Get bookings by date range
   */
  async getBookingsByDateRange(
    startDate: Date,
    endDate: Date,
  ): Promise<Booking[]> {
    try {
      const actor = getBookingActor();
      const startTimestamp = BigInt(startDate.getTime() * 1000000);
      const endTimestamp = BigInt(endDate.getTime() * 1000000);

      const bookings = await actor.getBookingsByDateRange(
        startTimestamp,
        endTimestamp,
      );
      return bookings.map(convertCanisterBooking);
    } catch (error) {
      console.error("Error fetching bookings by date range:", error);
      throw new Error(`Failed to fetch bookings by date range: ${error}`);
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
      const actor = getBookingActor();
      const dateTimestamp = BigInt(date.getTime() * 1000000);

      // DEBUG: Log the values being sent
      console.log("DEBUG getServiceAvailableSlots:", {
        serviceId,
        inputDate: date.toISOString(),
        dayOfWeek: date.getDay(),
        dayName: [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ][date.getDay()],
        timestamp: dateTimestamp.toString(),
        millisTimestamp: date.getTime(),
      });

      const result = await actor.getServiceAvailableSlots(
        serviceId,
        dateTimestamp,
      );

      if ("ok" in result) {
        console.log("DEBUG result:", {
          slotsCount: result.ok.length,
          slots: result.ok.map((slot) => ({
            date: slot.date,
            isAvailable: slot.isAvailable,
            timeSlot: slot.timeSlot,
            conflictingBookings: slot.conflictingBookings,
          })),
        });
        return result.ok.map(convertCanisterAvailableSlot);
      } else {
        console.error("Error fetching service available slots:", result.err);
        return null;
      }
    } catch (error) {
      console.error("Error fetching service available slots:", error);
      throw new Error(`Failed to fetch service available slots: ${error}`);
    }
  },

  /**
   * Get service's availability settings
   */
  async getServiceAvailabilitySettings(
    serviceId: string,
  ): Promise<ProviderAvailability | null> {
    try {
      const actor = getBookingActor();
      const result = await actor.getServiceAvailabilitySettings(serviceId);

      if ("ok" in result) {
        return convertCanisterProviderAvailability(result.ok);
      } else {
        console.error(
          "Error fetching service availability settings:",
          result.err,
        );
        return null;
      }
    } catch (error) {
      console.error("Error fetching service availability settings:", error);
      throw new Error(
        `Failed to fetch service availability settings: ${error}`,
      );
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
      const actor = getBookingActor();
      const timestamp = BigInt(requestedDateTime.getTime() * 1000000);

      const result = await actor.checkServiceAvailability(serviceId, timestamp);

      if ("ok" in result) {
        return result.ok;
      } else {
        console.error("Error checking service availability:", result.err);
        return null;
      }
    } catch (error) {
      console.error("Error checking service availability:", error);
      throw new Error(`Failed to check service availability: ${error}`);
    }
  },

  /**
   * Get service's booking conflicts for a date range
   */
  async getServiceBookingConflicts(
    serviceId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Booking[]> {
    try {
      const actor = getBookingActor();
      const startTimestamp = BigInt(startDate.getTime() * 1000000);
      const endTimestamp = BigInt(endDate.getTime() * 1000000);

      const bookings = await actor.getServiceBookingConflicts(
        serviceId,
        startTimestamp,
        endTimestamp,
      );
      return bookings.map(convertCanisterBooking);
    } catch (error) {
      console.error("Error fetching service booking conflicts:", error);
      throw new Error(`Failed to fetch service booking conflicts: ${error}`);
    }
  },

  /**
   * Get daily booking count for a service on a specific date
   */
  async getServiceDailyBookingCount(
    serviceId: string,
    date: Date,
  ): Promise<number> {
    try {
      const actor = getBookingActor();
      const dateTimestamp = BigInt(date.getTime() * 1000000);

      const count = await actor.getServiceDailyBookingCount(
        serviceId,
        dateTimestamp,
      );
      return Number(count);
    } catch (error) {
      console.error("Error fetching service daily booking count:", error);
      throw new Error(`Failed to fetch service daily booking count: ${error}`);
    }
  },

  /**
   * Get daily booking count for a provider on a specific date
   */
  async getDailyBookingCount(
    providerId: Principal,
    date: Date,
  ): Promise<number> {
    try {
      const actor = getBookingActor();
      const dateTimestamp = BigInt(date.getTime() * 1000000);

      const count = await actor.getDailyBookingCount(providerId, dateTimestamp);
      return Number(count);
    } catch (error) {
      console.error("Error fetching daily booking count:", error);
      throw new Error(`Failed to fetch daily booking count: ${error}`);
    }
  },

  /**
   * Set canister references (admin function)
   */
  async setCanisterReferences(): Promise<string | null> {
    try {
      const actor = getBookingActor(true);
      const result = await actor.setCanisterReferences(
        [Principal.fromText(authCanisterId)],
        [Principal.fromText(serviceCanisterId)],
        [Principal.fromText(reviewCanisterId)],
        [Principal.fromText(reputationCanisterId)],
        [], // Add an empty array or the appropriate Principal(s) for the fifth argument
      );

      if ("ok" in result) {
        return result.ok;
      } else {
        // console.error("Error setting canister references:", result.err);
        throw new Error(result.err);
      }
    } catch (error) {
      // console.error("Error setting canister references:", error);
      throw new Error(`Failed to set canister references: ${error}`);
    }
  },

  /**
   * Get bookings by service package
   */
  async getBookingsByPackage(packageId: string): Promise<Booking[]> {
    try {
      const actor = getBookingActor();
      const bookings = await actor.getBookingsByPackage(packageId);
      return bookings.map(convertCanisterBooking);
    } catch (error) {
      console.error("Error fetching bookings by package:", error);
      throw new Error(`Failed to fetch bookings by package: ${error}`);
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
      const actor = getBookingActor();
      const startTimestamp = startDate
        ? [BigInt(startDate.getTime() * 1000000)]
        : [];
      const endTimestamp = endDate ? [BigInt(endDate.getTime() * 1000000)] : [];

      const result = await actor.getClientAnalytics(
        clientId,
        startTimestamp as [] | [bigint],
        endTimestamp as [] | [bigint],
      );

      if ("ok" in result) {
        return convertCanisterClientAnalytics(result.ok);
      } else {
        console.error("Error fetching client analytics:", result.err);
        return null;
      }
    } catch (error) {
      console.error("Error fetching client analytics:", error);
      throw new Error(`Failed to fetch client analytics: ${error}`);
    }
  },

  /**
   * Get provider analytics
   */
  async getProviderAnalytics(
    providerId: Principal,
    startDate?: Date,
    endDate?: Date,
  ): Promise<ProviderAnalytics | null> {
    try {
      const actor = getBookingActor();
      const startTimestamp = startDate
        ? [BigInt(startDate.getTime() * 1000000)]
        : [];
      const endTimestamp = endDate ? [BigInt(endDate.getTime() * 1000000)] : [];

      const result = await actor.getProviderAnalytics(
        providerId,
        startTimestamp as [] | [bigint],
        endTimestamp as [] | [bigint],
      );

      if ("ok" in result) {
        return convertCanisterProviderAnalytics(result.ok);
      } else {
        console.error("Error fetching provider analytics:", result.err);
        return null;
      }
    } catch (error) {
      console.error("Error fetching provider analytics:", error);
      throw new Error(`Failed to fetch provider analytics: ${error}`);
    }
  },

  /**
   * Get service analytics
   */
  async getServiceAnalytics(
    serviceId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<ProviderAnalytics | null> {
    try {
      const actor = getBookingActor();
      const startTimestamp = startDate
        ? [BigInt(startDate.getTime() * 1000000)]
        : [];
      const endTimestamp = endDate ? [BigInt(endDate.getTime() * 1000000)] : [];

      const result = await actor.getServiceAnalytics(
        serviceId,
        startTimestamp as [] | [bigint],
        endTimestamp as [] | [bigint],
      );

      if ("ok" in result) {
        return convertCanisterProviderAnalytics(result.ok);
      } else {
        console.error("Error fetching service analytics:", result.err);
        return null;
      }
    } catch (error) {
      console.error("Error fetching service analytics:", error);
      throw new Error(`Failed to fetch service analytics: ${error}`);
    }
  },

  /**
   * Get package analytics
   */
  async getPackageAnalytics(
    packageId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<ProviderAnalytics | null> {
    try {
      const actor = getBookingActor();
      const startTimestamp = startDate
        ? [BigInt(startDate.getTime() * 1000000)]
        : [];
      const endTimestamp = endDate ? [BigInt(endDate.getTime() * 1000000)] : [];

      const result = await actor.getPackageAnalytics(
        packageId,
        startTimestamp as [] | [bigint],
        endTimestamp as [] | [bigint],
      );

      if ("ok" in result) {
        return convertCanisterProviderAnalytics(result.ok);
      } else {
        console.error("Error fetching package analytics:", result.err);
        return null;
      }
    } catch (error) {
      console.error("Error fetching package analytics:", error);
      throw new Error(`Failed to fetch package analytics: ${error}`);
    }
  },
};

// Reset functions for authentication state changes
export const resetBookingActor = () => {
  bookingActor = null;
};

export const refreshBookingActor = async () => {
  resetBookingActor();
  return await getBookingActor();
};

export default bookingCanisterService;
