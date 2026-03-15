export interface Listing {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  category: string;
  images: string[];
  videos?: string[];
  pricePerDay: number;
  daily_rate?: number;
  deposit?: number;
  condition?: string;
  pricing_tiers?: Array<{ days: number; price: number }>;
  location: { address: string; city: string; lat: number; lng: number };
  street_address?: string;
  postcode?: string;
  country?: string;
  show_on_map?: boolean;
  availability: { startDate: string; endDate: string }[] | boolean;
  min_rental_days?: number;
  max_rental_days?: number;
  notice_period_hours?: number;
  instant_booking?: boolean;
  same_day_pickup?: boolean;
  delivery_options?: string[];
  delivery_fee?: number;
  delivery_radius?: number | null;
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

export interface CreateListingFormData {
  title: string;
  description: string;
  category: string;
  daily_rate: string;
  pricing_tiers: Array<{ days: number; price: number }>;
  deposit: string;
  condition: string;
  location: string;
  street_address: string;
  postcode: string;
  country: string;
  show_on_map: boolean;
  min_rental_days: string;
  max_rental_days: string;
  notice_period_hours: string;
  instant_booking: boolean;
  same_day_pickup: boolean;
  delivery_options: string[];
  delivery_fee: string;
  delivery_radius: string;
}

export interface BulkEditChanges {
  availability: boolean | null;
  min_rental_days: string;
  max_rental_days: string;
  notice_period_hours: string;
  instant_booking: boolean | null;
  same_day_pickup: boolean | null;
  daily_rate_multiplier: string;
  deposit: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  count: number;
}

export interface ListingFilter {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  sortBy?: 'newest' | 'price_low' | 'price_high' | 'rating' | 'popular';
  query?: string;
  location?: string;
  availability?: 'all' | 'available' | 'unavailable';
}

export interface SavedSearch {
  id: string;
  user_email: string;
  name: string;
  filters?: {
    category?: string;
    location?: string;
    min_price?: number;
    max_price?: number;
    search_query?: string;
  };
  notify_new_items: boolean;
  created_at: string;
  updated_at?: string;
}
