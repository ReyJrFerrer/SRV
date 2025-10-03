# OTP Phone Number Verification with Firebase Auth - Setup Guide

This guide explains how to implement OTP phone number verification using Firebase Authentication in your SRV project.

## 📋 Overview

The implementation adds phone number verification to your user registration process using Firebase Auth's phone authentication provider. Users must verify their phone number before creating their profile.

## 🔧 Setup Steps

### 1. Firebase Console Configuration

1. **Enable Phone Authentication:**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project (e.g., `devsrv-rey`)
   - Go to **Authentication** → **Sign-in method**
   - Enable **Phone** provider
   - Add your domain to authorized domains if needed

2. **Enable reCAPTCHA (required for web):**
   - Phone auth on web requires reCAPTCHA verification
   - This is automatically handled by Firebase
   - No additional setup needed for basic implementation

3. **Get Firebase Config:**
   - Go to **Project Settings** (gear icon)
   - Scroll to "Your apps" section
   - If you don't have a web app, click "Add app" → Web
   - Copy the config object values

### 2. Environment Variables

Create a `.env.local` file in your frontend directory:

```bash
# Required Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 3. Install Dependencies

The Firebase SDK has already been installed:

```bash
npm install firebase
```

## 📱 How It Works

### User Flow

1. **Role Selection:** User selects Client or Service Provider
2. **Name Input:** User enters their full name
3. **Phone Verification:**
   - User enters phone number (Philippine format: 09xxxxxxxxx)
   - Firebase sends SMS with 6-digit code
   - User enters verification code
   - System verifies code with Firebase
4. **Profile Creation:** Only after phone verification, user can create profile

### Technical Implementation

#### Services Created

1. **`firebaseAuth.ts`** - Core Firebase Auth service
   - Initializes Firebase with your config
   - Handles reCAPTCHA setup
   - Manages OTP sending and verification
   - Formats phone numbers to international format

2. **`phoneVerification.ts`** - Higher-level verification service
   - Manages verification workflow
   - Handles state management
   - Provides user-friendly error messages
   - Manages resend cooldowns

#### Components Created

1. **`OtpInput.tsx`** - Reusable OTP input component
   - 6-digit code input with auto-focus
   - Supports paste functionality
   - Keyboard navigation (arrows, backspace)
   - Visual feedback for errors

2. **`PhoneVerification.tsx`** - Complete verification flow
   - Phone number input with validation
   - OTP code entry
   - Resend functionality with cooldown
   - Error handling and success states

## 🔐 Security Features

- **reCAPTCHA Protection:** Prevents automated abuse
- **Rate Limiting:** Firebase automatically limits SMS frequency
- **Phone Format Validation:** Ensures valid Philippine phone numbers
- **One-time Codes:** Each verification code expires and can only be used once
- **User Cleanup:** Firebase users are signed out after verification (we only need verification, not authentication)

## 📧 Phone Number Format

The system accepts Philippine mobile numbers in these formats:

- `09171234567` (11 digits starting with 09)
- `9171234567` (10 digits starting with 9)

All numbers are automatically converted to international format: `+639171234567`

## 🔧 Testing

### Development Testing

1. **Firebase Test Phone Numbers:**
   - In Firebase Console → Authentication → Settings
   - Add test phone numbers for development
   - Example: `+1 650-555-3434` with code `123456`

2. **Local Testing:**
   - Use Firebase emulator for offline testing
   - Run: `firebase emulators:start --only auth`

### Production Testing

- Use real phone numbers
- SMS charges apply through Firebase
- Monitor usage in Firebase Console

## 🚨 Important Notes

### Firebase Pricing

- Firebase charges for SMS messages sent
- First 10,000 verifications per month are free
- Check [Firebase Pricing](https://firebase.google.com/pricing) for current rates

### Error Handling

Common errors and their meanings:

- `auth/invalid-phone-number`: Phone number format is incorrect
- `auth/quota-exceeded`: Too many SMS sent, try again later
- `auth/invalid-verification-code`: Wrong OTP code entered
- `auth/code-expired`: Verification code has expired (usually 5 minutes)

### Security Considerations

1. **Never store Firebase config secrets client-side** - API keys for Firebase web are safe to expose
2. **Use Firebase Security Rules** for your Firestore/Database
3. **Monitor authentication usage** to detect abuse
4. **Consider implementing additional rate limiting** for your specific use case

## 🔄 Integration with Existing Flow

The verification is integrated into `create-profile.tsx`:

1. **Before:** User could enter any phone number and create profile
2. **After:** User must verify phone number before profile creation is allowed
3. **Backward Compatible:** Existing profiles are not affected

## 📱 User Experience

- **Clear Progress:** Users see their progress through the verification flow
- **Error Feedback:** Clear error messages for all failure cases
- **Resend Option:** Users can request new codes with cooldown timer
- **Mobile Optimized:** Components work well on mobile devices

## 🛠️ Customization Options

### Styling

- All components use Tailwind CSS classes
- Easy to customize colors and layout
- Responsive design included

### Behavior

- Modify cooldown timers in `phoneVerification.ts`
- Change OTP length in `OtpInput.tsx`
- Customize phone number validation rules

### Error Messages

- All error messages are centralized in services
- Easy to translate or customize messaging

## 🚀 Deployment Checklist

Before deploying to production:

1. ✅ Set production Firebase config in environment variables
2. ✅ Enable Phone Authentication in Firebase Console
3. ✅ Add production domain to Firebase authorized domains
4. ✅ Test with real phone numbers
5. ✅ Monitor Firebase usage and billing
6. ✅ Set up error monitoring/logging

## 📞 Support

If you encounter issues:

1. Check Firebase Console logs
2. Verify environment variables are set correctly
3. Ensure phone numbers are in correct format
4. Check browser console for detailed error messages
5. Verify Firebase project permissions and quotas

## 🔮 Future Enhancements

Possible improvements:

- WhatsApp verification as alternative
- Voice call verification option
- International phone number support
- Integration with existing user profiles for phone updates
- Admin panel for managing verification rates and limits
