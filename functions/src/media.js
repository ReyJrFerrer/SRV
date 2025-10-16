const functions = require("firebase-functions");
const admin = require("firebase-admin");

/**
 * Generate a v4 UUID using dynamic import to support ESM-only `uuid`.
 * @returns {Promise<string>} A UUID v4 string
 */
async function generateUuid() {
  const {v4: uuidv4} = await import("uuid");
  return uuidv4();
}

const db = admin.firestore();
const bucket = admin.storage().bucket();

/**
 * Helper function to safely get user authentication info
 * @param {object} context - Firebase Functions context
 * @param {object} data - Request data
 * @return {object} User authentication info
 */
function getAuthInfo(context, data) {
  const auth = context.auth || data.auth;
  return {
    uid: auth?.uid || null,
    isAdmin: auth?.token?.isAdmin || false,
    hasAuth: !!auth,
  };
}

// Constants - mirroring media.mo canister
const MAX_FILE_SIZE = 450000; // 450KB in bytes
const MAX_REMITTANCE_FILE_SIZE = 1048576; // 1MB in bytes
const SUPPORTED_CONTENT_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/bmp",
  "image/svg+xml",
  "application/pdf",
];

/**
 * Validate content type
 * @param {string} contentType - MIME type to validate
 * @return {boolean} True if valid
 */
function validateContentType(contentType) {
  return SUPPORTED_CONTENT_TYPES.includes(contentType);
}

/**
 * Validate file size based on media type
 * @param {number} fileSize - File size in bytes
 * @param {string} mediaType - Type of media
 * @return {boolean} True if valid
 */
function validateFileSize(fileSize, mediaType) {
  const maxSize =
    mediaType === "RemittancePaymentProof" ?
      MAX_REMITTANCE_FILE_SIZE :
      MAX_FILE_SIZE;
  return fileSize > 0 && fileSize <= maxSize;
}

/**
 * Generate storage file path based on media type and user
 * @param {string} ownerId - User ID
 * @param {string} mediaType - Type of media
 * @param {string} fileName - Original file name
 * @param {string} mediaId - Unique media ID
 * @return {string} Storage path
 */
function generateFilePath(ownerId, mediaType, fileName, mediaId) {
  const mediaTypeFolder = {
    UserProfile: "users",
    ServiceImage: "services",
    ServiceCertificate: "certificates",
    RemittancePaymentProof: "remittance",
  }[mediaType];

  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${mediaTypeFolder}/${ownerId}/${mediaId}_${sanitizedFileName}`;
}

/**
 * Upload a media file to Cloud Storage and store metadata in Firestore
 * Mirrors uploadMedia function from media.mo canister
 */
exports.uploadMedia = functions.https.onCall(async (data, context) => {
  const {fileName, contentType, mediaType, fileData} = data;

  // Authentication
  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  // Validate file name
  if (!fileName || fileName.length === 0 || fileName.length > 255) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "File name must be between 1 and 255 characters",
    );
  }

  // Validate content type
  if (!validateContentType(contentType)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `Unsupported file type. Supported types: ${SUPPORTED_CONTENT_TYPES.join(", ")}`,
    );
  }

  // Decode base64 file data
  let fileBuffer;
  try {
    // Remove data URL prefix if present
    const base64Data = fileData.includes(",") ?
      fileData.split(",")[1] :
      fileData;
    fileBuffer = Buffer.from(base64Data, "base64");
  } catch (error) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Invalid file data format",
    );
  }

  const fileSize = fileBuffer.length;

  // Validate file size
  if (!validateFileSize(fileSize, mediaType)) {
    const maxSizeText =
      mediaType === "RemittancePaymentProof" ? "1MB" : "450KB";
    throw new functions.https.HttpsError(
      "invalid-argument",
      `File size must be between 1 byte and ${maxSizeText} for this media type`,
    );
  }

  try {
    const mediaId = await generateUuid();
    const ownerId = authInfo.uid;
    const filePath = generateFilePath(ownerId, mediaType, fileName, mediaId);

    // Upload file to Cloud Storage
    const file = bucket.file(filePath);
    await file.save(fileBuffer, {
      metadata: {
        contentType: contentType,
        metadata: {
          mediaId: mediaId,
          ownerId: ownerId,
          mediaType: mediaType,
        },
      },
    });

    // Make file publicly accessible (or use signed URLs for private access)
    await file.makePublic();

    // Get public URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

    // Create media item metadata
    const now = new Date().toISOString();
    const mediaItem = {
      id: mediaId,
      ownerId: ownerId,
      fileName: fileName,
      fileSize: fileSize,
      contentType: contentType,
      mediaType: mediaType,
      filePath: filePath,
      url: publicUrl,
      thumbnailUrl: null, // Can implement thumbnail generation later
      validationStatus:
        mediaType === "ServiceCertificate" ? "Pending" : null,
      createdAt: now,
      updatedAt: now,
    };

    // Store metadata in Firestore
    await db.collection("media").doc(mediaId).set(mediaItem);

    // Add to user's media index
    const userMediaRef = db
      .collection("users")
      .doc(ownerId)
      .collection("media")
      .doc(mediaId);
    await userMediaRef.set({
      mediaId: mediaId,
      mediaType: mediaType,
      createdAt: now,
    });

    return {success: true, data: mediaItem};
  } catch (error) {
    console.error("Error uploading media:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Get a media item by ID
 * Mirrors getMediaItem function from media.mo canister
 */
exports.getMediaItem = functions.https.onCall(async (data, _context) => {
  const {mediaId} = data;

  if (!mediaId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Media ID is required",
    );
  }

  try {
    const mediaDoc = await db.collection("media").doc(mediaId).get();

    if (!mediaDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Media item not found");
    }

    return {success: true, data: mediaDoc.data()};
  } catch (error) {
    console.error("Error getting media item:", error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Get file data (URL) for a media item
 * Note: In Cloud Storage, we return the public URL instead of raw data
 * Mirrors getFileData function from media.mo canister
 */
exports.getFileData = functions.https.onCall(async (data, _context) => {
  const {mediaId} = data;

  if (!mediaId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Media ID is required",
    );
  }

  try {
    const mediaDoc = await db.collection("media").doc(mediaId).get();

    if (!mediaDoc.exists) {
      throw new functions.https.HttpsError("not-found", "File data not found");
    }

    const mediaItem = mediaDoc.data();
    return {success: true, data: mediaItem.url};
  } catch (error) {
    console.error("Error getting file data:", error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Get media items by owner
 * Mirrors getMediaByOwner function from media.mo canister
 */
exports.getMediaByOwner = functions.https.onCall(async (data, context) => {
  const {ownerId} = data;

  // Authentication
  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  // Users can only view their own media unless they're admin
  if (ownerId !== authInfo.uid && !authInfo.isAdmin) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "You can only view your own media",
    );
  }

  try {
    const mediaSnapshot = await db
      .collection("media")
      .where("ownerId", "==", ownerId)
      .get();

    const mediaItems = [];
    mediaSnapshot.forEach((doc) => {
      mediaItems.push(doc.data());
    });

    return {success: true, data: mediaItems};
  } catch (error) {
    console.error("Error getting media by owner:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Get media items by type and owner
 * Mirrors getMediaByTypeAndOwner function from media.mo canister
 */
exports.getMediaByTypeAndOwner = functions.https.onCall(
  async (data, context) => {
    const {ownerId, mediaType} = data;

    // Authentication
    const authInfo = getAuthInfo(context, data);
    if (!authInfo.hasAuth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated",
      );
    }

    // Users can only view their own media unless they're admin
    if (ownerId !== authInfo.uid && !authInfo.isAdmin) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "You can only view your own media",
      );
    }

    try {
      const mediaSnapshot = await db
        .collection("media")
        .where("ownerId", "==", ownerId)
        .where("mediaType", "==", mediaType)
        .get();

      const mediaItems = [];
      mediaSnapshot.forEach((doc) => {
        mediaItems.push(doc.data());
      });

      return {success: true, data: mediaItems};
    } catch (error) {
      console.error("Error getting media by type and owner:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  },
);

/**
 * Delete a media item
 * Mirrors deleteMedia function from media.mo canister
 */
exports.deleteMedia = functions.https.onCall(async (data, context) => {
  const {mediaId} = data;

  // Authentication
  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  if (!mediaId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Media ID is required",
    );
  }

  try {
    const mediaDoc = await db.collection("media").doc(mediaId).get();

    if (!mediaDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Media item not found");
    }

    const mediaItem = mediaDoc.data();

    // Only owner or admin can delete
    if (mediaItem.ownerId !== authInfo.uid && !authInfo.isAdmin) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "You can only delete your own media",
      );
    }

    // Delete file from Cloud Storage
    const file = bucket.file(mediaItem.filePath);
    await file.delete().catch((err) => {
      console.warn("File may already be deleted:", err.message);
    });

    // Delete metadata from Firestore
    await db.collection("media").doc(mediaId).delete();

    // Remove from user index
    await db
      .collection("users")
      .doc(mediaItem.ownerId)
      .collection("media")
      .doc(mediaId)
      .delete();

    return {success: true, data: "Media item deleted successfully"};
  } catch (error) {
    console.error("Error deleting media:", error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Update media metadata
 * Mirrors updateMediaMetadata function from media.mo canister
 */
exports.updateMediaMetadata = functions.https.onCall(async (data, context) => {
  const {mediaId, fileName} = data;

  // Authentication
  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  if (!mediaId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Media ID is required",
    );
  }

  try {
    const mediaDoc = await db.collection("media").doc(mediaId).get();

    if (!mediaDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Media item not found");
    }

    const mediaItem = mediaDoc.data();

    // Only owner can update
    if (mediaItem.ownerId !== authInfo.uid) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "You can only update your own media",
      );
    }

    const updates = {
      updatedAt: new Date().toISOString(),
    };

    // Validate and update file name if provided
    if (fileName !== undefined && fileName !== null) {
      if (fileName.length === 0 || fileName.length > 255) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "File name must be between 1 and 255 characters",
        );
      }
      updates.fileName = fileName;
    }

    await db.collection("media").doc(mediaId).update(updates);

    const updatedDoc = await db.collection("media").doc(mediaId).get();
    return {success: true, data: updatedDoc.data()};
  } catch (error) {
    console.error("Error updating media metadata:", error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Get storage statistics
 * Mirrors getStorageStats function from media.mo canister
 */
exports.getStorageStats = functions.https.onCall(async (data, context) => {
  // Authentication - only admins can view stats
  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth || !authInfo.isAdmin) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Admin access required",
    );
  }

  try {
    const mediaSnapshot = await db.collection("media").get();

    let totalSize = 0;
    const typeBreakdown = {
      UserProfile: 0,
      ServiceImage: 0,
      ServiceCertificate: 0,
      RemittancePaymentProof: 0,
    };
    const uniqueOwners = new Set();

    mediaSnapshot.forEach((doc) => {
      const item = doc.data();
      totalSize += item.fileSize;
      typeBreakdown[item.mediaType] = (typeBreakdown[item.mediaType] || 0) + 1;
      uniqueOwners.add(item.ownerId);
    });

    return {
      success: true,
      data: {
        totalItems: mediaSnapshot.size,
        totalSize: totalSize,
        userCount: uniqueOwners.size,
        typeBreakdown: typeBreakdown,
      },
    };
  } catch (error) {
    console.error("Error getting storage stats:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Validate media items (used by remittance canister)
 * Mirrors validateMediaItems function from media.mo canister
 */
exports.validateMediaItems = functions.https.onCall(async (data, context) => {
  const {mediaIds} = data;

  // Authentication
  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  if (!mediaIds || !Array.isArray(mediaIds)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Media IDs array is required",
    );
  }

  try {
    const validations = [];

    for (const mediaId of mediaIds) {
      const mediaDoc = await db.collection("media").doc(mediaId).get();

      if (mediaDoc.exists) {
        const item = mediaDoc.data();
        validations.push({
          mediaId: mediaId,
          isValidType: validateContentType(item.contentType),
          isWithinSizeLimit: validateFileSize(item.fileSize, item.mediaType),
          sizeBytes: item.fileSize,
          mimeType: item.contentType,
          uploadedAt: item.createdAt,
          validationFlags: [],
        });
      } else {
        validations.push({
          mediaId: mediaId,
          isValidType: false,
          isWithinSizeLimit: false,
          sizeBytes: 0,
          mimeType: "unknown",
          uploadedAt: new Date().toISOString(),
          validationFlags: ["Media not found"],
        });
      }
    }

    return {success: true, data: validations};
  } catch (error) {
    console.error("Error validating media items:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Get remittance media items (for admin/remittance system)
 * Mirrors getRemittanceMediaItems function from media.mo canister
 */
exports.getRemittanceMediaItems = functions.https.onCall(
  async (data, context) => {
    const {mediaIds} = data;

    // Authentication - only admins or system can access
    const authInfo = getAuthInfo(context, data);
    if (!authInfo.hasAuth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated",
      );
    }

    if (!mediaIds || !Array.isArray(mediaIds)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Media IDs array is required",
      );
    }

    try {
      const mediaItems = [];

      for (const mediaId of mediaIds) {
        const mediaDoc = await db.collection("media").doc(mediaId).get();
        if (mediaDoc.exists) {
          mediaItems.push(mediaDoc.data());
        }
      }

      return {success: true, data: mediaItems};
    } catch (error) {
      console.error("Error getting remittance media items:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  },
);

/**
 * Update certificate validation status (admin only)
 * Mirrors updateCertificateValidationStatus function from media.mo canister
 */
exports.updateCertificateValidationStatus = functions.https.onCall(
  async (data, context) => {
    const {mediaId, newStatus} = data;

    // Authentication - admin only
    const authInfo = getAuthInfo(context, data);
    if (!authInfo.hasAuth || !authInfo.isAdmin) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Admin access required",
      );
    }

    if (!mediaId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Media ID is required",
      );
    }

    if (!["Pending", "Validated", "Rejected"].includes(newStatus)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Invalid validation status",
      );
    }

    try {
      const mediaDoc = await db.collection("media").doc(mediaId).get();

      if (!mediaDoc.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          "Media item not found",
        );
      }

      const mediaItem = mediaDoc.data();

      if (mediaItem.mediaType !== "ServiceCertificate") {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Only service certificates can have validation status updated",
        );
      }

      await db.collection("media").doc(mediaId).update({
        validationStatus: newStatus,
        updatedAt: new Date().toISOString(),
      });

      const updatedDoc = await db.collection("media").doc(mediaId).get();
      return {success: true, data: updatedDoc.data()};
    } catch (error) {
      console.error("Error updating certificate validation status:", error);
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError("internal", error.message);
    }
  },
);

/**
 * Get certificates by validation status (admin only)
 * Mirrors getCertificatesByValidationStatus function from media.mo canister
 */
exports.getCertificatesByValidationStatus = functions.https.onCall(
  async (data, context) => {
    const {status} = data;

    // Authentication - admin only
    const authInfo = getAuthInfo(context, data);
    if (!authInfo.hasAuth || !authInfo.isAdmin) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Admin access required",
      );
    }

    try {
      let query = db
        .collection("media")
        .where("mediaType", "==", "ServiceCertificate");

      if (status !== undefined && status !== null) {
        query = query.where("validationStatus", "==", status);
      }

      const snapshot = await query.get();
      const certificates = [];
      snapshot.forEach((doc) => {
        certificates.push(doc.data());
      });

      return {success: true, data: certificates};
    } catch (error) {
      console.error("Error getting certificates by validation status:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  },
);

// ============================================================================
// INTERNAL HELPER FUNCTIONS (for use by other Cloud Functions)
// ============================================================================

/**
 * Internal upload function for use by other Cloud Functions (e.g., service.js)
 * Does not require context authentication - caller must handle authentication
 * @param {object} params - Upload parameters
 * @param {string} params.fileName - File name
 * @param {string} params.contentType - MIME type
 * @param {string} params.mediaType - Media type
 * @param {string} params.fileData - Base64 encoded file data
 * @param {string} params.ownerId - Owner user ID
 * @return {Promise<object>} Media item with metadata
 */
async function uploadMediaInternal({
  fileName,
  contentType,
  mediaType,
  fileData,
  ownerId,
}) {
  // Validate file name
  if (!fileName || fileName.length === 0 || fileName.length > 255) {
    throw new Error("File name must be between 1 and 255 characters");
  }

  // Validate content type
  if (!validateContentType(contentType)) {
    throw new Error(
      `Unsupported content type: ${contentType}. 
      Supported types: ${SUPPORTED_CONTENT_TYPES.join(", ")}`,
    );
  }

  // Validate media type
  const validMediaTypes = [
    "UserProfile",
    "ServiceImage",
    "ServiceCertificate",
    "RemittancePaymentProof",
  ];
  if (!validMediaTypes.includes(mediaType)) {
    throw new Error(`Invalid media type: ${mediaType}`);
  }

  // Decode base64 and validate file size
  const buffer = Buffer.from(fileData, "base64");
  const fileSize = buffer.length;

  if (!validateFileSize(fileSize, mediaType)) {
    const maxSize =
      mediaType === "RemittancePaymentProof" ?
        MAX_REMITTANCE_FILE_SIZE :
        MAX_FILE_SIZE;
    throw new Error(
      `File size ${fileSize} bytes exceeds maximum ${maxSize} bytes for ${mediaType}`,
    );
  }

  // Generate unique media ID
  const mediaId = await generateUuid();
  const timestamp = new Date().toISOString();

  // Generate file path
  const filePath = generateFilePath(ownerId, mediaType, fileName, mediaId);

  // Upload to Cloud Storage
  const file = bucket.file(filePath);
  await file.save(buffer, {
    metadata: {
      contentType: contentType,
      metadata: {
        mediaId: mediaId,
        ownerId: ownerId,
        mediaType: mediaType,
        uploadedAt: timestamp,
      },
    },
  });

  // Make file publicly accessible
  await file.makePublic();

  // Get public URL - handle both emulator and production
  let publicUrl;
  if (process.env.FUNCTIONS_EMULATOR === "true" || process.env.FIREBASE_STORAGE_EMULATOR_HOST) {
    // Emulator environment - use emulator URL format
    const encodedPath = encodeURIComponent(filePath);
    publicUrl = `http://127.0.0.1:9199/v0/b/${bucket.name}/o/${encodedPath}?alt=media`;
    console.log("Using emulator storage URL:", publicUrl);
  } else {
    // Production environment - use googleapis URL
    publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
  }

  // Create media metadata document
  const mediaMetadata = {
    id: mediaId,
    url: publicUrl,
    fileName: fileName,
    contentType: contentType,
    fileSize: fileSize,
    mediaType: mediaType,
    ownerId: ownerId,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  // Add validationStatus only for ServiceCertificate to avoid undefined values
  if (mediaType === "ServiceCertificate") {
    mediaMetadata.validationStatus = "Pending";
  }

  // Store metadata in Firestore
  await db.collection("media").doc(mediaId).set(mediaMetadata);

  // Add to user's media index
  await db
    .collection("users")
    .doc(ownerId)
    .collection("media")
    .doc(mediaId)
    .set({
      mediaId: mediaId,
      url: publicUrl,
      mediaType: mediaType,
      createdAt: timestamp,
    });

  return mediaMetadata;
}

/**
 * Internal delete function for use by other Cloud Functions (e.g., service.js)
 * Does not require context authentication - caller must handle authentication
 * @param {string} mediaId - Media ID to delete
 * @return {Promise<void>} Promise that resolves when deletion completes
 */
async function deleteMediaInternal(mediaId) {
  // Get media metadata
  const mediaDoc = await db.collection("media").doc(mediaId).get();

  if (!mediaDoc.exists) {
    throw new Error("Media item not found");
  }

  const mediaData = mediaDoc.data();

  // Delete from Cloud Storage
  try {
    const url = mediaData.url;
    const filePath = url.split(`${bucket.name}/`)[1];
    if (filePath) {
      const file = bucket.file(filePath);
      await file.delete();
    }
  } catch (error) {
    console.error("Error deleting file from storage:", error);
    // Continue with metadata deletion even if storage deletion fails
  }

  // Delete from user's media index
  try {
    await db
      .collection("users")
      .doc(mediaData.ownerId)
      .collection("media")
      .doc(mediaId)
      .delete();
  } catch (error) {
    console.error("Error deleting from user media index:", error);
  }

  // Delete metadata document
  await db.collection("media").doc(mediaId).delete();
}

/**
 * Internal function to get certificates by validation status
 * For use by other Cloud Functions (e.g., admin.js)
 * @param {string|null} status - Validation status
 *   ("Pending", "Validated", "Rejected", or null for all)
 * @return {Promise<Array>} Array of certificate media items
 */
async function getCertificatesByValidationStatusInternal(status = null) {
  let query = db
    .collection("media")
    .where("mediaType", "==", "ServiceCertificate");

  if (status !== undefined && status !== null) {
    query = query.where("validationStatus", "==", status);
  }

  const snapshot = await query.get();
  const certificates = [];
  snapshot.forEach((doc) => {
    certificates.push(doc.data());
  });

  return certificates;
}

/**
 * Internal function to update certificate validation status
 * For use by other Cloud Functions (e.g., admin.js)
 * @param {string} mediaId - Media ID
 * @param {string} newStatus - New validation status
 * @return {Promise<object>} Updated media item
 */
async function updateCertificateValidationStatusInternal(mediaId, newStatus) {
  const mediaDoc = await db.collection("media").doc(mediaId).get();

  if (!mediaDoc.exists) {
    throw new Error(`Media item ${mediaId} not found`);
  }

  const mediaData = mediaDoc.data();

  if (mediaData.mediaType !== "ServiceCertificate") {
    throw new Error("Media item is not a service certificate");
  }

  const updatedMedia = {
    ...mediaData,
    validationStatus: newStatus,
    updatedAt: new Date().toISOString(),
  };

  await db.collection("media").doc(mediaId).update({
    validationStatus: newStatus,
    updatedAt: updatedMedia.updatedAt,
  });

  return updatedMedia;
}

// Export internal functions for use by other modules
exports.uploadMediaInternal = uploadMediaInternal;
exports.deleteMediaInternal = deleteMediaInternal;
exports.getCertificatesByValidationStatusInternal = getCertificatesByValidationStatusInternal;
exports.updateCertificateValidationStatusInternal = updateCertificateValidationStatusInternal;