import { Principal } from "@dfinity/principal";
import { createActor, canisterId } from "../../../declarations/media";
import { Identity } from "@dfinity/agent";
import type {
  _SERVICE as MediaService,
  MediaItem as CanisterMediaItem,
  MediaType as CanisterMediaType,
  MediaValidationSummary as CanisterMediaValidationSummary,
  Time,
} from "../../../declarations/media/media.did";

/**
 * Creates a media actor with the provided identity
 * @param identity The user's identity from AuthContext
 * @returns An authenticated MediaService actor
 */
const createMediaActor = (identity?: Identity | null): MediaService => {
  return createActor(canisterId, {
    agentOptions: {
      identity: identity || undefined,
      host:
        process.env.DFX_NETWORK !== "ic"
          ? "http://localhost:4943"
          : "https://ic0.app",
    },
  }) as MediaService;
};

// Singleton actor instance with identity tracking
let mediaActor: MediaService | null = null;
let currentIdentity: Identity | null = null;

export const updateMediaActor = (identity: Identity | null) => {
  if (currentIdentity !== identity) {
    mediaActor = createMediaActor(identity);
    currentIdentity = identity;
  }
};

const getMediaActor = (requireAuth: boolean = true): MediaService => {
  if (requireAuth && !currentIdentity) {
    throw new Error(
      "Authentication required: Please log in to perform this action",
    );
  }

  if (!mediaActor) {
    mediaActor = createMediaActor(currentIdentity);
  }

  return mediaActor;
};

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

// Conversion utilities
const convertTimeToDate = (time: Time): Date =>
  new Date(Number(time) / 1000000);

const convertMediaType = (mediaType: CanisterMediaType): MediaType => {
  if ("ServiceImage" in mediaType) return "ServiceImage";
  if ("RemittancePaymentProof" in mediaType) return "RemittancePaymentProof";
  if ("UserProfile" in mediaType) return "UserProfile";
  if ("ServiceCertificate" in mediaType) return "ServiceCertificate";
  throw new Error("Unknown media type");
};

const convertToCanisterMediaType = (
  mediaType: MediaType,
): CanisterMediaType => {
  switch (mediaType) {
    case "ServiceImage":
      return { ServiceImage: null };
    case "RemittancePaymentProof":
      return { RemittancePaymentProof: null };
    case "UserProfile":
      return { UserProfile: null };
    case "ServiceCertificate":
      return { ServiceCertificate: null };
    default:
      throw new Error(`Unknown media type: ${mediaType}`);
  }
};

const convertMediaItem = (item: CanisterMediaItem): FrontendMediaItem => ({
  id: item.id,
  url: item.url,
  thumbnailUrl: item.thumbnailUrl[0],
  contentType: item.contentType,
  ownerId: item.ownerId.toString(),
  createdAt: convertTimeToDate(item.createdAt),
  fileName: item.fileName,
  filePath: item.filePath,
  fileSize: Number(item.fileSize),
  updatedAt: convertTimeToDate(item.updatedAt),
  mediaType: convertMediaType(item.mediaType),
});

const convertValidationSummary = (
  summary: CanisterMediaValidationSummary,
): FrontendMediaValidationSummary => ({
  sha256: summary.sha256[0],
  extractedTimestamp: summary.extracted_timestamp[0]
    ? convertTimeToDate(summary.extracted_timestamp[0])
    : undefined,
  sizeBytes: Number(summary.size_bytes),
  mimeType: summary.mime_type,
  hasTextContent: summary.has_text_content[0],
  mediaId: summary.media_id,
  isValidType: summary.is_valid_type,
  validationFlags: summary.validation_flags,
  isWithinSizeLimit: summary.is_within_size_limit,
  uploadedAt: convertTimeToDate(summary.uploaded_at),
});

// Helper function to handle canister results
const handleResult = <T, R>(
  result: { ok: T } | { err: string },
  converter?: (data: T) => R,
): R => {
  if ("err" in result) {
    throw new MediaServiceError({
      message: result.err,
      code: "CANISTER_ERROR",
    });
  }
  return converter ? converter(result.ok) : (result.ok as unknown as R);
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
    const actor = getMediaActor();
    const result = await actor.getRemittanceMediaItems(mediaIds);
    return handleResult(result, (items) => items.map(convertMediaItem));
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
    const actor = getMediaActor();
    const result = await actor.getMediaItem(mediaId);
    return handleResult(result, convertMediaItem);
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
    const actor = getMediaActor();
    const result = await actor.getFileData(mediaId);
    return handleResult(result, (data) => new Uint8Array(data));
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

    // Get file data from media canister
    console.log("getImageDataUrl - Getting media actor and calling getFileData");
    const actor = getMediaActor();
    const result = await actor.getFileData(mediaId);
    console.log("getImageDataUrl - getFileData result:", result);

    if ("err" in result) {
      console.warn("Failed to retrieve image data:", result.err);
      return opts.fallbackImageUrl;
    }

    // Get media item for content type
    console.log("getImageDataUrl - Getting media item for content type");
    const mediaItemResult = await actor.getMediaItem(mediaId);
    console.log("getImageDataUrl - getMediaItem result:", mediaItemResult);
    
    if ("err" in mediaItemResult) {
      console.warn("Failed to retrieve media item:", mediaItemResult.err);
      return opts.fallbackImageUrl;
    }

    // Convert Uint8Array to data URL
    console.log("getImageDataUrl - Converting to data URL");
    const uint8Array = new Uint8Array(result.ok);
    const contentType = mediaItemResult.ok.contentType;
    console.log("getImageDataUrl - Content type:", contentType, "Data length:", uint8Array.length);
    const dataUrl = await convertBlobToDataUrl(uint8Array, contentType);
    console.log("getImageDataUrl - Data URL generated, length:", dataUrl.length);

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
 * @param ownerId The owner's Principal
 * @returns Array of media items
 */
export const getMediaByOwner = async (
  ownerId: Principal,
): Promise<FrontendMediaItem[]> => {
  try {
    const actor = getMediaActor();
    const items = await actor.getMediaByOwner(ownerId);
    return items.map(convertMediaItem);
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
 * @param ownerId The owner's Principal
 * @param mediaType The media type to filter by
 * @returns Array of media items
 */
export const getMediaByTypeAndOwner = async (
  ownerId: Principal,
  mediaType: MediaType,
): Promise<FrontendMediaItem[]> => {
  try {
    const actor = getMediaActor();
    const canisterMediaType = convertToCanisterMediaType(mediaType);
    const items = await actor.getMediaByTypeAndOwner(
      ownerId,
      canisterMediaType,
    );
    return items.map(convertMediaItem);
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
    const actor = getMediaActor();
    const result = await actor.validateMediaItems(mediaIds);
    return handleResult(result, (summaries) =>
      summaries.map(convertValidationSummary),
    );
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
    const actor = getMediaActor();
    const canisterMediaType = convertToCanisterMediaType(mediaType);
    const result = await actor.uploadMedia(
      fileName,
      contentType,
      canisterMediaType,
      Array.from(fileData),
    );
    return handleResult(result, convertMediaItem);
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
    const actor = getMediaActor();
    const result = await actor.updateMediaMetadata(
      mediaId,
      newFileName ? [newFileName] : [],
    );
    return handleResult(result, convertMediaItem);
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
    const actor = getMediaActor();
    const result = await actor.deleteMedia(mediaId);
    return handleResult(result);
  } catch (error) {
    //console.error("Failed to delete media:", error);
    if (error instanceof MediaServiceError) throw error;
    throw new MediaServiceError({
      message: `Failed to delete media: ${error}`,
      context: "deleteMedia",
    });
  }
};

/**
 * Gets storage statistics for the media canister
 * @returns Storage statistics
 */
export const getStorageStats = async (): Promise<FrontendMediaStorageStats> => {
  try {
    const actor = getMediaActor();
    const stats = await actor.getStorageStats();

    const typeBreakdown: { [key: string]: number } = {};
    stats.typeBreakdown.forEach(([mediaType, count]) => {
      const key = convertMediaType(mediaType);
      typeBreakdown[key] = Number(count);
    });

    return {
      totalSize: Number(stats.totalSize),
      totalItems: Number(stats.totalItems),
      typeBreakdown,
      userCount: Number(stats.userCount),
    };
  } catch (error) {
    //console.error("Failed to get storage stats:", error);
    if (error instanceof MediaServiceError) throw error;
    throw new MediaServiceError({
      message: `Failed to get storage stats: ${error}`,
      context: "getStorageStats",
    });
  }
};

// Reset functions for authentication state changes
export const resetMediaActor = () => {
  mediaActor = null;
  currentIdentity = null;
};

export const refreshMediaActor = async () => {
  resetMediaActor();
  return getMediaActor();
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
