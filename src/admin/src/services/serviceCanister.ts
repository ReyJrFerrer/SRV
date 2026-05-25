import { httpsCallable } from "firebase/functions";
import { getFirebaseAuth, getFirebaseFunctions } from "./firebaseApp";

const auth = getFirebaseAuth();
const getFunctions = () => getFirebaseFunctions();

const checkAuth = (requireAuth: boolean = true) => {
  if (requireAuth && !auth.currentUser) {
    throw new Error(
      "Authentication required: Please log in as an admin to perform this action",
    );
  }
};

export interface ServiceData {
  id: string;
  title: string;
  description: string;
  category: {
    id: string;
    name: string;
    slug?: string;
    description?: string;
    imageUrl?: string;
    parentId?: string;
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
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
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
  slug?: string;
  imageUrl?: string;
  parentId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const serviceCanister = {
  async getAllServices(): Promise<ServiceData[]> {
    try {
      checkAuth();

      const serviceActionFn = httpsCallable(getFunctions(), "serviceAction");
      const result = await serviceActionFn({
        action: "getAllServices",
        data: {},
      });

      const data = result.data as { success: boolean; services: any[] };
      if (!data.success) throw new Error("Failed to fetch services");

      return data.services.map((service: any) => ({
        ...service,
        rating: service.averageRating ?? service.rating ?? 0,
        createdAt: service.createdAt ? new Date(service.createdAt) : new Date(),
        updatedAt: service.updatedAt ? new Date(service.updatedAt) : new Date(),
      }));
    } catch (error) {
      console.error("Error fetching services:", error);
      throw error;
    }
  },

  async getAllCategories(): Promise<CategoryData[]> {
    try {
      checkAuth();

      const serviceActionFn = httpsCallable(getFunctions(), "serviceAction");
      const result = await serviceActionFn({
        action: "getAllCategories",
        data: {},
      });

      const data = result.data as { success: boolean; categories: any[] };
      if (!data.success) throw new Error("Failed to fetch categories");

      return data.categories.map((category: any) => ({
        ...category,
        createdAt: category.createdAt
          ? new Date(category.createdAt)
          : new Date(),
        updatedAt: category.updatedAt
          ? new Date(category.updatedAt)
          : new Date(),
      }));
    } catch (error) {
      console.error("Error fetching categories:", error);
      throw error;
    }
  },

  async getServicesByCategory(categoryId: string): Promise<ServiceData[]> {
    try {
      checkAuth();

      const serviceActionFn = httpsCallable(getFunctions(), "serviceAction");
      const result = await serviceActionFn({
        action: "getServicesByCategory",
        data: { categoryId },
      });

      const data = result.data as { success: boolean; services: any[] };
      if (!data.success)
        throw new Error("Failed to fetch services by category");

      return data.services.map((service: any) => ({
        ...service,
        createdAt: service.createdAt ? new Date(service.createdAt) : new Date(),
        updatedAt: service.updatedAt ? new Date(service.updatedAt) : new Date(),
      }));
    } catch (error) {
      console.error("Error fetching services by category:", error);
      throw error;
    }
  },

  async getService(serviceId: string): Promise<ServiceData | null> {
    try {
      checkAuth();

      const serviceActionFn = httpsCallable(getFunctions(), "serviceAction");
      const result = await serviceActionFn({
        action: "getService",
        data: { serviceId },
      });

      const data = result.data as { success: boolean; service: any };
      if (!data.success || !data.service) return null;

      const raw = data.service;
      return {
        ...raw,
        rating: raw.averageRating ?? raw.rating ?? 0,
        createdAt: raw.createdAt ? new Date(raw.createdAt) : new Date(),
        updatedAt: raw.updatedAt ? new Date(raw.updatedAt) : new Date(),
      };
    } catch (error) {
      console.error("Error fetching service:", error);
      throw error;
    }
  },

  async verifyService(
    serviceId: string,
    isVerified: boolean,
  ): Promise<ServiceData | null> {
    try {
      checkAuth();

      const serviceActionFn = httpsCallable(getFunctions(), "serviceAction");
      const result = await serviceActionFn({
        action: "verifyService",
        data: { serviceId, isVerified },
      });

      const data = result.data as { success: boolean; service: any };
      if (!data.success) return null;

      return {
        ...data.service,
        createdAt: data.service.createdAt
          ? new Date(data.service.createdAt)
          : new Date(),
        updatedAt: data.service.updatedAt
          ? new Date(data.service.updatedAt)
          : new Date(),
      };
    } catch (error) {
      console.error("Error verifying service:", error);
      throw error;
    }
  },
};
