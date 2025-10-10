// Media Firebase Service
import { httpsCallable } from "firebase/functions";
import { getFirebaseFunctions } from "./firebaseApp";

// Get Firebase Functions instance from singleton
const functions = getFirebaseFunctions();

// Frontend-adapted types
export interface FrontendMediaItem {
  id: string;
  url: string;
  thumbnailUrl?: string;
  contentType: string;
  ownerId: string;
  createdAt: Date;
  fileName: string;
  filePath: string;
  fileSize: number;
  updatedAt: Date;
  mediaType: MediaType;
}

export interface FrontendMediaValidationSummary {
  sha256?: string;
  extractedTimestamp?: Date;
  sizeBytes: number;
  mimeType: string;
  hasTextContent?: boolean;
  mediaId: string;
  isValidType: boolean;
  validationFlags: string[];
  isWithinSizeLimit: boolean;
  uploadedAt: Date;
}

export interface FrontendMediaStorageStats {
  totalSize: number;
  totalItems: number;
  typeBreakdown: { [key: string]: number };
  userCount: number;
}

export type MediaType =
  | "ServiceImage"
  | "RemittancePaymentProof"
  | "UserProfile"
  | "ServiceCertificate";

// Custom error class for media service operations
export class MediaServiceError extends Error {
  constructor(
    public readonly details: {
      message: string;
      code?: string;
      context?: string;
    },
  ) {
    super(details.message);
    this.name = "MediaServiceError";
  }
}

// Helper function to convert timestamps to Date
const convertToDate = (timestamp: any): Date => {
  if (timestamp instanceof Date) return timestamp;
  if (typeof timestamp === 'string') return new Date(timestamp);
  if (typeof timestamp === 'number') return new Date(timestamp);
  return new Date();
};

// Media Service Functions

/**
 * Gets multiple remittance media items by their IDs
 * @param mediaIds Array of media IDs to retrieve
 * @returns Array of media items
 */
export const getRemittanceMediaItems = async (
  mediaIds: string[],
): Promise<FrontendMediaItem[]> => {
  try {
    const getRemittanceMediaItemsFn = httpsCallable(functions, "getRemittanceMediaItems");
    const result = await getRemittanceMediaItemsFn({ mediaIds });

    const data = result.data as { success: boolean; mediaItems: FrontendMediaItem[] };
    return data.success ? data.mediaItems.map(item => ({
      ...item,
      createdAt: convertToDate(item.createdAt),
      updatedAt: convertToDate(item.updatedAt)
    })) : [];
  } catch (error) {
    if (error instanceof MediaServiceError) throw error;
    throw new MediaServiceError({
      message: `Failed to get remittance media items: ${error}`,
      context: "getRemittanceMediaItems",
    });
  }
};

/**
 * Gets a single media item by ID
 * @param mediaId The media item ID
 * @returns Media item or null if not found
 */
export const getMediaItem = async (
  mediaId: string,
): Promise<FrontendMediaItem | null> => {
  try {
    const getMediaItemFn = httpsCallable(functions, "getMediaItem");
    const result = await getMediaItemFn({ mediaId });

    const data = result.data as { success: boolean; mediaItem: FrontendMediaItem };
    if (data.success && data.mediaItem) {
      return {
        ...data.mediaItem,
        createdAt: convertToDate(data.mediaItem.createdAt),
        updatedAt: convertToDate(data.mediaItem.updatedAt)
      };
    }
    return null;
  } catch (error) {
    if (error instanceof MediaServiceError) throw error;
    throw new MediaServiceError({
      message: `Failed to get media item: ${error}`,
      context: "getMediaItem",
    });
  }
};

/**
 * Gets file data for a media item
 * @param mediaId The media item ID
 * @returns File data as Uint8Array
 */
export const getFileData = async (mediaId: string): Promise<Uint8Array> => {
  try {
    const getFileDataFn = httpsCallable(functions, "getFileData");
    const result = await getFileDataFn({ mediaId });

    const data = result.data as { success: boolean; fileData: number[] };
    if (data.success && data.fileData) {
      return new Uint8Array(data.fileData);
    }
    throw new Error("Failed to get file data");
  } catch (error) {
    if (error instanceof MediaServiceError) throw error;
    throw new MediaServiceError({
      message: `Failed to get file data: ${error}`,
      context: "getFileData",
    });
  }
};

export const extractMediaIdFromUrl = (url: string): string | null => {
  try {
    // Handle URLs in format: /media/{mediaId} or media://{mediaId}
    if (url.startsWith("media://")) {
      return url.replace("media://", "").split("/").pop() || null;
    }

    if (url.startsWith("/media/")) {
      return url.replace("/media/", "").split("/").pop() || null;
    }

    return null;
  } catch (error) {
    console.error("Error extracting media ID from URL:", error);
    return null;
  }
};

export const convertBlobToDataUrl = (
  uint8Array: Uint8Array,
  contentType: string,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      const blob = new Blob([uint8Array as BlobPart], { type: contentType });
      const reader = new FileReader();

      reader.onload = () => {
        resolve(reader.result as string);
      };

      reader.onerror = () => {
        reject(new Error("Failed to convert blob to data URL"));
      };

      reader.readAsDataURL(blob);
    } catch (error) {
      reject(error);
    }
  });
};

// Image cache for performance
const imageCache = new Map<string, string>();
export const getImageDataUrl = async (
  mediaUrl: string,
  options: { enableCache?: boolean; fallbackImageUrl?: string } = {},
): Promise<string> => {
  const opts = {
    enableCache: true,
    fallbackImageUrl: "/placeholder-image.png",
    ...options,
  };

  console.log("getImageDataUrl - Starting for URL:", mediaUrl);

  try {
    // Check cache first if enabled
    if (opts.enableCache && imageCache.has(mediaUrl)) {
      console.log("getImageDataUrl - Found in cache:", mediaUrl);
      return imageCache.get(mediaUrl)!;
    }

    // Extract media ID from URL
    const mediaId = extractMediaIdFromUrl(mediaUrl);
    console.log("getImageDataUrl - Extracted media ID:", mediaId);
    if (!mediaId) {
      console.warn("Could not extract media ID from URL:", mediaUrl);
      return opts.fallbackImageUrl;
    }

    // Get file data from Firebase
    console.log("getImageDataUrl - Calling getFileData");
    const fileData = await getFileData(mediaId);
    console.log("getImageDataUrl - Got file data, length:", fileData.length);

    // Get media item for content type
    console.log("getImageDataUrl - Getting media item for content type");
    const mediaItem = await getMediaItem(mediaId);
    console.log("getImageDataUrl - getMediaItem result:", mediaItem);

    if (!mediaItem) {
      console.warn("Failed to retrieve media item");
      return opts.fallbackImageUrl;
    }

    // Convert Uint8Array to data URL
    console.log("getImageDataUrl - Converting to data URL");
    const contentType = mediaItem.contentType;
    console.log(
      "getImageDataUrl - Content type:",
      contentType,
      "Data length:",
      fileData.length,
    );
    const dataUrl = await convertBlobToDataUrl(fileData, contentType);
    console.log(
      "getImageDataUrl - Data URL generated, length:",
      dataUrl.length,
    );

    // Cache the result if enabled
    if (opts.enableCache) {
      imageCache.set(mediaUrl, dataUrl);
    }

    return dataUrl;
  } catch (error) {
    console.error("Error retrieving image data:", error);
    return opts.fallbackImageUrl;
  }
};

/**
 * Gets all media items owned by a specific user
 * @param ownerId The owner's Principal ID as string
 * @returns Array of media items
 */
export const getMediaByOwner = async (
  ownerId: string,
): Promise<FrontendMediaItem[]> => {
  try {
    const getMediaByOwnerFn = httpsCallable(functions, "getMediaByOwner");
    const result = await getMediaByOwnerFn({ ownerId });

    const data = result.data as { success: boolean; mediaItems: FrontendMediaItem[] };
    return data.success ? data.mediaItems.map(item => ({
      ...item,
      createdAt: convertToDate(item.createdAt),
      updatedAt: convertToDate(item.updatedAt)
    })) : [];
  } catch (error) {
    if (error instanceof MediaServiceError) throw error;
    throw new MediaServiceError({
      message: `Failed to get media by owner: ${error}`,
      context: "getMediaByOwner",
    });
  }
};

/**
 * Gets media items by type and owner
 * @param ownerId The owner's user ID as string
 * @param mediaType The media type to filter by
 * @returns Array of media items
 */
export const getMediaByTypeAndOwner = async (
  ownerId: string,
  mediaType: MediaType,
): Promise<FrontendMediaItem[]> => {
  try {
    const getMediaByTypeAndOwnerFn = httpsCallable(functions, "getMediaByTypeAndOwner");
    const result = await getMediaByTypeAndOwnerFn({ ownerId, mediaType });

    const data = result.data as { success: boolean; mediaItems: FrontendMediaItem[] };
    return data.success ? data.mediaItems.map(item => ({
      ...item,
      createdAt: convertToDate(item.createdAt),
      updatedAt: convertToDate(item.updatedAt)
    })) : [];
  } catch (error) {
    if (error instanceof MediaServiceError) throw error;
    throw new MediaServiceError({
      message: `Failed to get media by type and owner: ${error}`,
      context: "getMediaByTypeAndOwner",
    });
  }
};

/**
 * Validates multiple media items
 * @param mediaIds Array of media IDs to validate
 * @returns Array of validation summaries
 */
export const validateMediaItems = async (
  mediaIds: string[],
): Promise<FrontendMediaValidationSummary[]> => {
  try {
    const validateMediaItemsFn = httpsCallable(functions, "validateMediaItems");
    const result = await validateMediaItemsFn({ mediaIds });

    const data = result.data as { success: boolean; validationSummaries: FrontendMediaValidationSummary[] };
    return data.success ? data.validationSummaries.map(summary => ({
      ...summary,
      extractedTimestamp: summary.extractedTimestamp ? convertToDate(summary.extractedTimestamp) : undefined,
      uploadedAt: convertToDate(summary.uploadedAt)
    })) : [];
  } catch (error) {
    if (error instanceof MediaServiceError) throw error;
    throw new MediaServiceError({
      message: `Failed to validate media items: ${error}`,
      context: "validateMediaItems",
    });
  }
};

/**
 * Uploads a media file
 * @param fileName The name of the file
 * @param contentType The MIME type of the file
 * @param mediaType The type of media being uploaded
 * @param fileData The file data as Uint8Array
 * @returns The uploaded media item
 */
export const uploadMedia = async (
  fileName: string,
  contentType: string,
  mediaType: MediaType,
  fileData: Uint8Array,
): Promise<FrontendMediaItem> => {
  try {
    const uploadMediaFn = httpsCallable(functions, "uploadMedia");
    const result = await uploadMediaFn({
      fileName,
      contentType,
      mediaType,
      fileData: Array.from(fileData)
    });

    const data = result.data as { success: boolean; mediaItem: FrontendMediaItem };
    if (data.success && data.mediaItem) {
      return {
        ...data.mediaItem,
        createdAt: convertToDate(data.mediaItem.createdAt),
        updatedAt: convertToDate(data.mediaItem.updatedAt)
      };
    }
    throw new Error("Failed to upload media");
  } catch (error) {
    if (error instanceof MediaServiceError) throw error;
    throw new MediaServiceError({
      message: `Failed to upload media: ${error}`,
      context: "uploadMedia",
    });
  }
};

/**
 * Updates media metadata
 * @param mediaId The media item ID
 * @param newFileName Optional new file name
 * @returns Updated media item
 */
export const updateMediaMetadata = async (
  mediaId: string,
  newFileName?: string,
): Promise<FrontendMediaItem> => {
  try {
    const updateMediaMetadataFn = httpsCallable(functions, "updateMediaMetadata");
    const result = await updateMediaMetadataFn({
      mediaId,
      newFileName: newFileName || null
    });

    const data = result.data as { success: boolean; mediaItem: FrontendMediaItem };
    if (data.success && data.mediaItem) {
      return {
        ...data.mediaItem,
        createdAt: convertToDate(data.mediaItem.createdAt),
        updatedAt: convertToDate(data.mediaItem.updatedAt)
      };
    }
    throw new Error("Failed to update media metadata");
  } catch (error) {
    if (error instanceof MediaServiceError) throw error;
    throw new MediaServiceError({
      message: `Failed to update media metadata: ${error}`,
      context: "updateMediaMetadata",
    });
  }
};

/**
 * Deletes a media item
 * @param mediaId The media item ID
 * @returns Success message
 */
export const deleteMedia = async (mediaId: string): Promise<string> => {
  try {
    const deleteMediaFn = httpsCallable(functions, "deleteMedia");
    const result = await deleteMediaFn({ mediaId });

    const data = result.data as { success: boolean; message: string };
    return data.success ? data.message : "Failed to delete media";
  } catch (error) {
    if (error instanceof MediaServiceError) throw error;
    throw new MediaServiceError({
      message: `Failed to delete media: ${error}`,
      context: "deleteMedia",
    });
  }
};

/**
 * Gets storage statistics for the media service
 * @returns Storage statistics
 */
export const getStorageStats = async (): Promise<FrontendMediaStorageStats> => {
  try {
    const getStorageStatsFn = httpsCallable(functions, "getStorageStats");
    const result = await getStorageStatsFn({});

    const data = result.data as { success: boolean; stats: FrontendMediaStorageStats };
    return data.success ? data.stats : {
      totalSize: 0,
      totalItems: 0,
      typeBreakdown: {},
      userCount: 0
    };
  } catch (error) {
    if (error instanceof MediaServiceError) throw error;
    throw new MediaServiceError({
      message: `Failed to get storage stats: ${error}`,
      context: "getStorageStats",
    });
  }
};

// Reset functions for compatibility (no longer needed but kept for interface)
export const resetMediaActor = () => {
  // No-op: Firebase doesn't need actor reset
};

export const refreshMediaActor = async () => {
  // No-op: Firebase doesn't need actor refresh
};

export const updateMediaActor = () => {
  // No-op: Firebase doesn't need actor updates
};

// Default export of all service functions
export const mediaServiceCanister = {
  getRemittanceMediaItems,
  getMediaItem,
  getFileData,
  getMediaByOwner,
  getMediaByTypeAndOwner,
  validateMediaItems,
  uploadMedia,
  updateMediaMetadata,
  deleteMedia,
  getStorageStats,
  updateMediaActor,
  resetMediaActor,
  refreshMediaActor,
  getImageDataUrl,
  extractMediaIdFromUrl,
  convertBlobToDataUrl,
};
