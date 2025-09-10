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
        process.env.DFX_NETWORK !== "ic" &&
        process.env.DFX_NETWORK !== "playground"
          ? "http://localhost:4943"
          : "https://ic0.app",
    },
  }) as MediaService;
};

// Singleton actor instance with identity tracking
let mediaActor: MediaService | null = null;
let currentIdentity: Identity | null = null;

/**
 * Updates the media actor with a new identity
 */
export const updateMediaActor = (identity: Identity | null) => {
  if (currentIdentity !== identity) {
    mediaActor = createMediaActor(identity);
    currentIdentity = identity;
  }
};

/**
 * Gets the current media actor
 */
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
    //console.error("Failed to get remittance media items:", error);
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
    //console.error("Failed to get media item:", error);
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
    //console.error("Failed to get file data:", error);
    if (error instanceof MediaServiceError) throw error;
    throw new MediaServiceError({
      message: `Failed to get file data: ${error}`,
      context: "getFileData",
    });
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
    //console.error("Failed to get media by owner:", error);
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
    //console.error("Failed to get media by type and owner:", error);
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
    //console.error("Failed to validate media items:", error);
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
    //console.error("Failed to upload media:", error);
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
    //console.error("Failed to update media metadata:", error);
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
};
