# Missing Firebase Cloud Functions for Admin Service

This document lists functions in `adminServiceCanister.ts` that **do not** have corresponding Firebase Cloud Functions implementations. These functions still rely on canister calls and need Firebase implementations to be created.

## ✅ Already Migrated to Firebase
The following functions have been successfully updated to use Firebase Cloud Functions:

### Commission Rules Management
- ✅ `upsertCommissionRules` → calls `upsertCommissionRules`
- ✅ `listRules` → calls `listRules`
- ✅ `getRule` → calls `getRule`
- ✅ `activateRule` → calls `activateRule`
- ✅ `deactivateRule` → calls `deactivateRule`

### Role Management
- ✅ `assignRole` → calls `assignRole`
- ✅ `removeRole` → calls `removeRole`
- ✅ `getUserRole` → calls `getUserRole`
- ✅ `listUserRoles` → calls `listUserRoles`
- ✅ `hasAdminRole` → calls `hasRole`
- ✅ `checkAdminRole` → calls `hasRole` internally

### Settings & Stats
- ✅ `setSettings` → calls `setSettings`
- ✅ `getSettings` → calls `getSettings`
- ✅ `getSystemStats` → calls `getSystemStats`

### User Management
- ✅ `getAllUsers` → calls `getAllUsers`
- ✅ `getUserServicesAndBookings` → calls `getUserServicesAndBookings`
- ✅ `getUserServiceCount` → calls `getUserServiceCount`
- ✅ `lockUserAccount` → calls `lockUserAccount`
- ✅ `deleteUserAccount` → calls `deleteUserAccount`
- ✅ `updateUserReputation` → calls `updateUserReputation`
- ✅ `updateUserCommission` → calls `updateUserCommission`

### Certificate Validation
- ✅ `updateCertificateValidationStatus` → calls `updateCertificateValidationStatus`
- ✅ `getValidatedCertificates` → calls `getValidatedCertificates`
- ✅ `getRejectedCertificates` → calls `getRejectedCertificates`

---

## ❌ Missing Firebase Cloud Functions

The following functions in `adminServiceCanister.ts` **DO NOT** have Firebase Cloud Function equivalents and still use canister calls:

### Service Management
1. **`deleteService(serviceId: string)`**
   - Currently: Calls service canister directly
   - Needs: Firebase function in `functions/src/service.js` (already exists as `deleteService` but admin may need wrapper)
   - Status: `deleteService` exists in Firebase but not exposed/used by admin

2. **`getServicePackages(serviceId: string)`**
   - Currently: Calls admin/service canister
   - Needs: Firebase function - already exists as `getServicePackages` in service.js
   - Status: Available in Firebase, admin should call it directly

3. **`getServiceData(serviceId: string)`**
   - Currently: Calls service canister with complex conversion logic
   - Needs: Firebase function - already exists as `getService` in service.js
   - Status: Available in Firebase, admin should call it directly

### Analytics & User Data
4. **`getUserAnalytics(userId: string)`**
   - Currently: Calls booking canister for provider analytics
   - Returns: `{ totalEarnings, completedJobs, totalJobs, completionRate, averageRating, totalReviews }`
   - Needs: New Firebase function in `functions/src/booking.js` or `functions/src/admin.js`
   - Note: Partial data available from `getClientAnalytics` but not provider-focused
   - **Status: MISSING - needs to be created**

5. **`getUserReviews(userId: string)`**
   - Currently: Calls review canister
   - Returns: `{ averageRating, totalReviews }`
   - Needs: Firebase function - already exists as `getUserReviews` and `calculateUserAverageRating` in review.js
   - Status: Available in Firebase, admin should combine these

6. **`getUserReputation(userId: string)`**
   - Currently: Calls reputation canister
   - Returns: `{ reputationScore, trustLevel, completedBookings }`
   - Needs: Firebase function in `functions/src/reputation.js`
   - Note: `getReputationScore` exists but may not return all fields
   - **Status: PARTIALLY MISSING - may need enhancement**

7. **`getUserBookings(userId: string)`**
   - Currently: Calls admin canister, then enriches with provider/service names
   - Returns: Complex booking array with names
   - Needs: Enhanced Firebase function (booking data exists via `getClientBookings`/`getProviderBookings`)
   
   - **Status: MISSING - needs admin-specific enrichment logic**
### Certificate Validation (Canister-based)
9. **`getServicesWithCertificates()`**
   - Currently: Calls admin canister
   - Needs: Firebase function to query services with certificates
   - **Status: MISSING - needs to be created**

10. **`getPendingCertificateValidations()`**
    - Currently: Calls admin canister
    - Needs: Firebase function to get pending validations
    - **Status: MISSING - needs to be created**

11. **`validateCertificate(validationId, approved, reason?)`**
    - Currently: Calls admin canister
    - Needs: Firebase function for certificate approval workflow
    - **Status: MISSING - needs to be created**

---

## 📋 Action Items

### High Priority (Core Admin Functions)
1. **Create `getUserAnalytics` in Firebase** (`functions/src/admin.js` or `functions/src/booking.js`)
   - Aggregate provider analytics data
   - Return earnings, jobs, completion rate

2. **Create `getUserBookings` admin wrapper in Firebase** (`functions/src/admin.js`)
   - Fetch bookings for user
   - Enrich with provider/service names
   - Return formatted booking history

3. **Create `getUserCommissionData` in Firebase** (`functions/src/commission.js`)
   - Calculate commission analytics for providers
   - Return pending, settled, outstanding amounts

### Medium Priority (Analytics Enhancement)
4. **Enhance `getReputationScore` in Firebase** (`functions/src/reputation.js`)
   - Ensure it returns `reputationScore`, `trustLevel`, `completedBookings`
   - Or create separate `getUserReputation` function

5. **Create certificate validation workflow functions**:
   - `getServicesWithCertificates`
   - `getPendingCertificateValidations`
   - `validateCertificate`

### Low Priority (Already Available, Just Need Integration)
6. **Update admin to use existing Firebase functions**:
   - Use `getService` instead of `getServiceData` (with proper conversion)
   - Use `getServicePackages` directly
   - Use `getUserReviews` + `calculateUserAverageRating` combination

---

## 🔧 Implementation Notes

### For Functions that Already Exist in Firebase
- Admin just needs to call them via `callFirebaseFunction` helper
- May need response format conversion to match expected types

### For Functions that Need to be Created
Follow the migration patterns established in `/functions/src/admin.js`:

```javascript
exports.functionName = functions.https.onCall(async (data, context) => {
  // Extract payload from data.data
  const payload = data.data || data;
  const { param1, param2 } = payload;

  // Authentication
  const authInfo = getAuthInfo(context, data);
  if (!authInfo.hasAuth || !authInfo.isAdmin) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only ADMIN users can access this function"
    );
  }

  try {
    // Business logic using Firestore
    // Return success response
    return { success: true, data: result };
  } catch (error) {
    console.error("Error in functionName:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});
```

---

## 📝 Summary Statistics

- **Total Admin Functions**: 28
- **Migrated to Firebase**: 18 ✅
- **Missing Firebase Functions**: 10 ❌
- **Migration Progress**: 64%

### Breakdown:
- **Commission Rules**: 5/5 ✅ (100%)
- **Role Management**: 6/6 ✅ (100%)
- **Settings & Stats**: 3/3 ✅ (100%)
- **User Management**: 7/7 ✅ (100%)
- **Certificate Validation**: 3/6 ✅ (50%)
- **Service Management**: 0/3 ❌ (0% - but functions exist, just need to be called)
- **Analytics & User Data**: 0/5 ❌ (0% - need to be created)
