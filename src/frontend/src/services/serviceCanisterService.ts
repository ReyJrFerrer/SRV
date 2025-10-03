// Service Canister Service
import { Principal } from "@dfinity/principal";
import { canisterId, createActor } from "../../../declarations/service";
import { canisterId as authCanisterId } from "../../../declarations/auth";
import { canisterId as bookingCanisterId } from "../../../declarations/booking";
import { canisterId as reviewCanisterId } from "../../../declarations/review";
import { canisterId as reputationCanisterId } from "../../../declarations/reputation";
import { canisterId as mediaCanisterId } from "../../../declarations/media";
import { canisterId as commissionCanisterId } from "../../../declarations/commission";
import { Identity } from "@dfinity/agent";
import type {
  _SERVICE as ServiceService,
  Service as CanisterService,
  ServiceCategory as CanisterServiceCategory,
  ServiceStatus as CanisterServiceStatus,
  Location as CanisterLocation,
  ProviderAvailability as CanisterProviderAvailability,
  AvailableSlot as CanisterAvailableSlot,
  TimeSlot as CanisterTimeSlot,
  DayAvailability as CanisterDayAvailability,
  DayOfWeek as CanisterDayOfWeek,
  ServicePackage as CanisterServicePackage,
} from "../../../declarations/service/service.did";

/**
 * Creates a service actor with the provided identity
 * @param identity The user's identity from AuthContext
 * @returns An authenticated ServiceService actor
 */
const createServiceActor = (identity?: Identity | null): ServiceService => {
  return createActor(canisterId, {
    agentOptions: {
      identity: identity || undefined,
      host: "https://id.ai"
          
    },
  }) as ServiceService;
};

// Singleton actor instance
let serviceActor: ServiceService | null = null;
let currentIdentity: Identity | null = null;

export const updateServiceActor = (identity: Identity | null) => {
  if (currentIdentity !== identity) {
    serviceActor = createServiceActor(identity);
    currentIdentity = identity;
  }
};

const getServiceActor = (requireAuth: boolean = false): ServiceService => {
  if (requireAuth && !currentIdentity) {
    throw new Error(
      "Authentication required: Please log in to perform this action",
    );
  }

  if (!serviceActor) {
    serviceActor = createServiceActor(currentIdentity);
  }

  return serviceActor;
};

// Type mappings for frontend compatibility
export type ServiceStatus = "Available" | "Suspended" | "Unavailable";

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

export interface ServiceCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  parentId?: string;
}

export interface Service {
  id: string;
  providerId: Principal;
  title: string;
  description: string;
  category: ServiceCategory;
  price: number;
  // Commission fee information
  commissionFee: number;
  commissionRate: number;
  location: Location;
  status: ServiceStatus;
  rating?: number;
  reviewCount: number;
  imageUrls: string[]; // Array of media URLs for service images (max 5)
  certificateUrls: string[]; // Array of media URLs for service certificates
  isVerifiedService: boolean; // Service verification status based on certificates
  weeklySchedule?: Array<{ day: DayOfWeek; availability: DayAvailability }>;
  instantBookingEnabled?: boolean;
  bookingNoticeHours?: number;
  maxBookingsPerDay?: number;
  createdAt: string;
  updatedAt: string;
  // Additional UI fields
  providerName?: string;
  distance?: number;
  priceDisplay?: string;
  totalAmount?: number; // price + commissionFee (computed field)
}

export interface ServicePackage {
  id: string;
  serviceId: string;
  title: string;
  description: string;
  price: number;
  // Commission fee information
  commissionFee: number;
  commissionRate: number;
  createdAt: string;
  updatedAt: string;
  // Additional computed field
  totalAmount?: number; // price + commissionFee
}

// Commission-related interfaces
export interface CommissionQuote {
  commissionFee: number;
  commissionRate: number;
  totalAmount: number; // price + commission fee
}

// Helper functions to convert between canister and frontend types
const convertCanisterServiceStatus = (
  status: CanisterServiceStatus,
): ServiceStatus => {
  if ("Available" in status) return "Available";
  if ("Suspended" in status) return "Suspended";
  if ("Unavailable" in status) return "Unavailable";
  return "Available";
};

const convertToCanisterServiceStatus = (
  status: ServiceStatus,
): CanisterServiceStatus => {
  switch (status) {
    case "Available":
      return { Available: null };
    case "Suspended":
      return { Suspended: null };
    case "Unavailable":
      return { Unavailable: null };
    default:
      return { Available: null };
  }
};

const convertCanisterDayOfWeek = (day: CanisterDayOfWeek): DayOfWeek => {
  if ("Monday" in day) return "Monday";
  if ("Tuesday" in day) return "Tuesday";
  if ("Wednesday" in day) return "Wednesday";
  if ("Thursday" in day) return "Thursday";
  if ("Friday" in day) return "Friday";
  if ("Saturday" in day) return "Saturday";
  if ("Sunday" in day) return "Sunday";
  return "Monday";
};

const convertToCanisterDayOfWeek = (day: DayOfWeek): CanisterDayOfWeek => {
  switch (day) {
    case "Monday":
      return { Monday: null };
    case "Tuesday":
      return { Tuesday: null };
    case "Wednesday":
      return { Wednesday: null };
    case "Thursday":
      return { Thursday: null };
    case "Friday":
      return { Friday: null };
    case "Saturday":
      return { Saturday: null };
    case "Sunday":
      return { Sunday: null };
    default:
      return { Monday: null };
  }
};

const convertCanisterTimeSlot = (slot: CanisterTimeSlot): TimeSlot => ({
  startTime: slot.startTime,
  endTime: slot.endTime,
});

const convertToCanisterTimeSlot = (slot: TimeSlot): CanisterTimeSlot => ({
  startTime: slot.startTime,
  endTime: slot.endTime,
});

const convertCanisterDayAvailability = (
  availability: CanisterDayAvailability,
): DayAvailability => ({
  isAvailable: availability.isAvailable,
  slots: availability.slots.map(convertCanisterTimeSlot),
});

const convertToCanisterDayAvailability = (
  availability: DayAvailability,
): CanisterDayAvailability => ({
  isAvailable: availability.isAvailable,
  slots: availability.slots.map(convertToCanisterTimeSlot),
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

const convertCanisterServiceCategory = (
  category: CanisterServiceCategory,
): ServiceCategory => ({
  id: category.id,
  name: category.name,
  slug: category.slug,
  description: category.description,
  imageUrl: category.imageUrl,
  parentId: category.parentId[0],
});

const convertCanisterService = (service: CanisterService): Service => ({
  id: service.id,
  providerId: service.providerId,
  title: service.title,
  description: service.description,
  category: convertCanisterServiceCategory(service.category),
  price: Number(service.price),
  // Commission fee information
  commissionFee: Number(service.commissionFee),
  commissionRate: Number(service.commissionRate),
  location: convertCanisterLocation(service.location),
  status: convertCanisterServiceStatus(service.status),
  rating: service.rating[0],
  reviewCount: Number(service.reviewCount),
  imageUrls: service.imageUrls || [], // Convert canister imageUrls or default to empty array
  certificateUrls: service.certificateUrls || [], // Convert canister certificateUrls or default to empty array
  isVerifiedService: service.isVerifiedService || false, // Convert canister isVerifiedService or default to false
  weeklySchedule: service.weeklySchedule[0]?.map(([day, avail]) => ({
    day: convertCanisterDayOfWeek(day),
    availability: convertCanisterDayAvailability(avail),
  })),
  instantBookingEnabled: service.instantBookingEnabled[0],
  bookingNoticeHours: service.bookingNoticeHours[0]
    ? Number(service.bookingNoticeHours[0])
    : undefined,
  maxBookingsPerDay: service.maxBookingsPerDay[0]
    ? Number(service.maxBookingsPerDay[0])
    : undefined,
  createdAt: new Date(Number(service.createdAt) / 1000000).toISOString(),
  updatedAt: new Date(Number(service.updatedAt) / 1000000).toISOString(),
});

const convertCanisterServicePackage = (
  pkg: CanisterServicePackage,
): ServicePackage => ({
  id: pkg.id,
  serviceId: pkg.serviceId,
  title: pkg.title,
  description: pkg.description,
  price: Number(pkg.price),
  // Commission fee information
  commissionFee: Number(pkg.commissionFee),
  commissionRate: Number(pkg.commissionRate),
  createdAt: new Date(Number(pkg.createdAt) / 1000000).toISOString(),
  updatedAt: new Date(Number(pkg.updatedAt) / 1000000).toISOString(),
});

// Service Canister Service Functions
export const serviceCanisterService = {
  /**
   * Create a new service listing
   */
  async createService(
    title: string,
    description: string,
    categoryId: string,
    price: number,
    location: Location,
    weeklySchedule?: Array<{ day: DayOfWeek; availability: DayAvailability }>,
    instantBookingEnabled?: boolean,
    bookingNoticeHours?: number,
    maxBookingsPerDay?: number,
    serviceImages?: Array<{
      fileName: string;
      contentType: string;
      fileData: Uint8Array;
    }>,
    serviceCertificates?: Array<{
      fileName: string;
      contentType: string;
      fileData: Uint8Array;
    }>,
  ): Promise<Service | null> {
    try {
      const actor = await getServiceActor(true);

      // Convert service images to canister format
      const canisterImages: [string, string, Uint8Array][] =
        serviceImages?.map(({ fileName, contentType, fileData }) => [
          fileName,
          contentType,
          fileData,
        ]) || [];

      // Convert service certificates to canister format
      const canisterCertificates: [string, string, Uint8Array][] =
        serviceCertificates?.map(({ fileName, contentType, fileData }) => [
          fileName,
          contentType,
          fileData,
        ]) || [];

      const result = await actor.createService(
        title,
        description,
        categoryId,
        BigInt(price),
        convertToCanisterLocation(location),
        weeklySchedule
          ? [
              weeklySchedule.map(({ day, availability }) => [
                convertToCanisterDayOfWeek(day),
                convertToCanisterDayAvailability(availability),
              ]),
            ]
          : [],
        instantBookingEnabled ? [instantBookingEnabled] : [],
        bookingNoticeHours ? [BigInt(bookingNoticeHours)] : [],
        maxBookingsPerDay ? [BigInt(maxBookingsPerDay)] : [],
        canisterImages.length > 0 ? [canisterImages] : [],
        canisterCertificates.length > 0 ? [canisterCertificates] : [],
      );

      if ("ok" in result) {
        return convertCanisterService(result.ok);
      } else {
        //console.error("Error creating service:", result.err);
        throw new Error(result.err);
      }
    } catch (error) {
      //console.error("Error creating service:", error);
      throw new Error(`Failed to create service: ${error}`);
    }
  },

  /**
   * Get service by ID
   */
  async getService(serviceId: string): Promise<Service | null> {
    try {
      const actor = await getServiceActor();
      const result = await actor.getService(serviceId);

      if ("ok" in result) {
        return convertCanisterService(result.ok);
      } else {
        //console.error("Error fetching service:", result.err);
        return null;
      }
    } catch (error) {
      //console.error("Error fetching service:", error);
      throw new Error(`Failed to fetch service: ${error}`);
    }
  },

  /**
   * Get services by provider
   */
  async getServicesByProvider(providerId: string): Promise<Service[]> {
    try {
      const actor = await getServiceActor();
      const services = await actor.getServicesByProvider(
        Principal.fromText(providerId),
      );

      return services.map(convertCanisterService);
    } catch (error) {
      //console.error("Error fetching services by provider:", error);
      throw new Error(`Failed to fetch services by provider: ${error}`);
    }
  },

  /**
   * Get services by category
   */
  async getServicesByCategory(categoryId: string): Promise<Service[]> {
    try {
      const actor = await getServiceActor();
      const services = await actor.getServicesByCategory(categoryId);

      return services.map(convertCanisterService);
    } catch (error) {
      //console.error("Error fetching services by category:", error);
      throw new Error(`Failed to fetch services by category: ${error}`);
    }
  },

  /**
   * Update service status
   */
  async updateServiceStatus(
    serviceId: string,
    status: ServiceStatus,
  ): Promise<Service | null> {
    try {
      const actor = await getServiceActor(true);
      const result = await actor.updateServiceStatus(
        serviceId,
        convertToCanisterServiceStatus(status),
      );

      if ("ok" in result) {
        return convertCanisterService(result.ok);
      } else {
        //console.error("Error updating service status:", result.err);
        throw new Error(result.err);
      }
    } catch (error) {
      //console.error("Error updating service status:", error);
      throw new Error(`Failed to update service status: ${error}`);
    }
  },

  /**
   * Search services by location
   */
  async searchServicesByLocation(
    location: Location,
    radiusKm: number,
    categoryId?: string,
  ): Promise<Service[]> {
    try {
      const actor = await getServiceActor(false);
      const services = await actor.searchServicesByLocation(
        convertToCanisterLocation(location),
        radiusKm,
        categoryId ? [categoryId] : [],
      );

      return services.map(convertCanisterService);
    } catch (error) {
      //console.error("Error searching services by location:", error);
      throw new Error(`Failed to search services by location: ${error}`);
    }
  },

  /**
   * Search services by location with reputation filtering
   */
  async searchServicesWithReputationFilter(
    location: Location,
    radiusKm: number,
    categoryId?: string,
    minTrustScore?: number,
  ): Promise<Service[]> {
    try {
      const actor = await getServiceActor(false);
      const services = await actor.searchServicesWithReputationFilter(
        convertToCanisterLocation(location),
        radiusKm,
        categoryId ? [categoryId] : [],
        minTrustScore ? [minTrustScore] : [],
      );

      return services.map(convertCanisterService);
    } catch (error) {
      //console.error("Error searching services with reputation filter:", error);
      throw new Error(
        `Failed to search services with reputation filter: ${error}`,
      );
    }
  },

  /**
   * Update service rating (called by Review Canister)
   */
  async updateServiceRating(
    serviceId: string,
    newRating: number,
    newReviewCount: number,
  ): Promise<Service | null> {
    try {
      const actor = await getServiceActor(true);
      const result = await actor.updateServiceRating(
        serviceId,
        newRating,
        BigInt(newReviewCount),
      );

      if ("ok" in result) {
        return convertCanisterService(result.ok);
      } else {
        //console.error("Error updating service rating:", result.err);
        throw new Error(result.err);
      }
    } catch (error) {
      //console.error("Error updating service rating:", error);
      throw new Error(`Failed to update service rating: ${error}`);
    }
  },

  /**
   * Add a new category
   */
  async addCategory(
    name: string,
    slug: string,
    parentId: string | undefined,
    description: string,
    imageUrl: string,
  ): Promise<ServiceCategory | null> {
    try {
      const actor = await getServiceActor(true);
      const result = await actor.addCategory(
        name,
        slug,
        parentId ? [parentId] : [],
        description,
        imageUrl,
      );

      if ("ok" in result) {
        return convertCanisterServiceCategory(result.ok);
      } else {
        //console.error("Error adding category:", result.err);
        throw new Error(result.err);
      }
    } catch (error) {
      //console.error("Error adding category:", error);
      throw new Error(`Failed to add category: ${error}`);
    }
  },

  /**
   * Get all categories
   */
  async getAllCategories(): Promise<ServiceCategory[]> {
    try {
      const actor = await getServiceActor(false);
      const categories = await actor.getAllCategories();

      return categories.map(convertCanisterServiceCategory);
    } catch (error) {
      //console.error("Error fetching categories:", error);
      throw new Error(`Failed to fetch categories: ${error}`);
    }
  },

  /**
   * Get all services
   */
  async getAllServices(): Promise<Service[]> {
    try {
      const actor = await getServiceActor(false);
      const services = await actor.getAllServices();

      return services.map(convertCanisterService);
    } catch (error) {
      //console.error("Error fetching all services:", error);
      throw new Error(`Failed to fetch all services: ${error}`);
    }
  },

  /**
   * Set service availability
   */
  async setServiceAvailability(
    serviceId: string,
    weeklySchedule: Array<{ day: DayOfWeek; availability: DayAvailability }>,
    instantBookingEnabled: boolean,
    bookingNoticeHours: number,
    maxBookingsPerDay: number,
  ): Promise<ProviderAvailability | null> {
    try {
      const actor = await getServiceActor(true);
      const result = await actor.setServiceAvailability(
        serviceId,
        weeklySchedule.map(({ day, availability }) => [
          convertToCanisterDayOfWeek(day),
          convertToCanisterDayAvailability(availability),
        ]),
        instantBookingEnabled,
        BigInt(bookingNoticeHours),
        BigInt(maxBookingsPerDay),
      );

      if ("ok" in result) {
        return convertCanisterProviderAvailability(result.ok);
      } else {
        //console.error("Error setting service availability:", result.err);
        throw new Error(result.err);
      }
    } catch (error) {
      //console.error("Error setting service availability:", error);
      throw new Error(`Failed to set service availability: ${error}`);
    }
  },

  /**
   * Get provider availability
   */
  async getProviderAvailability(
    providerId: string,
  ): Promise<ProviderAvailability | null> {
    try {
      const actor = await getServiceActor(false);
      const result = await actor.getProviderAvailability(
        Principal.fromText(providerId),
      );

      if ("ok" in result) {
        return convertCanisterProviderAvailability(result.ok);
      } else {
        //console.error("Error fetching provider availability:", result.err);
        return null;
      }
    } catch (error) {
      //console.error("Error fetching provider availability:", error);
      throw new Error(`Failed to fetch provider availability: ${error}`);
    }
  },

  /**
   * Get service availability
   */
  async getServiceAvailability(
    serviceId: string,
  ): Promise<ProviderAvailability | null> {
    try {
      const actor = await getServiceActor(false);
      const result = await actor.getServiceAvailability(serviceId);

      if ("ok" in result) {
        return convertCanisterProviderAvailability(result.ok);
      } else {
        //console.error("Error fetching service availability:", result.err);
        return null;
      }
    } catch (error) {
      //console.error("Error fetching service availability:", error);
      throw new Error(`Failed to fetch service availability: ${error}`);
    }
  },

  /**
   * Get available time slots for a specific date and service
   */
  async getAvailableTimeSlots(
    serviceId: string,
    date: Date,
  ): Promise<AvailableSlot[]> {
    try {
      const actor = await getServiceActor(false);
      const result = await actor.getAvailableTimeSlots(
        serviceId,
        BigInt(date.getTime() * 1000000), // Convert to nanoseconds
      );

      if ("ok" in result) {
        return result.ok.map(convertCanisterAvailableSlot);
      } else {
        //console.error("Error fetching available time slots:", result.err);
        throw new Error(result.err);
      }
    } catch (error) {
      //console.error("Error fetching available time slots:", error);
      throw new Error(`Failed to fetch available time slots: ${error}`);
    }
  },

  /**
   * Set canister references
   */
  async setCanisterReferences(): Promise<string | null> {
    try {
      const actor = getServiceActor(true);
      const result = await actor.setCanisterReferences(
        [Principal.fromText(authCanisterId)],
        [Principal.fromText(bookingCanisterId)],
        [Principal.fromText(reviewCanisterId)],
        [Principal.fromText(reputationCanisterId)],
        [Principal.fromText(mediaCanisterId)],
        [Principal.fromText(commissionCanisterId)],
        [], // admin canister reference - empty for frontend
      );

      if ("ok" in result) {
        return result.ok;
      } else {
        // //console.error("Error setting canister references:", result.err);
        throw new Error(result.err);
      }
    } catch (error) {
      // //console.error("Error setting canister references:", error);
      throw new Error(`Failed to set canister references: ${error}`);
    }
  },

  /**
   * Create a new service package
   */
  async createServicePackage(
    serviceId: string,
    title: string,
    description: string,
    price: number,
  ): Promise<ServicePackage | null> {
    try {
      const actor = await getServiceActor(true);
      const result = await actor.createServicePackage(
        serviceId,
        title,
        description,
        BigInt(price),
      );

      if ("ok" in result) {
        return convertCanisterServicePackage(result.ok);
      } else {
        //console.error("Error creating service package:", result.err);
        throw new Error(result.err);
      }
    } catch (error) {
      //console.error("Error creating service package:", error);
      throw new Error(`Failed to create service package: ${error}`);
    }
  },

  /**
   * Get all packages for a service
   */
  async getServicePackages(serviceId: string): Promise<ServicePackage[]> {
    try {
      const actor = await getServiceActor(false);
      const result = await actor.getServicePackages(serviceId);

      if ("ok" in result) {
        return result.ok.map(convertCanisterServicePackage);
      } else {
        //console.error("Error fetching service packages:", result.err);
        throw new Error(result.err);
      }
    } catch (error) {
      //console.error("Error fetching service packages:", error);
      throw new Error(`Failed to fetch service packages: ${error}`);
    }
  },

  /**
   * Get a specific package by ID
   */
  async getPackage(packageId: string): Promise<ServicePackage | null> {
    try {
      const actor = await getServiceActor(false);
      const result = await actor.getPackage(packageId);

      if ("ok" in result) {
        return convertCanisterServicePackage(result.ok);
      } else {
        //console.error("Error fetching package:", result.err);
        return null;
      }
    } catch (error) {
      //console.error("Error fetching package:", error);
      throw new Error(`Failed to fetch package: ${error}`);
    }
  },

  /**
   * Update a service package
   */
  async updateServicePackage(
    packageId: string,
    title?: string,
    description?: string,
    price?: number,
  ): Promise<ServicePackage | null> {
    try {
      const actor = await getServiceActor(true);
      const result = await actor.updateServicePackage(
        packageId,
        title ? [title] : [],
        description ? [description] : [],
        price ? [BigInt(price)] : [],
      );

      if ("ok" in result) {
        return convertCanisterServicePackage(result.ok);
      } else {
        //console.error("Error updating service package:", result.err);
        throw new Error(result.err);
      }
    } catch (error) {
      //console.error("Error updating service package:", error);
      throw new Error(`Failed to update service package: ${error}`);
    }
  },

  /**
   * Delete a service package
   */
  async deleteServicePackage(packageId: string): Promise<string | null> {
    try {
      const actor = await getServiceActor(true);
      const result = await actor.deleteServicePackage(packageId);

      if ("ok" in result) {
        return result.ok;
      } else {
        //console.error("Error deleting service package:", result.err);
        throw new Error(result.err);
      }
    } catch (error) {
      //console.error("Error deleting service package:", error);
      throw new Error(`Failed to delete service package: ${error}`);
    }
  },

  /**
   * Update a service
   */
  async updateService(
    serviceId: string,
    categoryId: string,
    title?: string,
    description?: string,
    price?: number,
    location?: Location,
    weeklySchedule?: Array<{ day: DayOfWeek; availability: DayAvailability }>,
    instantBookingEnabled?: boolean,
    bookingNoticeHours?: number,
    maxBookingsPerDay?: number,
  ): Promise<Service | null> {
    try {
      const actor = await getServiceActor(true);
      const result = await actor.updateService(
        serviceId,
        categoryId,
        title ? [title] : [],
        description ? [description] : [],
        price ? [BigInt(price)] : [],
        location ? [convertToCanisterLocation(location)] : [],
        weeklySchedule
          ? [
              weeklySchedule.map(({ day, availability }) => [
                convertToCanisterDayOfWeek(day),
                convertToCanisterDayAvailability(availability),
              ]),
            ]
          : [],
        instantBookingEnabled ? [instantBookingEnabled] : [],
        bookingNoticeHours ? [BigInt(bookingNoticeHours)] : [],
        maxBookingsPerDay ? [BigInt(maxBookingsPerDay)] : [],
      );

      if ("ok" in result) {
        return convertCanisterService(result.ok);
      } else {
        //console.error("Error updating service:", result.err);
        throw new Error(result.err);
      }
    } catch (error) {
      //console.error("Error updating service:", error);
      throw new Error(`Failed to update service: ${error}`);
    }
  },

  /**
   * Delete a service
   */
  async deleteService(serviceId: string): Promise<string | null> {
    try {
      const actor = await getServiceActor(true);
      const result = await actor.deleteService(serviceId);

      if ("ok" in result) {
        return result.ok;
      } else {
        //console.error("Error deleting service:", result.err);
        throw new Error(result.err);
      }
    } catch (error) {
      //console.error("Error deleting service:", error);
      throw new Error(`Failed to delete service: ${error}`);
    }
  },

  /**
   * Upload additional images to existing service
   */
  async uploadServiceImages(
    serviceId: string,
    serviceImages: Array<{
      fileName: string;
      contentType: string;
      fileData: Uint8Array;
    }>,
  ): Promise<Service | null> {
    try {
      const actor = await getServiceActor(true);

      // Convert service images to canister format
      const canisterImages: [string, string, Uint8Array][] = serviceImages.map(
        ({ fileName, contentType, fileData }) => [
          fileName,
          contentType,
          fileData,
        ],
      );

      //console.log(canisterImages);

      const result = await actor.uploadServiceImages(serviceId, canisterImages);

      if ("ok" in result) {
        return convertCanisterService(result.ok);
      } else {
        //console.error("Error uploading service images:", result.err);
        throw new Error(result.err);
      }
    } catch (error) {
      //console.error("Error uploading service images:", error);
      throw new Error(`Failed to upload service images: ${error}`);
    }
  },

  /**
   * Remove specific image from service
   */
  async removeServiceImage(
    serviceId: string,
    imageUrl: string,
  ): Promise<Service | null> {
    try {
      const actor = await getServiceActor(true);
      const result = await actor.removeServiceImage(serviceId, imageUrl);

      if ("ok" in result) {
        return convertCanisterService(result.ok);
      } else {
        //console.error("Error removing service image:", result.err);
        throw new Error(result.err);
      }
    } catch (error) {
      //console.error("Error removing service image:", error);
      throw new Error(`Failed to remove service image: ${error}`);
    }
  },

  /**
   * Reorder service images
   */
  async reorderServiceImages(
    serviceId: string,
    orderedImageUrls: string[],
  ): Promise<Service | null> {
    try {
      const actor = await getServiceActor(true);
      const result = await actor.reorderServiceImages(
        serviceId,
        orderedImageUrls,
      );

      if ("ok" in result) {
        return convertCanisterService(result.ok);
      } else {
        //console.error("Error reordering service images:", result.err);
        throw new Error(result.err);
      }
    } catch (error) {
      //console.error("Error reordering service images:", error);
      throw new Error(`Failed to reorder service images: ${error}`);
    }
  },

  // SERVICE CERTIFICATE MANAGEMENT FUNCTIONS

  /**
   * Upload additional certificates to existing service
   */
  async uploadServiceCertificates(
    serviceId: string,
    serviceCertificates: Array<{
      fileName: string;
      contentType: string;
      fileData: Uint8Array;
    }>,
  ): Promise<Service | null> {
    try {
      const actor = await getServiceActor(true);

      // Convert service certificates to canister format
      const canisterCertificates: [string, string, Uint8Array][] =
        serviceCertificates.map(({ fileName, contentType, fileData }) => [
          fileName,
          contentType,
          fileData,
        ]);

      const result = await actor.uploadServiceCertificates(
        serviceId,
        canisterCertificates,
      );

      if ("ok" in result) {
        return convertCanisterService(result.ok);
      } else {
        //console.error("Error uploading service certificates:", result.err);
        throw new Error(result.err);
      }
    } catch (error) {
      //console.error("Error uploading service certificates:", error);
      throw new Error(`Failed to upload service certificates: ${error}`);
    }
  },

  /**
   * Remove specific certificate from service
   */
  async removeServiceCertificate(
    serviceId: string,
    certificateUrl: string,
  ): Promise<Service | null> {
    try {
      const actor = await getServiceActor(true);
      const result = await actor.removeServiceCertificate(
        serviceId,
        certificateUrl,
      );

      if ("ok" in result) {
        return convertCanisterService(result.ok);
      } else {
        //console.error("Error removing service certificate:", result.err);
        throw new Error(result.err);
      }
    } catch (error) {
      //console.error("Error removing service certificate:", error);
      throw new Error(`Failed to remove service certificate: ${error}`);
    }
  },

  /**
   * Verify service manually (admin function)
   */
  async verifyService(
    serviceId: string,
    isVerified: boolean,
  ): Promise<Service | null> {
    try {
      const actor = await getServiceActor(true);
      const result = await actor.verifyService(serviceId, isVerified);

      if ("ok" in result) {
        return convertCanisterService(result.ok);
      } else {
        //console.error("Error verifying service:", result.err);
        throw new Error(result.err);
      }
    } catch (error) {
      //console.error("Error verifying service:", error);
      throw new Error(`Failed to verify service: ${error}`);
    }
  },

  // COMMISSION FUNCTIONS

  /**
   * Get commission quote for a given category and price
   */
  async getCommissionQuote(
    categoryName: string,
    price: number,
  ): Promise<CommissionQuote | null> {
    try {
      const actor = await getServiceActor(false);
      const result = await actor.getCommissionQuote(
        categoryName,
        BigInt(price),
      );

      if ("ok" in result) {
        return {
          commissionFee: Number(result.ok.commissionFee),
          commissionRate: Number(result.ok.commissionRate),
          totalAmount: Number(result.ok.totalAmount),
        };
      } else {
        //console.error("Error getting commission quote:", result.err);
        throw new Error(result.err);
      }
    } catch (error) {
      //console.error("Error getting commission quote:", error);
      throw new Error(`Failed to get commission quote: ${error}`);
    }
  },

  /**
   * Get commission breakdown for debugging/testing (admin function)
   */
  async getCommissionBreakdown(
    categoryName: string,
    price: number,
  ): Promise<string | null> {
    try {
      const actor = await getServiceActor(true);
      const result = await actor.getCommissionBreakdown(
        categoryName,
        BigInt(price),
      );

      if ("ok" in result) {
        return result.ok;
      } else {
        //console.error("Error getting commission breakdown:", result.err);
        throw new Error(result.err);
      }
    } catch (error) {
      //console.error("Error getting commission breakdown:", error);
      throw new Error(`Failed to get commission breakdown: ${error}`);
    }
  },
};

// Commission utility functions
export const calculateTotalAmount = (
  price: number,
  commissionFee: number,
): number => {
  return price + commissionFee;
};

export const formatCommissionRate = (rate: number): string => {
  return `${rate.toFixed(2)}%`;
};

export const formatPriceWithCommission = (
  price: number,
  commissionFee: number,
): string => {
  const total = calculateTotalAmount(price, commissionFee);
  return `₱${price.toLocaleString()} + ₱${commissionFee.toLocaleString()} commission = ₱${total.toLocaleString()}`;
};

// Enhanced service/package with computed commission fields
export const enhanceServiceWithCommission = (
  service: Service,
): Service & { totalAmount: number } => ({
  ...service,
  totalAmount: calculateTotalAmount(service.price, service.commissionFee),
});

export const enhancePackageWithCommission = (
  pkg: ServicePackage,
): ServicePackage & { totalAmount: number } => ({
  ...pkg,
  totalAmount: calculateTotalAmount(pkg.price, pkg.commissionFee),
});

// Reset functions for authentication state changes
export const resetServiceActor = () => {
  serviceActor = null;
};

export const refreshServiceActor = async () => {
  resetServiceActor();
  return await getServiceActor(true);
};

export default serviceCanisterService;
