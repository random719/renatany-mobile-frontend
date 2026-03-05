export interface Listing {
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
}
