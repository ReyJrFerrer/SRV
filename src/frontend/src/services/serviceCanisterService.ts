/**
 * Service Firebase Service
 *
 * This service provides functions to interact with service-related Firebase Cloud Functions.
 * It replaces the previous canister-based service with Firebase Firestore and Cloud Functions.
 */

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

// Type definitions matching the backend
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
  providerId: string;
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
  providerId: string;
  title: string;
  description: string;
  category: ServiceCategory;
  price: number;
  commissionFee: number;
  commissionRate: number;
  location: Location;
  status: ServiceStatus;
  rating?: number;
  reviewCount: number;
  imageUrls: string[];
  certificateUrls: string[];
  isVerifiedService: boolean;
  weeklySchedule?: Array<{ day: DayOfWeek; availability: DayAvailability }>;
  instantBookingEnabled?: boolean;
  bookingNoticeHours?: number;
  maxBookingsPerDay?: number;
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
  isArchived?: boolean;
  archivedAt?: any;
  // Additional UI fields
  providerName?: string;
  distance?: number;
  priceDisplay?: string;
  totalAmount?: number;
}

export interface ServicePackage {
  id: string;
  serviceId: string;
  title: string;
  description: string;
  price: number;
  commissionFee: number;
  commissionRate: number;
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
  totalAmount?: number;
}

export interface CommissionQuote {
  commissionFee: number;
  commissionRate: number;
  totalAmount: number;
}

// Service Firebase Service Functions
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
      fileData: string; // base64 encoded
    }>,
    serviceCertificates?: Array<{
      fileName: string;
      contentType: string;
      fileData: string; // base64 encoded
    }>,
  ): Promise<Service | null> {
    try {
      const createServiceFn = httpsCallable(getFunctions(), "createService");
      const result = await createServiceFn({
        title,
        description,
        categoryId,
        price,
        location,
        weeklySchedule,
        instantBookingEnabled,
        bookingNoticeHours,
        maxBookingsPerDay,
        serviceImages,
        serviceCertificates,
      });

      const data = result.data as { success: boolean; service: Service };
      return data.success ? data.service : null;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get service by ID (real-time listener)
   */
  subscribeToService(
    serviceId: string,
    callback: (service: Service | null) => void,
  ): Unsubscribe {
    const serviceRef = doc(getDb(), "services", serviceId);
    return onSnapshot(
      serviceRef,
      (snapshot) => {
        if (snapshot.exists()) {
          callback({ id: snapshot.id, ...snapshot.data() } as Service);
        } else {
          callback(null);
        }
      },
      () => {
        callback(null);
      },
    );
  },

  /**
   * Get service by ID (one-time fetch)
   */
  async getService(serviceId: string): Promise<Service | null> {
    try {
      const getServiceFn = httpsCallable(getFunctions(), "getService");
      const result = await getServiceFn({ serviceId });

      const data = result.data as { success: boolean; service: Service };
      return data.success ? data.service : null;
    } catch (error) {
      return null;
    }
  },

  /**
   * Get services by provider (real-time listener)
   */
  subscribeToProviderServices(
    providerId: string,
    callback: (services: Service[]) => void,
  ): Unsubscribe {
    const servicesRef = collection(getDb(), "services");
    const q = query(
      servicesRef,
      where("providerId", "==", providerId),
      where("isArchived", "==", false),
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const services: Service[] = [];
        snapshot.forEach((doc) => {
          services.push({ id: doc.id, ...doc.data() } as Service);
        });
        callback(services);
      },
      () => {
        callback([]);
      },
    );
  },

  /**
   * Get services by provider (one-time fetch)
   */
  async getServicesByProvider(
    providerId: string,
    archivedOnly?: boolean,
  ): Promise<Service[]> {
    try {
      const getServicesByProviderFn = httpsCallable(
        getFunctions(),
        "getServicesByProvider",
      );
      const result = await getServicesByProviderFn({
        providerId,
        archivedOnly,
      });

      const data = result.data as { success: boolean; services: Service[] };
      return data.success ? data.services : [];
    } catch (error) {
      return [];
    }
  },

  /**
   * Get services by category (real-time listener)
   */
  subscribeToCategoryServices(
    categoryId: string,
    callback: (services: Service[]) => void,
  ): Unsubscribe {
    const servicesRef = collection(getDb(), "services");
    const q = query(
      servicesRef,
      where("category.id", "==", categoryId),
      where("isArchived", "==", false),
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const services: Service[] = [];
        snapshot.forEach((doc) => {
          services.push({ id: doc.id, ...doc.data() } as Service);
        });
        callback(services);
      },
      () => {
        callback([]);
      },
    );
  },

  /**
   * Get services by category (one-time fetch)
   */
  async getServicesByCategory(categoryId: string): Promise<Service[]> {
    try {
      const getServicesByCategoryFn = httpsCallable(
        getFunctions(),
        "getServicesByCategory",
      );
      const result = await getServicesByCategoryFn({ categoryId });

      const data = result.data as { success: boolean; services: Service[] };
      return data.success ? data.services : [];
    } catch (error) {
      return [];
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
      const updateServiceStatusFn = httpsCallable(
        getFunctions(),
        "updateServiceStatus",
      );
      const result = await updateServiceStatusFn({ serviceId, status });

      const data = result.data as { success: boolean; service: Service };
      return data.success ? data.service : null;
    } catch (error) {
      throw error;
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
      const searchServicesByLocationFn = httpsCallable(
        getFunctions(),
        "searchServicesByLocation",
      );
      const result = await searchServicesByLocationFn({
        userLocation: location,
        maxDistance: radiusKm,
        categoryId,
      });

      const data = result.data as { success: boolean; services: Service[] };
      return data.success ? data.services : [];
    } catch (error) {
      return [];
    }
  },

  /**
   * Update service
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
      const updateServiceFn = httpsCallable(getFunctions(), "updateService");
      const result = await updateServiceFn({
        serviceId,
        categoryId,
        title,
        description,
        price,
        location,
        weeklySchedule,
        instantBookingEnabled,
        bookingNoticeHours,
        maxBookingsPerDay,
      });

      const data = result.data as { success: boolean; service: Service };
      return data.success ? data.service : null;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Delete a service
   */
  async deleteService(serviceId: string): Promise<string | null> {
    try {
      const deleteServiceFn = httpsCallable(getFunctions(), "deleteService");
      const result = await deleteServiceFn({ serviceId });

      const data = result.data as { success: boolean; message: string };
      return data.success ? data.message : null;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Restore an archived service
   */
  async restoreService(serviceId: string): Promise<boolean> {
    try {
      const restoreServiceFn = httpsCallable(getFunctions(), "restoreService");
      const result = await restoreServiceFn({ serviceId });
      const data = result.data as { success: boolean };
      return data.success;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get all services (real-time listener)
   * Returns raw service data from Firestore without formatting
   */
  subscribeToAllServices(callback: (services: Service[]) => void): Unsubscribe {
    const servicesRef = collection(getDb(), "services");
    const q = query(servicesRef, where("isArchived", "==", false));

    return onSnapshot(
      q,
      (snapshot) => {
        const services: Service[] = snapshot.docs.map((doc) => {
          const data = doc.data();

          return {
            id: doc.id,
            providerId: data.providerId || "",
            title: data.title || data.name || "",
            description: data.description || "",
            category: {
              id: data.category?.id || "",
              name: data.category?.name || data.category || "",
              slug: data.category?.slug || "",
              description: data.category?.description || "",
              imageUrl: data.category?.imageUrl || "",
              parentId: data.category?.parentId,
            } as ServiceCategory,
            price:
              data.price?.amount ??
              (typeof data.price === "number" ? data.price : 0),
            commissionFee: data.commissionFee || 0,
            commissionRate: data.commissionRate || 0,
            location: {
              latitude: data.location?.latitude || 0,
              longitude: data.location?.longitude || 0,
              address: data.location?.address || "",
              city: data.location?.city || "",
              state: data.location?.state || "",
              country: data.location?.country || "",
              postalCode: data.location?.postalCode || "",
            },
            status: (data.status as ServiceStatus) || "Unavailable",
            rating: data.rating?.average ?? data.rating ?? 0,
            reviewCount: data.rating?.count ?? data.reviewCount ?? 0,
            imageUrls: data.imageUrls || [],
            certificateUrls: data.certificateUrls || [],
            isVerifiedService: data.isVerifiedService || false,
            weeklySchedule: data.weeklySchedule,
            instantBookingEnabled: data.instantBookingEnabled,
            bookingNoticeHours: data.bookingNoticeHours,
            maxBookingsPerDay: data.maxBookingsPerDay,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            providerName: data.providerName,
          } as Service;
        });

        // Sort by createdAt in descending order (newest first)
        const sorted = services.sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() ?? 0;
          const bTime = b.createdAt?.toMillis?.() ?? 0;
          return bTime - aTime;
        });

        callback(sorted);
      },
      () => {
        callback([]);
      },
    );
  },

  /**
   * Get all services (one-time fetch)
   */
  async getAllServices(): Promise<Service[]> {
    try {
      const getAllServicesFn = httpsCallable(getFunctions(), "getAllServices");
      const result = await getAllServicesFn({});

      const data = result.data as { success: boolean; services: Service[] };
      return data.success ? data.services : [];
    } catch (error) {
      return [];
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
      fileData: string;
    }>,
  ): Promise<Service | null> {
    try {
      const uploadServiceImagesFn = httpsCallable(
        getFunctions(),
        "uploadServiceImages",
      );
      const result = await uploadServiceImagesFn({ serviceId, serviceImages });

      const data = result.data as { success: boolean; service: Service };
      return data.success ? data.service : null;
    } catch (error) {
      throw error;
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
      const removeServiceImageFn = httpsCallable(
        getFunctions(),
        "removeServiceImage",
      );
      const result = await removeServiceImageFn({ serviceId, imageUrl });

      const data = result.data as { success: boolean; service: Service };
      return data.success ? data.service : null;
    } catch (error) {
      throw error;
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
      const reorderServiceImagesFn = httpsCallable(
        getFunctions(),
        "reorderServiceImages",
      );
      const result = await reorderServiceImagesFn({
        serviceId,
        orderedImageUrls,
      });

      const data = result.data as { success: boolean; service: Service };
      return data.success ? data.service : null;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Upload additional certificates to existing service
   */
  async uploadServiceCertificates(
    serviceId: string,
    serviceCertificates: Array<{
      fileName: string;
      contentType: string;
      fileData: string;
    }>,
  ): Promise<Service | null> {
    try {
      const uploadServiceCertificatesFn = httpsCallable(
        getFunctions(),
        "uploadServiceCertificates",
      );
      const result = await uploadServiceCertificatesFn({
        serviceId,
        serviceCertificates,
      });

      const data = result.data as { success: boolean; service: Service };
      return data.success ? data.service : null;
    } catch (error) {
      throw error;
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
      const removeServiceCertificateFn = httpsCallable(
        getFunctions(),
        "removeServiceCertificate",
      );
      const result = await removeServiceCertificateFn({
        serviceId,
        certificateUrl,
      });

      const data = result.data as { success: boolean; service: Service };
      return data.success ? data.service : null;
    } catch (error) {
      throw error;
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
      const verifyServiceFn = httpsCallable(getFunctions(), "verifyService");
      const result = await verifyServiceFn({ serviceId, isVerified });

      const data = result.data as { success: boolean; service: Service };
      return data.success ? data.service : null;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get all categories (real-time listener)
   */
  subscribeToAllCategories(
    callback: (categories: ServiceCategory[]) => void,
  ): Unsubscribe {
    const categoriesRef = collection(getDb(), "categories");

    return onSnapshot(
      categoriesRef,
      (snapshot) => {
        const categories: ServiceCategory[] = [];
        snapshot.forEach((doc) => {
          categories.push({ id: doc.id, ...doc.data() } as ServiceCategory);
        });
        callback(categories);
      },
      () => {
        callback([]);
      },
    );
  },

  /**
   * Get all categories (one-time fetch)
   */
  async getAllCategories(): Promise<ServiceCategory[]> {
    try {
      const getAllCategoriesFn = httpsCallable(
        getFunctions(),
        "getAllCategories",
      );
      const result = await getAllCategoriesFn({});

      const data = result.data as {
        success: boolean;
        categories: ServiceCategory[];
      };
      return data.success ? data.categories : [];
    } catch (error) {
      return [];
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
      const createServicePackageFn = httpsCallable(
        getFunctions(),
        "createServicePackage",
      );
      const result = await createServicePackageFn({
        serviceId,
        title,
        description,
        price,
      });

      const data = result.data as {
        success: boolean;
        package: ServicePackage;
      };
      return data.success ? data.package : null;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get all packages for a service (real-time listener)
   */
  subscribeToServicePackages(
    serviceId: string,
    callback: (packages: ServicePackage[]) => void,
  ): Unsubscribe {
    const packagesRef = collection(getDb(), "service_packages");
    const q = query(packagesRef, where("serviceId", "==", serviceId));

    return onSnapshot(
      q,
      (snapshot) => {
        const packages: ServicePackage[] = [];
        snapshot.forEach((doc) => {
          packages.push({ id: doc.id, ...doc.data() } as ServicePackage);
        });
        callback(packages);
      },
      () => {
        callback([]);
      },
    );
  },

  /**
   * Get all packages for a service (one-time fetch)
   */
  async getServicePackages(serviceId: string): Promise<ServicePackage[]> {
    try {
      const getServicePackagesFn = httpsCallable(
        getFunctions(),
        "getServicePackages",
      );
      const result = await getServicePackagesFn({ serviceId });

      const data = result.data as {
        success: boolean;
        packages: ServicePackage[];
      };
      return data.success ? data.packages : [];
    } catch (error) {
      return [];
    }
  },

  /**
   * Get a specific package by ID
   */
  async getPackage(packageId: string): Promise<ServicePackage | null> {
    try {
      const getPackageFn = httpsCallable(getFunctions(), "getPackage");
      const result = await getPackageFn({ packageId });

      const data = result.data as {
        success: boolean;
        package: ServicePackage;
      };
      return data.success ? data.package : null;
    } catch (error) {
      return null;
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
      const updateServicePackageFn = httpsCallable(
        getFunctions(),
        "updateServicePackage",
      );
      const result = await updateServicePackageFn({
        packageId,
        title,
        description,
        price,
      });

      const data = result.data as {
        success: boolean;
        package: ServicePackage;
      };
      return data.success ? data.package : null;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Delete a service package
   */
  async deleteServicePackage(packageId: string): Promise<string | null> {
    try {
      const deleteServicePackageFn = httpsCallable(
        getFunctions(),
        "deleteServicePackage",
      );
      const result = await deleteServicePackageFn({ packageId });

      const data = result.data as { success: boolean; message: string };
      return data.success ? data.message : null;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get commission quote for a given category and price
   */
  async getCommissionQuote(
    categoryName: string,
    price: number,
  ): Promise<CommissionQuote | null> {
    try {
      const getCommissionQuoteFn = httpsCallable(
        getFunctions(),
        "getCommissionQuote",
      );
      const result = await getCommissionQuoteFn({ categoryName, price });

      const data = result.data as CommissionQuote & { success: boolean };
      return data.success ? data : null;
    } catch (error) {
      return null;
    }
  },

  /**
   * Update service rating (called by Review system)
   */
  async updateServiceRating(
    serviceId: string,
    newRating: number,
    newReviewCount: number,
  ): Promise<Service | null> {
    try {
      const updateServiceRatingFn = httpsCallable(
        getFunctions(),
        "updateServiceRating",
      );
      const result = await updateServiceRatingFn({
        serviceId,
        newRating,
        newReviewCount,
      });

      const data = result.data as { success: boolean; service: Service };
      return data.success ? data.service : null;
    } catch (error) {
      throw error;
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
      const setServiceAvailabilityFn = httpsCallable(
        getFunctions(),
        "setServiceAvailability",
      );
      const result = await setServiceAvailabilityFn({
        serviceId,
        weeklySchedule,
        instantBookingEnabled,
        bookingNoticeHours,
        maxBookingsPerDay,
      });

      const data = result.data as {
        success: boolean;
        availability: ProviderAvailability;
      };
      return data.success ? data.availability : null;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get service availability
   */
  async getServiceAvailability(
    serviceId: string,
  ): Promise<ProviderAvailability | null> {
    try {
      const getServiceAvailabilityFn = httpsCallable(
        getFunctions(),
        "getServiceAvailability",
      );
      const result = await getServiceAvailabilityFn({ serviceId });

      const data = result.data as {
        success: boolean;
        availability: ProviderAvailability;
      };
      return data.success ? data.availability : null;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get available time slots for a specific date and service
   */
  async getAvailableTimeSlots(
    serviceId: string,
    date: number, // Unix timestamp in milliseconds
  ): Promise<AvailableSlot[]> {
    try {
      const getAvailableTimeSlotsFn = httpsCallable(
        getFunctions(),
        "getAvailableTimeSlots",
      );
      const result = await getAvailableTimeSlotsFn({ serviceId, date });

      const data = result.data as {
        success: boolean;
        slots: AvailableSlot[];
      };
      return data.success ? data.slots : [];
    } catch (error) {
      return [];
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

export default serviceCanisterService;
