import { BaseEntity } from "../common/base-entity";
import { ServicePrice } from "./service-price";
import { ServiceLocation } from "./service-location";
import { ServiceAvailability } from "./service-availability";
import { ServiceRating } from "./service-rating";
import { MediaItem } from "../common/media-item";
import { Category } from "../category/category";
import { Package } from "./service-package";
import { Terms } from "./service-terms";

export interface Service extends BaseEntity {
  // categoryId: string;
  providerId: string;
  name: string;
  title: string;
  description: string;
  price: ServicePrice;
  location: ServiceLocation;
  availability: ServiceAvailability;
  rating: ServiceRating;
  media: MediaItem[];
  requirements?: string[];
  isVerified: boolean;

  // added 12/2/2025
  slug: string;
  heroImage: string;
  category: Omit<Category, "services">;

  // added 15/4/2025
  packages?: Package[];
  terms?: Terms;
}
