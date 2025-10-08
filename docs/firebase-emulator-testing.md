# Firebase Emulator Testing Guide for Media Migration

## ✅ Yes, You Can Test with Firebase Emulator!

All media functions work perfectly with Firebase Emulator suite.

## Quick Start

```bash
# Start emulators
firebase emulators:start

# Your app will connect to:
# - Functions: http://localhost:5001
# - Storage: http://localhost:9199
# - Firestore: http://localhost:8080
# - Auth: http://localhost:9099
```

## What Works in Emulator

✅ **Cloud Functions** - All 12 media functions
✅ **Cloud Storage** - File uploads/downloads  
✅ **Firestore** - Metadata storage
✅ **Authentication** - User sessions
✅ **Security Rules** - Firestore & Storage rules

## Testing Workflow

### 1. Start Emulator

```bash
cd /path/to/your/project
firebase emulators:start
```

### 2. Update Frontend Config (if needed)

If not auto-detected, configure emulator connection:

```typescript
// src/frontend/src/firebase.ts
import { connectFunctionsEmulator } from 'firebase/functions';
import { connectStorageEmulator } from 'firebase/storage';
import { connectFirestoreEmulator } from 'firebase/firestore';

const functions = getFunctions(app);
const storage = getStorage(app);
const db = getFirestore(app);

if (location.hostname === 'localhost') {
  connectFunctionsEmulator(functions, 'localhost', 5001);
  connectStorageEmulator(storage, 'localhost', 9199);
  connectFirestoreEmulator(db, 'localhost', 8080);
}
```

### 3. Test Media Upload

```javascript
// Upload a test image
const file = document.getElementById('fileInput').files[0];
const result = await mediaService.uploadProfilePictureWithDescaling(file);

console.log('Uploaded to emulator:', result);
// URL will be like: http://localhost:9199/v0/b/...
```

### 4. View Uploaded Files

Open Emulator UI:
```
http://localhost:4000
```

Navigate to **Storage** tab to see uploaded files.

### 5. Check Function Logs

Function logs appear in terminal where emulator is running:
```
i  functions: Beginning execution of "uploadMedia"
✔  functions: Finished "uploadMedia" in 234ms
```

## Testing Each Function

### Upload Media
```typescript
const uploadMedia = httpsCallable(functions, 'uploadMedia');
const result = await uploadMedia({
  fileName: 'test.jpg',
  contentType: 'image/jpeg',
  mediaType: 'UserProfile',
  fileData: base64String
});
```

### Get Media Item
```typescript
const getMediaItem = httpsCallable(functions, 'getMediaItem');
const result = await getMediaItem({ mediaId: 'abc-123' });
```

### Delete Media
```typescript
const deleteMedia = httpsCallable(functions, 'deleteMedia');
const result = await deleteMedia({ mediaId: 'abc-123' });
```

## Emulator vs Production Differences

| Feature | Emulator | Production |
|---------|----------|------------|
| Storage URLs | `localhost:9199` | `storage.googleapis.com` |
| Data Persistence | Lost on restart | Persistent |
| File Size Limits | Same as production | Same |
| Authentication | Works normally | Works normally |
| Speed | ⚡ Very fast | Normal |
| Cost | 💰 Free | Pay per use |

## Common Issues

### Issue: Functions not found
**Solution**: Ensure functions are deployed to emulator
```bash
# Check emulator is running with functions
firebase emulators:start --only functions,storage,firestore
```

### Issue: CORS errors
**Solution**: CORS is automatically handled in emulator

### Issue: Files not appearing
**Solution**: Check Emulator UI at http://localhost:4000

### Issue: Authentication errors
**Solution**: Ensure auth emulator is running
```bash
firebase emulators:start --only auth,functions,storage,firestore
```

## Emulator Data Export/Import

### Export Data (for testing continuity)
```bash
firebase emulators:export ./emulator-data
```

### Import Data (restore test data)
```bash
firebase emulators:start --import=./emulator-data
```

## Debugging Tips

### 1. Enable Verbose Logging
```bash
export FIREBASE_FUNCTIONS_LOG_LEVEL=DEBUG
firebase emulators:start
```

### 2. Check Function Execution
Look for these in terminal:
```
>  functions: Beginning execution of "uploadMedia"
i  functions: Request: { fileName: "test.jpg", ... }
i  functions: Response: { success: true, ... }
```

### 3. Inspect Storage
Open Emulator UI → Storage → Browse files

### 4. Check Firestore Data
Open Emulator UI → Firestore → Browse collections

## Example: Full Upload Test

```typescript
// Complete test in your frontend
async function testMediaUpload() {
  try {
    // 1. Get file
    const file = document.getElementById('fileInput').files[0];
    
    // 2. Convert to base64
    const reader = new FileReader();
    const base64 = await new Promise((resolve) => {
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
    
    // 3. Upload via Cloud Function
    const uploadMedia = httpsCallable(functions, 'uploadMedia');
    const result = await uploadMedia({
      fileName: file.name,
      contentType: file.type,
      mediaType: 'UserProfile',
      fileData: base64
    });
    
    console.log('✅ Upload successful!');
    console.log('Media ID:', result.data.data.id);
    console.log('Public URL:', result.data.data.url);
    
    // 4. Verify file exists
    const img = document.createElement('img');
    img.src = result.data.data.url;
    document.body.appendChild(img);
    
    // 5. Get media item details
    const getMediaItem = httpsCallable(functions, 'getMediaItem');
    const details = await getMediaItem({ 
      mediaId: result.data.data.id 
    });
    console.log('Media details:', details.data.data);
    
    return result.data.data;
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run test
testMediaUpload();
```

## Performance Testing

Emulator is perfect for load testing:

```typescript
async function loadTest() {
  const files = Array(10).fill(null).map((_, i) => 
    createMockFile(`test-${i}.jpg`)
  );
  
  const startTime = Date.now();
  const results = await Promise.all(
    files.map(file => uploadFile(file))
  );
  const endTime = Date.now();
  
  console.log(`Uploaded ${files.length} files in ${endTime - startTime}ms`);
}
```

## Next Steps

1. ✅ Start emulator: `firebase emulators:start`
2. ✅ Test upload function with a real file
3. ✅ Verify file appears in Emulator UI
4. ✅ Test download/retrieval
5. ✅ Test delete function
6. ✅ Check all CRUD operations work
7. 🚀 Deploy to production when ready

## Production Deployment

When ready to go live:

```bash
# Deploy functions
firebase deploy --only functions

# Deploy storage rules
firebase deploy --only storage

# Deploy firestore rules
firebase deploy --only firestore:rules
```

## Resources

- [Firebase Emulator Docs](https://firebase.google.com/docs/emulator-suite)
- [Cloud Functions Docs](https://firebase.google.com/docs/functions)
- [Cloud Storage Docs](https://firebase.google.com/docs/storage)

---

**Pro Tip**: Keep emulator running during development. It's much faster than deploying to production for every test! 🚀
