/**
 * This adapter converts React Native image objects to strings for Next.js compatibility
 */

// In serviceDataAdapter.ts
export function adaptServiceData(services: any[]) {
  return services.map((service) => {
    const adaptedService = { ...service };
    if (service.heroImage) {
      // If heroImage comes directly from require()
      adaptedService.heroImage = convertImageToObjectOrPath(service.heroImage);
    } else if (
      service.media &&
      service.media.length > 0 &&
      service.media[0].url
    ) {
      // If from media array
      adaptedService.heroImage = convertImageToObjectOrPath(
        service.media[0].url,
      );
    } else {
      adaptedService.heroImage = "/default-provider.svg"; // Fallback
    }

    if (adaptedService.media) {
      adaptedService.media = service.media.map((item: any) => ({
        ...item,
        url: convertImageToObjectOrPath(item.url),
        thumbnail: item.thumbnail
          ? convertImageToObjectOrPath(item.thumbnail)
          : undefined,
      }));
    }
    return adaptedService;
  });
}

export function adaptCategoryData(categories: any[]) {
  return categories.map((category) => {
    const adaptedCategory = { ...category };

    // Convert imageUrl if it's a React Native image object
    if (category.imageUrl) {
      adaptedCategory.imageUrl = convertImageToObjectOrPath(category.imageUrl);
    }

    return adaptedCategory;
  });
}

// In serviceDataAdapter.ts and providerDataAdapter.ts
function convertImageToObjectOrPath(image: any): any {
  // Change return type
  if (typeof image === "string") {
    return image; // It's already a path string
  }
  // If it's a Webpack module (common structure: { default: { src: ... }} or { src: ... })
  if (typeof image === "object" && image !== null) {
    if (image.default && typeof image.default.src === "string") {
      return image.default; // Or just image.default.src if you only need the path
    }
    if (typeof image.src === "string") {
      return image; // Or just image.src
    }
    // If it's React Native style { uri: ... } (though less likely in Next.js adapters)
    if ("uri" in image && typeof image.uri === "string") {
      return image.uri;
    }
  }
  // Fallback if the structure is not recognized or it's not what <Image> expects
  // Ensure this path points to an image in your `public` directory
  return "/images/default-provider.svg";
}
