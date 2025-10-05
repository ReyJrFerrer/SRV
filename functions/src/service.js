const functions = require("firebase-functions");
const admin = require("firebase-admin");

const db = admin.firestore();

// Constants
const MIN_TITLE_LENGTH = 1;
const MAX_TITLE_LENGTH = 100;
const MIN_DESCRIPTION_LENGTH = 1;
const MAX_DESCRIPTION_LENGTH = 1000;
const MIN_PRICE = 1;
const MAX_PRICE = 1000000;
const MAX_SERVICE_IMAGES = 5;
const MAX_SERVICE_CERTIFICATES = 10;

// Helper function to calculate distance using Haversine formula
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

// Validation helpers
function validateTitle(title) {
  return (
    title &&
    title.length >= MIN_TITLE_LENGTH &&
    title.length <= MAX_TITLE_LENGTH
  );
}

function validateDescription(description) {
  return (
    description &&
    description.length >= MIN_DESCRIPTION_LENGTH &&
    description.length <= MAX_DESCRIPTION_LENGTH
  );
}

function validatePrice(price) {
  return price >= MIN_PRICE && price <= MAX_PRICE;
}

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

// Helper to calculate commission
async function calculateCommissionInfo(categoryName, price) {
  try {
    // Call commission Cloud Function
    const commissionResult = await admin
      .functions()
      .httpsCallable("calculateCommission")({ categoryName, price });

    if (commissionResult.data && commissionResult.data.success) {
      return {
        commissionFee: commissionResult.data.commissionFee,
        commissionRate: commissionResult.data.commissionRate,
      };
    }

    // Fallback to default commission
    return {
      commissionFee: Math.floor(price * 0.05),
      commissionRate: 5.0,
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

// Helper to upload images to storage
async function uploadImagesToStorage(serviceId, images, folder) {
  const bucket = admin.storage().bucket();
  const uploadedUrls = [];

  for (const image of images) {
    const { fileName, contentType, fileData } = image;
    const filePath = `services/${serviceId}/${folder}/${fileName}`;
    const file = bucket.file(filePath);

    // Convert base64 to buffer if needed
    const buffer = Buffer.isBuffer(fileData)
      ? fileData
      : Buffer.from(fileData, "base64");

    await file.save(buffer, {
      metadata: {
        contentType: contentType,
      },
    });

    // Make file publicly accessible
    await file.makePublic();

    // Get public URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
    uploadedUrls.push(publicUrl);
  }

  return uploadedUrls;
}

// Helper to delete images from storage
async function deleteImagesFromStorage(imageUrls) {
  const bucket = admin.storage().bucket();

  for (const url of imageUrls) {
    try {
      // Extract file path from URL
      const filePath = url.split(`${bucket.name}/`)[1];
      if (filePath) {
        await bucket.file(filePath).delete();
      }
    } catch (error) {
      console.error(`Error deleting image ${url}:`, error);
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
  // Authentication check
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated to create a service"
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
  } = data;

  const providerId = context.auth.uid;

  // Validate input
  if (!validateTitle(title)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `Service title must be between ${MIN_TITLE_LENGTH} and ${MAX_TITLE_LENGTH} characters`
    );
  }

  if (!validateDescription(description)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `Service description must be between ${MIN_DESCRIPTION_LENGTH} and ${MAX_DESCRIPTION_LENGTH} characters`
    );
  }

  if (!validatePrice(price)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      `Service price must be between ₱${MIN_PRICE} and ₱${MAX_PRICE}`
    );
  }

  if (!validateLocation(location)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Invalid location data"
    );
  }

  // Validate category exists
  const categoryDoc = await db.collection("categories").doc(categoryId).get();
  if (!categoryDoc.exists) {
    throw new functions.https.HttpsError(
      "not-found",
      "Service category not found"
    );
  }

  const category = { id: categoryDoc.id, ...categoryDoc.data() };

  try {
    // Create service document
    const serviceRef = db.collection("services").doc();
    const serviceId = serviceRef.id;

    // Upload service images if provided
    let imageUrls = [];
    if (serviceImages && serviceImages.length > 0) {
      if (serviceImages.length > MAX_SERVICE_IMAGES) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          `Maximum ${MAX_SERVICE_IMAGES} service images allowed`
        );
      }
      imageUrls = await uploadImagesToStorage(
        serviceId,
        serviceImages,
        "images"
      );
    }

    // Upload service certificates if provided
    let certificateUrls = [];
    if (serviceCertificates && serviceCertificates.length > 0) {
      if (serviceCertificates.length > MAX_SERVICE_CERTIFICATES) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          `Maximum ${MAX_SERVICE_CERTIFICATES} service certificates allowed`
        );
      }
      certificateUrls = await uploadImagesToStorage(
        serviceId,
        serviceCertificates,
        "certificates"
      );
    }

    // Calculate commission
    const { commissionFee, commissionRate } = await calculateCommissionInfo(
      category.name,
      price
    );

    const timestamp = admin.firestore.FieldValue.serverTimestamp();

    const newService = {
      id: serviceId,
      providerId,
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
      imageUrls,
      certificateUrls,
      isVerifiedService: certificateUrls.length > 0,
      weeklySchedule: weeklySchedule || null,
      instantBookingEnabled: instantBookingEnabled || false,
      bookingNoticeHours: bookingNoticeHours || null,
      maxBookingsPerDay: maxBookingsPerDay || null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await serviceRef.set(newService);

    return { success: true, service: { ...newService, id: serviceId } };
  } catch (error) {
    console.error("Error creating service:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Get service by ID
 */
exports.getService = functions.https.onCall(async (data, context) => {
  const { serviceId } = data;

  if (!serviceId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Service ID is required"
    );
  }

  try {
    const serviceDoc = await db.collection("services").doc(serviceId).get();

    if (!serviceDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Service not found");
    }

    return { success: true, service: { id: serviceDoc.id, ...serviceDoc.data() } };
  } catch (error) {
    console.error("Error getting service:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Get services by provider
 */
exports.getServicesByProvider = functions.https.onCall(async (data, context) => {
  const { providerId } = data;

  if (!providerId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Provider ID is required"
    );
  }

  try {
    const servicesSnapshot = await db
      .collection("services")
      .where("providerId", "==", providerId)
      .get();

    const services = [];
    servicesSnapshot.forEach((doc) => {
      services.push({ id: doc.id, ...doc.data() });
    });

    return { success: true, services };
  } catch (error) {
    console.error("Error getting services by provider:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Get services by category
 */
exports.getServicesByCategory = functions.https.onCall(async (data, context) => {
  const { categoryId } = data;

  if (!categoryId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Category ID is required"
    );
  }

  try {
    // Validate category exists
    const categoryDoc = await db.collection("categories").doc(categoryId).get();
    if (!categoryDoc.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "Service category not found"
      );
    }

    const servicesSnapshot = await db
      .collection("services")
      .where("category.id", "==", categoryId)
      .get();

    const services = [];
    servicesSnapshot.forEach((doc) => {
      services.push({ id: doc.id, ...doc.data() });
    });

    return { success: true, services };
  } catch (error) {
    console.error("Error getting services by category:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Update service status
 */
exports.updateServiceStatus = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated"
    );
  }

  const { serviceId, status } = data;

  if (!serviceId || !status) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Service ID and status are required"
    );
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
      service.providerId !== context.auth.uid &&
      !context.auth.token.isAdmin
    ) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only the service provider or admin can update service status"
      );
    }

    await serviceRef.update({
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const updatedDoc = await serviceRef.get();
    return { success: true, service: { id: updatedDoc.id, ...updatedDoc.data() } };
  } catch (error) {
    console.error("Error updating service status:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Search services by location
 */
exports.searchServicesByLocation = functions.https.onCall(
  async (data, context) => {
    const { userLocation, maxDistance, categoryId } = data;

    if (!userLocation) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "User location is required"
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
        const service = { id: doc.id, ...doc.data() };
        const distance = calculateDistance(userLocation, service.location);

        if (!maxDistance || distance <= maxDistance) {
          service.distance = distance;
          services.push(service);
        }
      });

      // Sort by distance
      services.sort((a, b) => a.distance - b.distance);

      return { success: true, services };
    } catch (error) {
      console.error("Error searching services by location:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  }
);

/**
 * Update service
 */
exports.updateService = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated"
    );
  }

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
  } = data;

  if (!serviceId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Service ID is required"
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
      service.providerId !== context.auth.uid &&
      !context.auth.token.isAdmin
    ) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only the service provider or admin can update this service"
      );
    }

    const updates = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Update title if provided
    if (title !== undefined) {
      if (!validateTitle(title)) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          `Service title must be between ${MIN_TITLE_LENGTH} and ${MAX_TITLE_LENGTH} characters`
        );
      }
      updates.title = title;
    }

    // Update description if provided
    if (description !== undefined) {
      if (!validateDescription(description)) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          `Service description must be between ${MIN_DESCRIPTION_LENGTH} and ${MAX_DESCRIPTION_LENGTH} characters`
        );
      }
      updates.description = description;
    }

    // Update price and recalculate commission if provided
    if (price !== undefined) {
      if (!validatePrice(price)) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          `Service price must be between ₱${MIN_PRICE} and ₱${MAX_PRICE}`
        );
      }
      updates.price = price;

      // Recalculate commission
      const { commissionFee, commissionRate } = await calculateCommissionInfo(
        service.category.name,
        price
      );
      updates.commissionFee = commissionFee;
      updates.commissionRate = commissionRate;
    }

    // Update location if provided
    if (location !== undefined) {
      if (!validateLocation(location)) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Invalid location data"
        );
      }
      updates.location = location;
    }

    // Update category if provided
    if (categoryId !== undefined) {
      const categoryDoc = await db.collection("categories").doc(categoryId).get();
      if (!categoryDoc.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          "Service category not found"
        );
      }
      const category = { id: categoryDoc.id, ...categoryDoc.data() };
      updates.category = category;

      // Recalculate commission if category changed
      const currentPrice = price !== undefined ? price : service.price;
      const { commissionFee, commissionRate } = await calculateCommissionInfo(
        category.name,
        currentPrice
      );
      updates.commissionFee = commissionFee;
      updates.commissionRate = commissionRate;
    }

    // Update availability settings
    if (weeklySchedule !== undefined) {
      updates.weeklySchedule = weeklySchedule;
    }
    if (instantBookingEnabled !== undefined) {
      updates.instantBookingEnabled = instantBookingEnabled;
    }
    if (bookingNoticeHours !== undefined) {
      updates.bookingNoticeHours = bookingNoticeHours;
    }
    if (maxBookingsPerDay !== undefined) {
      updates.maxBookingsPerDay = maxBookingsPerDay;
    }

    await serviceRef.update(updates);

    const updatedDoc = await serviceRef.get();
    return { success: true, service: { id: updatedDoc.id, ...updatedDoc.data() } };
  } catch (error) {
    console.error("Error updating service:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Delete a service
 */
exports.deleteService = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated"
    );
  }

  const { serviceId } = data;

  if (!serviceId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Service ID is required"
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
      service.providerId !== context.auth.uid &&
      !context.auth.token.isAdmin
    ) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only the service provider or admin can delete this service"
      );
    }

    // Delete service images from storage
    if (service.imageUrls && service.imageUrls.length > 0) {
      await deleteImagesFromStorage(service.imageUrls);
    }

    // Delete service certificates from storage
    if (service.certificateUrls && service.certificateUrls.length > 0) {
      await deleteImagesFromStorage(service.certificateUrls);
    }

    // Delete the service document
    await serviceRef.delete();

    return { success: true, message: "Service deleted successfully" };
  } catch (error) {
    console.error("Error deleting service:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Get all services
 */
exports.getAllServices = functions.https.onCall(async (data, context) => {
  try {
    const servicesSnapshot = await db.collection("services").get();

    const services = [];
    servicesSnapshot.forEach((doc) => {
      services.push({ id: doc.id, ...doc.data() });
    });

    return { success: true, services };
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
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated"
    );
  }

  const { serviceId, serviceImages } = data;

  if (!serviceId || !serviceImages || serviceImages.length === 0) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Service ID and images are required"
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
    if (service.providerId !== context.auth.uid) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only the service provider can upload images"
      );
    }

    const currentImageCount = service.imageUrls ? service.imageUrls.length : 0;
    if (currentImageCount + serviceImages.length > MAX_SERVICE_IMAGES) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        `Maximum ${MAX_SERVICE_IMAGES} service images allowed. Current: ${currentImageCount}, trying to add: ${serviceImages.length}`
      );
    }

    // Upload new images
    const newImageUrls = await uploadImagesToStorage(
      serviceId,
      serviceImages,
      "images"
    );

    // Update service with new images
    const updatedImageUrls = [...(service.imageUrls || []), ...newImageUrls];

    await serviceRef.update({
      imageUrls: updatedImageUrls,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const updatedDoc = await serviceRef.get();
    return { success: true, service: { id: updatedDoc.id, ...updatedDoc.data() } };
  } catch (error) {
    console.error("Error uploading service images:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Remove specific image from service
 */
exports.removeServiceImage = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated"
    );
  }

  const { serviceId, imageUrl } = data;

  if (!serviceId || !imageUrl) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Service ID and image URL are required"
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
    if (service.providerId !== context.auth.uid) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only the service provider can remove images"
      );
    }

    if (!service.imageUrls || !service.imageUrls.includes(imageUrl)) {
      throw new functions.https.HttpsError(
        "not-found",
        "Image not found in service"
      );
    }

    // Delete image from storage
    await deleteImagesFromStorage([imageUrl]);

    // Remove image URL from service
    const updatedImageUrls = service.imageUrls.filter((url) => url !== imageUrl);

    await serviceRef.update({
      imageUrls: updatedImageUrls,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const updatedDoc = await serviceRef.get();
    return { success: true, service: { id: updatedDoc.id, ...updatedDoc.data() } };
  } catch (error) {
    console.error("Error removing service image:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Reorder service images
 */
exports.reorderServiceImages = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated"
    );
  }

  const { serviceId, orderedImageUrls } = data;

  if (!serviceId || !orderedImageUrls) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Service ID and ordered image URLs are required"
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
    if (service.providerId !== context.auth.uid) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only the service provider can reorder images"
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
        "Ordered URLs must match existing service images"
      );
    }

    await serviceRef.update({
      imageUrls: orderedImageUrls,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const updatedDoc = await serviceRef.get();
    return { success: true, service: { id: updatedDoc.id, ...updatedDoc.data() } };
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
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated"
      );
    }

    const { serviceId, serviceCertificates } = data;

    if (!serviceId || !serviceCertificates || serviceCertificates.length === 0) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Service ID and certificates are required"
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
      if (service.providerId !== context.auth.uid) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Only the service provider can upload certificates"
        );
      }

      const currentCertCount = service.certificateUrls
        ? service.certificateUrls.length
        : 0;
      if (currentCertCount + serviceCertificates.length > MAX_SERVICE_CERTIFICATES) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          `Maximum ${MAX_SERVICE_CERTIFICATES} service certificates allowed`
        );
      }

      // Upload new certificates
      const newCertUrls = await uploadImagesToStorage(
        serviceId,
        serviceCertificates,
        "certificates"
      );

      // Update service with new certificates
      const updatedCertUrls = [...(service.certificateUrls || []), ...newCertUrls];

      await serviceRef.update({
        certificateUrls: updatedCertUrls,
        isVerifiedService: updatedCertUrls.length > 0,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const updatedDoc = await serviceRef.get();
      return { success: true, service: { id: updatedDoc.id, ...updatedDoc.data() } };
    } catch (error) {
      console.error("Error uploading service certificates:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  }
);

/**
 * Remove specific certificate from service
 */
exports.removeServiceCertificate = functions.https.onCall(
  async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated"
      );
    }

    const { serviceId, certificateUrl } = data;

    if (!serviceId || !certificateUrl) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Service ID and certificate URL are required"
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
      if (service.providerId !== context.auth.uid) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Only the service provider can remove certificates"
        );
      }

      if (
        !service.certificateUrls ||
        !service.certificateUrls.includes(certificateUrl)
      ) {
        throw new functions.https.HttpsError(
          "not-found",
          "Certificate not found in service"
        );
      }

      // Delete certificate from storage
      await deleteImagesFromStorage([certificateUrl]);

      // Remove certificate URL from service
      const updatedCertUrls = service.certificateUrls.filter(
        (url) => url !== certificateUrl
      );

      await serviceRef.update({
        certificateUrls: updatedCertUrls,
        isVerifiedService: updatedCertUrls.length > 0,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const updatedDoc = await serviceRef.get();
      return { success: true, service: { id: updatedDoc.id, ...updatedDoc.data() } };
    } catch (error) {
      console.error("Error removing service certificate:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  }
);

/**
 * Verify service manually (admin function)
 */
exports.verifyService = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated"
    );
  }

  if (!context.auth.token.isAdmin) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only admins can verify services"
    );
  }

  const { serviceId, isVerified } = data;

  if (!serviceId || isVerified === undefined) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Service ID and verification status are required"
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
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const updatedDoc = await serviceRef.get();
    return { success: true, service: { id: updatedDoc.id, ...updatedDoc.data() } };
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
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated"
    );
  }

  if (!context.auth.token.isAdmin) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only admins can add categories"
    );
  }

  const { name, description, parentId, slug, imageUrl } = data;

  if (!name || !slug) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Name and slug are required"
    );
  }

  try {
    // Validate parent category if provided
    if (parentId) {
      const parentDoc = await db.collection("categories").doc(parentId).get();
      if (!parentDoc.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          "Parent category not found"
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

    return { success: true, category: newCategory };
  } catch (error) {
    console.error("Error adding category:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Get all categories
 */
exports.getAllCategories = functions.https.onCall(async (data, context) => {
  try {
    const categoriesSnapshot = await db.collection("categories").get();

    const categories = [];
    categoriesSnapshot.forEach((doc) => {
      categories.push({ id: doc.id, ...doc.data() });
    });

    return { success: true, categories };
  } catch (error) {
    console.error("Error getting all categories:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

// ============================================================================
// SERVICE PACKAGE MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Create a new service package
 */
exports.createServicePackage = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated"
    );
  }

  const { serviceId, title, description, price } = data;

  if (!serviceId || !title || !description || !price) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Service ID, title, description, and price are required"
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
    if (service.providerId !== context.auth.uid) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only the service provider can create packages"
      );
    }

    // Validate price
    if (!validatePrice(price)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        `Package price must be between ₱${MIN_PRICE} and ₱${MAX_PRICE}`
      );
    }

    // Calculate commission
    const { commissionFee, commissionRate } = await calculateCommissionInfo(
      service.category.name,
      price
    );

    const packageRef = db.collection("service_packages").doc();
    const timestamp = admin.firestore.FieldValue.serverTimestamp();

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

    return { success: true, package: newPackage };
  } catch (error) {
    console.error("Error creating service package:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Get all packages for a service
 */
exports.getServicePackages = functions.https.onCall(async (data, context) => {
  const { serviceId } = data;

  if (!serviceId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Service ID is required"
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
      packages.push({ id: doc.id, ...doc.data() });
    });

    return { success: true, packages };
  } catch (error) {
    console.error("Error getting service packages:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Get a specific package by ID
 */
exports.getPackage = functions.https.onCall(async (data, context) => {
  const { packageId } = data;

  if (!packageId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Package ID is required"
    );
  }

  try {
    const packageDoc = await db.collection("service_packages").doc(packageId).get();

    if (!packageDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Package not found");
    }

    return { success: true, package: { id: packageDoc.id, ...packageDoc.data() } };
  } catch (error) {
    console.error("Error getting package:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Update a service package
 */
exports.updateServicePackage = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated"
    );
  }

  const { packageId, title, description, price } = data;

  if (!packageId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Package ID is required"
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
    if (service.providerId !== context.auth.uid) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only the service provider can update packages"
      );
    }

    const updates = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
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
          `Package price must be between ₱${MIN_PRICE} and ₱${MAX_PRICE}`
        );
      }
      updates.price = price;

      // Recalculate commission
      const { commissionFee, commissionRate } = await calculateCommissionInfo(
        service.category.name,
        price
      );
      updates.commissionFee = commissionFee;
      updates.commissionRate = commissionRate;
    }

    await packageRef.update(updates);

    const updatedDoc = await packageRef.get();
    return { success: true, package: { id: updatedDoc.id, ...updatedDoc.data() } };
  } catch (error) {
    console.error("Error updating service package:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Delete a service package
 */
exports.deleteServicePackage = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated"
    );
  }

  const { packageId } = data;

  if (!packageId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Package ID is required"
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
    if (service.providerId !== context.auth.uid) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only the service provider can delete packages"
      );
    }

    await packageRef.delete();

    return { success: true, message: "Package deleted successfully" };
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
exports.getCommissionQuote = functions.https.onCall(async (data, context) => {
  const { categoryName, price } = data;

  if (!categoryName || !price) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Category name and price are required"
    );
  }

  try {
    const { commissionFee, commissionRate } = await calculateCommissionInfo(
      categoryName,
      price
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
exports.updateServiceRating = functions.https.onCall(async (data, context) => {
  const { serviceId, newRating, newReviewCount } = data;

  if (!serviceId || newRating === undefined || newReviewCount === undefined) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Service ID, rating, and review count are required"
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
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const updatedDoc = await serviceRef.get();
    return { success: true, service: { id: updatedDoc.id, ...updatedDoc.data() } };
  } catch (error) {
    console.error("Error updating service rating:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});
