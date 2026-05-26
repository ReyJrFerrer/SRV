import { callFirebaseFunction } from "./coreUtils";

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

const mapService = (service: any): ServiceData => ({
  ...service,
  rating: service.averageRating ?? service.rating ?? 0,
  createdAt: service.createdAt ? new Date(service.createdAt) : new Date(),
  updatedAt: service.updatedAt ? new Date(service.updatedAt) : new Date(),
});

const mapCategory = (category: any): CategoryData => ({
  ...category,
  createdAt: category.createdAt ? new Date(category.createdAt) : new Date(),
  updatedAt: category.updatedAt ? new Date(category.updatedAt) : new Date(),
});

export const serviceCanister = {
  async getAllServices(): Promise<ServiceData[]> {
    const result = await callFirebaseFunction("serviceAction", {
      action: "getAllServices",
      data: {},
    });
    return (result as { services: any[] }).services.map(mapService);
  },

  async getAllCategories(): Promise<CategoryData[]> {
    const result = await callFirebaseFunction("serviceAction", {
      action: "getAllCategories",
      data: {},
    });
    return (result as { categories: any[] }).categories.map(mapCategory);
  },

  async getServicesByCategory(categoryId: string): Promise<ServiceData[]> {
    const result = await callFirebaseFunction("serviceAction", {
      action: "getServicesByCategory",
      data: { categoryId },
    });
    return (result as { services: any[] }).services.map(mapService);
  },

  async getService(serviceId: string): Promise<ServiceData | null> {
    const result = await callFirebaseFunction("serviceAction", {
      action: "getService",
      data: { serviceId },
    });
    const raw = (result as { service?: any }).service;
    return raw ? mapService(raw) : null;
  },

  async verifyService(
    serviceId: string,
    isVerified: boolean,
  ): Promise<ServiceData | null> {
    const result = await callFirebaseFunction("serviceAction", {
      action: "verifyService",
      data: { serviceId, isVerified },
    });
    const raw = (result as { service?: any }).service;
    return raw ? mapService(raw) : null;
  },
};
