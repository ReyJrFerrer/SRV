import { useState, useEffect } from "react";
import { getImageDataUrl } from "../../../frontend/src/services/mediaService";

interface ServiceImage {
  url: string;
  dataUrl: string | null;
  error: string | null;
}

export const useServiceImages = (
  serviceId: string | null | undefined,
  imageUrls: (string | null | undefined)[] = [],
) => {
  const [images, setImages] = useState<ServiceImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadImages = async () => {
      console.log(
        "useServiceImages - Loading images for serviceId:",
        serviceId,
      );
      console.log("useServiceImages - ImageUrls:", imageUrls);

      if (!serviceId || !imageUrls.length) {
        console.log(
          "useServiceImages - No serviceId or imageUrls, setting empty array",
        );
        setImages([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const validUrls = imageUrls.filter((url): url is string => !!url);
        console.log("useServiceImages - Valid URLs:", validUrls);

        const imagePromises = validUrls.map(async (url) => {
          console.log("useServiceImages - Loading image:", url);
          try {
            const dataUrl = await getImageDataUrl(url, {
              enableCache: true,
            });
            console.log(
              "useServiceImages - Image loaded successfully:",
              url,
              dataUrl ? "dataUrl generated" : "no dataUrl",
            );
            console.log(
              "useServiceImages - Data URL preview:",
              dataUrl ? dataUrl.substring(0, 100) + "..." : "no dataUrl",
            );
            console.log(
              "useServiceImages - Data URL length:",
              dataUrl ? dataUrl.length : 0,
            );
            return { url, dataUrl, error: null };
          } catch (error) {
            console.error(
              "useServiceImages - Error loading image:",
              url,
              error,
            );
            return {
              url,
              dataUrl: null,
              error:
                error instanceof Error ? error.message : "Failed to load image",
            };
          }
        });

        const loadedImages = await Promise.all(imagePromises);
        console.log("useServiceImages - All images loaded:", loadedImages);
        setImages(loadedImages);
      } catch (err) {
        console.error("useServiceImages - General error:", err);
        setError(err instanceof Error ? err.message : "Failed to load images");
        setImages([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadImages();
  }, [serviceId, imageUrls.join(",")]);

  return {
    images,
    isLoading,
    error,
  };
};
