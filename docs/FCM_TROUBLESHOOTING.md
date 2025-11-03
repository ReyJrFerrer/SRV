# FCM Push Notifications Troubleshooting Guide

## Error: "Registration failed - push service error"

This error typically occurs due to Firebase/Google Cloud configuration issues.

## Step-by-Step Resolution

### 1. Enable Required APIs in Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project: **devsrv-rey**
3. Navigate to **APIs & Services** > **Library**
4. Search and enable the following APIs:
   - ✅ **Firebase Cloud Messaging API** (v1)
   - ✅ **Cloud Messaging** (Legacy)
   - ✅ **FCM Registration API**

**How to check if enabled:**
- Go to **APIs & Services** > **Dashboard**
- You should see these APIs listed as enabled

### 2. Verify Firebase Project Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **devsrv-rey**
3. Click **Project Settings** (gear icon)
4. Go to **Cloud Messaging** tab

**Required Configuration:**
- ✅ Server key (auto-generated)
- ✅ Sender ID: `851522429469`
- ✅ Web Push certificates (VAPID key pair)

### 3. Verify/Regenerate VAPID Key

**Current VAPID Key:**
```
BJsC4118PVulthWXC7mN1pWkxOG_0ao1my5QwoWj5Hjs7z1j5wOnekEYLeC20YBpbOJdicCRSlfH0adFCNx8vKs
```

**To verify or regenerate:**

1. In Firebase Console > **Project Settings** > **Cloud Messaging**
2. Scroll to **Web Push certificates**
3. You should see your key pair
4. If missing or invalid, click **Generate key pair**
5. Copy the new key and update both:
   - `src/frontend/.env`
   - `src/admin/.env`

```env
VITE_FIREBASE_VAPID_KEY=YOUR_NEW_KEY_HERE
```

### 4. Check Browser Permissions

**For Chrome/Brave/Vivaldi:**
1. Click the lock icon in address bar
2. Check **Notifications** permission
3. Should be "Allow" (green)
4. If blocked, click and change to "Allow"
5. Refresh the page

**For Safari:**
1. Safari > Settings > Websites > Notifications
2. Find `localhost:5173`
3. Set to "Allow"

### 5. Clear Cache and Service Workers

**Option A: Via DevTools**
1. Open DevTools (F12)
2. Go to **Application** tab
3. Click **Storage** > **Clear site data**
4. Check all boxes and click **Clear**
5. Go to **Service Workers** section
6. Click **Unregister** for all workers
7. Refresh page

**Option B: Via Browser Settings**
1. Chrome: `chrome://settings/content/notifications`
2. Find and remove `localhost:5173`
3. Go to `chrome://serviceworker-internals/`
4. Unregister all workers for localhost
5. Restart browser

### 6. Test FCM Configuration

Run this in your browser console to test FCM:

```javascript
// Test if FCM is properly configured
async function testFCM() {
  try {
    const registration = await navigator.serviceWorker.ready;
    console.log('✅ Service Worker ready:', registration.scope);
    
    const permission = await Notification.requestPermission();
    console.log('✅ Permission:', permission);
    
    if (permission !== 'granted') {
      console.error('❌ Permission denied');
      return;
    }
    
    // Import Firebase
    const { getMessaging, getToken } = await import('firebase/messaging');
    const messaging = getMessaging();
    
    const token = await getToken(messaging, {
      vapidKey: 'BJsC4118PVulthWXC7mN1pWkxOG_0ao1my5QwoWj5Hjs7z1j5wOnekEYLeC20YBpbOJdicCRSlfH0adFCNx8vKs',
      serviceWorkerRegistration: registration
    });
    
    console.log('✅ Token obtained:', token);
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testFCM();
```

### 7. Common Issues by Browser

#### Chrome/Brave/Vivaldi
- **Issue**: "Registration failed - push service error"
- **Fix**: 
  1. Enable FCM API in Google Cloud
  2. Clear all site data
  3. Ensure notification permission is granted
  4. Restart browser

#### Safari
- **Issue**: Notifications work initially but stop after a while
- **Fix**:
  1. Safari has stricter service worker lifecycle
  2. Check Safari > Settings > Websites > Notifications
  3. Ensure "Allow" is set permanently
  4. Clear website data and re-enable

#### Firefox
- **Issue**: Service worker registration issues
- **Fix**:
  1. Check `about:serviceworkers`
  2. Ensure push is enabled: `about:config` > `dom.push.enabled` = true
  3. Clear site data

### 8. Verify Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select project: **devsrv-rey**
3. Check **Billing** is enabled (required for FCM)
4. Check **Quotas** under IAM & Admin
5. Verify no quota limits are exceeded

### 9. Check Service Worker Scope

Your service workers should be:
- `sw.js` - Main service worker (scope: `/`)
- `firebase-messaging-sw.js` - FCM handler (scope: `/`)

**Verify:**
```javascript
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(reg => {
    console.log('Scope:', reg.scope);
    console.log('Active:', !!reg.active);
  });
});
```

### 10. Production Checklist

Before deploying to production:

- [ ] Firebase Cloud Messaging API enabled in Google Cloud
- [ ] Billing enabled on Google Cloud project
- [ ] VAPID key configured in environment variables
- [ ] Service workers properly registered
- [ ] HTTPS enabled (required for production)
- [ ] Notification permissions requested properly
- [ ] Background message handler configured
- [ ] Token refresh logic implemented
- [ ] Error handling and retry logic in place

## Still Not Working?

### Enable Detailed Logging

Add this to your browser console:

```javascript
localStorage.setItem('DEBUG', 'fcm:*');
```

Refresh and check console for detailed FCM logs.

### Check Firebase Console Logs

1. Go to Firebase Console > **Analytics** > **Dashboard**
2. Check for any errors or warnings
3. Go to **Cloud Messaging** > **Reports**
4. Look for delivery failures

### Contact Support

If all else fails:

1. Check Firebase Status: https://status.firebase.google.com/
2. Firebase Support: https://firebase.google.com/support
3. Stack Overflow: Tag with `firebase-cloud-messaging` and `web-push`

## Quick Checklist

Before asking for help, verify:

- ✅ FCM API enabled in Google Cloud
- ✅ VAPID key is correct and in .env files
- ✅ Browser notification permission granted
- ✅ Service workers registered and active
- ✅ No console errors about missing imports
- ✅ Tried in incognito/private mode
- ✅ Tested in multiple browsers
- ✅ Network requests to FCM endpoints succeed
- ✅ Firebase project has billing enabled

## Working Configuration

**Firebase Config:**
```javascript
{
  apiKey: "AIzaSyDRyQ38qXdEDDF1gcw33UhyAXocHAtnQzs",
  authDomain: "devsrv-rey.firebaseapp.com",
  projectId: "devsrv-rey",
  storageBucket: "devsrv-rey.firebasestorage.app",
  messagingSenderId: "851522429469",
  appId: "1:851522429469:web:e0737ae9bdedb4f27edcf4"
}
```

**VAPID Key:**
```
BJsC4118PVulthWXC7mN1pWkxOG_0ao1my5QwoWj5Hjs7z1j5wOnekEYLeC20YBpbOJdicCRSlfH0adFCNx8vKs
```
