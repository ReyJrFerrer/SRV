import { useQuery } from "@tanstack/react-query";
import { mediaService } from "../services/mediaService";
import { serviceCanisterService } from "../services/serviceCanisterService";

export interface UseImageLoaderOptions {
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number; // Renamed from cacheTime in newer React Query versions
  retry?: number;
  placeholder?: string;
}

const DEFAULT_OPTIONS: Required<UseImageLoaderOptions> = {
  enabled: true,
  staleTime: 1000 * 60 * 60, // 1 hour
  gcTime: 1000 * 60 * 60 * 24, // 24 hours
  retry: 3,
  placeholder: "",
};

/**
 * Custom hook for loading images with React Query caching
 * Provides optimal performance with browser and memory caching
 */
export const useImageLoader = (
  mediaUrl: string | null | undefined,
  options: UseImageLoaderOptions = {},
) => {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const {
    data: imageDataUrl,
    isLoading,
    error,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["image", mediaUrl],
    queryFn: async () => {
      if (!mediaUrl) {
        throw new Error("Media URL is required");
      }
      return await mediaService.getImageDataUrl(mediaUrl, {
        enableCache: true,
      });
    },
    enabled: opts.enabled && !!mediaUrl,
    staleTime: opts.staleTime,
    gcTime: opts.gcTime,
    retry: opts.retry,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  return {
    /** The data URL for the image (ready to use in src attribute) */
    imageDataUrl: imageDataUrl || opts.placeholder,
    /** Whether the image is currently loading */
    isLoading,
    /** Any error that occurred during loading */
    error: error as Error | null,
    /** Whether an error occurred */
    isError,
    /** Function to manually refetch the image */
    refetch,
    /** Whether the image has been loaded successfully */
    isSuccess: !!imageDataUrl,
  };
};

/**
 * Hook for preloading multiple images
 * Useful for image galleries or carousels
 */
export const useImagePreloader = (mediaUrls: (string | null | undefined)[]) => {
  const validUrls = mediaUrls.filter((url): url is string => !!url);

  const queries = useQuery({
    queryKey: ["preload-images", validUrls],
    queryFn: async () => {
      const preloadPromises = validUrls.map((url) =>
        mediaService.preloadImage(url).catch((error) => ({
          url,
          error: error.message,
        })),
      );

      const results = await Promise.allSettled(preloadPromises);
      return results;
    },
    enabled: validUrls.length > 0,
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  return {
    /** Whether preloading is in progress */
    isPreloading: queries.isLoading,
    /** Whether preloading completed */
    isPreloaded: queries.isSuccess,
    /** Any errors that occurred during preloading */
    preloadErrors:
      queries.data?.filter((result: any) => result.status === "rejected") || [],
  };
};

/**
 * Hook for managing profile picture loading specifically
 * Includes fallback to default avatar
 */
export const useProfileImage = (
  profilePictureUrl: string | null | undefined,
  options: UseImageLoaderOptions = {},
) => {
  const { imageDataUrl, isLoading, error, isError, refetch, isSuccess } =
    useImageLoader(profilePictureUrl, {
      placeholder: "/default-client.svg",
      ...options,
    });

  return {
    /** The profile image URL (with fallback to default avatar) */
    profileImageUrl:
      isSuccess && imageDataUrl ? imageDataUrl : "/default-client.svg",
    /** Whether the profile image is loading */
    isLoading: isLoading && !!profilePictureUrl,
    /** Whether to show the default avatar */
    isUsingDefaultAvatar: !profilePictureUrl || (!isSuccess && !isLoading),
    /** Any error that occurred */
    error,
    /** Whether an error occurred */
    isError,
    /** Function to manually refetch the image */
    refetch,
  };
};

/***
 * Hook for fetching service provider profile pictures
 *
 * Inclues fallback to default provider avatar
 */
export const useUserImage = (
  profilePictureUrl: string | null | undefined,

  options: UseImageLoaderOptions = {},
) => {
  const { imageDataUrl, isLoading, error, isError, refetch, isSuccess } =
    useImageLoader(profilePictureUrl, {
      ...options,
    });

  return {
    /** The profile image URL (with fallback to default avatar) */
    userImageUrl: isSuccess && imageDataUrl ? imageDataUrl : undefined,
    /** Whether the profile image is loading */
    isLoading: isLoading && !!profilePictureUrl,
    /** Whether to show the default avatar */
    isUsingDefaultAvatar: !profilePictureUrl || (!isSuccess && !isLoading),
    /** Any error that occurred */
    error,
    /** Whether an error occurred */
    isError,
    /** Function to manually refetch the image */
    refetch,
  };
};

/**
 * Hook for managing service images
 * Provides loading, uploading, and management functionality for service image galleries
 */
export const useServiceImages = (
  serviceId: string | null | undefined,
  imageUrls: (string | null | undefined)[] = [],
  options: UseImageLoaderOptions = {},
) => {
  const validUrls = imageUrls.filter((url): url is string => !!url);

  // Load all service images
  const {
    data: loadedImages,
    isLoading: isLoadingImages,
    error: loadError,
    isError: isLoadError,
    refetch: refetchImages,
  } = useQuery({
    queryKey: ["service-images", serviceId, validUrls],
    queryFn: async () => {
      if (!validUrls.length) return [];

      const imagePromises = validUrls.map(async (url) => {
        try {
          const dataUrl = await mediaService.getImageDataUrl(url, {
            enableCache: true,
            ...options,
          });
          return { url, dataUrl, error: null };
        } catch (error) {
          return {
            url,
            dataUrl: null,
            error:
              error instanceof Error ? error.message : "Failed to load image",
          };
        }
      });

      return await Promise.all(imagePromises);
    },
    enabled: !!serviceId && validUrls.length > 0,
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  return {
    /** Array of loaded images with their data URLs */
    images: loadedImages || [],
    /** Whether images are currently loading */
    isLoading: isLoadingImages,
    /** Any error that occurred during loading */
    error: loadError as Error | null,
    /** Whether an error occurred */
    isError: isLoadError,
    /** Function to manually refetch all images */
    refetch: refetchImages,
    /** Whether images have been loaded successfully */
    isSuccess: !!loadedImages,
    /** Number of successfully loaded images */
    successCount: loadedImages?.filter((img) => img.dataUrl).length || 0,
    /** Number of failed image loads */
    errorCount: loadedImages?.filter((img) => img.error).length || 0,
  };
};

/**
 * Hook for managing service image uploads
 * Provides upload functionality with progress tracking and validation
 */
export const useServiceImageUpload = (serviceId: string | null | undefined) => {
  return {
    /**
     * Upload multiple images to a service
     */
    async uploadImages(files: File[], options: any = {}) {
      if (!serviceId) {
        throw new Error("Service ID is required for image upload");
      }

      try {
        return await mediaService.uploadServiceImagesWithDescaling(
          serviceId,
          files,
          options,
        );
      } catch (error) {
        //console.error("Error uploading service images:", error);
        throw error;
      }
    },

    /**
     * Remove a specific image from the service
     */
    async removeImage(imageUrl: string) {
      if (!serviceId) {
        throw new Error("Service ID is required to remove image");
      }

      try {
        return await serviceCanisterService.removeServiceImage(
          serviceId,
          imageUrl,
        );
      } catch (error) {
        //console.error("Error removing service image:", error);
        throw error;
      }
    },

    /**
     * Reorder service images
     */
    async reorderImages(orderedImageUrls: string[]) {
      if (!serviceId) {
        throw new Error("Service ID is required to reorder images");
      }

      try {
        return await serviceCanisterService.reorderServiceImages(
          serviceId,
          orderedImageUrls,
        );
      } catch (error) {
        //console.error("Error reordering service images:", error);
        throw error;
      }
    },

    /**
     * Process files for upload without actually uploading
     */
    async processFiles(files: File[], options: any = {}) {
      try {
        return await mediaService.processServiceImageFiles(files, options);
      } catch (error) {
        //console.error("Error processing service image files:", error);
        throw error;
      }
    },
  };
};

/**
 * Hook for service image gallery management
 * Combines loading and upload functionality for a complete gallery experience
 */
export const useServiceImageGallery = (
  serviceId: string | null | undefined,
  imageUrls: (string | null | undefined)[] = [],
  options: UseImageLoaderOptions = {},
) => {
  const imageLoader = useServiceImages(serviceId, imageUrls, options);
  const uploader = useServiceImageUpload(serviceId);

  return {
    // Image loading
    ...imageLoader,

    // Image management
    uploadImages: uploader.uploadImages,
    removeImage: uploader.removeImage,
    reorderImages: uploader.reorderImages,
    processFiles: uploader.processFiles,

    // Gallery state
    hasImages: (imageLoader.images?.length || 0) > 0,
    canAddMore: (imageUrls.length || 0) < 5, // Max 5 images per service
    remainingSlots: Math.max(0, 5 - (imageUrls.length || 0)),
  };
};

/**
 * Hook for managing service certificates
 * Provides loading and management functionality for service certificates (PDFs and images)
 */
export const useServiceCertificates = (
  serviceId: string | null | undefined,
  certificateUrls: (string | null | undefined)[] = [],
  options: UseImageLoaderOptions = {},
) => {
  const validUrls = certificateUrls.filter((url): url is string => !!url);

  // Load all service certificates
  const {
    data: loadedCertificates,
    isLoading: isLoadingCertificates,
    error: loadError,
    isError: isLoadError,
    refetch: refetchCertificates,
  } = useQuery({
    queryKey: ["service-certificates", serviceId, validUrls],
    queryFn: async () => {
      if (!validUrls.length) return [];

      const certificatePromises = validUrls.map(async (url) => {
        try {
          // Get both image data and validation status
          const [dataUrl, mediaDetails] = await Promise.all([
            mediaService.getImageDataUrl(url, {
              enableCache: true,
              ...options,
            }),
            mediaService.getMediaItemDetails(url),
          ]);

          return {
            url,
            dataUrl,
            validationStatus: mediaDetails.validationStatus,
            error: null,
          };
        } catch (error) {
          return {
            url,
            dataUrl: null,
            validationStatus: undefined,
            error:
              error instanceof Error
                ? error.message
                : "Failed to load certificate",
          };
        }
      });

      return await Promise.all(certificatePromises);
    },
    enabled: !!serviceId && validUrls.length > 0,
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  return {
    /** Array of loaded certificates with their data URLs */
    certificates: loadedCertificates || [],
    /** Whether certificates are currently loading */
    isLoading: isLoadingCertificates,
    /** Any error that occurred during loading */
    error: loadError as Error | null,
    /** Whether an error occurred */
    isError: isLoadError,
    /** Function to manually refetch all certificates */
    refetch: refetchCertificates,
    /** Whether certificates have been loaded successfully */
    isSuccess: !!loadedCertificates,
    /** Number of successfully loaded certificates */
    successCount:
      loadedCertificates?.filter((cert) => cert.dataUrl).length || 0,
    /** Number of failed certificate loads */
    errorCount: loadedCertificates?.filter((cert) => cert.error).length || 0,
  };
};

/**
 * Hook for managing service certificate uploads
 * Provides upload functionality with progress tracking and validation for PDFs and images
 */
export const useServiceCertificateUpload = (
  serviceId: string | null | undefined,
) => {
  return {
    /**
     * Upload multiple certificates to a service
     */
    async uploadCertificates(files: File[], options: any = {}) {
      if (!serviceId) {
        throw new Error("Service ID is required for certificate upload");
      }

      try {
        return await mediaService.uploadServiceCertificatesWithProcessing(
          serviceId,
          files,
          options,
        );
      } catch (error) {
        //console.error("Error uploading service certificates:", error);
        throw error;
      }
    },

    /**
     * Remove a specific certificate from the service
     */
    async removeCertificate(certificateUrl: string) {
      if (!serviceId) {
        throw new Error("Service ID is required to remove certificate");
      }

      try {
        return await serviceCanisterService.removeServiceCertificate(
          serviceId,
          certificateUrl,
        );
      } catch (error) {
        //console.error("Error removing service certificate:", error);
        throw error;
      }
    },

    /**
     * Verify service manually (admin function)
     */
    async verifyService(isVerified: boolean) {
      if (!serviceId) {
        throw new Error("Service ID is required to verify service");
      }

      try {
        return await serviceCanisterService.verifyService(
          serviceId,
          isVerified,
        );
      } catch (error) {
        //console.error("Error verifying service:", error);
        throw error;
      }
    },

    /**
     * Process certificate files for upload without actually uploading
     */
    async processFiles(files: File[], options: any = {}) {
      try {
        return await mediaService.processServiceCertificateFiles(
          files,
          options,
        );
      } catch (error) {
        //console.error("Error processing service certificate files:", error);
        throw error;
      }
    },

    /**
     * Validate certificate file (PDF or image)
     */
    validateCertificateFile(file: File, options: any = {}) {
      try {
        return mediaService.validateCertificateFile(file, options);
      } catch (error) {
        //console.error("Error validating certificate file:", error);
        throw error;
      }
    },
  };
};

/**
 * Hook for service certificate gallery management
 * Combines loading and upload functionality for a complete certificate gallery experience
 */
export const useServiceCertificateGallery = (
  serviceId: string | null | undefined,
  certificateUrls: (string | null | undefined)[] = [],
  options: UseImageLoaderOptions = {},
) => {
  const certificateLoader = useServiceCertificates(
    serviceId,
    certificateUrls,
    options,
  );
  const uploader = useServiceCertificateUpload(serviceId);

  return {
    // Certificate loading
    ...certificateLoader,

    // Certificate management
    uploadCertificates: uploader.uploadCertificates,
    removeCertificate: uploader.removeCertificate,
    verifyService: uploader.verifyService,
    processFiles: uploader.processFiles,
    validateCertificateFile: uploader.validateCertificateFile,

    // Gallery state
    hasCertificates: (certificateLoader.certificates?.length || 0) > 0,
    canAddMore: (certificateUrls.length || 0) < 10, // Max 10 certificates per service
    remainingSlots: Math.max(0, 10 - (certificateUrls.length || 0)),
  };
};

/**
 * Combined hook for managing both service images and certificates
 * Provides a unified interface for all service media management
 */
export const useServiceMediaGallery = (
  serviceId: string | null | undefined,
  imageUrls: (string | null | undefined)[] = [],
  certificateUrls: (string | null | undefined)[] = [],
  options: UseImageLoaderOptions = {},
) => {
  const imageGallery = useServiceImageGallery(serviceId, imageUrls, options);
  const certificateGallery = useServiceCertificateGallery(
    serviceId,
    certificateUrls,
    options,
  );

  return {
    // Image management
    images: imageGallery,

    // Certificate management
    certificates: certificateGallery,

    // Combined state
    isLoading: imageGallery.isLoading || certificateGallery.isLoading,
    hasAnyMedia: imageGallery.hasImages || certificateGallery.hasCertificates,
    totalMediaCount: (imageUrls.length || 0) + (certificateUrls.length || 0),

    // Combined actions
    async refreshAll() {
      await Promise.all([imageGallery.refetch(), certificateGallery.refetch()]);
    },
  };
};

export default useImageLoader;
