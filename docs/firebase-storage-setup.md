# Firebase Storage Setup for Media Migration

This guide explains how to configure Firebase Cloud Storage for the media canister migration.

## Overview

The media canister has been migrated from Internet Computer to Firebase, using:

- **Cloud Storage** for file storage (images, PDFs)
- **Firestore** for metadata storage
- **Cloud Functions** for upload/download/delete operations

## Prerequisites

- Firebase project already created
- Firebase CLI installed
- Admin access to Firebase Console

## Configuration Steps

### 1. Enable Firebase Storage

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. In the left sidebar, click **Build** → **Storage**
4. Click **Get Started**
5. Choose production mode (security rules will be configured next)
6. Select a Cloud Storage location (preferably same region as your Functions)
7. Click **Done**

### 2. Configure Storage Security Rules

1. In Firebase Console, go to **Storage** → **Rules** tab
2. Replace the default rules with the following:

```javascript
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    // Helper function to check if user is admin
    function isAdmin() {
      return request.auth.token.isAdmin == true;
    }

    // Helper function to check if user owns the file
    function isOwner(userId) {
      return request.auth.uid == userId;
    }

    // User profile pictures
    match /users/{userId}/{fileName} {
      // Anyone authenticated can read
      allow read: if request.auth != null;
      // Only owner or admin can write/delete
      allow write, delete: if isOwner(userId) || isAdmin();
    }

    // Service images
    match /services/{providerId}/{fileName} {
      // Anyone authenticated can read
      allow read: if request.auth != null;
      // Only provider or admin can write/delete
      allow write, delete: if isOwner(providerId) || isAdmin();
    }

    // Service certificates
    match /certificates/{providerId}/{fileName} {
      // Anyone authenticated can read
      allow read: if request.auth != null;
      // Only provider or admin can write/delete
      allow write, delete: if isOwner(providerId) || isAdmin();
    }

    // Remittance payment proofs
    match /remittance/{userId}/{fileName} {
      // Only owner or admin can read
      allow read: if isOwner(userId) || isAdmin();
      // Only owner or admin can write/delete
      allow write, delete: if isOwner(userId) || isAdmin();
    }
  }
}
```

3. Click **Publish**

### 3. Configure Storage CORS (for Web Access)

To allow your web app to access Storage files, you need to configure CORS:

1. Install Google Cloud SDK if not already installed:

   ```bash
   # macOS
   brew install google-cloud-sdk

   # Or download from: https://cloud.google.com/sdk/docs/install
   ```

2. Create a CORS configuration file `storage-cors.json`:

   ```json
   [
     {
       "origin": ["*"],
       "method": ["GET", "HEAD", "PUT", "POST", "DELETE"],
       "maxAgeSeconds": 3600,
       "responseHeader": ["Content-Type", "Access-Control-Allow-Origin"]
     }
   ]
   ```

3. Apply CORS configuration:

   ```bash
   # Authenticate with Google Cloud
   gcloud auth login

   # Set your project
   gcloud config set project YOUR_PROJECT_ID

   # Apply CORS configuration
   gsutil cors set storage-cors.json gs://YOUR_PROJECT_ID.appspot.com
   ```

   Replace `YOUR_PROJECT_ID` with your actual Firebase project ID.

### 4. Update Firebase Configuration in Your App

Ensure your frontend has the Firebase Storage SDK initialized:

**Frontend (`src/frontend/src/firebase.ts` or similar):**

```typescript
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com", // Important: Add this
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app); // Export storage instance
export const functions = getFunctions(app);
```

### 5. Deploy Updated Functions

Deploy the new media functions:

```bash
cd functions
npm install uuid
cd ..
firebase deploy --only functions
```

### 6. Deploy Firestore Rules

Deploy the updated Firestore security rules:

```bash
firebase deploy --only firestore:rules
```

### 7. Deploy Storage Rules

Deploy the Storage security rules:

```bash
firebase deploy --only storage
```

## Storage Structure

The Cloud Storage bucket will have the following structure:

```
gs://YOUR_PROJECT_ID.appspot.com/
├── users/
│   └── {userId}/
│       └── {mediaId}_{filename} (profile pictures)
├── services/
│   └── {providerId}/
│       └── {mediaId}_{filename} (service images)
├── certificates/
│   └── {providerId}/
│       └── {mediaId}_{filename} (service certificates - PDF/images)
└── remittance/
    └── {userId}/
        └── {mediaId}_{filename} (payment proofs)
```

## File Size Limits

The following size limits are enforced:

- **User Profile Images**: 450 KB
- **Service Images**: 450 KB
- **Service Certificates**: 450 KB
- **Remittance Payment Proofs**: 1 MB

## Supported File Types

- **Images**: JPEG, JPG, PNG, GIF, WebP, BMP, SVG
- **Documents**: PDF (for certificates and remittance proofs)

## Testing

### Test Upload Function

You can test the upload function using the Firebase Console or your frontend:

```javascript
import { getFunctions, httpsCallable } from "firebase/functions";

const functions = getFunctions();
const uploadMedia = httpsCallable(functions, "uploadMedia");

// Convert file to base64
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};

// Upload a file
const file = document.getElementById("fileInput").files[0];
const base64Data = await fileToBase64(file);

const result = await uploadMedia({
  fileName: file.name,
  contentType: file.type,
  mediaType: "UserProfile", // or 'ServiceImage', 'ServiceCertificate', 'RemittancePaymentProof'
  fileData: base64Data,
});

console.log("Upload result:", result.data);
```

## Monitoring

### View Storage Usage

1. Go to Firebase Console → **Storage** → **Usage** tab
2. Monitor:
   - Total storage used
   - Download bandwidth
   - Upload bandwidth
   - Number of files

### View Storage Costs

1. Go to Firebase Console → **Usage and billing**
2. Check Storage costs under:
   - Stored data (GB/month)
   - Download bandwidth (GB/month)

### Storage Pricing (As of 2024)

**Free Tier (Spark Plan):**

- 5 GB stored
- 1 GB/day download bandwidth

**Blaze Plan (Pay as you go):**

- $0.026 per GB stored per month
- $0.12 per GB downloaded

## Migration Notes

### Differences from Canister Implementation

1. **File Storage**: Files are now stored in Cloud Storage instead of canister memory
2. **URL Format**: URLs are now standard HTTPS URLs instead of `/media/{id}` format
3. **Public Access**: Files are publicly accessible by default (adjust Storage rules if needed)
4. **File Retrieval**: `getFileData` now returns a URL instead of raw bytes

### Compatibility with Frontend Services

The Cloud Functions maintain compatibility with existing frontend services:

- `mediaService.ts` can continue using the same function signatures
- `mediaServiceCanister.ts` calls are now redirected to Cloud Functions
- File upload/download workflows remain the same from frontend perspective

### Required Frontend Updates

Update your media service to call Cloud Functions instead of canisters:

```typescript
import { getFunctions, httpsCallable } from "firebase/functions";

const functions = getFunctions();

export const uploadMedia = async (
  fileName,
  contentType,
  mediaType,
  fileData,
) => {
  const uploadFn = httpsCallable(functions, "uploadMedia");
  return await uploadFn({
    fileName,
    contentType,
    mediaType,
    fileData,
  });
};

export const getMediaItem = async (mediaId) => {
  const getFn = httpsCallable(functions, "getMediaItem");
  return await getFn({ mediaId });
};

// ... other functions
```

## Troubleshooting

### CORS Errors

If you see CORS errors when accessing Storage files:

1. Verify CORS configuration is applied (Step 3)
2. Check that `storageBucket` is set in Firebase config
3. Ensure Storage rules allow read access

### Upload Failures

If uploads fail:

1. Check file size limits
2. Verify file type is supported
3. Check Firebase Authentication is working
4. View Cloud Function logs in Firebase Console

### Permission Denied

If you get permission errors:

1. Verify user is authenticated
2. Check Firestore security rules for `media` collection
3. Check Storage security rules
4. Verify user owns the resource or is admin

## Next Steps

1. **Update Frontend**: Modify `mediaService.ts` to call Cloud Functions
2. **Test All Operations**: Test upload, download, delete, update
3. **Monitor Usage**: Keep an eye on Storage costs
4. **Optimize**: Consider implementing:
   - Image compression/resizing
   - Thumbnail generation
   - CDN integration for faster delivery
   - Caching strategies

## Support

For issues or questions:

1. Check Firebase Console logs: **Functions** → **Logs**
2. Check Storage logs: **Storage** → **Usage** tab
3. Review [Firebase Storage documentation](https://firebase.google.com/docs/storage)
