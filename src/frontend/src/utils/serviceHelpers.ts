import { Service } from "../services/serviceCanisterService";
import { FrontendProfile } from "../services/authCanisterService";
import { Principal } from "@dfinity/principal";

export interface EnrichedService extends Service {
  providerName: string;
  providerAvatar?: any;
  priceDisplay: string;
}

/**
 * Merges service data with provider data to create an enriched service object
 * @param service The service data from serviceCanisterService
 * @param provider The provider data from authCanisterService
 * @returns An enriched service object
 */
export const enrichServiceWithProvider = (
  service: Service,
  provider: FrontendProfile | null,
): EnrichedService => {
  return {
    ...service,
    providerName: provider?.name || "Unknown Provider",
    providerAvatar: provider?.profilePicture?.thumbnailUrl,
    priceDisplay: formatPrice(service.price),
  };
};

/**
 * Formats a price number to a display string
 * @param price The price as a number
 * @returns Formatted price string
 */
export const formatPrice = (price: number): string => {
  // Check if price is a valid number before using toFixed
  if (price === undefined || price === null) {
    return "$0.00";
  }
  return `$${Number(price).toFixed(2)}`;
};

/**
 * Converts a Principal ID to a string
 * @param principal The Principal object
 * @returns String representation of Principal
 */
export const principalToString = (principal: Principal): string => {
  return principal.toString();
};

/**
 * Maps category names to icon names for consistent UI display
 * @param categoryName The category name from the service canister
 * @returns Icon name for the Heroicons library
 */
export const getCategoryIcon = (categoryName: string): string => {
  const lowerName = categoryName.toLowerCase();

  // Handle the specified categories with consistent mapping
  if (lowerName.includes("home") || lowerName.includes("house")) return "home";
  if (lowerName.includes("clean")) return "broom";
  if (lowerName.includes("auto") || lowerName.includes("car")) return "car";
  if (
    lowerName.includes("gadget") ||
    lowerName.includes("tech") ||
    lowerName.includes("computer")
  )
    return "computer";
  if (lowerName.includes("beauty") && lowerName.includes("wellness"))
    return "sparkles";
  if (lowerName.includes("beauty") && lowerName.includes("services"))
    return "scissors";
  if (lowerName.includes("photographer")) return "camera";
  if (lowerName.includes("tutoring")) return "acads";

  // Additional categories
  if (lowerName.includes("delivery") || lowerName.includes("courier"))
    return "truck";
  if (lowerName.includes("electric")) return "bolt";
  if (lowerName.includes("repair") || lowerName.includes("maintenance"))
    return "wrench";

  // Default
  return "default";
};

/**
 * Fetches category images based on category name
 * @param categoryName The category name
 * @returns Path to category image
 */
export const getCategoryImage = (categoryName: string): string => {
  const lowerName = categoryName.toLowerCase();

  if (lowerName.includes("home") || lowerName.includes("house"))
    return "/images/HomeServices-CoverImage.jpg";
  if (lowerName.includes("clean"))
    return "/images/CleaningServices-CoverImage.jpeg";
  if (lowerName.includes("auto") || lowerName.includes("car"))
    return "/images/AutomobileRepairs-CoverImage.jpg";
  if (
    lowerName.includes("gadget") ||
    lowerName.includes("tech") ||
    lowerName.includes("computer")
  )
    return "/images/GadgetTechnician-CoverImage1.jpg";
  if (lowerName.includes("beauty") && lowerName.includes("wellness"))
    return "/images/Beauty&Wellness-CoverImage.jpg";
  if (lowerName.includes("delivery")) return "/images/Delivery-CoverImage.jpg";
  if (lowerName.includes("beauty") && lowerName.includes("services"))
    return "/images/BeautyServices-CoverImage.jpg";
  if (lowerName.includes("photography"))
    return "/images/Photographer-CoverImage.jpg";
  if (lowerName.includes("tutoring")) return "/images/Tutoring-CoverImage.jpg";
  if (lowerName.includes("others") || lowerName.includes("others"))
    return "/images/HomeServices-CoverImage.jpg";
  // Default image
  return "/default-provider.svg";
};
