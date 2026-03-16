# Rentany - End-to-End Test Flow Document

> **Source of truth**: `rentany-frontend-v1` (Next.js web app) + `rentany-backend-v1` (Express API)

## Complete Rental Lifecycle: From Registration to Review

This document covers one full end-to-end flow involving **2 users** (a Renter and an Owner) and **1 Admin**, testing the core rental lifecycle across the entire application.

---

## Prerequisites

| Item | Details |
|------|---------|
| Backend | Running at `NEXT_PUBLIC_API_URL` (default: `http://localhost:5000/api`) |
| Frontend | Next.js 16 app running (default: `http://localhost:3000`) |
| Stripe | Test mode enabled with test keys |
| Clerk | Test instance configured (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`) |
| S3 | AWS S3 configured for file uploads |
| MongoDB | Atlas or local instance running |

### Test Accounts Needed
- **Renter**: `renter@test.com` / password: `Test@1234`
- **Owner**: `owner@test.com` / password: `Test@1234`
- **Admin**: `admin@test.com` / password: `Admin@1234` (role: `admin` in DB)
- Stripe test card: `4242 4242 4242 4242` (any future exp, any CVC)

---

## PHASE 1: USER REGISTRATION & PROFILE SETUP

### 1.1 — Register as Owner

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/auth/signup` | Signup page loads with email field + Google/Facebook OAuth buttons |
| 2 | Enter email: `owner@test.com`, password: `Test@1234` | Form validates inputs |
| 3 | Submit registration | Clerk creates account, email verification sent |
| 4 | Navigate to `/auth/check-email` | "Check your email" confirmation page shown |
| 5 | Click verification link in email | Email verified, account activated |
| 6 | Redirected to `/home` | Home page loads with sidebar navigation |
| 7 | Verify sidebar links visible | Browse All, Favorites, Saved Searches, Rental History, List Item, Bulk Edit, Profile, Conversations, Disputes |
| 8 | API call: `POST /users/sync` fires automatically | User synced to MongoDB |

### 1.2 — Owner Sets Username (Required)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/profile` | Profile page loads, username prompt appears |
| 2 | Enter username: `camera_owner` | Username field populated |
| 3 | Save | API: `PUT /users/me` → username saved |
| 4 | Profile now shows username and avatar area | Account activated for full use |

### 1.3 — Owner Sets Up Stripe Connect (Required for Lending)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Go to `/profile` → Wallet tab | WalletOverview shows "Connect Stripe" button |
| 2 | Click "Connect Stripe Account" (StripeConnectButton) | Stripe Connect onboarding opens in new tab |
| 3 | Complete Stripe Connect setup (test mode) | `stripe_account_id` saved, `payouts_enabled = true` |
| 4 | Redirected to `/stripe/confirm` | Confirmation page shown |
| 5 | Return to `/profile` → Wallet | Status shows "Payouts Enabled", `can_lend = true` |

### 1.4 — Register as Renter (separate browser/incognito)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/auth/signup` | Signup page loads |
| 2 | Register with `renter@test.com` | Account created, email verified |
| 3 | Set username: `renter_user` on `/profile` | Username saved |
| 4 | Verify `/home` loads | Browse page with items, filters, map toggle |

### 1.5 — Renter Adds Payment Method (Required for Renting)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Go to `/profile` → Wallet tab | WalletOverview shows "Add Payment Method" |
| 2 | Click to add payment method | Stripe payment method form appears |
| 3 | Enter test card: `4242 4242 4242 4242` | Card accepted |
| 4 | Save | `stripe_payment_method_id` saved, `can_rent = true` |

> **Capability Check**: `can_rent` requires `stripe_payment_method_id`. `can_lend` requires `stripe_account_id` + `payouts_enabled`. `can_list` is always true. Admins cannot rent/lend.

---

## PHASE 2: LISTING CREATION (Owner)

### 2.1 — Create a New Listing

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "List Item" in sidebar → navigates to `/add-item` | Multi-step listing form loads |
| 2 | **Basic Details**: Enter title: "Canon EOS R5 Camera" | Title field populated |
| 3 | Enter description: "Professional mirrorless camera, excellent condition" | Description populated |
| 4 | Select category: "Electronics" | Category dropdown set |
| 5 | Select condition: "Excellent" | Condition set |
| 6 | **Pricing**: Set daily rate: $50 | Price field shows $50/day |
| 7 | Add pricing tier: 7+ days = $40/day | Tier added (bulk discount) |
| 8 | Set deposit: $200 | Fixed deposit amount saved |
| 9 | **Location**: Enter address, postcode, country | Location geocoded to lat/lng via geocodeLocation |
| 10 | Toggle "Show on map": ON | `show_on_map = true` |
| 11 | **Rental Rules**: Set min 1 day, max 30 days | Rules saved |
| 12 | Set notice period: 24 hours | `notice_period_hours = 24` |
| 13 | Enable "Instant Booking" | `instant_booking = true` |
| 14 | **Delivery**: Select delivery options (pickup/delivery) | Options configured |
| 15 | Set delivery fee: $10, radius: 10km | Delivery details saved |
| 16 | **Media**: Drag & drop or click to upload 3 photos | Images uploaded to S3 via `POST /file/upload`, thumbnails shown in MediaUploadZone |
| 17 | Click "Create Listing" / Submit | API: `POST /items` → 201 Created |
| 18 | Verify listing appears on `/profile` → Items tab | Item shown with status "active" |

### 2.2 — Manage Item & Availability

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | From Profile → Items tab, click "Manage" on listing | Navigates to `/manage-item?id={itemId}` |
| 2 | Open Availability Calendar section | AvailabilityCalendar component loads |
| 3 | Block out March 25-27 by clicking dates | Dates marked as unavailable |
| 4 | Save availability | API: `POST /item-availability` → blocked dates saved |
| 5 | Verify blocked dates show as unavailable on calendar | Visual indicator on dates |

---

## PHASE 3: SEARCH & BROWSE (Renter)

### 3.1 — Browse Home Page

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/home` as renter | Home page loads with item grid |
| 2 | Verify sections: Featured items, Recommended, Recently Viewed, Trending | Sections render (RecommendedItems, TrendingItems components) |
| 3 | Verify "Canon EOS R5 Camera" appears in listings | ItemCard shows image, title, price ($50/day) |
| 4 | Toggle Map View (Leaflet) | Map renders with item location pins |
| 5 | Click a category filter chip (e.g., "Electronics") | Items filtered by category |
| 6 | Verify "How It Works" section visible | HowItWorks component renders |

### 3.2 — Search with Filters

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Type "Camera" in search bar on `/home` | Search query applied |
| 2 | Open filter panel (ItemFilters component) | Filter options expand |
| 3 | Set price range: $20-$100 | Price filter applied |
| 4 | Set category: Electronics | Category filter applied |
| 5 | Set sort: "Price: Low to High" | Sort applied |
| 6 | Apply filters | API: `GET /items?search=Camera&category=Electronics&min_price=20&max_price=100&sort=price_asc` |
| 7 | Verify "Canon EOS R5 Camera" in results | Item visible in filtered list |
| 8 | Verify ItemCard shows: title, image, price, rating | All info displayed correctly |

### 3.3 — Save a Search

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/saved-searches` from sidebar | Saved Searches page loads |
| 2 | Click "Create New Saved Search" | Form opens |
| 3 | Name it: "Camera Rentals" | Name field populated |
| 4 | Set filters: category=Electronics, search=Camera | Filters configured |
| 5 | Toggle "Notify me of new items" ON | `notify_new_items = true` |
| 6 | Save | API: `POST /saved-searches` → 201 |
| 7 | Verify "Camera Rentals" appears in saved searches list | Entry shown with filters and notification toggle |
| 8 | Click saved search entry | Navigates to `/home` with filters pre-applied |

### 3.4 — View Listing Detail

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click "Canon EOS R5 Camera" from results | Navigates to `/itemdetails?id={itemId}` |
| 2 | Verify item gallery (ItemGallery with zoom) | Photos display, click to zoom (ImageZoomModal) |
| 3 | Verify details: title, description, category, condition | All data matches what owner entered |
| 4 | Verify owner info: name, avatar, username, rating | Owner profile card shown, click → `/public-profile?username=camera_owner` |
| 5 | Verify pricing: $50/day, deposit $200 | Price and deposit displayed |
| 6 | Verify availability calendar shows blocked dates | March 25-27 greyed out |
| 7 | Check reviews section | "No reviews yet" (new listing) |
| 8 | Verify "Similar Items" section | SimilarItems component renders |
| 9 | Item auto-tracked as viewed | API: `POST /viewed-items` fires |

### 3.5 — AI Chat Assistant (Item Q&A)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | On item detail page, open AI Chat | AIChatAssistant component opens |
| 2 | Ask: "Is this camera good for video?" | API: `POST /ai/ask-item-question` |
| 3 | AI responds based on item details | Relevant answer displayed |

### 3.6 — Add to Favorites

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click heart/favorite icon on item detail page | API: `POST /favorites` → 201 |
| 2 | Heart icon fills/changes color | Visual feedback — favorited |
| 3 | Navigate to `/favorites` from sidebar | "Canon EOS R5 Camera" appears in favorites list |
| 4 | Click heart again to unfavorite | API: `DELETE /favorites` (by item) |
| 5 | Item removed from favorites list | List updates |

---

## PHASE 4: BOOKING & PAYMENT (Renter)

### 4.1 — Send Inquiry First (Optional Pre-Booking)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | On `/itemdetails`, click "Send Inquiry" | Inquiry form/dialog opens |
| 2 | Type message: "Is the camera available next week?" | Message field populated |
| 3 | Submit inquiry | API: `POST /rental-requests` with status: "inquiry" + `POST /messages` |
| 4 | Inquiry appears in `/request` for both renter and owner | Conversation thread created |
| 5 | Owner replies via message thread | Messages exchanged in ChatWindow |

### 4.2 — Create Booking Request

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | On `/itemdetails`, click "Book" / "Request to Rent" | Booking section activates with AvailabilityCalendar |
| 2 | Select dates on calendar: March 20, 21, 22, 23 (4 days) | Individual dates selected and highlighted |
| 3 | Verify blocked dates (March 25-27) not selectable | Blocked dates greyed out/disabled |
| 4 | Verify pricing breakdown (15% platform fee): | Calculated correctly |
|   | — Rental cost: 4 x $50 = $200 | Daily rate x days (or tiered if applicable) |
|   | — Platform fee (15%): $30 | 15% of rental cost |
|   | — Security deposit: $200 | Fixed amount set by owner |
|   | — **Total: $430** | Rental + fee + deposit |
| 5 | Add message: "Hi, I'll take good care of it!" | Message field populated |
| 6 | System validates dates available | API: `POST /rental-requests/validate` → OK |
| 7 | Check if KYC required | API: `GET /security/threshold` — $430 < $500 threshold → no KYC needed |
| 8 | Click "Submit Request" | API: `POST /rental-requests` → status: "pending" (or auto-approved if instant booking) |
| 9 | BookingSuccessDialog appears | Success dialog with rental details shown |
| 10 | Rental request visible in `/request` page | New request card with status |

### 4.3 — KYC Flow (If Triggered)

> Triggered when total > `kyc_amount_threshold` OR item category is in `kyc_high_risk_categories` OR item has `high_risk_override`

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | System detects KYC required | Redirect to `/verify-identity` |
| 2 | Context saved to `sessionStorage` (`verify_identity_ctx`) | Booking draft preserved |
| 3 | Click "Verify Identity" | API: `POST /verification/session` → Stripe Identity session created |
| 4 | Redirected to Stripe Identity hosted page | Identity verification form loads |
| 5 | Complete verification (upload ID, selfie) | Stripe processes verification |
| 6 | Return to app via callback | `kyc_status = verified` |
| 7 | Booking resumes automatically | Original booking request submitted |

> **Note**: For this test flow ($430 total < $500 threshold), KYC should NOT be triggered unless admin lowered the threshold or "Electronics" is in high-risk categories.

---

## PHASE 5: RENTAL MANAGEMENT

### 5.1 — Owner Receives & Approves Request

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Owner logs in, check notification bell in Header | Notification badge with count visible |
| 2 | Click notifications dropdown | "New rental request for Canon EOS R5" shown |
| 3 | Navigate to `/request` from sidebar ("My Conversations") | Rental requests page loads with tabs/filters |
| 4 | Filter by status: "Pending" | Pending requests shown |
| 5 | Click on the rental request card | Request detail expands with ChatWindow, dates, amount |
| 6 | Review renter info, dates (Mar 20-23), amount ($430) | All details correct |
| 7 | Click "Accept" | API: `PUT /rental-requests/{id}` → status: "approved" |
| 8 | Renter receives notification | "Your rental request was approved!" |

> **Note**: If "Instant Booking" was enabled on the item, status is auto-set to "approved" or "paid" — owner doesn't need to manually approve.

### 5.2 — In-Rental Messaging

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Renter navigates to `/request` | Conversation list visible |
| 2 | Click on the rental request | ChatWindow opens within the request detail |
| 3 | Type message: "When can I pick up?" | Message sent via `POST /messages` |
| 4 | Owner sees message on their `/request` page | Message appears in ChatWindow thread |
| 5 | Owner replies: "Anytime after 10am at my address" | Reply sent via `POST /messages` |
| 6 | Renter sees reply | Messages in correct chronological order |
| 7 | Verify message timestamps shown | date-fns formatted timestamps |

### 5.3 — Condition Report at Pickup

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | From rental request detail, find "Condition Report" section | ConditionReportDisplay component visible |
| 2 | Click "Create Pickup Report" | Condition report form opens |
| 3 | Upload photos of item condition | Photos uploaded to S3 via `POST /file/upload` |
| 4 | Add notes: "Minor scratch on bottom, otherwise excellent" | Notes saved |
| 5 | Report any pre-existing damages with severity | Damages array populated |
| 6 | Submit | API: `POST /condition-reports` with `report_type: "pickup"` |
| 7 | Report visible to both parties | ConditionReportDisplay shows pickup report |

### 5.4 — Request Rental Extension

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Renter goes to rental request detail | Current rental details shown |
| 2 | Click "Request Extension" | Extension form opens |
| 3 | Select new end date: March 26 (3 extra days) | New date selected |
| 4 | Verify additional cost: 3 x $50 = $150 | Cost calculated |
| 5 | Submit request | API: `POST /rental-extensions` → status: "pending" |
| 6 | Owner receives notification | "Extension requested for Canon EOS R5" |
| 7 | Owner approves extension | API: `PUT /rental-extensions/{id}` → status: "approved" |
| 8 | Rental end date updated to March 26 | Dates reflect extension |

### 5.5 — Condition Report at Return

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | On return date, create return condition report | Condition report form opens |
| 2 | Upload photos of returned item | Photos uploaded |
| 3 | Note condition / confirm no new damages | Notes saved |
| 4 | Submit | API: `POST /condition-reports` with `report_type: "return"` |
| 5 | Both pickup and return reports visible | ConditionReportDisplay shows both |

### 5.6 — Download Receipt

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | From rental request detail, click "Download Receipt" | API: `GET /receipts?rental_request_id={id}` |
| 2 | PDF receipt downloads | Receipt contains rental details, dates, amounts |

---

## PHASE 6: PAYMENT SETTLEMENT

### 6.1 — Automatic Settlement After Rental Completion

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Rental end date passes | Backend auto-release scheduler triggers |
| 2 | System checks: no active disputes | Dispute check passes |
| 3 | Payment transferred to owner via Stripe Connect | `settlement_state = done`, `transfer_id` populated |
| 4 | Security deposit refunded to renter | `deposit_refund_id` populated |
| 5 | Rental status updated to "completed" | Both parties see "Completed" in `/request` |
| 6 | Owner receives notification | "Payment received for Canon EOS R5 rental" |

### 6.2 — Verify Wallet & Payouts (Owner)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Owner navigates to `/profile` → Wallet tab | WalletOverview loads |
| 2 | Verify Stripe Connect status | API: `GET /stripe/connect/status` → connected, payouts enabled |
| 3 | Check earnings display | Earnings from rental visible (EarningsChart) |
| 4 | Verify earnings = rental amount - platform fee | $200 rental - $30 fee = $170 to owner |

---

## PHASE 7: REVIEWS

### 7.1 — Renter Reviews Owner

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | After rental completion, navigate to completed rental in `/request` | Review option available |
| 2 | Click "Leave Review" | Review form with StarRating component opens |
| 3 | Set rating: 5 stars | Star rating selected |
| 4 | Add comment: "Great camera, owner was very helpful!" | Comment entered |
| 5 | Submit | API: `POST /reviews` with `review_type: "for_owner"` |
| 6 | Review appears on owner's public profile | Navigate to `/public-profile?username=camera_owner` → ReviewCard visible |

### 7.2 — Owner Reviews Renter

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Owner navigates to completed rental in `/request` | Review option available |
| 2 | Click "Leave Review" | Review form opens |
| 3 | Set rating: 4 stars | Star rating selected |
| 4 | Add comment: "Returned on time, good renter" | Comment entered |
| 5 | Submit | API: `POST /reviews` with `review_type: "for_renter"` |
| 6 | Review appears on renter's profile | Rating visible on `/public-profile?username=renter_user` |

### 7.3 — Verify Reviews on Listing

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/itemdetails?id={itemId}` | Item detail page loads |
| 2 | Scroll to Reviews section | ReviewCard from renter visible |
| 3 | Verify rating (5 stars), comment, reviewer name | All data correct |
| 4 | Average rating updated on item | Item rating reflects new review |

---

## PHASE 8: DISPUTE FLOW

### 8.1 — File a Dispute (Renter)

> Test with a **separate rental** or modify the above flow to include a damage scenario.

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Renter navigates to `/disputes` from sidebar | Disputes page loads |
| 2 | Click "File New Dispute" | DisputeForm opens |
| 3 | Select rental request from dropdown | Rental selected |
| 4 | Select reason: "Item not as described" | Reason set |
| 5 | Add description: "Camera had a cracked screen not shown in photos" | Description entered |
| 6 | Upload evidence photos | Photos uploaded as `evidence_urls` |
| 7 | Submit | API: `POST /disputes` → status: "open" |
| 8 | Owner receives notification | "A dispute has been filed" |
| 9 | Dispute appears in renter's `/disputes` page | Status shows "Open" |

### 8.2 — Admin Resolves Dispute

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Admin logs in → redirected to `/admin/dashboard` | Admin dashboard loads |
| 2 | Navigate to `/admin/disputes` from sidebar | Dispute management page loads |
| 3 | Click on the open dispute | Dispute detail expands |
| 4 | Review evidence from both parties | Photos, descriptions, condition reports visible |
| 5 | Set decision: "Favor Renter" | Decision selected (favor_renter/favor_owner/split) |
| 6 | Set refund amount to renter: $200 (partial) | `refund_to_renter` amount entered |
| 7 | Add admin notes: "Listing photos were misleading" | Notes saved |
| 8 | Submit resolution | API: `PUT /admin/disputes/{id}` |
| 9 | Stripe refund processed automatically | `stripe_refund_id` populated in DB |
| 10 | Both parties notified of resolution | Notifications sent |
| 11 | Dispute status → "resolved" | Status updated in `/disputes` for both parties |

---

## PHASE 9: REPORTING & MODERATION

### 9.1 — Report a Listing (Renter)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | On `/itemdetails`, click "Report" button | ReportsDialog opens |
| 2 | Select reason: "Misleading" (options: fraud, stolen_item, prohibited_item, misleading, price_gouging, spam, other) | Reason selected |
| 3 | Add description: "Photos don't match actual item condition" | Description entered |
| 4 | Upload evidence (optional) | Evidence URLs saved |
| 5 | Submit | API: `POST /reports/listing` → status: "pending" |

### 9.2 — Report a User (Renter)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | On `/public-profile?username=camera_owner`, click report option | Report user dialog opens |
| 2 | Select reason: "Fraud" (options: harassment, spam, fraud, inappropriate_content, other) | Reason selected |
| 3 | Add description and evidence | Details saved |
| 4 | Submit | API: `POST /reports/user` → status: "pending" |

### 9.3 — Admin Reviews Reports

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Admin navigates to `/admin/reports-listing` | Listing reports page loads |
| 2 | Review pending listing report | Report details visible |
| 3 | Take action: "Warning Sent" (options: none, warning_sent, listing_removed, user_suspended, user_banned) | Action recorded |
| 4 | Navigate to `/admin/user-reports` | User reports page loads |
| 5 | Review user report, take action | API: `PUT /admin/user-reports/{id}` |

### 9.4 — Admin Reviews Fraud Reports

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/admin/fraud-reports` | Fraud report list loads (FraudReportList) |
| 2 | Review fraud alerts with risk scores (low/medium/high/critical) | Risk assessment visible |
| 3 | Take action on flagged items/users | API: `PUT /admin/fraud-reports/{id}` |

---

## PHASE 10: ADMIN DASHBOARD & SECURITY

### 10.1 — Verify Dashboard Metrics

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Admin logs in → `/admin/dashboard` | AdminDashboard component loads with Recharts |
| 2 | Verify metrics: total users, total listings, active rentals | Numbers reflect test data (≥ 3 users, ≥ 1 item, ≥ 1 rental) |
| 3 | Check user growth chart | Recharts chart renders with data points |
| 4 | Check revenue metrics | Platform fee revenue from completed rental ($30) shown |
| 5 | Check recent disputes count | Dispute from Phase 8 reflected |

### 10.2 — Admin Security Settings

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/admin/security` | Security settings page loads |
| 2 | View current KYC threshold | API: `GET /security/settings` → shows $500 default |
| 3 | Change threshold to $200 | API: `PUT /security/settings` → threshold updated |
| 4 | View high-risk categories list | Categories shown with toggles |
| 5 | Add "Electronics" to high-risk categories | Category added |
| 6 | View high-risk override items | API: `GET /security/items` → list loads |
| 7 | Mark "Canon EOS R5" as high-risk override | API: `PUT /security/items/{id}` → `high_risk_override = true` |
| 8 | Verify: next booking for this item triggers KYC | Item now requires identity verification |

### 10.3 — Admin Reviews Pending Requests

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/admin/review-pending-request` | Pending requests page loads |
| 2 | Review any flagged or pending rental requests | Request details visible |
| 3 | Take action if needed | Admin can intervene on suspicious requests |

---

## PHASE 11: NOTIFICATIONS

### 11.1 — Verify Notification System

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Click notification bell in Header | Notifications dropdown opens |
| 2 | Verify all notifications from flow | API: `GET /notifications` returns all |
| 3 | Click a notification | Navigates to relevant page |
| 4 | Mark as read | API: `PUT /notifications/{id}` → `is_read = true` |

### 11.2 — Notifications Generated Throughout Flow

| Notification | Recipient | Phase | Trigger |
|-------------|-----------|-------|---------|
| "New rental request" | Owner | 4 | Renter submits booking |
| "Rental approved" | Renter | 5 | Owner approves request |
| "New message" | Both | 5 | Message sent in ChatWindow |
| "Extension requested" | Owner | 5 | Renter requests extension |
| "Extension approved" | Renter | 5 | Owner approves extension |
| "Rental completed" | Both | 6 | Rental period ends |
| "Payment received" | Owner | 6 | Settlement processed |
| "Deposit refunded" | Renter | 6 | Settlement processed |
| "New review" | Both | 7 | Review submitted |
| "Dispute filed" | Owner | 8 | Renter files dispute |
| "Dispute resolved" | Both | 8 | Admin resolves dispute |

---

## PHASE 12: ADDITIONAL FEATURES TO VERIFY

### 12.1 — Referral Program

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/referral` from sidebar | ReferralProgram component loads |
| 2 | View referral link | Unique referral URL shown |
| 3 | Share via social buttons (ShareButtons) | Share options available |

### 12.2 — Public Profile

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/public-profile?username=camera_owner` | Public profile loads |
| 2 | Verify: username, avatar, member since, rating | All info displayed |
| 3 | Verify listed items shown | Canon EOS R5 visible |
| 4 | Verify reviews shown | Reviews from Phase 7 visible |

### 12.3 — Rental History

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/rental-history` | Rental history page loads |
| 2 | Filter by role: "Renting" vs "Lending" | Appropriate rentals shown |
| 3 | Verify completed rental visible | Canon EOS R5 rental with status "completed" |

### 12.4 — Bulk Edit Items (Owner)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/bulk-edit-items` | Bulk edit page loads |
| 2 | Select multiple items (if owner has multiple) | Items selected |
| 3 | Apply bulk changes (e.g., update price) | API calls to update each item |

### 12.5 — OAuth Login

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/auth/signin` | Sign in page with Google & Facebook buttons |
| 2 | Click "Sign in with Google" | Redirects to Google OAuth → `/auth/sso-callback` |
| 3 | Complete Google sign-in | Account created/logged in, redirected to `/home` |

### 12.6 — Password Reset

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/auth/reset-password` | Password reset form loads |
| 2 | Enter email | Reset email sent |
| 3 | Click reset link → `/auth/set-new-password` | New password form loads |
| 4 | Set new password | Password updated, can login with new password |

---

## TEST EXECUTION CHECKLIST

- [ ] **Phase 1**: Registration (Owner + Renter), username setup, Stripe Connect + Payment Method
- [ ] **Phase 2**: Listing creation (all fields) + availability management
- [ ] **Phase 3**: Home browse, search/filters, saved search, favorites, item detail, AI chat
- [ ] **Phase 4**: Inquiry, booking, pricing (15% fee), KYC check, payment
- [ ] **Phase 5**: Approval, messaging, condition reports, extension, receipt download
- [ ] **Phase 6**: Auto-settlement, deposit refund, wallet/earnings verification
- [ ] **Phase 7**: Reviews (both directions), listing rating update, public profile
- [ ] **Phase 8**: Dispute filing, admin resolution, Stripe refund
- [ ] **Phase 9**: Listing report, user report, fraud reports, admin moderation
- [ ] **Phase 10**: Admin dashboard metrics, security settings, KYC thresholds
- [ ] **Phase 11**: Notifications across all phases
- [ ] **Phase 12**: Referral, public profile, rental history, bulk edit, OAuth, password reset

---

## API ENDPOINTS HIT IN THIS FLOW

| Method | Endpoint | Phase |
|--------|----------|-------|
| POST | `/users/sync` | 1 |
| PUT | `/users/me` | 1 |
| GET | `/stripe/connect/status` | 1, 6 |
| POST | `/items` | 2 |
| POST | `/item-availability` | 2 |
| GET | `/items` | 3 |
| GET | `/items/{id}` | 3 |
| POST | `/viewed-items` | 3 |
| POST | `/ai/ask-item-question` | 3 |
| POST | `/favorites` | 3 |
| DELETE | `/favorites` | 3 |
| POST | `/saved-searches` | 3 |
| GET | `/saved-searches` | 3 |
| POST | `/rental-requests/validate` | 4 |
| GET | `/security/threshold` | 4 |
| POST | `/rental-requests` | 4 |
| POST | `/verification/session` | 4 (if KYC) |
| PUT | `/rental-requests/{id}` | 5 |
| POST | `/messages` | 5 |
| GET | `/messages` | 5 |
| POST | `/file/upload` | 2, 5 |
| POST | `/condition-reports` | 5 |
| POST | `/rental-extensions` | 5 |
| PUT | `/rental-extensions/{id}` | 5 |
| GET | `/receipts` | 5 |
| POST | `/reviews` | 7 |
| GET | `/reviews` | 7 |
| POST | `/disputes` | 8 |
| PUT | `/admin/disputes/{id}` | 8 |
| POST | `/reports/listing` | 9 |
| POST | `/reports/user` | 9 |
| GET | `/admin/fraud-reports` | 9 |
| PUT | `/admin/user-reports/{id}` | 9 |
| GET | `/security/settings` | 10 |
| PUT | `/security/settings` | 10 |
| GET | `/security/items` | 10 |
| PUT | `/security/items/{id}` | 10 |
| GET | `/notifications` | 11 |
| PUT | `/notifications/{id}` | 11 |

---

## EDGE CASES TO VERIFY

| # | Scenario | Expected |
|---|----------|----------|
| 1 | Book dates overlapping with blocked availability | Error: dates unavailable (validate endpoint rejects) |
| 2 | Book below minimum rental days (< 1 day) | Error: minimum not met |
| 3 | Book above maximum rental days (> 30 days) | Error: maximum exceeded |
| 4 | Pay with declined card (`4000 0000 0000 0002`) | Payment fails, user sees error message |
| 5 | Cancel a pending rental request | Status → "cancelled" |
| 6 | Owner declines a rental request | Status → "declined"/"rejected" |
| 7 | Renter without `stripe_payment_method_id` tries to book | Blocked — `can_rent = false`, prompted to add payment method |
| 8 | Owner without Stripe Connect tries to receive payout | Blocked — `can_lend = false`, prompted to connect Stripe |
| 9 | Renter tries to book own listing | Error or button hidden |
| 10 | Non-admin user navigates to `/admin/*` routes | Redirected to `/home` |
| 11 | Upload oversized file | Error with file size message |
| 12 | Booking triggers KYC (amount > threshold) | Redirected to `/verify-identity`, booking resumes after verification |
| 13 | Booking triggers KYC (high-risk category) | Same KYC flow triggered by category match |
| 14 | Admin tries to rent or list items | Blocked — admins can only manage platform |
| 15 | User without username tries to use features | Username prompt appears, must set before proceeding |
