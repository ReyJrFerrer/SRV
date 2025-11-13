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
      if (!serviceId || !imageUrls.length) {
        setImages([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const validUrls = imageUrls.filter((url): url is string => !!url);

        const imagePromises = validUrls.map(async (url) => {
          try {
            const dataUrl = await getImageDataUrl(url, {
              enableCache: true,
            });
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
