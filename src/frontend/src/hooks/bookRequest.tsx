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
  scheduledDate?: Date;
  scheduledTime?: string;
  location: string | Location;
  concerns?: string;
  notes?: string; // Optional notes for the booking
  amountToPay?: number;
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
  loadServiceData: (serviceSlug: string) => Promise<void>;
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

  // Load service and package data
  const loadServiceData = useCallback(async (serviceId: string) => {
    setLoading(true);
    setError(null);

    try {
      // Get service details
      const serviceData = await serviceCanisterService.getService(serviceId);
      if (!serviceData) {
        throw new Error("Service not found");
      }

      // Get service packages
      const servicePackages =
        await serviceCanisterService.getServicePackages(serviceId);

      // Get provider profile
      let providerData: FrontendProfile | null = null;
      try {
        providerData = await authCanisterService.getProfile(
          serviceData.providerId.toString(),
        );
      } catch (providerError) {
        //console.warn("Could not load provider profile:", providerError);
      }

      setService(serviceData);
      setPackages(servicePackages || []);
      setProviderProfile(providerData);

      // Check same-day availability
      const sameDayAvailable = await checkSameDayAvailability(serviceId);
      setIsSameDayAvailable(sameDayAvailable);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load service data";
      setError(errorMessage);
      //console.error("Error loading service data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Check if same-day booking is available
  const checkSameDayAvailability = useCallback(
    async (serviceId: string): Promise<boolean> => {
      try {
        const now = new Date(); // Use actual current time
        const todayForBackend = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          12,
          0,
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

        // IMPORTANT: Using booking canister for availability check (with conflict checking)
        // Use the backend-friendly date for the API call
        const isAvailable =
          await bookingCanisterService.checkServiceAvailability(
            serviceId,
            todayForBackend,
          );

        return isAvailable || false;
      } catch (err) {
        //console.log("Same-day booking not available for this service today");
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
        const adjustedDate = new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
          12,
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
        //console.error("Error fetching available slots:", err);
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
          const startTime = timeSlot.split("-")[0];
          [hours, minutes] = startTime.split(":").map(Number);
        } else {
          // Handle single time
          [hours, minutes] = timeSlot.split(":").map(Number);
        }

        if (isNaN(hours) || isNaN(minutes)) {
          //console.error("Invalid time slot format:", timeSlot);
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

        // IMPORTANT: Using booking canister for availability check (with conflict checking)
        const isAvailable =
          await bookingCanisterService.checkServiceAvailability(
            serviceId,
            requestedDateTime,
          );

        return isAvailable || false;
      } catch (err) {
        //console.error("Error checking time slot availability:", err);
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

        // Determine requested date with enhanced debugging
        let requestedDate: Date;
        if (bookingData.bookingType === "sameday") {
          // For same-day bookings, we need to use the current date with the selected time
          requestedDate = new Date();

          // If there's a scheduled time (which should be provided for same-day bookings too)
          if (bookingData.scheduledTime) {
            let startHour = requestedDate.getHours(); // Use current hour as default
            let startMinute = requestedDate.getMinutes(); // Use current minute as default

            try {
              if (bookingData.scheduledTime.includes("-")) {
                // Time range format: "09:00-10:00"
                const [startTime] = bookingData.scheduledTime.split("-");
                const [hour, minute] = startTime.split(":").map(Number);

                if (!isNaN(hour) && !isNaN(minute)) {
                  startHour = hour;
                  startMinute = minute;
                }
              } else {
                // Single time format: "09:00"
                const [hour, minute] = bookingData.scheduledTime
                  .split(":")
                  .map(Number);

                if (!isNaN(hour) && !isNaN(minute)) {
                  startHour = hour;
                  startMinute = minute;
                }
              }
            } catch (timeParseError) {
              //console.error("❌ Error parsing same-day time:", timeParseError);
            }

            requestedDate.setHours(startHour, startMinute, 0, 0);
          }
        } else if (bookingData.scheduledDate && bookingData.scheduledTime) {
          // Parse the time string (format: "HH:MM-HH:MM" or "HH:MM")
          let startHour = 9; // default
          let startMinute = 0; // default

          try {
            if (bookingData.scheduledTime.includes("-")) {
              // Time range format: "09:00-10:00"
              const [startTime] = bookingData.scheduledTime.split("-");
              const [hour, minute] = startTime.split(":").map(Number);

              if (!isNaN(hour) && !isNaN(minute)) {
                startHour = hour;
                startMinute = minute;
              }
            } else {
              // Single time format: "09:00"
              const [hour, minute] = bookingData.scheduledTime
                .split(":")
                .map(Number);

              if (!isNaN(hour) && !isNaN(minute)) {
                startHour = hour;
                startMinute = minute;
              }
            }
          } catch (timeParseError) {
            //console.error("❌ Error parsing time:", timeParseError);
            throw new Error("Invalid time format");
          }

          requestedDate = new Date(bookingData.scheduledDate);
          requestedDate.setHours(startHour, startMinute, 0, 0);
        } else {
          throw new Error(
            "Invalid booking data: missing date or time for scheduled booking",
          );
        }

        // Validate that totalPrice is a valid number
        const totalPrice = Number(bookingData.totalPrice);
        if (isNaN(totalPrice) || totalPrice < 0) {
          // //console.error("❌ Invalid total price for BigInt conversion:", {
          //   originalPrice: bookingData.totalPrice,
          //   convertedPrice: totalPrice,
          //   type: typeof bookingData.totalPrice,
          // });
          throw new Error(`Invalid total price: ${bookingData.totalPrice}`);
        }

        // Get the first package ID (you might want to modify this based on your business logic)
        const firstPackageId =
          bookingData.packages.length > 0
            ? bookingData.packages[0].id
            : undefined;

        // Create booking through canister
        const booking = await bookingCanisterService.createBooking(
          bookingData.serviceId,
          Principal.fromText(bookingData.providerId),
          totalPrice, // This should now be a valid number
          location,
          requestedDate,
          firstPackageId,
          bookingData.notes, // Pass the notes to the booking
          bookingData.amountToPay,
        );
        //console.log("✅ Booking created successfully:", booking);
        return booking;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to create booking";
        setError(errorMessage);
        //console.error("❌ Error creating booking:", err);
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

    if (bookingData.bookingType === "scheduled") {
      if (!bookingData.scheduledDate) {
        errors.push("Scheduled date is required");
      }
      if (!bookingData.scheduledTime) {
        errors.push("Scheduled time is required");
      }

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
