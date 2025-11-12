import { useState, useCallback } from "react";
import { Principal } from "@dfinity/principal";
import serviceCanisterService, {
  Service,
  ServicePackage,
  Location,
} from "../services/serviceCanisterService";
import bookingCanisterService, {
  Booking,
  AvailableSlot,
} from "../services/bookingCanisterService";
import authCanisterService, {
  FrontendProfile,
} from "../services/authCanisterService";

// TypeScript Interfaces
export interface BookingRequest {
  serviceId: string;
  serviceName: string;
  providerId: string;
  packages: Array<{
    id: string;
    title: string;
    description: string;
    price: number;
  }>;
  totalPrice: number;
  bookingType: "sameday" | "scheduled";
  scheduledDate: Date; // Required: represents the end time of the booking slot
  scheduledTime: string; // Required: format "HH:MM-HH:MM" for start-end time
  location: string | Location;
  concerns?: string;
  notes?: string; // Optional notes for the booking
  amountToPay?: number;
  paymentMethod: "CashOnHand" | "GCash" | "SRVWallet"; // Payment method chosen by client
  paymentId?: string; // Optional payment ID for e-wallet payments (Xendit invoice ID)
  locationDetection?: "automatic" | "manual"; // Track if location was detected automatically or entered manually
}

export interface UseBookRequestReturn {
  // Service data
  service: Service | null;
  packages: ServicePackage[];
  providerProfile: FrontendProfile | null; // Add this
  loading: boolean;
  error: string | null;

  // Availability data
  availableSlots: AvailableSlot[];
  isSameDayAvailable: boolean;

  // Booking operations
  loadServiceData: (serviceSlug: string) => (() => void) | undefined;
  checkSameDayAvailability: (serviceId: string) => Promise<boolean>;
  getAvailableSlots: (
    serviceId: string,
    date: Date,
  ) => Promise<AvailableSlot[]>;
  checkTimeSlotAvailability: (
    serviceId: string,
    date: Date,
    timeSlot: string,
  ) => Promise<boolean>;
  createBookingRequest: (
    bookingData: BookingRequest,
  ) => Promise<Booking | null>;

  // Utility functions
  validateBookingRequest: (bookingData: BookingRequest) => {
    isValid: boolean;
    errors: string[];
  };
  calculateTotalPrice: (
    selectedPackages: string[],
    allPackages: ServicePackage[],
  ) => number;
  formatLocationForBooking: (location: any) => Location;
}

export const useBookRequest = (): UseBookRequestReturn => {
  // State management
  const [service, setService] = useState<Service | null>(null);
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [providerProfile, setProviderProfile] =
    useState<FrontendProfile | null>(null); // Add this
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [isSameDayAvailable, setIsSameDayAvailable] = useState(false);

  // Load service and package data with realtime subscriptions
  const loadServiceData = useCallback((serviceId: string) => {
    setLoading(true);
    setError(null);

    try {
      // Subscribe to service updates
      const serviceUnsubscribe = serviceCanisterService.subscribeToService(
        serviceId,
        async (serviceData) => {
          if (!serviceData) {
            setError("Service not found");
            setService(null);
            setLoading(false);
            return;
          }

          setService(serviceData);

          // Get provider profile when service loads
          try {
            const providerData = await authCanisterService.getProfile(
              serviceData.providerId.toString(),
            );
            setProviderProfile(providerData);
          } catch (providerError) {
            setProviderProfile(null);
          }

          // Check same-day availability
          const sameDayAvailable = await checkSameDayAvailability(serviceId);
          setIsSameDayAvailable(sameDayAvailable);

          setLoading(false);
        },
      );

      // Subscribe to package updates
      const packageUnsubscribe =
        serviceCanisterService.subscribeToServicePackages(
          serviceId,
          (packageData) => {
            setPackages(packageData || []);
          },
        );

      // Store unsubscribe functions for cleanup
      // Return cleanup function
      return () => {
        serviceUnsubscribe();
        packageUnsubscribe();
      };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load service data";
      setError(errorMessage);
      setLoading(false);
    }
  }, []);

  // Check if same-day booking is available
  const checkSameDayAvailability = useCallback(
    async (serviceId: string): Promise<boolean> => {
      try {
        const now = new Date(); // Use actual current time
        // Create today's date without changing the day of week
        const todayForBackend = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          now.getHours(), // Use current hour instead of fixed 12
          now.getMinutes(), // Use current minute
          0,
          0,
        );

        // Get service data if not already loaded
        let serviceData = service;
        if (!serviceData) {
          serviceData = await serviceCanisterService.getService(serviceId);
        }

        // Check if service allows same-day booking
        if (!serviceData?.instantBookingEnabled) {
          return false;
        }

        // Check if service is available today based on weekly schedule
        if (serviceData?.weeklySchedule) {
          const dayNames = [
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
          ];
          const todayName = dayNames[now.getDay()];

          const todaySchedule = serviceData.weeklySchedule.find(
            (schedule) => schedule.day === todayName,
          );

          // If today is not in the schedule or not available, return false
          if (!todaySchedule || !todaySchedule.availability.isAvailable) {
            return false;
          }
        }

        // IMPORTANT: Check if there are ANY available slots remaining for today
        // Get all slots for today
        const slots = await bookingCanisterService.getServiceAvailableSlots(
          serviceId,
          todayForBackend,
        );

        if (!slots || slots.length === 0) {
          return false;
        }

        // Check if at least one slot is available and hasn't passed yet
        const hasAvailableSlot = slots.some((slot) => {
          // Check if slot is marked as available
          if (!slot.isAvailable) {
            return false;
          }

          // Check if the slot time hasn't passed yet
          const [endHour, endMinute] = slot.timeSlot.endTime
            .split(":")
            .map(Number);
          const slotEndTime = new Date();
          slotEndTime.setHours(endHour, endMinute, 0, 0);

          return now < slotEndTime;
        });

        return hasAvailableSlot;
      } catch (err) {
        return false;
      }
    },
    [service],
  );

  // Get available time slots for a specific date
  const getAvailableSlots = useCallback(
    async (serviceId: string, date: Date): Promise<AvailableSlot[]> => {
      try {
        // IMPORTANT: Now using booking canister for availability (with conflict checking)
        // Preserve the exact date without changing day of week
        const adjustedDate = new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
          9, // Use 9 AM as a safe default hour for date queries
          0,
          0,
          0,
        );
        const slots = await bookingCanisterService.getServiceAvailableSlots(
          serviceId,
          adjustedDate,
        );
        const availableSlots = slots || [];

        setAvailableSlots(availableSlots);

        return availableSlots;
      } catch (err) {
        setAvailableSlots([]);
        return [];
      }
    },
    [],
  );

  // Check if a specific time slot is available
  const checkTimeSlotAvailability = useCallback(
    async (
      serviceId: string,
      date: Date,
      timeSlot: string,
    ): Promise<boolean> => {
      try {
        // Parse time slot (format: "HH:MM" or "HH:MM-HH:MM")
        let hours: number, minutes: number;

        if (timeSlot.includes("-")) {
          // Handle time range, use start time
          const startTime = timeSlot.split("-")[0].trim();
          [hours, minutes] = startTime.split(":").map(Number);
        } else {
          // Handle single time
          const cleanTimeSlot = timeSlot.trim();
          [hours, minutes] = cleanTimeSlot.split(":").map(Number);
        }

        if (isNaN(hours) || isNaN(minutes)) {
          return false;
        }

        // Create specific datetime with the actual time slot
        const requestedDateTime = new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
          hours, // Use the actual hours from the time slot
          minutes, // Use the actual minutes from the time slot
          0,
          0,
        );

        // Debug logging
        const currentTime = new Date();
        date.toDateString() === currentTime.toDateString();
        const isAvailable =
          await bookingCanisterService.checkServiceAvailability(
            serviceId,
            requestedDateTime,
          );

        return isAvailable || false;
      } catch (err) {
        return false;
      }
    },
    [],
  );

  // Create a booking request
  const createBookingRequest = useCallback(
    async (bookingData: BookingRequest): Promise<Booking | null> => {
      try {
        setLoading(true);
        setError(null);

        // Validate booking data
        const validation = validateBookingRequest(bookingData);
        if (!validation.isValid) {
          throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
        }

        // Format location
        const location = formatLocationForBooking(bookingData.location);

        // Parse the time slot (format: "HH:MM-HH:MM")
        if (!bookingData.scheduledTime.includes("-")) {
          throw new Error("Invalid time format. Expected format: HH:MM-HH:MM");
        }

        const [startTimeStr, endTimeStr] = bookingData.scheduledTime.split("-");
        const [startHour, startMinute] = startTimeStr.split(":").map(Number);
        const [endHour, endMinute] = endTimeStr.split(":").map(Number);

        if (
          isNaN(startHour) ||
          isNaN(startMinute) ||
          isNaN(endHour) ||
          isNaN(endMinute)
        ) {
          throw new Error("Invalid time format");
        }

        // Determine the base date
        let baseDate: Date;
        if (bookingData.bookingType === "sameday") {
          const today = new Date();
          baseDate = new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate(),
            0,
            0,
            0,
            0,
          );
        } else {
          baseDate = new Date(
            bookingData.scheduledDate.getFullYear(),
            bookingData.scheduledDate.getMonth(),
            bookingData.scheduledDate.getDate(),
            0,
            0,
            0,
            0,
          );
        }

        // requestedDate = start time of the booking slot
        const requestedDate = new Date(baseDate);
        requestedDate.setHours(startHour, startMinute, 0, 0);

        // scheduledDate = end time of the booking slot (already provided in bookingData)
        const scheduledDate = new Date(baseDate);
        scheduledDate.setHours(endHour, endMinute, 0, 0);

        // Validate that totalPrice is a valid number
        const totalPrice = Number(bookingData.totalPrice);
        if (isNaN(totalPrice) || totalPrice < 0) {
          throw new Error(`Invalid total price: ${bookingData.totalPrice}`);
        }

        // Extract all package IDs for multiple package booking
        const packageIds = bookingData.packages.map((pkg) => pkg.id);

        // Create booking through canister
        const booking = await bookingCanisterService.createBooking(
          bookingData.serviceId,
          Principal.fromText(bookingData.providerId),
          totalPrice, // This should now be a valid number
          location,
          requestedDate,
          scheduledDate, // Pass the end time of the booking slot
          packageIds, // Send array of all package IDs
          bookingData.notes, // Pass the notes to the booking
          bookingData.amountToPay,
          bookingData.paymentMethod, // Pass the payment method to the booking
          bookingData.paymentId, // Pass the payment ID (Xendit invoice ID) for e-wallet payments
          bookingData.locationDetection || "manual", // Pass the location detection mode
        );
        return booking;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to create booking";
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Validate booking request data
  const validateBookingRequest = useCallback((bookingData: BookingRequest) => {
    const errors: string[] = [];

    if (!bookingData.serviceId) {
      errors.push("Service ID is required");
    }

    if (!bookingData.providerId) {
      errors.push("Provider ID is required");
    }

    if (!bookingData.packages || bookingData.packages.length === 0) {
      errors.push("At least one package must be selected");
    }

    if (bookingData.totalPrice <= 0) {
      errors.push("Total price must be greater than 0");
    }

    // scheduledDate and scheduledTime are required for both same-day and scheduled bookings
    if (!bookingData.scheduledDate) {
      errors.push("Scheduled date is required");
    }

    if (!bookingData.scheduledTime) {
      errors.push("Scheduled time is required");
    }

    // Validate time format (should be "HH:MM-HH:MM")
    if (bookingData.scheduledTime && !bookingData.scheduledTime.includes("-")) {
      errors.push("Invalid time format. Expected format: HH:MM-HH:MM");
    }

    if (bookingData.bookingType === "scheduled") {
      // Validate that scheduled date is in the future
      if (
        bookingData.scheduledDate &&
        bookingData.scheduledDate <= new Date()
      ) {
        errors.push("Scheduled date must be in the future");
      }
    }

    if (!bookingData.location) {
      errors.push("Location is required");
    }

    if (!bookingData.paymentMethod) {
      errors.push("Payment method is required");
    }

    // Validate payment method is one of the allowed values
    const validPaymentMethods = ["CashOnHand", "GCash", "SRVWallet"];
    if (
      bookingData.paymentMethod &&
      !validPaymentMethods.includes(bookingData.paymentMethod)
    ) {
      errors.push("Invalid payment method selected");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }, []);

  // Calculate total price from selected packages
  const calculateTotalPrice = useCallback(
    (selectedPackageIds: string[], allPackages: ServicePackage[]): number => {
      const total = selectedPackageIds.reduce((sum, packageId) => {
        const pkg = allPackages.find((p) => p.id === packageId);
        return sum + (pkg?.price || 0);
      }, 0);

      return total;
    },
    [],
  );

  // Format location data for booking
  const formatLocationForBooking = useCallback((location: any): Location => {
    if (typeof location === "string") {
      // If location is a string (manual address or GPS), convert to Location object
      return {
        latitude: 0, // Default values - you might want to geocode the address
        longitude: 0,
        address: location,
        city: "",
        state: "",
        country: "Philippines", // Default country
        postalCode: "",
      };
    } else if (typeof location === "object" && location !== null) {
      // If location is already a Location object
      return location as Location;
    } else {
      // Fallback
      return {
        latitude: 0,
        longitude: 0,
        address: "Address not specified",
        city: "",
        state: "",
        country: "Philippines",
        postalCode: "",
      };
    }
  }, []);

  return {
    // Service data
    service,
    packages,
    providerProfile, // Add this
    loading,
    error,

    // Availability data
    availableSlots,
    isSameDayAvailable,

    // Booking operations
    loadServiceData,
    checkSameDayAvailability,
    getAvailableSlots,
    checkTimeSlotAvailability,
    createBookingRequest,

    // Utility functions
    validateBookingRequest,
    calculateTotalPrice,
    formatLocationForBooking,
  };
};

export default useBookRequest;
