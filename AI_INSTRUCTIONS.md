# AI Instructions for RentAny

You are an AI developer working on the RentAny mobile app. **Read the entire README.md before writing any code.** It is the single source of truth for project structure, flows, screen definitions, data models, navigation, and theming.

## About the Project

RentAny is an existing peer-to-peer rental marketplace (web: [www.rentany.fr](https://www.rentany.fr)). This is the React Native mobile companion app. The web app is already live -- the mobile app must match its features, flows, and visual style.

The backend (Node.js) API is arriving in ~2 days. **Do not wait for the API.** Build each flow with mock data AND a `USE_API` toggle in the service layer so it can be switched to real API instantly.

## Development is Flow-Based & Parallel

README.md defines 7 flows. Customer flows (2-4) and Admin flows (5-7) run **in parallel**. Each flow is a complete vertical slice:

```
Types -> Mock Data -> Service (with USE_API flag) -> Store -> Screens + Components
```

### Parallel pairs

- Flow 1: Foundation & Auth (build first, everything depends on it)
- Flow 2 (Customer Browse) runs alongside Flow 5 (Admin Dashboard)
- Flow 3 (Customer List & Profile) runs alongside Flow 6 (Admin Moderation)
- Flow 4 (Customer Rent & Chat) runs alongside Flow 7 (Admin Reports & Disputes)

**Always check README.md for which flow you are working on and its deliverables.**

## API Wiring Pattern (Critical)

Every service file must use the `USE_API` flag pattern from day one:

```typescript
// src/services/listingService.ts
import { api } from './api';
import { listings as mockListings } from '../data/listings';

const USE_API = false; // flip to true when backend endpoint is ready

export const getListings = async () => {
  if (USE_API) return api.get('/listings').then(r => r.data);
  await new Promise(r => setTimeout(r, 500));
  return mockListings;
};
```

- `src/services/api.ts` must have Axios instance with `baseURL`, auth token interceptor, and error handling -- ready for real API from the start
- Each service function has BOTH paths: mock and API
- Each flow in README.md lists the exact API endpoints to wire (e.g., `GET /listings`, `POST /bookings`)
- When the backend team delivers an endpoint, flip `USE_API = true` in that service file -- nothing else changes

## Core Rules

1. **Read README.md first** -- every time, for every task
2. **Follow the exact folder structure** in README.md
3. **TypeScript only** -- `.ts` and `.tsx`. No `.js`. No `any` type
4. **React Native Paper for UI components** -- use Paper's `Text`, `Button`, `TextInput`, `Card`, `ActivityIndicator`, `Snackbar`, `Dialog`, `FAB`, etc. Use RN `View`/`ScrollView`/`FlatList` for layout. Use `MaterialCommunityIcons` for icons.
5. **Zustand for state** -- one store per domain (auth, listing, booking, chat, favorite, dispute, notification, admin)
6. **React Navigation v6** -- exact navigator structure from README.md
7. **Match the web app design** -- dark primary (#1F2937), coral/emerald gradient accents, trust badges, "AI Powered" badge on recommendations, heart/like counts on listing cards
8. **Admin screens are role-gated** -- only visible when `user.role === 'admin'`

## Data Flow (Strict)

```
Screen -> Store (Zustand) -> Service (USE_API toggle) -> Backend API / Mock Data
```

- `src/data/` -- Static mock data matching TypeScript interfaces in README.md
- `src/services/` -- Each function has mock path AND API path via `USE_API` flag
- `src/store/` -- Zustand stores that call service functions
- Screens/Components -- **Only access data through stores.** Never import `src/data/` directly

## Code Style

- **Functional components only**, arrow function syntax
- **Named exports** for everything
- **File naming:**
  - Screens: `PascalCase.tsx` (e.g., `HomeScreen.tsx`)
  - Components: `PascalCase.tsx` (e.g., `ListingCard.tsx`)
  - Stores: `camelCase.ts` (e.g., `authStore.ts`)
  - Services: `camelCase.ts` (e.g., `listingService.ts`)
  - Utils/hooks: `camelCase.ts` (e.g., `useAuth.ts`)
  - Types: `camelCase.ts` (e.g., `listing.ts`)
  - Data: `camelCase.ts` (e.g., `listings.ts`)
- **No inline styles** -- use React Native Paper props or style objects
- **No `any`** -- use types from `src/types/`
- Keep components under 200 lines. Extract sub-components if needed
- Use exact type definitions from README.md (User, Listing, Booking, Chat, Dispute, AdminStats, etc.)

## React Native Paper Usage

- Root: `<PaperProvider theme={lightTheme}>` (from `react-native-paper`)
- Theme: `src/theme/index.ts` extends `MD3LightTheme` / `MD3DarkTheme` with app colors
- Layout: Use React Native `View`, `ScrollView`, `FlatList` with `StyleSheet`
- Text: Use `Text` from `react-native-paper` (supports `variant` prop: `headlineLarge`, `bodyMedium`, etc.)
- Forms: `TextInput`, `Checkbox`, `RadioButton`, `Switch` from `react-native-paper`
- Buttons: `Button` from `react-native-paper` (modes: `contained`, `outlined`, `text`)
- Cards: `Card`, `Card.Title`, `Card.Content`, `Card.Cover` from `react-native-paper`
- Feedback: `ActivityIndicator`, `Snackbar`, `Banner`, `Dialog` from `react-native-paper`
- Icons: `MaterialCommunityIcons` from `@expo/vector-icons`
- FAB: `FAB` from `react-native-paper` for the center "+" list item tab button

## Navigation

- Exact hierarchy from README.md
- All route params in `src/navigation/types.ts`
- Typed hooks: `useNavigation<StackNavigationProp<ParamList>>()`
- Bottom tabs: Home, Search, + List (center FAB), Favorites, Profile
- Admin screens: nested under Profile tab via `AdminNavigator` (only if admin)
- Notifications from header bell icon (modal)
- Chat, Rentals, Disputes as push/modal screens

## Component Guidelines

**Screens:**

- Handle layout, data fetching (via store), loading states, error states
- Show `Spinner` while loading
- Pull-to-refresh on list screens
- `EmptyState` component when no data

**Reusable Components (`src/components/common/`):**

- `AppButton`, `AppInput`, `AppCard`, `AppModal`, `EmptyState`, `ErrorState`, `TrustBadge`
- Accept props, no hardcoded values

**Listing Components:**

- `ListingCard` -- image, category badge, heart icon with like count, title, price/day, rating
- `ImageCarousel` -- swipeable gallery for listing detail
- `FavoriteButton` -- heart toggle with count

**Profile Components:**

- `PaymentSetup` -- card/bank connection status with action buttons
- `ProfileTabs` -- Items, Wallet, Reviews, Rentals, Disputes, Documents, Settings
- `StatCard` -- items count, available count, rating

**Admin Components:**

- `StatsCard` -- stat value, label, icon, color
- `AdminListItem` -- reusable row for reports, disputes, pending items
- `ActionButtons` -- approve/reject, warn/ban/dismiss

## Image Handling

- Placeholder images from `https://picsum.photos/` in mock data
- React Native Paper `Image` with `alt` prop always set
- `FlatList` for lazy loading in lists

## When Adding a New Feature

1. Check README.md for the flow it belongs to and its deliverables
2. Add types to `src/types/` if not defined
3. Add mock data to `src/data/`
4. Add service functions to `src/services/` WITH both mock and API paths
5. Add/update Zustand store in `src/store/`
6. Build screen in `src/screens/`
7. Extract reusable parts to `src/components/`
8. Add navigation route if new screen

## Do NOT

- Install packages not in README.md without asking
- Use Redux, Context API, or MobX
- Write class components
- Put business logic in components (use stores or utils)
- Import mock data directly in screens (go through services -> stores)
- Skip TypeScript types or use `any`
- Hardcode colors (use React Native Paper theme tokens)
- Write service functions without the `USE_API` toggle pattern
- Skip the API path in services -- both mock AND api paths must exist
- Show admin screens to non-admin users
- Deviate from the web app's visual design and flow
