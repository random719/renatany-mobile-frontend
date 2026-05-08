# 🚀 RentAny — App Store Deployment Guide

## Overview

This guide covers deploying the **RentAny React Native (Expo)** mobile app to the Apple App Store.

---

## ✅ Prerequisites Checklist

- [ ] **Apple Developer Account** ($99/year) — [enroll here](https://developer.apple.com)
- [ ] **App Store Connect** app entry created — [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
- [ ] **Backend API** deployed and accessible via HTTPS
- [ ] **Clerk** production instance configured (not dev)
- [ ] **Stripe** production keys configured (not test)
- [ ] **EAS CLI** installed: `npm install -g eas-cli`
- [ ] **Expo account** and logged in: `eas login`

---

## Step 1: Create Your App in App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Click **Apps** → **+** → **New App**
3. Fill in:
   - **Platforms**: iOS
   - **Name**: RentAny
   - **Primary Language**: English
   - **Bundle ID**: `com.rentany.app` (create a new one if needed)
   - **SKU**: `rentany_ios_1`
   - **User Access**: Limited or Full access
4. Save the **Apple ID** (numeric) — you'll need it for `eas.json`

---

## Step 2: Generate Certificates & Profiles

Run this to let EAS manage certificates automatically:

```bash
cd /home/teja/Desktop/projects/rentany
eas build:configure
```

Then run the credentials manager:

```bash
eas credentials --platform ios
```

Choose **"Let EAS handle all credentials"** — this will:
- Create a distribution certificate
- Create a push notification certificate (if needed)
- Create a provisioning profile

> Alternatively, you can manually create certificates in the Apple Developer Portal.

---

## Step 3: Update app.json with Your Team ID

Replace `YOUR_TEAM_ID` in `app.json` with your actual Apple Team ID:

1. Go to [developer.apple.com](https://developer.apple.com) → **Account** → **Membership**
2. Copy the **Team ID** (a 10-character string)
3. Update `app.json` → `ios.appleTeamId`

Also update the **version** if needed (currently `1.0.0`).

---

## Step 4: Set Up Production Environment Variables

Create a `.env.production` file (do NOT commit this):

```bash
EXPO_PUBLIC_API_URL=https://your-production-api.com/api
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxxx
```

These are already added to the `production` build profile in `eas.json` — update them with your real values.

---

## Step 5: Build for iOS

### Option A: EAS Build (Recommended)

Build the iOS binary:

```bash
eas build --platform ios --profile production
```

This will:
1. Run `expo prebuild` to generate the `ios/` native project
2. Compile the app on EAS's macOS servers
3. Produce an `.ipa` file
4. Return a build URL

### Option B: Local Build (Requires macOS)

```bash
npx expo prebuild
cd ios && pod install
cd ..
npx expo run:ios --configuration Release
```

---

## Step 6: Submit to App Store

### Using EAS Submit (Recommended)

First, update `eas.json` with your Apple credentials:

```json
"submit": {
  "production": {
    "ios": {
      "appleId": "your-apple-id@email.com",
      "ascAppId": "YOUR_APPLE_APP_ID",
      "appleTeamId": "YOUR_TEAM_ID"
    }
  }
}
```

Then submit:

```bash
eas submit --platform ios --profile production
```

### Manual Upload via Transporter

1. Download the `.ipa` from the EAS build URL
2. Open **Apple Transporter** app on macOS
3. Drag the `.ipa` in and click **Deliver**

---

## Step 7: Prepare for App Review

### Required App Store Metadata (in App Store Connect)

| Field | Suggested Value |
|-------|----------------|
| **Subtitle** | Rent anything from your neighbors |
| **Category** | Lifestyle |
| **Age Rating** | 4+ |
| **Price** | Free (with in-app purchases if applicable) |
| **Privacy Policy URL** | `https://www.rentany.fr/privacy-policy` |
| **Support URL** | `https://www.rentany.fr` |
| **Marketing URL** | `https://www.rentany.fr` |

### Screenshots Required

| Device | Size | Quantity |
|--------|------|----------|
| iPhone 6.7" (Pro Max) | 1290×2796 | 3-5 screenshots |
| iPhone 6.5" (Plus) | 1242×2688 | 3-5 screenshots |
| iPhone 5.5" (SE/8 Plus) | 1242×2208 | 3-5 screenshots |

Generate screenshots using:
- Simulator: Run the app and take screenshots
- Or use a tool like [AppScreenshot](https://appscreenshot.io)

### Suggested Screenshots Order

1. **Home/Browse** — Show items available for rent with search bar
2. **Item Details** — A product page with pricing & availability
3. **Booking Flow** — Calendar/date picker for rental
4. **Chat** — Messaging between renter and owner
5. **Profile/Wallet** — User profile with Stripe integration

---

## Step 8: Common iOS Issues & Fixes

| Issue | Solution |
|-------|----------|
| **Missing push notification entitlement** | Add `"entitlements": {"aps-environment": "production"}` in `app.json` under iOS |
| **Icon sizes wrong** | Ensure `assets/icon.png` is 1024x1024px (transparent background) |
| **Build fails on EAS** | Check Expo SDK compatibility; ensure all native deps are compatible |
| **App rejected - camera usage** | Provide a clear explanation of why camera is needed in the review notes |
| **Deep linking not working** | Ensure `scheme` in `app.json` matches your universal link config |

### Add Push Notification Support (if needed)

```json
// app.json
"ios": {
  "entitlements": {
    "aps-environment": "production"
  }
}
```

---

## Step 9: Post-Deployment Checklist

- [ ] App icon and splash screen look correct on device
- [ ] Backend API is accessible from production
- [ ] Stripe Connect onboarding works end-to-end
- [ ] Clerk authentication works with production keys
- [ ] iDenfy identity verification is configured for production
- [ ] Push notifications are working (if configured)
- [ ] Deep links / universal links are functional
- [ ] Analytics are configured (if any)
- [ ] Crash reporting (Sentry or similar) is set up

---

## Quick Reference Commands

```bash
# Login to Expo
eas login

# Build for iOS (production)
eas build --platform ios --profile production

# Build for Android (production)
eas build --platform android --profile production

# Submit to App Store
eas submit --platform ios --profile production

# Submit to Google Play
eas submit --platform android --profile production

# Check build status
eas build:list

# View credentials
eas credentials --platform ios
```

---

## Backend Deployment

Your backend (`rentany-backend-v1`) also needs to be deployed before the app goes live:

**Recommended options:**
- **Render** — Easy Node.js deployment with auto-deploy from GitHub
- **Railway** — Simple deployment with built-in MongoDB
- **AWS EC2** — More control, higher scale
- **Fly.io** — Great for global deployments

Make sure your production backend has:
- [ ] MongoDB Atlas (production cluster)
- [ ] Clerk production secret key
- [ ] Stripe production keys
- [ ] AWS S3 bucket for uploads (CORS configured)
- [ ] HTTPS/SSL enabled
- [ ] CORS configured to allow the mobile app
