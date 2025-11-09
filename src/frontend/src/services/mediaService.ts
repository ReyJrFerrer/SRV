// Media Service for handling file uploads and conversions
import { authCanisterService } from "./authCanisterService";
import { serviceCanisterService } from "./serviceCanisterService";
import { httpsCallable } from "firebase/functions";
import { getFirebaseFunctions } from "./firebaseApp";

// Get Firebase Functions instance with correct region
const functions = getFirebaseFunctions();

export interface ImageUploadOptions {
  maxSizeKB?: number;
  allowedTypes?: string[];
  maxWidth?: number;
  maxHeight?: number;
}

export interface ImageRetrievalOptions {
  enableCache?: boolean;
  fallbackImageUrl?: string;
}

const DEFAULT_OPTIONS: Required<ImageUploadOptions> = {
  maxSizeKB: 450, // 450KB limit as defined in media canister
  allowedTypes: [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/bmp",
    "image/svg+xml",
    "application/pdf", // Add PDF support for certificates
  ],
  maxWidth: 1024,
  maxHeight: 1024,
};

const DEFAULT_RETRIEVAL_OPTIONS: Required<ImageRetrievalOptions> = {
  enableCache: true,
  fallbackImageUrl: "/default-avatar.png",
};

// Cache for storing converted data URLs
const imageCache = new Map<string, string>();

/**
 * Extracts media ID from a media URL
 */
export const extractMediaIdFromUrl = (url: string): string | null => {
  try {
    // Handle Firebase Storage emulator URLs: http://127.0.0.1:9199/v0/b/bucket/o/path?alt=media
    if (url.includes("127.0.0.1:9199") || url.includes("localhost:9199")) {
      const urlObj = new URL(url);
      const pathMatch = urlObj.pathname.match(/\/o\/(.+)$/);
      if (pathMatch) {
        const fullPath = decodeURIComponent(pathMatch[1]);
        const parts = fullPath.split("/");
        const filename = parts[parts.length - 1];
        const mediaId = filename.split("_")[0];
        return mediaId || null;
      }
    }

    // Handle Firebase Storage production URLs
    if (
      url.includes("storage.googleapis.com") ||
      url.includes("firebasestorage.googleapis.com")
    ) {
      const parts = url.split("/");
      const filename = parts[parts.length - 1].split("?")[0];
      const mediaId = filename.split("_")[0];
      return mediaId || null;
    }

    // Handle old format: /media/{mediaId} or media://{mediaId}
    if (url.startsWith("media://")) {
      return url.replace("media://", "").split("/").pop() || null;
    }

    if (url.startsWith("/media/")) {
      return url.replace("/media/", "").split("/").pop() || null;
    }

    return null;
  } catch (error) {
    return null;
  }
};

/**
 * Converts a media URL to a data URL for direct use in img tags
 * Now works with Firebase Storage URLs
 */
export const getImageDataUrl = async (
  mediaUrl: string,
  options: ImageRetrievalOptions = {},
): Promise<string> => {
  const opts = { ...DEFAULT_RETRIEVAL_OPTIONS, ...options };

  try {
    // Check cache first if enabled
    if (opts.enableCache && imageCache.has(mediaUrl)) {
      return imageCache.get(mediaUrl)!;
    }

    // For Firebase Storage URLs (both production and emulator), return directly
    if (
      mediaUrl.includes("storage.googleapis.com") ||
      mediaUrl.includes("127.0.0.1:9199") ||
      mediaUrl.includes("localhost:9199")
    ) {
      if (opts.enableCache) {
        imageCache.set(mediaUrl, mediaUrl);
      }
      return mediaUrl;
    }

    // For old format URLs, try to get from Cloud Function
    const mediaId = extractMediaIdFromUrl(mediaUrl);
    if (!mediaId) {
      //console.warn("Could not extract media ID from URL:", mediaUrl);
      return opts.fallbackImageUrl;
    }

    // Get file URL from Cloud Function
    const getFileDataFn = httpsCallable<
      { mediaId: string },
      { success: boolean; data: string }
    >(functions, "getFileData");

    const result = await getFileDataFn({ mediaId });

    if (!result.data.success) {
      //console.warn("Failed to retrieve image data from Cloud Function");
      return opts.fallbackImageUrl;
    }

    const url = result.data.data;

    // Cache the result if enabled
    if (opts.enableCache) {
      imageCache.set(mediaUrl, url);
    }

    return url;
  } catch (error) {
    //console.error("Error retrieving image data:", error);
    return opts.fallbackImageUrl;
  }
};

/**
 * Converts Uint8Array to data URL
 */
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

/**
 * Converts Uint8Array to base64 string
 */
export const uint8ArrayToBase64 = (uint8Array: Uint8Array): string => {
  let binary = "";
  const len = uint8Array.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binary);
};

/**
 * Preloads an image to ensure it's in cache
 */
export const preloadImage = async (mediaUrl: string): Promise<void> => {
  try {
    await getImageDataUrl(mediaUrl, { enableCache: true });
  } catch (error) {
    //console.warn("Failed to preload image:", mediaUrl, error);
  }
};

/**
 * Clears the image cache
 */
export const clearImageCache = (): void => {
  imageCache.clear();
};

/**
 * Gets cache size information
 */
export const getCacheInfo = (): { size: number; keys: string[] } => {
  return {
    size: imageCache.size,
    keys: Array.from(imageCache.keys()),
  };
};

/**
 * Validates an image file before upload
 */
export const validateImageFile = (
  file: File,
  options: ImageUploadOptions = {},
): string | null => {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Check file size
  // const fileSizeKB = file.size / 1024;
  // if (fileSizeKB > opts.maxSizeKB) {
  //   return `File size (${fileSizeKB.toFixed(1)}KB) exceeds maximum allowed size of ${opts.maxSizeKB}KB`;
  // }

  // Check file type
  if (!opts.allowedTypes.includes(file.type)) {
    return `File type ${file.type} is not supported. Allowed types: ${opts.allowedTypes.join(", ")}`;
  }

  return null; // Valid file
};

/**
 * Converts a File object to Uint8Array for canister upload
 */
export const fileToUint8Array = (file: File): Promise<Uint8Array> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      if (event.target?.result) {
        const arrayBuffer = event.target.result as ArrayBuffer;
        resolve(new Uint8Array(arrayBuffer));
      } else {
        reject(new Error("Failed to read file"));
      }
    };

    reader.onerror = () => {
      reject(new Error("Error reading file"));
    };

    reader.readAsArrayBuffer(file);
  });
};

/**
 * Resizes an image if it exceeds maximum dimensions
 */
export const resizeImage = (
  file: File,
  maxWidth: number = 1024,
  maxHeight: number = 1024,
  quality: number = 0.8,
): Promise<File> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    if (!ctx) {
      reject(new Error("Canvas context not available"));
      return;
    }

    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;

      if (width > maxWidth || height > maxHeight) {
        const aspectRatio = width / height;

        if (width > height) {
          width = maxWidth;
          height = width / aspectRatio;
        } else {
          height = maxHeight;
          width = height * aspectRatio;
        }
      }

      // Set canvas dimensions
      canvas.width = width;
      canvas.height = height;

      // Draw and compress image
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const resizedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });
            resolve(resizedFile);
          } else {
            reject(new Error("Failed to resize image"));
          }
        },
        file.type,
        quality,
      );
    };

    img.onerror = () => {
      reject(new Error("Failed to load image"));
    };

    img.src = URL.createObjectURL(file);
  });
};

/**
 * Batch process multiple files for service upload
 */
export const processServiceImageFiles = async (
  files: File[],
  options: ImageUploadOptions = {},
): Promise<
  { fileName: string; contentType: string; fileData: Uint8Array }[]
> => {
  try {
    if (files.length === 0) {
      return [];
    }

    if (files.length > 10) {
      throw new Error("Maximum 10 images allowed per service");
    }

    const opts = { ...DEFAULT_OPTIONS, ...options };
    const processedFiles: {
      fileName: string;
      contentType: string;
      fileData: Uint8Array;
    }[] = [];

    for (const file of files) {
      // Validate file type only (we'll handle size through scaling)
      if (!opts.allowedTypes.includes(file.type)) {
        throw new Error(
          `File ${file.name}: File type ${file.type} is not supported. Allowed types: ${opts.allowedTypes.join(", ")}`,
        );
      }

      let processedFile = file;
      const currentSizeKB = file.size / 1024;

      // Scale down if file exceeds size limit
      if (currentSizeKB > opts.maxSizeKB) {
        // //console.log(
        //   `Scaling ${file.name} from ${currentSizeKB.toFixed(1)}KB to ${opts.maxSizeKB}KB...`,
        // );
        processedFile = await intelligentScaleImageTo450KB(
          file,
          opts.maxSizeKB,
        );
        // //console.log(
        //   `Successfully scaled ${file.name} to ${(processedFile.size / 1024).toFixed(1)}KB`,
        // );
      }

      // Apply dimension limits if specified
      if (opts.maxWidth || opts.maxHeight) {
        processedFile = await resizeImage(
          processedFile,
          opts.maxWidth,
          opts.maxHeight,
        );

        // Check if resizing caused the file to exceed size limit again
        const resizedSizeKB = processedFile.size / 1024;
        if (resizedSizeKB > opts.maxSizeKB) {
          // //console.log(
          //   `File size after dimension resize: ${resizedSizeKB.toFixed(1)}KB. Scaling down again...`,
          // );
          processedFile = await intelligentScaleImageTo450KB(
            processedFile,
            opts.maxSizeKB,
          );
        }
      }

      // Convert to Uint8Array
      const fileData = await fileToUint8Array(processedFile);

      processedFiles.push({
        fileName: processedFile.name,
        contentType: processedFile.type,
        fileData,
      });
    }

    return processedFiles;
  } catch (error) {
    //console.error("Error processing service image files:", error);
    throw error;
  }
};

/**
 * Batch process multiple certificate files for service upload (supports PDFs and images)
 */
export const processServiceCertificateFiles = async (
  files: File[],
  options: ImageUploadOptions = {},
): Promise<
  { fileName: string; contentType: string; fileData: Uint8Array }[]
> => {
  try {
    if (files.length === 0) {
      return [];
    }

    if (files.length > 10) {
      throw new Error("Maximum 10 certificates allowed per service");
    }

    const opts = { ...DEFAULT_OPTIONS, ...options };
    const processedFiles: {
      fileName: string;
      contentType: string;
      fileData: Uint8Array;
    }[] = [];

    for (const file of files) {
      // Validate file type
      if (!opts.allowedTypes.includes(file.type)) {
        throw new Error(
          `File ${file.name}: File type ${file.type} is not supported. Allowed types: ${opts.allowedTypes.join(", ")}`,
        );
      }

      let processedFile = file;
      const currentSizeKB = file.size / 1024;

      // For PDFs, we don't resize/scale - just check size limit
      if (file.type === "application/pdf") {
        if (currentSizeKB > opts.maxSizeKB) {
          throw new Error(
            `PDF file ${file.name} size (${currentSizeKB.toFixed(1)}KB) exceeds maximum allowed size of ${opts.maxSizeKB}KB`,
          );
        }
      } else {
        // For image certificates, scale down if needed
        if (currentSizeKB > opts.maxSizeKB) {
          // //console.log(
          //   `Scaling certificate ${file.name} from ${currentSizeKB.toFixed(1)}KB to ${opts.maxSizeKB}KB...`,
          // );
          processedFile = await intelligentScaleImageTo450KB(
            file,
            opts.maxSizeKB,
          );
          // //console.log(
          //   `Successfully scaled certificate ${file.name} to ${(processedFile.size / 1024).toFixed(1)}KB`,
          // );
        }

        // Apply dimension limits for image certificates
        if (opts.maxWidth || opts.maxHeight) {
          processedFile = await resizeImage(
            processedFile,
            opts.maxWidth,
            opts.maxHeight,
          );

          // Check if resizing caused the file to exceed size limit again
          const resizedSizeKB = processedFile.size / 1024;
          if (resizedSizeKB > opts.maxSizeKB) {
            // //console.log(
            //   `Certificate size after dimension resize: ${resizedSizeKB.toFixed(1)}KB. Scaling down again...`,
            // );
            processedFile = await intelligentScaleImageTo450KB(
              processedFile,
              opts.maxSizeKB,
            );
          }
        }
      }

      // Convert to Uint8Array (same as images)
      const fileData = await fileToUint8Array(processedFile);

      processedFiles.push({
        fileName: processedFile.name,
        contentType: processedFile.type,
        fileData,
      });
    }

    return processedFiles;
  } catch (error) {
    //console.error("Error processing service certificate files:", error);
    throw error;
  }
};
/**
 * Scales down an image to meet the 450KB size limit through iterative resizing and quality adjustment
 */
export const scaleImageTo450KB = async (
  file: File,
  targetSizeKB: number = 450,
  maxIterations: number = 10,
): Promise<File> => {
  return new Promise(async (resolve, reject) => {
    try {
      // If already under limit, return original
      const currentSizeKB = file.size / 1024;
      if (currentSizeKB <= targetSizeKB) {
        resolve(file);
        return;
      }

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      if (!ctx) {
        reject(new Error("Canvas context not available"));
        return;
      }

      img.onload = async () => {
        let currentFile = file;
        let iterations = 0;

        // Initial dimensions and quality
        let scaleFactor = Math.sqrt(targetSizeKB / currentSizeKB); // Estimate initial scale
        let quality = 0.9;

        while (iterations < maxIterations) {
          // Calculate new dimensions
          const newWidth = Math.floor(img.width * scaleFactor);
          const newHeight = Math.floor(img.height * scaleFactor);

          // Set canvas dimensions
          canvas.width = newWidth;
          canvas.height = newHeight;

          // Clear and draw image
          ctx.clearRect(0, 0, newWidth, newHeight);
          ctx.drawImage(img, 0, 0, newWidth, newHeight);

          // Convert to blob with current quality
          const blob = await new Promise<Blob | null>((resolve) => {
            canvas.toBlob(resolve, file.type, quality);
          });

          if (!blob) {
            reject(new Error("Failed to create blob"));
            return;
          }

          const newFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now(),
          });

          const newSizeKB = newFile.size / 1024;

          // Check if we've reached the target
          if (newSizeKB <= targetSizeKB) {
            resolve(newFile);
            return;
          }

          // Adjust parameters for next iteration
          if (newSizeKB > targetSizeKB * 1.1) {
            // Still too big, reduce more aggressively
            scaleFactor *= 0.9;
            quality = Math.max(0.3, quality - 0.1);
          } else {
            // Close but still too big, fine-tune
            scaleFactor *= 0.95;
            quality = Math.max(0.3, quality - 0.05);
          }

          iterations++;
          currentFile = newFile;
        }

        // If we've exhausted iterations, return the last result
        // //console.warn(
        //   `Could not reach ${targetSizeKB}KB target after ${maxIterations} iterations. Final size: ${currentFile.size / 1024}KB`,
        // );
        resolve(currentFile);
      };

      img.onerror = () => {
        reject(new Error("Failed to load image"));
      };

      img.src = URL.createObjectURL(file);
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Enhanced version that tries different strategies based on image characteristics
 */
export const intelligentScaleImageTo450KB = async (
  file: File,
  targetSizeKB: number = 450,
): Promise<File> => {
  try {
    const currentSizeKB = file.size / 1024;

    if (currentSizeKB <= targetSizeKB) {
      return file;
    }

    // Strategy 1: If image is only slightly over, try quality reduction first
    if (currentSizeKB < targetSizeKB * 1.5) {
      const qualityReduced = await reduceImageQuality(file, targetSizeKB);
      if (qualityReduced.size / 1024 <= targetSizeKB) {
        return qualityReduced;
      }
    }

    // Strategy 2: If significantly over, use dimension + quality reduction
    return await scaleImageTo450KB(file, targetSizeKB);
  } catch (error) {
    //console.error("Error in intelligent scaling:", error);
    throw error;
  }
};

/**
 * Reduces image quality while maintaining dimensions
 */
const reduceImageQuality = async (
  file: File,
  targetSizeKB: number,
  maxIterations: number = 8,
): Promise<File> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    if (!ctx) {
      reject(new Error("Canvas context not available"));
      return;
    }

    img.onload = async () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      let quality = 0.9;
      let iterations = 0;

      while (iterations < maxIterations && quality > 0.1) {
        const blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob(resolve, file.type, quality);
        });

        if (!blob) {
          reject(new Error("Failed to create blob"));
          return;
        }

        const newFile = new File([blob], file.name, {
          type: file.type,
          lastModified: Date.now(),
        });

        if (newFile.size / 1024 <= targetSizeKB) {
          resolve(newFile);
          return;
        }

        quality -= 0.1;
        iterations++;
      }

      // Return the last attempt if we couldn't meet the target
      const finalBlob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, file.type, quality);
      });

      if (finalBlob) {
        resolve(
          new File([finalBlob], file.name, {
            type: file.type,
            lastModified: Date.now(),
          }),
        );
      } else {
        reject(new Error("Failed to reduce image quality"));
      }
    };

    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Enhanced upload profile picture with automatic descaling
 */
export const uploadProfilePictureWithDescaling = async (
  file: File,
  options: ImageUploadOptions = {},
): Promise<any> => {
  try {
    // First validate file type (but not size since we'll handle that)
    const opts = { ...DEFAULT_OPTIONS, ...options };

    if (!opts.allowedTypes.includes(file.type)) {
      throw new Error(
        `File type ${file.type} is not supported. Allowed types: ${opts.allowedTypes.join(", ")}`,
      );
    }

    // Scale down if needed
    let processedFile = file;
    const currentSizeKB = file.size / 1024;

    if (currentSizeKB > opts.maxSizeKB) {
      // //console.log(
      //   `Image size (${currentSizeKB.toFixed(1)}KB) exceeds limit. Scaling down to ${opts.maxSizeKB}KB...`,
      // );
      processedFile = await intelligentScaleImageTo450KB(file, opts.maxSizeKB);
      // //console.log(
      //   `Successfully scaled image to ${(processedFile.size / 1024).toFixed(1)}KB`,
      // );
    }

    // Apply dimension limits if specified
    if (opts.maxWidth || opts.maxHeight) {
      processedFile = await resizeImage(
        processedFile,
        opts.maxWidth,
        opts.maxHeight,
      );
    }

    // Convert to Uint8Array
    const fileData = await fileToUint8Array(processedFile);

    // Upload via auth canister
    const result = await authCanisterService.uploadProfilePicture(
      processedFile.name,
      processedFile.type,
      fileData,
    );

    return result;
  } catch (error) {
    //console.error("Error uploading profile picture with descaling:", error);
    throw error;
  }
};

/**
 * Enhanced service image upload with automatic descaling
 */
export const uploadServiceImagesWithDescaling = async (
  serviceId: string,
  files: File[],
  options: ImageUploadOptions = {},
): Promise<any> => {
  try {
    if (files.length === 0) {
      throw new Error("No files provided for upload");
    }

    if (files.length > 10) {
      throw new Error("Maximum 10 images allowed per service");
    }

    const opts = { ...DEFAULT_OPTIONS, ...options };
    const processedFiles: {
      fileName: string;
      contentType: string;
      fileData: string;
    }[] = [];

    for (const file of files) {
      // Validate file type
      if (!opts.allowedTypes.includes(file.type)) {
        throw new Error(
          `File ${file.name}: File type ${file.type} is not supported`,
        );
      }

      // Scale down if needed
      let processedFile = file;
      const currentSizeKB = file.size / 1024;

      if (currentSizeKB > opts.maxSizeKB) {
        // //console.log(
        //   `Scaling ${file.name} from ${currentSizeKB.toFixed(1)}KB to ${opts.maxSizeKB}KB...`,
        // );
        processedFile = await intelligentScaleImageTo450KB(
          file,
          opts.maxSizeKB,
        );
        // //console.log(
        //   `Successfully scaled ${file.name} to ${(processedFile.size / 1024).toFixed(1)}KB`,
        // );
      }

      // Apply dimension limits
      if (opts.maxWidth || opts.maxHeight) {
        processedFile = await resizeImage(
          processedFile,
          opts.maxWidth,
          opts.maxHeight,
        );
      }

      // Convert to Uint8Array then to base64
      const fileData = await fileToUint8Array(processedFile);
      const base64Data = uint8ArrayToBase64(fileData);

      processedFiles.push({
        fileName: processedFile.name,
        contentType: processedFile.type,
        fileData: base64Data,
      });
    }

    // Upload via service canister
    const result = await serviceCanisterService.uploadServiceImages(
      serviceId,
      processedFiles,
    );

    return result;
  } catch (error) {
    console.error("Error uploading service images with descaling:", error);
    throw error;
  }
};

/**
 * Enhanced service certificate upload with automatic processing
 */
export const uploadServiceCertificatesWithProcessing = async (
  serviceId: string,
  files: File[],
  options: ImageUploadOptions = {},
): Promise<any> => {
  try {
    if (files.length === 0) {
      throw new Error("No files provided for upload");
    }

    if (files.length > 10) {
      throw new Error("Maximum 10 certificates allowed per service");
    }

    const processedFiles = await processServiceCertificateFiles(files, options);

    // Convert Uint8Array to base64 for Firebase upload
    const base64Files = processedFiles.map((file) => ({
      fileName: file.fileName,
      contentType: file.contentType,
      fileData: uint8ArrayToBase64(file.fileData),
    }));

    // Upload via service canister
    const result = await serviceCanisterService.uploadServiceCertificates(
      serviceId,
      base64Files,
    );

    return result;
  } catch (error) {
    console.error("Error uploading service certificates:", error);
    throw error;
  }
};

/**
 * Upload report attachments with automatic processing
 * Supports images only for report screenshots
 */
export const uploadReportAttachments = async (
  files: File[],
  options: ImageUploadOptions = {},
): Promise<string[]> => {
  try {
    if (files.length === 0) {
      throw new Error("No files to upload");
    }

    if (files.length > 5) {
      throw new Error("Maximum 5 attachments allowed per report");
    }

    const opts = { ...DEFAULT_OPTIONS, ...options };
    const uploadMediaFn = httpsCallable<
      {
        fileName: string;
        contentType: string;
        mediaType: string;
        fileData: string;
      },
      { success: boolean; data: { url: string } }
    >(functions, "uploadMedia");

    const uploadedUrls: string[] = [];

    for (const file of files) {
      // Validate file type
      if (!opts.allowedTypes.includes(file.type)) {
        throw new Error(
          `File type ${file.type} is not supported. Only images are allowed for report attachments.`,
        );
      }

      // Preserve original filename
      const originalFileName = file.name;
      const originalContentType = file.type;

      // Process file - scale down if needed
      let processedFile = file;
      const currentSizeKB = file.size / 1024;

      if (currentSizeKB > opts.maxSizeKB) {
        console.log(
          `Scaling down report attachment from ${currentSizeKB.toFixed(1)}KB to meet ${opts.maxSizeKB}KB limit`,
        );
        processedFile = await intelligentScaleImageTo450KB(
          file,
          opts.maxSizeKB,
        );
      }

      // Apply dimension limits if specified
      if (opts.maxWidth || opts.maxHeight) {
        processedFile = await resizeImage(
          processedFile,
          opts.maxWidth,
          opts.maxHeight,
        );
      }

      // Convert to base64
      const fileData = await fileToUint8Array(processedFile);
      const base64Data = uint8ArrayToBase64(fileData);

      // Log what we're about to send
      console.log("📤 Uploading report attachment:", {
        fileName: originalFileName,
        contentType: originalContentType,
        mediaType: "ReportAttachment",
        fileDataLength: base64Data.length,
      });

      // Upload via media canister (Cloud Function) - use original filename
      const result = await uploadMediaFn({
        fileName: originalFileName,
        contentType: originalContentType,
        mediaType: "ReportAttachment",
        fileData: base64Data,
      });

      console.log("✅ Upload result:", result);

      if (result.data.success && result.data.data.url) {
        uploadedUrls.push(result.data.data.url);
      } else {
        throw new Error("Failed to upload report attachment");
      }
    }

    return uploadedUrls;
  } catch (error) {
    console.error("Error uploading report attachments:", error);
    throw error;
  }
};

export const mediaService = {
  // File validation and processing
  validateImageFile,
  fileToUint8Array,
  resizeImage,
  processServiceImageFiles,
  processServiceCertificateFiles,

  // Upload functionality
  uploadProfilePictureWithDescaling,
  uploadServiceImagesWithDescaling,
  uploadServiceCertificatesWithProcessing,
  uploadReportAttachments,

  // Image retrieval functionality
  getImageDataUrl,
  extractMediaIdFromUrl,
  convertBlobToDataUrl,
  preloadImage,

  // Cache management
  clearImageCache,
  getCacheInfo,

  /**
   * Remove profile picture
   */
  async removeProfilePicture() {
    try {
      return await authCanisterService.removeProfilePicture();
    } catch (error) {
      //console.error("Error removing profile picture:", error);
      throw error;
    }
  },

  /**
   * Delete service images
   */
  async deleteServiceImages(serviceId: string, imageUrls: string[]) {
    try {
      // Note: removeServiceImage removes one image at a time
      const results = [];
      for (const imageUrl of imageUrls) {
        const result = await serviceCanisterService.removeServiceImage(
          serviceId,
          imageUrl,
        );
        results.push(result);
      }
      return results;
    } catch (error) {
      //console.error("Error deleting service images:", error);
      throw error;
    }
  },

  /**
   * Update service image order
   */
  async updateServiceImageOrder(serviceId: string, orderedImageUrls: string[]) {
    try {
      return await serviceCanisterService.reorderServiceImages(
        serviceId,
        orderedImageUrls,
      );
    } catch (error) {
      //console.error("Error updating service image order:", error);
      throw error;
    }
  },

  /**
   * Delete service certificates
   */
  async deleteServiceCertificates(
    serviceId: string,
    certificateUrls: string[],
  ) {
    try {
      // Note: removeServiceCertificate removes one certificate at a time
      const results = [];
      for (const certificateUrl of certificateUrls) {
        const result = await serviceCanisterService.removeServiceCertificate(
          serviceId,
          certificateUrl,
        );
        results.push(result);
      }
      return results;
    } catch (error) {
      //console.error("Error deleting service certificates:", error);
      throw error;
    }
  },

  /**
   * Verify service manually
   */
  async verifyService(serviceId: string, isVerified: boolean) {
    try {
      return await serviceCanisterService.verifyService(serviceId, isVerified);
    } catch (error) {
      //console.error("Error verifying service:", error);
      throw error;
    }
  },

  /**
   * Validate certificate file (PDF or image)
   */
  validateCertificateFile(
    file: File,
    options: ImageUploadOptions = {},
  ): string | null {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    // Check file type
    if (!opts.allowedTypes.includes(file.type)) {
      return `File type ${file.type} is not supported. Allowed types: ${opts.allowedTypes.join(", ")}`;
    }

    // Check file size for PDFs (we don't resize them)
    if (file.type === "application/pdf") {
      const fileSizeKB = file.size / 1024;
      if (fileSizeKB > opts.maxSizeKB) {
        return `PDF file size (${fileSizeKB.toFixed(1)}KB) exceeds maximum allowed size of ${opts.maxSizeKB}KB`;
      }
    }

    return null; // Valid file
  },

  /**
   * Get media item details including validation status
   */
  async getMediaItemDetails(url: string): Promise<{
    url: string;
    validationStatus?: "Pending" | "Validated" | "Rejected";
    error: string | null;
  }> {
    try {
      // Extract media ID from URL
      const mediaId = extractMediaIdFromUrl(url);
      if (!mediaId) {
        return { url, error: "Invalid media URL format" };
      }

      // Get media item from Cloud Function
      const getMediaItemFn = httpsCallable<
        { mediaId: string },
        { success: boolean; data: any }
      >(functions, "getMediaItem");

      const result = await getMediaItemFn({ mediaId });

      if (result.data.success) {
        const mediaItem = result.data.data;

        return {
          url,
          validationStatus: mediaItem.validationStatus,
          error: null,
        };
      } else {
        return { url, error: "Failed to get media item" };
      }
    } catch (error) {
      return {
        url,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get media details",
      };
    }
  },
};

export default mediaService;
