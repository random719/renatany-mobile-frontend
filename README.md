# RentAny - Mobile App (React Native)

> "Don't use it? Don't waste it. Rent it."

Mobile companion for [www.rentany.fr](https://www.rentany.fr) -- a peer-to-peer rental marketplace where users can list and rent anything from neighbors: power tools, designer clothes, electronics, vehicles, and more.

## Tech Stack

- **Frontend:** React Native (Expo managed workflow)
- **Navigation:** React Navigation v6 (Stack + Bottom Tabs)
- **UI Library:** NativeBase
- **State Management:** Zustand
- **Language:** TypeScript
- **Backend:** Node.js (API arriving in ~2 days -- wire as each flow is built)
- **Payments:** Stripe (SetupIntent for cards, Connect for payouts)

## Categories

| Category | Icon |
| --- | --- |
| Electronics | monitor |
| Tools | tool |
| Fashion | shirt |
| Sports | activity |
| Vehicles | truck |
| Home | home |
| Books | book |
| Music | music |
| Photography | camera |
| Other | grid |

---

## Development Approach

Build **Customer flow** and **Admin flow** in parallel. Each flow is developed as a complete vertical slice: screens + components + store + service + API wiring -- all together per flow. No "static first, wire later" -- each flow ships fully wired.

### Service Layer Pattern

Every service file starts with mock data and a `USE_API` flag. When the backend endpoint is ready, flip the flag -- no other changes needed.

```typescript
// src/services/listingService.ts
import { api } from './api';
import { listings as mockListings } from '../data/listings';

const USE_API = false; // flip to true when backend is ready

export const getListings = async () => {
  if (USE_API) return api.get('/listings').then(r => r.data);
  await new Promise(r => setTimeout(r, 500));
  return mockListings;
};
```

### Data Flow (Strict)

```
Screen -> Store (Zustand) -> Service (mock OR api) -> Backend / Mock Data
```

---

## Flow 1: Foundation & Auth

**Build first -- both Customer and Admin depend on this.**

```
App Launch
  -> SplashScreen (logo + tagline, auto-navigate)
  -> AuthNavigator
      |-> LoginScreen
      |     |-> Continue with Google
      |     |-> Continue with Facebook
      |     |-> Email + Password -> Sign In
      |     |-> Forgot Password? -> ForgotPasswordScreen
      |     |-> Need an account? -> RegisterScreen
      |
      |-> RegisterScreen (name, email, password, confirm)
      |-> ForgotPasswordScreen (email input for reset link)
```

### Deliverables

- [ ] Expo project init with NativeBase, React Navigation, Zustand, TypeScript
- [ ] Custom theme (`src/theme/index.ts`) matching web colors
- [ ] `src/services/api.ts` -- Axios instance with base URL config + `USE_API` pattern
- [ ] `src/types/` -- All TypeScript interfaces (User, Listing, Booking, Chat, Dispute, Notification)
- [ ] `src/data/` -- All mock data files
- [ ] Auth screens: Splash, Login, Register, ForgotPassword
- [ ] `authStore` + `authService` (mock login/register, stores user + token)
- [ ] `AppNavigator` -- auth check, routes to AuthNavigator or MainTabNavigator
- [ ] Dark mode support via NativeBase color mode

---

## Flow 2: Customer -- Browse & Discover

**Run in parallel with Flow 5 (Admin Dashboard).**

```
MainTabNavigator -> Home Tab
  -> HomeScreen
      |-> Hero Section: "Don't use it? Don't waste it. Rent it."
      |-> Trust Badges: Verified Users, Secure Payments, Deposit Protection, 24/7 Support
      |-> Recommended for You (AI Powered badge)
      |-> Recently Viewed
      |-> Browse by Category (horizontal scroll)
      |-> Tap Item -> ListingDetailScreen

MainTabNavigator -> Search Tab
  -> SearchScreen
      |-> Search bar with autocomplete
      |-> Results as grid/list
      |-> Tap Item -> ListingDetailScreen
  -> FilterScreen (modal/bottom sheet)
      |-> Category, price range slider, distance, rating, sort by

CategoriesScreen (from Home)
  -> CategoryDetailScreen (items filtered by category)
```

### Deliverables

- [ ] Bottom tab navigation: Home, Search, + List (FAB), Favorites, Profile
- [ ] HomeScreen -- hero banner, trust badges, recommended (AI badge), recently viewed, categories
- [ ] ListingDetailScreen -- image carousel, title, price/day, owner info, reviews, "Rent Now" + "Chat with Owner", heart icon with like count
- [ ] SearchScreen + FilterScreen
- [ ] CategoriesScreen + CategoryDetailScreen
- [ ] `listingStore` + `listingService` (getListings, getById, search, filter, getByCategory)
- [ ] Components: `ListingCard`, `ImageCarousel`, `FavoriteButton`, `HeroBanner`, `TrustBadge`, `CategoryRow`
- [ ] Wire API when ready: `GET /listings`, `GET /listings/:id`, `GET /categories`

---

## Flow 3: Customer -- List, Favorite & Profile

**Run in parallel with Flow 6 (Admin Moderation).**

```
MainTabNavigator -> + List Item (Center FAB)
  -> CreateListingScreen (modal, multi-step)
      |-> Step 1: Photos upload
      |-> Step 2: Title, Description, Category
      |-> Step 3: Price per day
      |-> Step 4: Location & Availability

MainTabNavigator -> Favorites Tab
  -> FavoritesScreen (wishlisted items grid)
  -> SavedSearchesScreen

MainTabNavigator -> Profile Tab
  -> ProfileScreen
      |-> Avatar, @username, stats (Items, Available, Rating)
      |-> List New Item button
      |-> Sign Out
      |-> Payment Setup section
      |     |-> Card status (connected/not connected)
      |     |-> Bank status (connected/not connected)
      |     |-> Add payment method (Stripe SetupIntent)
      |     |-> Connect bank account (Stripe Connect)
      |-> Tabs: Items | Wallet | Reviews | Rentals | Disputes | Documents | Settings
  -> EditProfileScreen (edit name, bio, avatar)
  -> SettingsScreen (notifications, language, theme, about, logout)
```

### Deliverables

- [ ] CreateListingScreen (multi-step form)
- [ ] FavoritesScreen + SavedSearchesScreen
- [ ] ProfileScreen with payment setup UI + tabbed content
- [ ] EditProfileScreen + SettingsScreen
- [ ] `favoriteStore` + `favoriteService`
- [ ] Components: `PaymentSetup`, `ProfileTabs`, `StatCard`
- [ ] Wire API when ready: `POST /listings`, `GET /favorites`, `PUT /profile`, `POST /stripe/setup-intent`, `POST /stripe/connect`

---

## Flow 4: Customer -- Rent, Chat & Disputes

**Run in parallel with Flow 7 (Admin Reports & Disputes).**

```
ListingDetailScreen -> "Rent Now"
  -> BookingScreen (select dates, pricing breakdown: daily rate, service fee, deposit, total)
  -> BookingConfirmScreen (summary, payment method, confirm)
  -> BookingSuccessScreen (booking ID, next steps)

ListingDetailScreen -> "Chat with Owner"
  -> ChatScreen (messaging UI)

Profile -> My Conversations
  -> ChatListScreen (all conversations, last message, unread badge)
  -> ChatScreen

Profile -> Rentals tab
  -> MyRentalsScreen (tabs: Upcoming | Active | Completed | Cancelled)
  -> RentalDetailScreen (status timeline, dates, item, actions: cancel/extend/report)

Profile -> Disputes tab
  -> DisputesListScreen (open/resolved)
  -> DisputeDetailScreen (info, message thread, status)

Header bell icon -> NotificationsScreen (grouped by date)
```

### Deliverables

- [ ] BookingScreen + BookingConfirmScreen + BookingSuccessScreen
- [ ] ChatListScreen + ChatScreen
- [ ] MyRentalsScreen + RentalDetailScreen
- [ ] DisputesListScreen + DisputeDetailScreen
- [ ] NotificationsScreen
- [ ] `bookingStore` + `bookingService`
- [ ] `chatStore` + `chatService`
- [ ] `disputeStore` + `disputeService`
- [ ] `notificationStore` + `notificationService`
- [ ] Components: `BookingCard`, `DateRangePicker`, `PricingBreakdown`, `MessageBubble`, `ConversationItem`
- [ ] Wire API when ready: `POST /bookings`, `GET /bookings`, `GET /conversations`, `POST /messages`, `GET /disputes`, `POST /disputes`, `GET /notifications`

---

## Flow 5: Admin -- Dashboard

**Run in parallel with Flow 2 (Customer Browse).**

Admin screens are only accessible when `user.role === 'admin'`. Show admin section in Profile tab or as a separate drawer/section.

```
Profile -> Admin Section (visible only if admin)
  -> AdminDashboardScreen
      |-> Tabs: Overview | Users | Revenue | Moderation | Health
      |-> Stats cards: Total Users, Verified Users, New This Month
      |-> User Management: User Reports count, Fraud Reports count
```

### Deliverables

- [ ] AdminDashboardScreen with tabs (Overview, Users, Revenue, Moderation, Health)
- [ ] Stats cards component
- [ ] Role-based navigation guard (show admin section only if `user.role === 'admin'`)
- [ ] `adminStore` + `adminService`
- [ ] Wire API when ready: `GET /admin/stats`, `GET /admin/users`

---

## Flow 6: Admin -- Moderation

**Run in parallel with Flow 3 (Customer List & Profile).**

```
Admin Section
  -> AdminPendingRequestsScreen (listings awaiting approval)
      |-> Tap -> Listing detail with Approve/Reject actions
  -> AdminReportsScreen (all reports)
      |-> Tap -> Report detail
  -> BulkEditItemsScreen (bulk actions on listings)
```

### Deliverables

- [ ] AdminPendingRequestsScreen
- [ ] AdminReportsScreen
- [ ] BulkEditItemsScreen
- [ ] Approve/Reject actions on listings
- [ ] Wire API when ready: `GET /admin/pending`, `POST /admin/approve`, `POST /admin/reject`, `GET /admin/reports`

---

## Flow 7: Admin -- Reports & Disputes

**Run in parallel with Flow 4 (Customer Rent & Chat).**

```
Admin Section
  -> AdminDisputesScreen (all platform disputes)
      |-> Tap -> Dispute detail with resolution actions
  -> AdminUserReportsScreen (user reports)
      |-> Tap -> User report detail with actions (warn, ban, dismiss)
```

### Deliverables

- [ ] AdminDisputesScreen
- [ ] AdminUserReportsScreen
- [ ] Resolution actions (resolve dispute, warn/ban user, dismiss)
- [ ] Wire API when ready: `GET /admin/disputes`, `PUT /admin/disputes/:id`, `GET /admin/user-reports`, `PUT /admin/user-reports/:id`

---

## Parallel Execution Plan

```
Week 1 (Day 1-2): Foundation
|
|-- Flow 1: Foundation & Auth [BOTH]
|
Week 1 (Day 2-4): Core screens + API starts arriving
|
|-- Flow 2: Customer Browse & Discover  ←→  Flow 5: Admin Dashboard
|
Week 1 (Day 4-6): Listing & Profile + Admin Moderation
|
|-- Flow 3: Customer List & Profile     ←→  Flow 6: Admin Moderation
|
Week 2 (Day 1-3): Transactions + Admin Reports
|
|-- Flow 4: Customer Rent & Chat        ←→  Flow 7: Admin Reports & Disputes
|
Week 2 (Day 3-4): Polish
|
|-- Empty states, error states, loading skeletons
|-- Pull-to-refresh everywhere
|-- Final API wiring pass (flip remaining USE_API flags)
|-- Dark mode QA
```

---

## Project Structure

```
rentany/
├── src/
│   ├── assets/
│   │   ├── images/
│   │   └── fonts/
│   ├── components/
│   │   ├── common/           # AppButton, AppInput, AppCard, AppModal, EmptyState, TrustBadge
│   │   ├── home/             # HeroBanner, RecommendedSection, RecentlyViewed, CategoryRow
│   │   ├── listing/          # ListingCard, ImageCarousel, FavoriteButton
│   │   ├── booking/          # BookingCard, DateRangePicker, PricingBreakdown
│   │   ├── chat/             # MessageBubble, ConversationItem
│   │   ├── profile/          # PaymentSetup, ProfileTabs, StatCard
│   │   └── admin/            # StatsCard, AdminListItem, ActionButtons
│   ├── screens/
│   │   ├── auth/             # SplashScreen, LoginScreen, RegisterScreen, ForgotPasswordScreen
│   │   ├── home/             # HomeScreen
│   │   ├── search/           # SearchScreen, FilterScreen
│   │   ├── categories/       # CategoriesScreen, CategoryDetailScreen
│   │   ├── listing/          # ListingDetailScreen, CreateListingScreen
│   │   ├── favorites/        # FavoritesScreen, SavedSearchesScreen
│   │   ├── booking/          # BookingScreen, BookingConfirmScreen, BookingSuccessScreen
│   │   ├── rentals/          # MyRentalsScreen, RentalDetailScreen
│   │   ├── chat/             # ChatListScreen, ChatScreen
│   │   ├── disputes/         # DisputesListScreen, DisputeDetailScreen
│   │   ├── notifications/    # NotificationsScreen
│   │   ├── profile/          # ProfileScreen, EditProfileScreen, SettingsScreen
│   │   └── admin/            # AdminDashboardScreen, AdminPendingRequestsScreen,
│   │                         # AdminReportsScreen, AdminDisputesScreen,
│   │                         # AdminUserReportsScreen, BulkEditItemsScreen
│   ├── navigation/
│   │   ├── AppNavigator.tsx
│   │   ├── AuthNavigator.tsx
│   │   ├── MainTabNavigator.tsx
│   │   ├── AdminNavigator.tsx
│   │   └── types.ts
│   ├── store/
│   │   ├── authStore.ts
│   │   ├── listingStore.ts
│   │   ├── bookingStore.ts
│   │   ├── chatStore.ts
│   │   ├── favoriteStore.ts
│   │   ├── disputeStore.ts
│   │   ├── notificationStore.ts
│   │   └── adminStore.ts
│   ├── services/
│   │   ├── api.ts            # Axios instance, base URL, auth interceptor
│   │   ├── authService.ts
│   │   ├── listingService.ts
│   │   ├── bookingService.ts
│   │   ├── chatService.ts
│   │   ├── favoriteService.ts
│   │   ├── disputeService.ts
│   │   ├── notificationService.ts
│   │   └── adminService.ts
│   ├── data/                 # Mock data (used when USE_API = false)
│   │   ├── categories.ts
│   │   ├── listings.ts
│   │   ├── users.ts
│   │   ├── bookings.ts
│   │   ├── chats.ts
│   │   ├── disputes.ts
│   │   └── admin.ts
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   └── useDebounce.ts
│   ├── utils/
│   │   ├── formatters.ts
│   │   ├── validators.ts
│   │   └── constants.ts
│   ├── theme/
│   │   └── index.ts
│   └── types/
│       ├── user.ts
│       ├── listing.ts
│       ├── booking.ts
│       ├── chat.ts
│       ├── dispute.ts
│       ├── admin.ts
│       └── navigation.ts
├── App.tsx
├── app.json
├── package.json
├── tsconfig.json
├── babel.config.js
├── .gitignore
├── AI_INSTRUCTIONS.md
└── README.md
```

## Navigation Structure

```
AppNavigator (Stack)
├── AuthNavigator (Stack)
│   ├── Splash
│   ├── Login
│   ├── Register
│   └── ForgotPassword
│
└── MainTabNavigator (Bottom Tabs)
    ├── Home Tab (Stack)
    │   ├── HomeScreen
    │   ├── ListingDetailScreen
    │   ├── CategoriesScreen
    │   └── CategoryDetailScreen
    │
    ├── Search Tab (Stack)
    │   ├── SearchScreen
    │   └── FilterScreen (modal)
    │
    ├── List Item Tab -> CreateListingScreen (modal)
    │
    ├── Favorites Tab (Stack)
    │   ├── FavoritesScreen
    │   └── SavedSearchesScreen
    │
    └── Profile Tab (Stack)
        ├── ProfileScreen
        ├── EditProfileScreen
        ├── SettingsScreen
        └── AdminNavigator (if admin) (Stack)
            ├── AdminDashboardScreen
            ├── AdminPendingRequestsScreen
            ├── AdminReportsScreen
            ├── AdminDisputesScreen
            ├── AdminUserReportsScreen
            └── BulkEditItemsScreen

Shared Modal / Push Screens:
├── BookingScreen -> BookingConfirmScreen -> BookingSuccessScreen
├── ChatListScreen -> ChatScreen
├── MyRentalsScreen -> RentalDetailScreen
├── DisputesListScreen -> DisputeDetailScreen
└── NotificationsScreen (header bell icon)
```

## Bottom Tab Bar

| Tab | Icon | Screen | Note |
| --- | --- | --- | --- |
| Home | home | HomeScreen | "Browse All" equivalent |
| Search | search | SearchScreen | |
| + List | plus-circle | CreateListingScreen | Center FAB-style button |
| Favorites | heart | FavoritesScreen | |
| Profile | user | ProfileScreen | |

## Data Models

### User

```typescript
interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  bio: string;
  rating: number;
  totalReviews: number;
  memberSince: string;
  isVerified: boolean;
  role: 'user' | 'admin';
  location: { city: string; state: string; country: string };
  paymentSetup: {
    cardConnected: boolean;
    bankConnected: boolean;
  };
  stats: {
    totalItems: number;
    availableItems: number;
  };
}
```

### Listing

```typescript
interface Listing {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  category: string;
  images: string[];
  pricePerDay: number;
  location: { address: string; city: string; lat: number; lng: number };
  availability: { startDate: string; endDate: string }[];
  rating: number;
  totalReviews: number;
  features: string[];
  rules: string[];
  likes: number;
  isLiked: boolean;
  createdAt: string;
  isActive: boolean;
  status: 'active' | 'pending' | 'rejected' | 'draft';
}
```

### Booking

```typescript
interface Booking {
  id: string;
  listingId: string;
  renterId: string;
  ownerId: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  dailyRate: number;
  serviceFee: number;
  deposit: number;
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled';
  paymentMethod: string;
  createdAt: string;
}
```

### Chat

```typescript
interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  timestamp: string;
  isRead: boolean;
}

interface Conversation {
  id: string;
  participants: string[];
  listingId: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}
```

### Dispute

```typescript
interface Dispute {
  id: string;
  bookingId: string;
  reporterId: string;
  reason: string;
  description: string;
  status: 'open' | 'in_review' | 'resolved' | 'closed';
  messages: { senderId: string; text: string; timestamp: string }[];
  createdAt: string;
}
```

### Notification

```typescript
interface AppNotification {
  id: string;
  userId: string;
  type: 'booking_update' | 'new_message' | 'review' | 'promotion' | 'system' | 'dispute';
  title: string;
  body: string;
  data?: Record<string, string>;
  isRead: boolean;
  createdAt: string;
}
```

### Admin Stats

```typescript
interface AdminStats {
  totalUsers: number;
  verifiedUsers: number;
  newThisMonth: number;
  joinedThisWeek: number;
  userReports: number;
  fraudReports: number;
  totalListings: number;
  pendingListings: number;
  totalRevenue: number;
  monthlyRevenue: number;
}
```

## Theme & Styling

Matching the web app design:

- **Primary Color:** #1F2937 (dark navy -- sidebar, hero, buttons)
- **Accent Gradient:** hero text ("Don't waste it." coral-to-orange, "Rent it." emerald)
- **Accent Coral:** #F97066 (CTA highlights)
- **Accent Emerald:** #10B981 (success, bank connect button)
- **Accent Blue:** #3B82F6 (card connect button, links)
- **Background:** #F9FAFB (light), #111827 (dark)
- **Card Background:** #FFFFFF (light), #1F2937 (dark)
- **Text Primary:** #111827 (light), #F9FAFB (dark)
- **Text Secondary:** #6B7280
- **Error/Red:** #EF4444
- **Warning:** #F59E0B
- **Border Radius:** 12px (cards), 8px (buttons/inputs), full-round (avatars)
- **Font:** System default
- **Sidebar on web = Bottom tabs on mobile**
- Light and dark mode via NativeBase color mode

## Development Commands

```bash
npm install              # Install dependencies
npx expo start           # Start dev server
npx expo run:android     # Run on Android
npx expo run:ios         # Run on iOS
npx tsc --noEmit         # Type check
npx eslint src/          # Lint
```
