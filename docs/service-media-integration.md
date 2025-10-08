# Service.js and Media.js Integration Guide

## Overview

The `service.js` Cloud Functions now integrate seamlessly with `media.js` for consistent media handling across your application. This ensures all media uploads are properly tracked with metadata in Firestore.

## What Changed

### Before (Direct Storage Uploads)
```javascript
// Old approach - direct Storage uploads without metadata
async function uploadImagesToStorage(serviceId, images, folder) {
  const bucket = admin.storage().bucket();
  const uploadedUrls = [];
  
  for (const image of images) {
    const filePath = `services/${serviceId}/${folder}/${fileName}`;
    const file = bucket.file(filePath);
    await file.save(buffer, { metadata: { contentType } });
    await file.makePublic();
    uploadedUrls.push(publicUrl);
  }
  
  return uploadedUrls; // Only URLs, no metadata
}
```

**Problems:**
- ❌ No metadata stored in Firestore
- ❌ No media ID tracking
- ❌ Inconsistent with media.js uploads
- ❌ Can't query or manage media easily
- ❌ No validation status for certificates

### After (Integrated with Media.js)
```javascript
// New approach - uses media.js for consistent handling
async function uploadImagesToStorage(ownerId, images, mediaType) {
  const uploadedMedia = [];
  
  for (const image of images) {
    const {fileName, contentType, fileData} = image;
    
    // Call media.js internal function
    const mediaItem = await uploadMediaInternal({
      fileName,
      contentType,
      mediaType, // "ServiceImage" or "ServiceCertificate"
      fileData,
      ownerId,
    });
    
    uploadedMedia.push(mediaItem);
  }
  
  return uploadedMedia; // Full media objects with metadata
}
```

**Benefits:**
- ✅ Metadata stored in Firestore `media` collection
- ✅ Each upload gets unique media ID
- ✅ Consistent with all other media uploads
- ✅ Can query and manage via media.js functions
- ✅ Validation status tracked for certificates
- ✅ User media index maintained

## Integration Details

### 1. Import Media.js Functions

```javascript
// At the top of service.js
const {
  uploadMediaInternal,
  deleteMediaInternal,
} = require("./media");
```

### 2. Upload Integration

**Service Creation (createService):**
```javascript
// Upload service images
let imageMedia = [];
if (serviceImages && serviceImages.length > 0) {
  imageMedia = await uploadImagesToStorage(
    providerId,          // Owner ID
    serviceImages,       // Image data
    "ServiceImage"       // Media type
  );
}

// Upload service certificates
let certificateMedia = [];
if (serviceCertificates && serviceCertificates.length > 0) {
  certificateMedia = await uploadImagesToStorage(
    providerId,
    serviceCertificates,
    "ServiceCertificate"
  );
}

// Store both URLs and full media metadata
const newService = {
  // ... other fields
  imageUrls: imageMedia.map((m) => m.url),
  imageMedia: imageMedia, // NEW: Full metadata
  certificateUrls: certificateMedia.map((m) => m.url),
  certificateMedia: certificateMedia, // NEW: Full metadata
};
```

**Adding Images to Existing Service (uploadServiceImages):**
```javascript
// Upload new images
const newImageMedia = await uploadImagesToStorage(
  service.providerId,
  serviceImages,
  "ServiceImage"
);

// Merge with existing
const existingImageMedia = service.imageMedia || [];
const updatedImageMedia = [...existingImageMedia, ...newImageMedia];
const updatedImageUrls = updatedImageMedia.map((m) => m.url);

// Update service
await serviceRef.update({
  imageUrls: updatedImageUrls,
  imageMedia: updatedImageMedia, // Store metadata
  updatedAt: new Date().toISOString(),
});
```

### 3. Delete Integration

**Removing Single Image (removeServiceImage):**
```javascript
// Find the media item to delete
const imageMedia = service.imageMedia || [];
const mediaToDelete = imageMedia.find((m) => m.url === imageUrl);

if (mediaToDelete) {
  // Delete from Storage AND Firestore metadata
  await deleteImagesFromStorage([mediaToDelete]);
}

// Update service
const updatedImageMedia = imageMedia.filter((m) => m.url !== imageUrl);
await serviceRef.update({
  imageUrls: updatedImageMedia.map((m) => m.url),
  imageMedia: updatedImageMedia,
});
```

**Deleting Entire Service (deleteService):**
```javascript
// Delete all media items with metadata cleanup
if (service.imageMedia && service.imageMedia.length > 0) {
  await deleteImagesFromStorage(service.imageMedia);
}

if (service.certificateMedia && service.certificateMedia.length > 0) {
  await deleteImagesFromStorage(service.certificateMedia);
}
```

## Database Schema Updates

### Service Document Structure

```javascript
{
  id: "service-123",
  providerId: "user-456",
  
  // Legacy URL arrays (kept for backward compatibility)
  imageUrls: [
    "https://storage.googleapis.com/.../uuid1_image1.jpg",
    "https://storage.googleapis.com/.../uuid2_image2.jpg"
  ],
  certificateUrls: [
    "https://storage.googleapis.com/.../uuid3_cert1.pdf"
  ],
  
  // NEW: Full media metadata arrays
  imageMedia: [
    {
      id: "uuid1",
      url: "https://storage.googleapis.com/.../uuid1_image1.jpg",
      fileName: "image1.jpg",
      contentType: "image/jpeg",
      fileSize: 245000,
      mediaType: "ServiceImage",
      ownerId: "user-456",
      createdAt: "2025-10-08T12:00:00Z",
      updatedAt: "2025-10-08T12:00:00Z"
    },
    {
      id: "uuid2",
      url: "https://storage.googleapis.com/.../uuid2_image2.jpg",
      // ... more metadata
    }
  ],
  
  certificateMedia: [
    {
      id: "uuid3",
      url: "https://storage.googleapis.com/.../uuid3_cert1.pdf",
      fileName: "cert1.pdf",
      contentType: "application/pdf",
      fileSize: 180000,
      mediaType: "ServiceCertificate",
      ownerId: "user-456",
      validationStatus: "Pending", // Pending/Validated/Rejected
      createdAt: "2025-10-08T12:00:00Z",
      updatedAt: "2025-10-08T12:00:00Z"
    }
  ],
  
  // ... other service fields
}
```

### Media Collection (Firestore)

Each upload creates a document in `media` collection:

```javascript
// Collection: media/{mediaId}
{
  id: "uuid1",
  url: "https://storage.googleapis.com/.../uuid1_image1.jpg",
  fileName: "image1.jpg",
  contentType: "image/jpeg",
  fileSize: 245000,
  mediaType: "ServiceImage",
  ownerId: "user-456",
  createdAt: "2025-10-08T12:00:00Z",
  updatedAt: "2025-10-08T12:00:00Z"
}
```

### User Media Index (Firestore)

Each upload also creates an index entry:

```javascript
// Collection: users/{ownerId}/media/{mediaId}
{
  mediaId: "uuid1",
  url: "https://storage.googleapis.com/.../uuid1_image1.jpg",
  mediaType: "ServiceImage",
  createdAt: "2025-10-08T12:00:00Z"
}
```

## API Response Changes

### createService Response

**Before:**
```json
{
  "success": true,
  "service": {
    "id": "service-123",
    "imageUrls": ["https://..."],
    "certificateUrls": ["https://..."]
  }
}
```

**After:**
```json
{
  "success": true,
  "service": {
    "id": "service-123",
    "imageUrls": ["https://..."],
    "imageMedia": [
      {
        "id": "uuid1",
        "url": "https://...",
        "fileName": "image.jpg",
        "contentType": "image/jpeg",
        "fileSize": 245000,
        "mediaType": "ServiceImage",
        "ownerId": "user-456"
      }
    ],
    "certificateUrls": ["https://..."],
    "certificateMedia": [
      {
        "id": "uuid2",
        "url": "https://...",
        "validationStatus": "Pending"
      }
    ]
  }
}
```

## Benefits of Integration

### 1. Consistent Media Management
All media uploads go through the same validation, storage, and metadata tracking pipeline.

### 2. Better Querying
```javascript
// Get all ServiceImages for a provider
const images = await db.collection("media")
  .where("ownerId", "==", providerId)
  .where("mediaType", "==", "ServiceImage")
  .get();

// Get all pending certificates
const pendingCerts = await db.collection("media")
  .where("mediaType", "==", "ServiceCertificate")
  .where("validationStatus", "==", "Pending")
  .get();
```

### 3. Certificate Validation Workflow
```javascript
// Admins can now validate certificates using media.js functions
const updateStatus = httpsCallable(functions, "updateCertificateValidationStatus");
await updateStatus({
  mediaId: "uuid3",
  status: "Validated"
});

// This automatically updates the certificate metadata
```

### 4. Storage Analytics
```javascript
// Get storage statistics per user
const stats = httpsCallable(functions, "getStorageStats");
const result = await stats({ ownerId: "user-456" });

console.log(result.data);
// {
//   totalFiles: 15,
//   totalSize: 3500000,
//   byType: {
//     "ServiceImage": { count: 10, size: 2500000 },
//     "ServiceCertificate": { count: 5, size: 1000000 }
//   }
// }
```

### 5. Cleanup and Maintenance
```javascript
// Delete all media for a user (GDPR compliance)
const userMedia = await db.collection("users")
  .doc(userId)
  .collection("media")
  .get();

for (const doc of userMedia.docs) {
  await deleteMediaInternal(doc.data().mediaId);
}
```

## Migration Notes

### Existing Services
Existing service documents may only have `imageUrls` and `certificateUrls` arrays without the `imageMedia` and `certificateMedia` fields.

**Handling in Code:**
```javascript
// Always check for both old and new formats
const imageMedia = service.imageMedia || [];
const imageUrls = service.imageUrls || [];

// If only URLs exist, they still work for display
// New uploads will use the new format
```

### Gradual Migration
You can create a migration script to backfill `imageMedia` and `certificateMedia`:

```javascript
// Migration script (one-time)
const services = await db.collection("services").get();

for (const serviceDoc of services.docs) {
  const service = serviceDoc.data();
  
  // For services with only URLs, create metadata
  if (service.imageUrls && !service.imageMedia) {
    const imageMedia = service.imageUrls.map(url => ({
      id: extractMediaIdFromUrl(url),
      url: url,
      // Other fields can be null or default values
    }));
    
    await serviceDoc.ref.update({ imageMedia });
  }
}
```

## Testing

### Test Service Creation with Media
```javascript
const createService = httpsCallable(functions, "createService");

const result = await createService({
  title: "Test Service",
  description: "Test description",
  categoryId: "cat-001",
  price: 1000,
  location: { latitude: 14.5995, longitude: 120.9842, address: "Manila" },
  serviceImages: [
    {
      fileName: "test.jpg",
      contentType: "image/jpeg",
      fileData: base64ImageData
    }
  ],
  serviceCertificates: [
    {
      fileName: "cert.pdf",
      contentType: "application/pdf",
      fileData: base64PdfData
    }
  ]
});

console.log("Created service:", result.data.service);
console.log("Image metadata:", result.data.service.imageMedia);
console.log("Certificate metadata:", result.data.service.certificateMedia);
```

### Verify Media Collection
```javascript
// Check that media metadata was created
const mediaId = result.data.service.imageMedia[0].id;
const mediaDoc = await db.collection("media").doc(mediaId).get();

console.log("Media metadata exists:", mediaDoc.exists);
console.log("Media data:", mediaDoc.data());
```

### Test Certificate Validation
```javascript
// Get pending certificates
const getCerts = httpsCallable(functions, "getCertificatesByValidationStatus");
const pending = await getCerts({ status: "Pending" });

console.log("Pending certificates:", pending.data.data);

// Validate a certificate (admin only)
const validateCert = httpsCallable(functions, "updateCertificateValidationStatus");
await validateCert({
  mediaId: certMediaId,
  status: "Validated"
});
```

## Troubleshooting

### Issue: "uploadMediaInternal is not a function"
**Solution:** Make sure you're importing from the correct path:
```javascript
const {uploadMediaInternal, deleteMediaInternal} = require("./media");
```

### Issue: Media metadata not appearing in service
**Solution:** Check that you're storing the full media array:
```javascript
await serviceRef.update({
  imageUrls: imageMedia.map((m) => m.url),
  imageMedia: imageMedia, // Don't forget this!
});
```

### Issue: Old services don't have imageMedia field
**Solution:** Handle gracefully in your code:
```javascript
const imageMedia = service.imageMedia || [];
// Use imageUrls as fallback if needed
```

## Next Steps

1. ✅ Service.js now integrated with media.js
2. ✅ All uploads tracked with metadata
3. ⏳ Update frontend to use new media metadata (optional)
4. ⏳ Create migration script for existing services (optional)
5. ⏳ Add admin UI for certificate validation

---

**Key Takeaway:** Service uploads now go through media.js for consistent, trackable, and manageable media handling across your entire application! 🎉
