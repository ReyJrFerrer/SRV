# Automatic Cache Clearing for Firebase Deployments

This document explains the multi-layered cache busting strategy implemented to automatically clear browser caches when deploying to Firebase.

## Overview

When deploying updates to Firebase Hosting, browsers may serve cached versions of your app, preventing users from seeing the latest changes. This solution implements multiple strategies to ensure users always get the latest version.

## Implementation Components

### 1. HTTP Cache Headers (firebase.json)

**Purpose**: Prevents browsers from caching HTML files

**What was changed**:

- Added cache-control headers for HTML files to prevent caching
- Kept asset caching (CSS, JS, images) for performance

```json
{
  "source": "**/*.@(html)",
  "headers": [
    {
      "key": "Cache-Control",
      "value": "no-cache, no-store, must-revalidate"
    },
    {
      "key": "Pragma",
      "value": "no-cache"
    },
    {
      "key": "Expires",
      "value": "0"
    }
  ]
}
```

### 2. HTML Meta Tags

**Purpose**: Additional layer of cache prevention at the HTML level

**What was changed**:

- Added meta tags to both `src/frontend/index.html` and `src/admin/index.html`

```html
<meta
  http-equiv="Cache-Control"
  content="no-cache, no-store, must-revalidate"
/>
<meta http-equiv="Pragma" content="no-cache" />
<meta http-equiv="Expires" content="0" />
```

### 3. Version Checker Utility

**Purpose**: Automatically detects new deployments and prompts users to reload

**Files created**:

- `src/frontend/src/utils/versionChecker.ts`
- `src/admin/src/utils/versionChecker.ts`

**How it works**:

1. Checks for a `version.json` file every 5 minutes
2. Compares the current version with the deployed version
3. Shows a user-friendly notification when a new version is detected
4. Clears all caches (Cache API, Service Workers, localStorage) before reload

**Features**:

- Non-intrusive notification with "Reload Now" and "Later" options
- Automatic cleanup of all browser caches
- Configurable check interval

### 4. Build-Time Version Generation

**Purpose**: Creates a version file during build that changes with each deployment

**Files created**:

- `src/frontend/scripts/generate-version.js`
- `src/admin/scripts/generate-version.js`

**What it does**:

- Generates a `version.json` file in the dist folder
- Contains build timestamp and version number
- Runs automatically during the build process

**Example version.json**:

```json
{
  "version": "1.0.0",
  "buildTime": "2025-11-09T10:30:00.000Z",
  "buildTimestamp": 1699527000000
}
```

### 5. Build Script Updates

**Purpose**: Automatically generates version file during build

**Modified files**:

- `src/frontend/package.json`
- `src/admin/package.json`

**Changes**:

```json
"build": "tsc && vite build && node ./scripts/generate-version.js"
```

## How It Works Together

1. **During Development**: Normal caching behavior for fast development
2. **During Build**: Version file is generated with current timestamp
3. **After Deployment**:
   - HTML files are never cached (HTTP headers + meta tags)
   - Assets (JS, CSS) are cached with hashed filenames for performance
   - Version checker periodically checks for new deployments
4. **When Update Detected**:
   - User sees a friendly notification
   - Can reload immediately or later
   - All caches are cleared before reload

## Deployment Workflow

No changes needed! The cache clearing happens automatically:

```bash
# Build your apps
cd src/frontend && npm run build
cd ../admin && npm run build

# Deploy to Firebase (from project root)
firebase deploy --only hosting
```

## Configuration

### Change Check Interval

Edit `versionChecker.ts` to change how often it checks for updates:

```typescript
const VERSION_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes (default)
// Change to: 10 * 60 * 1000 for 10 minutes
```

### Customize Notification

The notification styling can be customized in the `showUpdateNotification()` function in `versionChecker.ts`.

### Disable Version Checking

If needed, you can disable version checking by commenting out the initialization in `main.tsx`:

```typescript
// initVersionChecker(); // Commented out to disable
```

## Testing

### Test Locally

1. Build and deploy your app
2. Open the app in your browser
3. Open DevTools Console - you should see: `📦 App version: [timestamp]`
4. Make a change and rebuild
5. Deploy again
6. Wait 5 minutes (or force refresh the page multiple times)
7. The update notification should appear

### Force Check Manually

You can force a version check from the browser console:

```javascript
import { checkForUpdates } from "./utils/versionChecker";
const hasUpdate = await checkForUpdates();
console.log("Has update:", hasUpdate);
```

## Browser Support

- ✅ Chrome/Edge (full support)
- ✅ Firefox (full support)
- ✅ Safari (full support)
- ✅ Mobile browsers (full support)

## Benefits

1. **Automatic**: No manual cache clearing needed
2. **User-Friendly**: Clear notification when updates are available
3. **Performance**: Assets are still cached for fast loading
4. **Reliable**: Multiple layers ensure cache is always cleared
5. **Transparent**: Users are informed about updates

## Troubleshooting

### Version checker not working

1. Check if `version.json` exists in the deployed app: `https://your-app.web.app/version.json`
2. Check browser console for errors
3. Verify the build script ran successfully

### Users still seeing old version

1. Verify cache headers are applied (check Network tab in DevTools)
2. Try a hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
3. Clear browser cache manually once
4. Check if service workers are properly unregistered

### Notification not appearing

1. Check browser console for JavaScript errors
2. Verify `initVersionChecker()` is called in `main.tsx`
3. Wait at least 5 minutes for the first check to run

## Additional Notes

- The version.json file is small (~100 bytes) and has minimal impact on performance
- The periodic check happens in the background and doesn't affect UI performance
- Service workers from OneSignal are not affected by this implementation
- The solution works with HashRouter and BrowserRouter

## Future Enhancements

Possible improvements for the future:

1. Add analytics to track how many users reload after updates
2. Implement a "What's New" modal after reload
3. Add version comparison to show changelog
4. Store update notification preference in localStorage
5. Add a manual "Check for Updates" button in settings
