// Service Management Firebase Interface for Admin
import { httpsCallable } from "firebase/functions";
import { getFirebaseAuth, getFirebaseFunctions } from "./firebaseApp";

// Get Firebase instances
const auth = getFirebaseAuth();
const functions = getFirebaseFunctions();

// Helper function to create Firebase callable functions
const createCallableFunction = (functionName: string) => {
  return httpsCallable(functions, functionName);
};

// Helper function to check authentication
const checkAuth = (requireAuth: boolean = true) => {
  if (requireAuth && !auth.currentUser) {
    throw new Error(
      "Authentication required: Please log in as an admin to perform this action",
    );
  }
};

// Service data interfaces
export interface ServiceData {
  id: string;
  title: string;
  description: string;
  category: {
    id: string;
    name: string;
  };
  status: string;
  type: string;
  price: number;
  currency: string;
  duration?: number;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  providerId: string;
  providerName: string;
  images: string[];
  certificates: string[];
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryData {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Main service object
export const serviceCanister = {
  /**
   * Get all services
   */
  async getAllServices(): Promise<ServiceData[]> {
    try {
      checkAuth();
      console.log("Fetching all services from Firebase...");

      const getAllServices = createCallableFunction("getAllServices");
      const result = await getAllServices({});

      if ((result.data as any).success) {
        console.log(
          `✅ Successfully fetched ${(result.data as any).services.length} services`,
        );
        return (result.data as any).services.map((service: any) => ({
          ...service,
          createdAt: service.createdAt
            ? new Date(service.createdAt)
            : new Date(),
          updatedAt: service.updatedAt
            ? new Date(service.updatedAt)
            : new Date(),
        }));
      } else {
        throw new Error("Failed to fetch services");
      }
    } catch (error) {
      console.error("❌ Error fetching services:", error);
      throw error;
    }
  },

  /**
   * Get all categories
   */
  async getAllCategories(): Promise<CategoryData[]> {
    try {
      checkAuth();
      console.log("Fetching all categories from Firebase...");

      const getAllCategories = createCallableFunction("getAllCategories");
      const result = await getAllCategories({});

      if ((result.data as any).success) {
        console.log(
          `✅ Successfully fetched ${(result.data as any).categories.length} categories`,
        );
        return (result.data as any).categories.map((category: any) => ({
          ...category,
          createdAt: category.createdAt
            ? new Date(category.createdAt)
            : new Date(),
          updatedAt: category.updatedAt
            ? new Date(category.updatedAt)
            : new Date(),
        }));
      } else {
        throw new Error("Failed to fetch categories");
      }
    } catch (error) {
      console.error("❌ Error fetching categories:", error);
      throw error;
    }
  },

  /**
   * Get services by category
   */
  async getServicesByCategory(categoryId: string): Promise<ServiceData[]> {
    try {
      checkAuth();
      console.log(`Fetching services for category: ${categoryId}`);

      const getServicesByCategory = createCallableFunction(
        "getServicesByCategory",
      );
      const result = await getServicesByCategory({ categoryId });

      if ((result.data as any).success) {
        console.log(
          `✅ Successfully fetched ${(result.data as any).services.length} services for category ${categoryId}`,
        );
        return (result.data as any).services.map((service: any) => ({
          ...service,
          createdAt: service.createdAt
            ? new Date(service.createdAt)
            : new Date(),
          updatedAt: service.updatedAt
            ? new Date(service.updatedAt)
            : new Date(),
        }));
      } else {
        throw new Error("Failed to fetch services by category");
      }
    } catch (error) {
      console.error("❌ Error fetching services by category:", error);
      throw error;
    }
  },

  /**
   * Get service by ID
   */
  async getService(serviceId: string): Promise<ServiceData | null> {
    try {
      checkAuth();
      console.log(`Fetching service: ${serviceId}`);

      const getService = createCallableFunction("getService");
      const result = await getService({ serviceId });

      if ((result.data as any).success && (result.data as any).service) {
        console.log(`✅ Successfully fetched service: ${serviceId}`);
        return {
          ...(result.data as any).service,
          createdAt: (result.data as any).service.createdAt
            ? new Date((result.data as any).service.createdAt)
            : new Date(),
          updatedAt: (result.data as any).service.updatedAt
            ? new Date((result.data as any).service.updatedAt)
            : new Date(),
        };
      } else {
        console.log(`ℹ️ Service not found: ${serviceId}`);
        return null;
      }
    } catch (error) {
      console.error("❌ Error fetching service:", error);
      throw error;
    }
  },
};
