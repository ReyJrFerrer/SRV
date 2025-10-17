const functions = require("firebase-functions");
const admin = require("firebase-admin");

const db = admin.firestore();

// Import media upload functions for consistent media handling
const {
  uploadMediaInternal,
  deleteMediaInternal,
} = require("./media");

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

// Constants
const MIN_TITLE_LENGTH = 1;
const MAX_TITLE_LENGTH = 100;
const MIN_DESCRIPTION_LENGTH = 1;
const MAX_DESCRIPTION_LENGTH = 1000;
const MIN_PRICE = 1;
const MAX_PRICE = 1000000;
const MAX_SERVICE_IMAGES = 5;
const MAX_SERVICE_CERTIFICATES = 10;

/**
 * Calculate distance between two locations using Haversine formula
 * @param {object} loc1 - First location with latitude and longitude
 * @param {object} loc2 - Second location with latitude and longitude
 * @return {number} Distance in kilometers
 */
function calculateDistance(loc1, loc2) {
  const R = 6371.0; // Earth's radius in kilometers
  const dLat = ((loc2.latitude - loc1.latitude) * Math.PI) / 180.0;
  const dLon = ((loc2.longitude - loc1.longitude) * Math.PI) / 180.0;
  const a =
    Math.sin(dLat / 2.0) * Math.sin(dLat / 2.0) +
    Math.cos((loc1.latitude * Math.PI) / 180.0) *
      Math.cos((loc2.latitude * Math.PI) / 180.0) *
      Math.sin(dLon / 2.0) *
      Math.sin(dLon / 2.0);
  const c = 2.0 * Math.atan2(Math.sqrt(a), Math.sqrt(1.0 - a));
  return R * c;
}

/**
 * Validate service title length
 * @param {string} title - Service title
 * @return {boolean} True if valid
 */
function validateTitle(title) {
  console.log("🔍 validateTitle called with:", {
    title: title,
    type: typeof title,
    truthy: !!title,
    length: title ? title.length : "N/A",
    minRequired: MIN_TITLE_LENGTH,
    maxRequired: MAX_TITLE_LENGTH,
  });

  const result = (
    title &&
    title.length >= MIN_TITLE_LENGTH &&
    title.length <= MAX_TITLE_LENGTH
  );

  console.log("🔍 validateTitle result:", result);
  return result;
}

/**
 * Validate service description length
 * @param {string} description - Service description
 * @return {boolean} True if valid
 */
function validateDescription(description) {
  return (
    description &&
    description.length >= MIN_DESCRIPTION_LENGTH &&
    description.length <= MAX_DESCRIPTION_LENGTH
  );
}

/**
 * Validate service price range
 * @param {number} price - Service price
 * @return {boolean} True if valid
 */
function validatePrice(price) {
  return price >= MIN_PRICE && price <= MAX_PRICE;
}

/**
 * Validate location coordinates and address
 * @param {object} location - Location object
 * @return {boolean} True if valid
 */
function validateLocation(location) {
  return (
    location &&
    location.latitude >= -90.0 &&
    location.latitude <= 90.0 &&
    location.longitude >= -180.0 &&
    location.longitude <= 180.0 &&
    location.address &&
    location.address.length > 0
  );
}

/**
 * Calculate commission fee and rate for a service
 * @param {string} categoryName - Service category name
 * @param {number} price - Service price
 * @return {Promise<object>} Commission fee and rate
 */
async function calculateCommissionInfo(categoryName, price) {
  // Import commission logic locally to avoid HTTPS call overhead
  const {
    getCategoryTier,
    getFeeStructure,
    calculateDynamicCommission,
  } = require("./commission-utils");

  try {
    const tier = getCategoryTier(categoryName);
    const structure = getFeeStructure(tier);
    const commissionFee = calculateDynamicCommission(price, structure);

    // Calculate commission rate as percentage
    const commissionRate = ((commissionFee / price) * 100);

    return {
      commissionFee: commissionFee,
      commissionRate: parseFloat(commissionRate.toFixed(2)),
    };
  } catch (error) {
    console.error("Error calculating commission:", error);
    // Fallback to default commission
    return {
      commissionFee: Math.floor(price * 0.05),
      commissionRate: 5.0,
    };
  }
}

/**
 * Upload images using media.js for consistent handling
 * This ensures all uploads are tracked in Firestore with proper metadata
 * @param {string} ownerId - Owner ID (provider ID)
 * @param {Array} images - Array of image objects
 * @param {string} mediaType - Media type (ServiceImage or ServiceCertificate)
 * @return {Promise<Array>} Array of media items with URLs and metadata
 */
async function uploadImagesToStorage(ownerId, images, mediaType) {
  const uploadedMedia = [];

  for (const image of images) {
    const {fileName, contentType, fileData} = image;

    // Call media.js uploadMediaInternal to create media with metadata
    const mediaItem = await uploadMediaInternal({
      fileName,
      contentType,
      mediaType,
      fileData,
      ownerId,
    });

    uploadedMedia.push(mediaItem);
  }

  return uploadedMedia;
}

/**
 * Delete media items using media.js for consistent handling
 * This ensures metadata is also removed from Firestore
 * @param {Array} mediaItems - Array of media items with id and url
 * @return {Promise<void>} Promise that resolves when deletion is complete
 */
async function deleteImagesFromStorage(mediaItems) {
  for (const item of mediaItems) {
    try {
      // Call media.js deleteMediaInternal to remove both Storage file and Firestore metadata
      await deleteMediaInternal(item.id);
    } catch (error) {
      console.error(`Error deleting media ${item.id}:`, error);
    }
  }
}

// ============================================================================
// SERVICE MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Create a new service listing
 */
exports.createService = functions.https.onCall(async (data, context) => {
  console.log("🚀 createService called");
  console.log("🔍 Raw data type:", typeof data);
  console.log("🔍 Raw data keys:", data ? Object.keys(data) : "No data");
  console.log("🔍 Raw data:", data);

  // Extract the actual payload from data.data FIRST
  const payload = data.data || data;

  // Safely log data without circular references
  const safeData = {
    title: payload.title,
    description: payload.description,
    categoryId: payload.categoryId,
    price: payload.price,
    location: payload.location ? "Present" : "Missing",
    weeklySchedule: payload.weeklySchedule ? "Present" : "Missing",
    instantBookingEnabled: payload.instantBookingEnabled,
    bookingNoticeHours: payload.bookingNoticeHours,
    maxBookingsPerDay: payload.maxBookingsPerDay,
    serviceImages: payload.serviceImages ?
      `${payload.serviceImages.length} images` : "none",
    serviceCertificates: payload.serviceCertificates ?
      `${payload.serviceCertificates.length} certificates` : "none",
    auth: data.auth ? "Present" : "Missing",
  };
  console.log("� Safe data received:", JSON.stringify(safeData, null, 2));
  console.log("🔐 Context auth:", context.auth ? "Present" : "Missing");

  // Get authentication info
  const authInfo = getAuthInfo(context, data);
  console.log("👤 Auth info:", JSON.stringify(authInfo, null, 2));

  // Authentication check
  if (!authInfo.hasAuth) {
    console.log("❌ Authentication failed");
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated to create a service",
    );
  }

  const {
    title,
    description,
    categoryId,
    price,
    location,
    weeklySchedule,
    instantBookingEnabled,
    bookingNoticeHours,
    maxBookingsPerDay,
    serviceImages,
    serviceCertificates,
  } = payload;

  console.log("📋 Extracted data from payload:");
  console.log("  - Title:", title,
    "(type:", typeof title, ", length:", title ? title.length : "N/A", ")");
  console.log("  - Description:", description,
    "(type:", typeof description, ", length:",
    description ? description.length : "N/A", ")");
  console.log("  - CategoryId:", categoryId, "(type:", typeof categoryId, ")");
  console.log("  - Price:", price, "(type:", typeof price, ")");
  console.log("  - Location:", location ? "Present" : "Missing");

  const providerId = authInfo.uid;

  // Validate input
  console.log("🔍 Starting validation...");
  console.log("🔍 Title validation - Min:", MIN_TITLE_LENGTH, "Max:", MAX_TITLE_LENGTH);

  const titleValid = validateTitle(title);
  console.log("📝 Title validation result:", titleValid);
  if (!titleValid) {
    console.log("❌ Title validation failed for:", title);
    throw new functions.https.HttpsError(
      "invalid-argument",
      `Service title must be between ${MIN_TITLE_LENGTH} and ${MAX_TITLE_LENGTH} characters`);
  }

  const descValid = validateDescription(description);
  console.log("📝 Description validation result:", descValid);
  if (!descValid) {
    console.log("❌ Description validation failed for:", description);
    throw new functions.https.HttpsError(
      "invalid-argument",
      `Service description must be between 
      ${MIN_DESCRIPTION_LENGTH} and ${MAX_DESCRIPTION_LENGTH} characters`);
  }

  const priceValid = validatePrice(price);
  console.log("💰 Price validation result:", priceValid);
  if (!priceValid) {
    console.log("❌ Price validation failed for:", price);
    throw new functions.https.HttpsError(
      "invalid-argument",
      `Service price must be between ₱${MIN_PRICE} and ₱${MAX_PRICE}`);
  }

  const locationValid = validateLocation(location);
  console.log("📍 Location validation result:", locationValid);
  if (!locationValid) {
    console.log("❌ Location validation failed for:", location);
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Invalid location data");
  }

  // Validate category exists
  const categoryDoc = await db.collection("categories").doc(categoryId).get();
  if (!categoryDoc.exists) {
    throw new functions.https.HttpsError(
      "not-found",
      "Service category not found");
  }

  const category = {id: categoryDoc.id, ...categoryDoc.data()};

  try {
    // Fetch provider information to get name
    const providerDoc = await db.collection("users").doc(providerId).get();
    if (!providerDoc.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "Provider not found");
    }
    const providerData = providerDoc.data();
    const providerName = providerData.name || "Unknown Provider";
    const providerAvatar = providerData.profilePicture || null;

    // Create service document
    const serviceRef = db.collection("services").doc();
    const serviceId = serviceRef.id;

    // Upload service images if provided
    let imageMedia = [];
    if (serviceImages && serviceImages.length > 0) {
      if (serviceImages.length > MAX_SERVICE_IMAGES) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          `Maximum ${MAX_SERVICE_IMAGES} service images allowed`);
      }
      imageMedia = await uploadImagesToStorage(
        providerId,
        serviceImages,
        "ServiceImage");
    }

    // Upload service certificates if provided
    let certificateMedia = [];
    if (serviceCertificates && serviceCertificates.length > 0) {
      if (serviceCertificates.length > MAX_SERVICE_CERTIFICATES) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          `Maximum ${MAX_SERVICE_CERTIFICATES} service certificates allowed`);
      }
      certificateMedia = await uploadImagesToStorage(
        providerId,
        serviceCertificates,
        "ServiceCertificate");
    }

    // Calculate commission
    const {commissionFee, commissionRate} = await calculateCommissionInfo(
      category.name,
      price);

    const timestamp = new Date().toISOString();

    const newService = {
      id: serviceId,
      providerId,
      providerName,
      providerAvatar,
      title,
      description,
      category,
      price,
      commissionFee,
      commissionRate,
      location,
      status: "Available",
      rating: null,
      reviewCount: 0,
      imageUrls: imageMedia.map((m) => m.url),
      imageMedia: imageMedia, // Store full media metadata
      certificateUrls: certificateMedia.map((m) => m.url),
      certificateMedia: certificateMedia, // Store full media metadata
      isVerifiedService: certificateMedia.length > 0,
      weeklySchedule: weeklySchedule || null,
      instantBookingEnabled: instantBookingEnabled || false,
      bookingNoticeHours: bookingNoticeHours || null,
      maxBookingsPerDay: maxBookingsPerDay || null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await serviceRef.set(newService);

    return {success: true, service: {...newService, id: serviceId}};
  } catch (error) {
    console.error("Error creating service:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Get service by ID
 */
exports.getService = functions.https.onCall(async (data, _context) => {
  const payload = data.data || data;
  const {serviceId} = payload;

  if (!serviceId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Service ID is required");
  }

  try {
    const serviceDoc = await db.collection("services").doc(serviceId).get();

    if (!serviceDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Service not found");
    }

    return {success: true, service: {id: serviceDoc.id, ...serviceDoc.data()}};
  } catch (error) {
    console.error("Error getting service:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Get services by provider
 */
exports.getServicesByProvider = functions.https.onCall(async (data, _context) => {
  const payload = data.data || data;
  const {providerId} = payload;

  if (!providerId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Provider ID is required");
  }

  try {
    const servicesSnapshot = await db
      .collection("services")
      .where("providerId", "==", providerId)
      .get();

    const services = [];
    servicesSnapshot.forEach((doc) => {
      services.push({id: doc.id, ...doc.data()});
    });

    return {success: true, services};
  } catch (error) {
    console.error("Error getting services by provider:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Get services by category
 */
exports.getServicesByCategory = functions.https.onCall(async (data, _context) => {
  const payload = data.data || data;
  const {categoryId} = payload;

  if (!categoryId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Category ID is required");
  }

  try {
    // Validate category exists
    const categoryDoc = await db.collection("categories").doc(categoryId).get();
    if (!categoryDoc.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "Service category not found");
    }

    const servicesSnapshot = await db
      .collection("services")
      .where("category.id", "==", categoryId)
      .get();

    const services = [];
    servicesSnapshot.forEach((doc) => {
      services.push({id: doc.id, ...doc.data()});
    });

    return {success: true, services};
  } catch (error) {
    console.error("Error getting services by category:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Update service status
 */
exports.updateServiceStatus = functions.https.onCall(async (data, context) => {
  // Get authentication info
  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated");
  }

  const payload = data.data || data;
  const {serviceId, status} = payload;

  if (!serviceId || !status) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Service ID and status are required");
  }

  if (!["Available", "Suspended", "Unavailable"].includes(status)) {
    throw new functions.https.HttpsError("invalid-argument", "Invalid status");
  }

  try {
    const serviceRef = db.collection("services").doc(serviceId);
    const serviceDoc = await serviceRef.get();

    if (!serviceDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Service not found");
    }

    const service = serviceDoc.data();

    // Check if user is the provider or admin
    if (
      service.providerId !== authInfo.uid &&
      !authInfo.isAdmin
    ) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only the service provider or admin can update service status",
      );
    }

    await serviceRef.update({
      status,
      updatedAt: new Date().toISOString(),
    });

    const updatedDoc = await serviceRef.get();
    return {success: true, service: {id: updatedDoc.id, ...updatedDoc.data()}};
  } catch (error) {
    console.error("Error updating service status:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Search services by location
 */
exports.searchServicesByLocation = functions.https.onCall(
  async (data, _context) => {
    const payload = data.data || data;
    const {userLocation, maxDistance, categoryId} = payload;

    if (!userLocation) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "User location is required",
      );
    }

    try {
      let query = db.collection("services");

      // Filter by category if provided
      if (categoryId) {
        query = query.where("category.id", "==", categoryId);
      }

      const servicesSnapshot = await query.get();

      const services = [];
      servicesSnapshot.forEach((doc) => {
        const service = {id: doc.id, ...doc.data()};
        const distance = calculateDistance(userLocation, service.location);

        if (!maxDistance || distance <= maxDistance) {
          service.distance = distance;
          services.push(service);
        }
      });

      // Sort by distance
      services.sort((a, b) => a.distance - b.distance);

      return {success: true, services};
    } catch (error) {
      console.error("Error searching services by location:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  },
);

/**
 * Update service
 */
exports.updateService = functions.https.onCall(async (data, context) => {
  console.log("🔍 Raw data:", data);
  // Get authentication info
  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  // Extract the actual payload from data.data
  const payload = data.data || data;
  const {
    serviceId,
    categoryId,
    title,
    description,
    price,
    location,
    weeklySchedule,
    instantBookingEnabled,
    bookingNoticeHours,
    maxBookingsPerDay,
  } = payload;

  if (!serviceId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Service ID is required",
    );
  }

  try {
    const serviceRef = db.collection("services").doc(serviceId);
    const serviceDoc = await serviceRef.get();

    if (!serviceDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Service not found");
    }

    const service = serviceDoc.data();

    // Check if user is the provider or admin
    if (
      service.providerId !== authInfo.uid &&
      !authInfo.isAdmin
    ) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only the service provider or admin can update this service",
      );
    }

    // Handle null data gracefully by preserving existing values
    // Update title - preserve existing if null/undefined provided
    let updatedTitle;
    if (title !== undefined && title !== null) {
      if (!validateTitle(title)) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          `Service title must be between ${MIN_TITLE_LENGTH} and ${MAX_TITLE_LENGTH} characters`,
        );
      }
      updatedTitle = title;
    } else {
      updatedTitle = service.title;
    }

    // Update description - preserve existing if null/undefined provided
    let updatedDescription;
    if (description !== undefined && description !== null) {
      if (!validateDescription(description)) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          `Service description must be between ${MIN_DESCRIPTION_LENGTH} ` +
          `and ${MAX_DESCRIPTION_LENGTH} characters`,
        );
      }
      updatedDescription = description;
    } else {
      updatedDescription = service.description;
    }

    // Update category - preserve existing if null/undefined or invalid categoryId provided
    let updatedCategory;
    if (categoryId !== undefined && categoryId !== null && categoryId !== service.category.id) {
      const categoryDoc = await db.collection("categories").doc(categoryId).get();
      if (!categoryDoc.exists) {
        // Preserve existing category if provided categoryId is invalid
        updatedCategory = service.category;
      } else {
        updatedCategory = {id: categoryDoc.id, ...categoryDoc.data()};
      }
    } else {
      updatedCategory = service.category;
    }

    // Update price - preserve existing if null/undefined provided
    let updatedPrice;
    if (price !== undefined && price !== null) {
      if (!validatePrice(price)) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          `Service price must be between ₱${MIN_PRICE} and ₱${MAX_PRICE}`,
        );
      }
      updatedPrice = price;
    } else {
      updatedPrice = service.price;
    }

    // Update location - preserve existing if null/undefined provided
    let updatedLocation;
    if (location !== undefined && location !== null) {
      if (!validateLocation(location)) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Invalid location data",
        );
      }
      updatedLocation = location;
    } else {
      updatedLocation = service.location;
    }

    // Update availability settings - preserve existing if null/undefined provided
    const updatedWeeklySchedule = (weeklySchedule !== undefined && weeklySchedule !== null) ?
      weeklySchedule :
      service.weeklySchedule;

    const updatedInstantBookingEnabled = (instantBookingEnabled !== undefined &&
      instantBookingEnabled !== null) ?
      instantBookingEnabled :
      service.instantBookingEnabled;

    let updatedBookingNoticeHours;
    if (bookingNoticeHours !== undefined && bookingNoticeHours !== null) {
      if (bookingNoticeHours > 720) { // Maximum 30 days
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Booking notice hours cannot exceed 720 (30 days)",
        );
      }
      updatedBookingNoticeHours = bookingNoticeHours;
    } else {
      updatedBookingNoticeHours = service.bookingNoticeHours;
    }

    let updatedMaxBookingsPerDay;
    if (maxBookingsPerDay !== undefined && maxBookingsPerDay !== null) {
      if (maxBookingsPerDay === 0 || maxBookingsPerDay > 50) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Max bookings per day must be between 1 and 50",
        );
      }
      updatedMaxBookingsPerDay = maxBookingsPerDay;
    } else {
      updatedMaxBookingsPerDay = service.maxBookingsPerDay;
    }

    // Calculate commission if price or category changed
    let commissionFee;
    let commissionRate;
    const priceChanged = (price !== undefined && price !== null);
    const categoryChanged = (categoryId !== undefined && categoryId !== null &&
      categoryId !== service.category.id);

    if (priceChanged || categoryChanged) {
      const commissionInfo = await calculateCommissionInfo(updatedCategory.name, updatedPrice);
      commissionFee = commissionInfo.commissionFee;
      commissionRate = commissionInfo.commissionRate;
    } else {
      commissionFee = service.commissionFee;
      commissionRate = service.commissionRate;
    }

    // Build the updates object with all values (including preserved ones)
    const updates = {
      title: updatedTitle,
      description: updatedDescription,
      category: updatedCategory,
      price: updatedPrice,
      commissionFee: commissionFee,
      commissionRate: commissionRate,
      location: updatedLocation,
      weeklySchedule: updatedWeeklySchedule,
      instantBookingEnabled: updatedInstantBookingEnabled,
      bookingNoticeHours: updatedBookingNoticeHours,
      maxBookingsPerDay: updatedMaxBookingsPerDay,
      updatedAt: new Date().toISOString(),
    };

    await serviceRef.update(updates);

    const updatedDoc = await serviceRef.get();
    return {success: true, service: {id: updatedDoc.id, ...updatedDoc.data()}};
  } catch (error) {
    console.error("Error updating service:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Delete a service
 */
exports.deleteService = functions.https.onCall(async (data, context) => {
  // Get authentication info
  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  const payload = data.data || data;
  const {serviceId} = payload;

  if (!serviceId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Service ID is required",
    );
  }

  try {
    const serviceRef = db.collection("services").doc(serviceId);
    const serviceDoc = await serviceRef.get();

    if (!serviceDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Service not found");
    }

    const service = serviceDoc.data();

    // Check if user is the provider or admin
    if (
      service.providerId !== authInfo.uid &&
      !authInfo.isAdmin
    ) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only the service provider or admin can delete this service",
      );
    }

    // Delete service images from storage and metadata
    if (service.imageMedia && service.imageMedia.length > 0) {
      await deleteImagesFromStorage(service.imageMedia);
    }

    // Delete service certificates from storage and metadata
    if (service.certificateMedia && service.certificateMedia.length > 0) {
      await deleteImagesFromStorage(service.certificateMedia);
    }

    // Delete the service document
    await serviceRef.delete();

    return {success: true, message: "Service deleted successfully"};
  } catch (error) {
    console.error("Error deleting service:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Get all services
 */
exports.getAllServices = functions.https.onCall(async (_data, _context) => {
  try {
    const servicesSnapshot = await db.collection("services").get();

    const services = [];
    servicesSnapshot.forEach((doc) => {
      services.push({id: doc.id, ...doc.data()});
    });

    return {success: true, services};
  } catch (error) {
    console.error("Error getting all services:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

// ============================================================================
// SERVICE IMAGE MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Upload additional images to existing service
 */
exports.uploadServiceImages = functions.https.onCall(async (data, context) => {
  // Get authentication info
  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  const payload = data.data || data;
  const {serviceId, serviceImages} = payload;

  if (!serviceId || !serviceImages || serviceImages.length === 0) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Service ID and images are required",
    );
  }

  try {
    const serviceRef = db.collection("services").doc(serviceId);
    const serviceDoc = await serviceRef.get();

    if (!serviceDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Service not found");
    }

    const service = serviceDoc.data();

    // Check if user is the provider
    if (service.providerId !== authInfo.uid) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only the service provider can upload images",
      );
    }

    const currentImageCount = service.imageUrls ? service.imageUrls.length : 0;
    if (currentImageCount + serviceImages.length > MAX_SERVICE_IMAGES) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        `Maximum ${MAX_SERVICE_IMAGES} service images allowed. 
        Current: ${currentImageCount}, trying to add: ${serviceImages.length}`,
      );
    }

    // Upload new images
    const newImageMedia = await uploadImagesToStorage(
      service.providerId,
      serviceImages,
      "ServiceImage",
    );

    // Update service with new images
    const existingImageMedia = service.imageMedia || [];
    const updatedImageMedia = [...existingImageMedia, ...newImageMedia];
    const updatedImageUrls = updatedImageMedia.map((m) => m.url);

    await serviceRef.update({
      imageUrls: updatedImageUrls,
      imageMedia: updatedImageMedia,
      updatedAt: new Date().toISOString(),
    });

    const updatedDoc = await serviceRef.get();
    return {success: true, service: {id: updatedDoc.id, ...updatedDoc.data()}};
  } catch (error) {
    console.error("Error uploading service images:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Remove specific image from service
 */
exports.removeServiceImage = functions.https.onCall(async (data, context) => {
  // Get authentication info
  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  const payload = data.data || data;
  const {serviceId, imageUrl} = payload;

  if (!serviceId || !imageUrl) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Service ID and image URL are required",
    );
  }

  try {
    const serviceRef = db.collection("services").doc(serviceId);
    const serviceDoc = await serviceRef.get();

    if (!serviceDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Service not found");
    }

    const service = serviceDoc.data();

    // Check if user is the provider
    if (service.providerId !== authInfo.uid) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only the service provider can remove images",
      );
    }

    if (!service.imageUrls || !service.imageUrls.includes(imageUrl)) {
      throw new functions.https.HttpsError(
        "not-found",
        "Image not found in service",
      );
    }

    // Find the media item to delete
    const imageMedia = service.imageMedia || [];
    const mediaToDelete = imageMedia.find((m) => m.url === imageUrl);

    if (mediaToDelete) {
      // Delete image from storage and metadata
      await deleteImagesFromStorage([mediaToDelete]);
    }

    // Remove image from service
    const updatedImageMedia = imageMedia.filter((m) => m.url !== imageUrl);
    const updatedImageUrls = updatedImageMedia.map((m) => m.url);

    await serviceRef.update({
      imageUrls: updatedImageUrls,
      imageMedia: updatedImageMedia,
      updatedAt: new Date().toISOString(),
    });

    const updatedDoc = await serviceRef.get();
    return {success: true, service: {id: updatedDoc.id, ...updatedDoc.data()}};
  } catch (error) {
    console.error("Error removing service image:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Reorder service images
 */
exports.reorderServiceImages = functions.https.onCall(async (data, context) => {
  // Get authentication info
  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  const payload = data.data || data;
  const {serviceId, orderedImageUrls} = payload;

  if (!serviceId || !orderedImageUrls) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Service ID and ordered image URLs are required",
    );
  }

  try {
    const serviceRef = db.collection("services").doc(serviceId);
    const serviceDoc = await serviceRef.get();

    if (!serviceDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Service not found");
    }

    const service = serviceDoc.data();

    // Check if user is the provider
    if (service.providerId !== authInfo.uid) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only the service provider can reorder images",
      );
    }

    // Validate that all URLs exist in current service images
    const currentUrls = service.imageUrls || [];
    const allUrlsMatch =
      orderedImageUrls.length === currentUrls.length &&
      orderedImageUrls.every((url) => currentUrls.includes(url));

    if (!allUrlsMatch) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Ordered URLs must match existing service images",
      );
    }

    await serviceRef.update({
      imageUrls: orderedImageUrls,
      updatedAt: new Date().toISOString(),
    });

    const updatedDoc = await serviceRef.get();
    return {success: true, service: {id: updatedDoc.id, ...updatedDoc.data()}};
  } catch (error) {
    console.error("Error reordering service images:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

// ============================================================================
// SERVICE CERTIFICATE MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Upload additional certificates to existing service
 */
exports.uploadServiceCertificates = functions.https.onCall(
  async (data, context) => {
    // Get authentication info
    const authInfo = getAuthInfo(context, data);
    if (!authInfo.hasAuth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated",
      );
    }

    const payload = data.data || data;
    const {serviceId, serviceCertificates} = payload;

    if (!serviceId || !serviceCertificates || serviceCertificates.length === 0) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Service ID and certificates are required",
      );
    }

    try {
      const serviceRef = db.collection("services").doc(serviceId);
      const serviceDoc = await serviceRef.get();

      if (!serviceDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Service not found");
      }

      const service = serviceDoc.data();

      // Check if user is the provider
      if (service.providerId !== authInfo.uid) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Only the service provider can upload certificates",
        );
      }

      const currentCertCount = service.certificateUrls ?
        service.certificateUrls.length :
        0;
      if (currentCertCount + serviceCertificates.length > MAX_SERVICE_CERTIFICATES) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          `Maximum ${MAX_SERVICE_CERTIFICATES} service certificates allowed`,
        );
      }

      // Upload new certificates
      const newCertMedia = await uploadImagesToStorage(
        service.providerId,
        serviceCertificates,
        "ServiceCertificate",
      );

      // Update service with new certificates
      const existingCertMedia = service.certificateMedia || [];
      const updatedCertMedia = [...existingCertMedia, ...newCertMedia];
      const updatedCertUrls = updatedCertMedia.map((m) => m.url);

      await serviceRef.update({
        certificateUrls: updatedCertUrls,
        certificateMedia: updatedCertMedia,
        isVerifiedService: updatedCertMedia.length > 0,
        updatedAt: new Date().toISOString(),
      });

      const updatedDoc = await serviceRef.get();
      return {success: true, service: {id: updatedDoc.id, ...updatedDoc.data()}};
    } catch (error) {
      console.error("Error uploading service certificates:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  },
);

/**
 * Remove specific certificate from service
 */
exports.removeServiceCertificate = functions.https.onCall(
  async (data, context) => {
    // Get authentication info
    const authInfo = getAuthInfo(context, data);
    if (!authInfo.hasAuth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated",
      );
    }

    const payload = data.data || data;
    const {serviceId, certificateUrl} = payload;

    if (!serviceId || !certificateUrl) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Service ID and certificate URL are required",
      );
    }

    try {
      const serviceRef = db.collection("services").doc(serviceId);
      const serviceDoc = await serviceRef.get();

      if (!serviceDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Service not found");
      }

      const service = serviceDoc.data();

      // Check if user is the provider
      if (service.providerId !== authInfo.uid) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Only the service provider can remove certificates",
        );
      }

      if (
        !service.certificateUrls ||
        !service.certificateUrls.includes(certificateUrl)
      ) {
        throw new functions.https.HttpsError(
          "not-found",
          "Certificate not found in service",
        );
      }

      // Find the media item to delete
      const certMedia = service.certificateMedia || [];
      const mediaToDelete = certMedia.find((m) => m.url === certificateUrl);

      if (mediaToDelete) {
        // Delete certificate from storage and metadata
        await deleteImagesFromStorage([mediaToDelete]);
      }

      // Remove certificate from service
      const updatedCertMedia = certMedia.filter((m) => m.url !== certificateUrl);
      const updatedCertUrls = updatedCertMedia.map((m) => m.url);

      await serviceRef.update({
        certificateUrls: updatedCertUrls,
        certificateMedia: updatedCertMedia,
        isVerifiedService: updatedCertMedia.length > 0,
        updatedAt: new Date().toISOString(),
      });

      const updatedDoc = await serviceRef.get();
      return {success: true, service: {id: updatedDoc.id, ...updatedDoc.data()}};
    } catch (error) {
      console.error("Error removing service certificate:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  },
);

/**
 * Verify service manually (admin function)
 */
exports.verifyService = functions.https.onCall(async (data, context) => {
  // Get authentication info
  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  if (!authInfo.isAdmin) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only admins can verify services",
    );
  }

  const payload = data.data || data;
  const {serviceId, isVerified} = payload;

  if (!serviceId || isVerified === undefined) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Service ID and verification status are required",
    );
  }

  try {
    const serviceRef = db.collection("services").doc(serviceId);
    const serviceDoc = await serviceRef.get();

    if (!serviceDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Service not found");
    }

    await serviceRef.update({
      isVerifiedService: isVerified,
      updatedAt: new Date().toISOString(),
    });

    const updatedDoc = await serviceRef.get();
    return {success: true, service: {id: updatedDoc.id, ...updatedDoc.data()}};
  } catch (error) {
    console.error("Error verifying service:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

// ============================================================================
// CATEGORY MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Add a new category
 */
exports.addCategory = functions.https.onCall(async (data, context) => {
  // Get authentication info
  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  if (!authInfo.isAdmin) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only admins can add categories",
    );
  }

  const payload = data.data || data;
  const {name, description, parentId, slug, imageUrl} = payload;

  if (!name || !slug) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Name and slug are required",
    );
  }

  try {
    // Validate parent category if provided
    if (parentId) {
      const parentDoc = await db.collection("categories").doc(parentId).get();
      if (!parentDoc.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          "Parent category not found",
        );
      }
    }

    const categoryRef = db.collection("categories").doc();
    const newCategory = {
      id: categoryRef.id,
      name,
      description: description || "",
      slug,
      imageUrl: imageUrl || "",
      parentId: parentId || null,
    };

    await categoryRef.set(newCategory);

    return {success: true, category: newCategory};
  } catch (error) {
    console.error("Error adding category:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Get all categories
 */
exports.getAllCategories = functions.https.onCall(async (_data, _context) => {
  try {
    const categoriesSnapshot = await db.collection("categories").get();

    const categories = [];
    categoriesSnapshot.forEach((doc) => {
      categories.push({id: doc.id, ...doc.data()});
    });

    return {success: true, categories};
  } catch (error) {
    console.error("Error getting all categories:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});
/**
 * Initialize categories directly (for startup initialization)
 * This is a direct function that can be called without Firebase Functions context
 * @return {Promise<object>} Initialization result
 */
async function initializeCategoriesDirectly() {
  // Predefined categories from staticData.mo
  const STATIC_CATEGORIES = [
    {
      id: "cat-001",
      name: "Home Repairs",
      description: "Professional home maintenance and improvement services",
      parentId: null,
      slug: "home-services",
      imageUrl: "/images/HomeServices-CoverImage.jpg",
    },
    {
      id: "cat-002",
      name: "Cleaning Services",
      description: "Professional cleaning and housekeeping services",
      parentId: null,
      slug: "cleaning-services",
      imageUrl: "/images/CLeaningServices-CoverImage.jpeg",
    },
    {
      id: "cat-003",
      name: "Automobile Repairs",
      description: "Professional automobile maintenance and repair services",
      parentId: null,
      slug: "automobile-repairs",
      imageUrl: "/images/AutomobileRepairs-CoverImage.jpg",
    },
    {
      id: "cat-004",
      name: "Gadget Technicians",
      description: "Professional repair and support for electronic devices",
      parentId: null,
      slug: "gadget-technicians",
      imageUrl: "/images/GedgetTechnician-CoverImage1.jpg",
    },
    {
      id: "cat-005",
      name: "Beauty Services",
      description: "Professional beauty and grooming services",
      parentId: null,
      slug: "beauty-services",
      imageUrl: "/images/BeautyServices-CoverImage.jpg",
    },
    {
      id: "cat-006",
      name: "Delivery and Errands",
      description: "Professional delivery and errand running services",
      parentId: null,
      slug: "delivery-errands",
      imageUrl: "/images/Delivery-CoverImage.jpg",
    },
    {
      id: "cat-007",
      name: "Massage Services",
      description: "Professional wellness and spa services",
      parentId: null,
      slug: "beauty-wellness",
      imageUrl: "/images/Beauty&Wellness-CoverImage.jpg",
    },
    {
      id: "cat-008",
      name: "Tutoring",
      description: "Professional educational tutoring services",
      parentId: null,
      slug: "tutoring",
      imageUrl: "/images/Tutoring-CoverImage.jpg",
    },
    {
      id: "cat-009",
      name: "Photographer",
      description: "Professional photography services",
      parentId: null,
      slug: "photographer",
      imageUrl: "/images/Photographer-CoverImage.jpg",
    },
  ];

  try {
    const batch = db.batch();
    let createdCount = 0;
    let skippedCount = 0;

    for (const category of STATIC_CATEGORIES) {
      const categoryRef = db.collection("categories").doc(category.id);
      const categoryDoc = await categoryRef.get();

      // Only create if it doesn't exist
      if (!categoryDoc.exists) {
        batch.set(categoryRef, category);
        createdCount++;
      } else {
        skippedCount++;
      }
    }

    await batch.commit();

    return {
      success: true,
      message: `Categories initialized: ${createdCount} created, ${skippedCount} already existed`,
      createdCount,
      skippedCount,
    };
  } catch (error) {
    console.error("Error initializing categories:", error);
    throw error;
  }
}

// Export the direct initialization function
exports.initializeCategoriesDirectly = initializeCategoriesDirectly;

// ============================================================================
// SERVICE PACKAGE MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Create a new service package
 */
exports.createServicePackage = functions.https.onCall(async (data, context) => {
  // Get authentication info
  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  // Extract the actual payload from data.data
  const payload = data.data || data;
  const {serviceId, title, description, price} = payload;

  if (!serviceId || !title || !description || !price) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Service ID, title, description, and price are required",
    );
  }

  try {
    // Validate service exists
    const serviceDoc = await db.collection("services").doc(serviceId).get();
    if (!serviceDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Service not found");
    }

    const service = serviceDoc.data();

    // Check if user is the provider
    if (service.providerId !== authInfo.uid) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only the service provider can create packages",
      );
    }

    // Validate price
    if (!validatePrice(price)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        `Package price must be between ₱${MIN_PRICE} and ₱${MAX_PRICE}`,
      );
    }

    // Calculate commission
    const {commissionFee, commissionRate} = await calculateCommissionInfo(
      service.category.name,
      price,
    );

    const packageRef = db.collection("service_packages").doc();
    const timestamp = new Date().toISOString();

    const newPackage = {
      id: packageRef.id,
      serviceId,
      title,
      description,
      price,
      commissionFee,
      commissionRate,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await packageRef.set(newPackage);

    return {success: true, package: newPackage};
  } catch (error) {
    console.error("Error creating service package:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Get all packages for a service
 */
exports.getServicePackages = functions.https.onCall(async (data, _context) => {
  const payload = data.data || data;
  const {serviceId} = payload;

  if (!serviceId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Service ID is required",
    );
  }

  try {
    // Validate service exists
    const serviceDoc = await db.collection("services").doc(serviceId).get();
    if (!serviceDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Service not found");
    }

    const packagesSnapshot = await db
      .collection("service_packages")
      .where("serviceId", "==", serviceId)
      .get();

    const packages = [];
    packagesSnapshot.forEach((doc) => {
      packages.push({id: doc.id, ...doc.data()});
    });

    return {success: true, packages};
  } catch (error) {
    console.error("Error getting service packages:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Get a specific package by ID
 */
exports.getPackage = functions.https.onCall(async (data, _context) => {
  const payload = data.data || data;
  const {packageId} = payload;

  if (!packageId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Package ID is required",
    );
  }

  try {
    const packageDoc = await db.collection("service_packages").doc(packageId).get();

    if (!packageDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Package not found");
    }

    return {success: true, package: {id: packageDoc.id, ...packageDoc.data()}};
  } catch (error) {
    console.error("Error getting package:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Update a service package
 */
exports.updateServicePackage = functions.https.onCall(async (data, context) => {
  // Get authentication info
  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  // Extract the actual payload from data.data
  const payload = data.data || data;
  const {packageId, title, description, price} = payload;

  if (!packageId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Package ID is required",
    );
  }

  try {
    const packageRef = db.collection("service_packages").doc(packageId);
    const packageDoc = await packageRef.get();

    if (!packageDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Package not found");
    }

    const pkg = packageDoc.data();

    // Validate service and ownership
    const serviceDoc = await db.collection("services").doc(pkg.serviceId).get();
    if (!serviceDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Service not found");
    }

    const service = serviceDoc.data();
    if (service.providerId !== authInfo.uid) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only the service provider can update packages",
      );
    }

    const updates = {
      updatedAt: new Date().toISOString(),
    };

    if (title !== undefined) {
      updates.title = title;
    }
    if (description !== undefined) {
      updates.description = description;
    }
    if (price !== undefined) {
      if (!validatePrice(price)) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          `Package price must be between ₱${MIN_PRICE} and ₱${MAX_PRICE}`,
        );
      }
      updates.price = price;

      // Recalculate commission
      const {commissionFee, commissionRate} = await calculateCommissionInfo(
        service.category.name,
        price,
      );
      updates.commissionFee = commissionFee;
      updates.commissionRate = commissionRate;
    }

    await packageRef.update(updates);

    const updatedDoc = await packageRef.get();
    return {success: true, package: {id: updatedDoc.id, ...updatedDoc.data()}};
  } catch (error) {
    console.error("Error updating service package:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Delete a service package
 */
exports.deleteServicePackage = functions.https.onCall(async (data, context) => {
  // Get authentication info
  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated",
    );
  }

  // Extract the actual payload from data.data
  const payload = data.data || data;
  const {packageId} = payload;

  if (!packageId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Package ID is required",
    );
  }

  try {
    const packageRef = db.collection("service_packages").doc(packageId);
    const packageDoc = await packageRef.get();

    if (!packageDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Package not found");
    }

    const pkg = packageDoc.data();

    // Validate service and ownership
    const serviceDoc = await db.collection("services").doc(pkg.serviceId).get();
    if (!serviceDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Service not found");
    }

    const service = serviceDoc.data();
    if (service.providerId !== authInfo.uid) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only the service provider can delete packages",
      );
    }

    await packageRef.delete();

    return {success: true, message: "Package deleted successfully"};
  } catch (error) {
    console.error("Error deleting service package:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

// ============================================================================
// COMMISSION FUNCTIONS
// ============================================================================

/**
 * Get commission quote for a given category and price
 */
exports.getCommissionQuote = functions.https.onCall(async (data, _context) => {
  const payload = data.data || data;
  const {categoryName, price} = payload;

  if (!categoryName || !price) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Category name and price are required",
    );
  }

  try {
    const {commissionFee, commissionRate} = await calculateCommissionInfo(
      categoryName,
      price,
    );

    return {
      success: true,
      commissionFee,
      commissionRate,
      totalAmount: price + commissionFee,
    };
  } catch (error) {
    console.error("Error getting commission quote:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Update service rating (called by Review system)
 */
exports.updateServiceRating = functions.https.onCall(async (data, _context) => {
  const payload = data.data || data;
  const {serviceId, newRating, newReviewCount} = payload;

  if (!serviceId || newRating === undefined || newReviewCount === undefined) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Service ID, rating, and review count are required",
    );
  }

  try {
    const serviceRef = db.collection("services").doc(serviceId);
    const serviceDoc = await serviceRef.get();

    if (!serviceDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Service not found");
    }

    await serviceRef.update({
      rating: newRating,
      reviewCount: newReviewCount,
      updatedAt: new Date().toISOString(),
    });

    const updatedDoc = await serviceRef.get();
    return {success: true, service: {id: updatedDoc.id, ...updatedDoc.data()}};
  } catch (error) {
    console.error("Error updating service rating:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

// ============================================================================
// AVAILABILITY MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Set service availability
 */
exports.setServiceAvailability = functions.https.onCall(
  async (data, context) => {
    // Get authentication info
    const authInfo = getAuthInfo(context, data);
    if (!authInfo.hasAuth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated",
      );
    }

    // Extract the actual payload from data.data
    const payload = data.data || data;
    const {
      serviceId,
      weeklySchedule,
      instantBookingEnabled,
      bookingNoticeHours,
      maxBookingsPerDay,
    } = payload;

    if (
      !serviceId ||
      !weeklySchedule ||
      instantBookingEnabled === undefined ||
      bookingNoticeHours === undefined ||
      maxBookingsPerDay === undefined
    ) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "All availability parameters are required",
      );
    }

    try {
      const serviceRef = db.collection("services").doc(serviceId);
      const serviceDoc = await serviceRef.get();

      if (!serviceDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Service not found");
      }

      const service = serviceDoc.data();

      // Check if user is the provider
      if (service.providerId !== authInfo.uid) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Not authorized to set availability for this service",
        );
      }

      // Validate booking notice hours
      if (bookingNoticeHours > 720) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Booking notice hours cannot exceed 720 (30 days)",
        );
      }

      // Validate max bookings per day
      if (maxBookingsPerDay === 0 || maxBookingsPerDay > 50) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Max bookings per day must be between 1 and 50",
        );
      }

      // Update service with availability data
      await serviceRef.update({
        weeklySchedule,
        instantBookingEnabled,
        bookingNoticeHours,
        maxBookingsPerDay,
        updatedAt: new Date().toISOString(),
      });

      const availability = {
        providerId: service.providerId,
        weeklySchedule,
        instantBookingEnabled,
        bookingNoticeHours,
        maxBookingsPerDay,
        isActive: true,
        createdAt: service.createdAt,
        updatedAt: new Date().toISOString(),
      };

      return {success: true, availability};
    } catch (error) {
      console.error("Error setting service availability:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  },
);

/**
 * Get service availability
 */
exports.getServiceAvailability = functions.https.onCall(
  async (data, _context) => {
    const payload = data.data || data;
    const {serviceId} = payload;

    if (!serviceId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Service ID is required",
      );
    }

    try {
      const serviceDoc = await db.collection("services").doc(serviceId).get();

      if (!serviceDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Service not found");
      }

      const service = serviceDoc.data();

      // Check if service has availability data
      if (
        !service.weeklySchedule ||
        service.instantBookingEnabled === undefined ||
        service.bookingNoticeHours === undefined ||
        service.maxBookingsPerDay === undefined
      ) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Service availability not properly configured",
        );
      }

      const availability = {
        providerId: service.providerId,
        isActive: true,
        instantBookingEnabled: service.instantBookingEnabled,
        bookingNoticeHours: service.bookingNoticeHours,
        maxBookingsPerDay: service.maxBookingsPerDay,
        weeklySchedule: service.weeklySchedule,
        createdAt: service.createdAt,
        updatedAt: service.updatedAt,
      };

      return {success: true, availability};
    } catch (error) {
      console.error("Error getting service availability:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  },
);

/**
 * Helper function to convert timestamp to day of week
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @return {string} Day of week (Monday-Sunday)
 */
function getDayOfWeekFromTimestamp(timestamp) {
  const date = new Date(timestamp);
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  return days[date.getDay()];
}

/**
 * Get available time slots for a specific date and service
 */
exports.getAvailableTimeSlots = functions.https.onCall(
  async (data, _context) => {
    const payload = data.data || data;
    const {serviceId, date} = payload;

    if (!serviceId || !date) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Service ID and date are required",
      );
    }

    try {
      const serviceDoc = await db.collection("services").doc(serviceId).get();

      if (!serviceDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Service not found");
      }

      const service = serviceDoc.data();

      // Check if service has availability data
      if (
        !service.weeklySchedule ||
        service.instantBookingEnabled === undefined ||
        service.bookingNoticeHours === undefined ||
        service.maxBookingsPerDay === undefined
      ) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Service availability not properly configured",
        );
      }

      // Get day of week for the requested date
      const dayOfWeek = getDayOfWeekFromTimestamp(date);

      // Find the day's availability in the weekly schedule
      const daySchedule = service.weeklySchedule.find(
        (schedule) => schedule.day === dayOfWeek,
      );

      if (!daySchedule || !daySchedule.availability) {
        return {success: true, slots: []};
      }

      const dayAvailability = daySchedule.availability;

      if (!dayAvailability.isAvailable) {
        return {success: true, slots: []};
      }

      // Create available slots
      // Note: Conflict checking is handled in booking canister/function
      const availableSlots = dayAvailability.slots.map((slot) => ({
        date: date,
        timeSlot: slot,
        isAvailable: true, // Service only provides schedule availability
        conflictingBookings: [], // Conflict checking handled in booking system
      }));

      return {success: true, slots: availableSlots};
    } catch (error) {
      console.error("Error getting available time slots:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  },
);

// ============================================================================
// INTERNAL HELPER FUNCTIONS (for use by other Cloud Functions)
// ============================================================================

/**
 * Internal function to get all services
 * For use by other Cloud Functions (e.g., admin.js)
 * @return {Promise<Array>} Array of all services
 */
async function getAllServicesInternal() {
  const servicesSnapshot = await db.collection("services").get();
  const services = [];
  servicesSnapshot.forEach((doc) => {
    services.push({id: doc.id, ...doc.data()});
  });
  return services;
}

/**
 * Internal function to get service by ID
 * For use by other Cloud Functions (e.g., admin.js)
 * @param {string} serviceId - Service ID
 * @return {Promise<object|null>} Service object or null if not found
 */
async function getServiceInternal(serviceId) {
  const serviceDoc = await db.collection("services").doc(serviceId).get();
  if (!serviceDoc.exists) {
    return null;
  }
  return {id: serviceDoc.id, ...serviceDoc.data()};
}

// Export internal functions for use by other modules
exports.getAllServicesInternal = getAllServicesInternal;
exports.getServiceInternal = getServiceInternal;
