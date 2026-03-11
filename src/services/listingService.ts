import { mockCategories } from '../data/categories';
import { mockListings } from '../data/listings';
import { Category, Listing, ListingFilter, CreateListingFormData } from '../types/listing';
import { api } from './api';

const USE_API = true;

// Helper to map backend item format to frontend Listing format
const mapItem = (item: any): Listing => ({
  id: item.id || item._id,
  title: item.title || '',
  description: item.description || '',
  pricePerDay: item.daily_rate ?? item.pricePerDay ?? 0,
  daily_rate: item.daily_rate,
  category: item.category || '',
  images: item.images || [],
  videos: item.videos || [],
  ownerId: item.owner_id ?? item.ownerId ?? '',
  location: typeof item.location === 'object' && item.location !== null
    ? item.location
    : { address: item.location ?? '', city: '', lat: item.lat ?? 0, lng: item.lng ?? 0 },
  street_address: item.street_address,
  postcode: item.postcode,
  country: item.country,
  show_on_map: item.show_on_map,
  availability: item.availability ?? true,
  rating: item.rating ?? 0,
  totalReviews: item.totalReviews ?? 0,
  features: item.features ?? [],
  rules: item.rules ?? [],
  likes: item.favorite_count ?? item.likes ?? 0,
  isLiked: item.isLiked ?? false,
  isActive: item.status === 'active',
  status: item.status ?? 'active',
  condition: item.condition ?? 'Good',
  deposit: item.deposit ?? 0,
  min_rental_days: item.min_rental_days ?? 1,
  max_rental_days: item.max_rental_days ?? 30,
  notice_period_hours: item.notice_period_hours,
  instant_booking: item.instant_booking,
  same_day_pickup: item.same_day_pickup,
  delivery_options: item.delivery_options ?? [],
  delivery_fee: item.delivery_fee,
  delivery_radius: item.delivery_radius,
  pricing_tiers: item.pricing_tiers ?? [],
  createdAt: item.created_at ?? item.createdAt ?? new Date().toISOString(),
});

export const getListings = async (params?: {
  limit?: number;
  offset?: number;
  search?: string;
  category?: string;
  location?: string;
  min_price?: number;
  max_price?: number;
  sort_by?: string;
}): Promise<Listing[]> => {
  if (USE_API) {
    const res = await api.get('/items', { params });
    return (res.data.data || res.data).map(mapItem);
  }
  await new Promise((r) => setTimeout(r, 500));
  if (params?.limit) {
    const start = params.offset ?? 0;
    return mockListings.slice(start, start + params.limit);
  }
  return mockListings;
};

export interface ItemOwner {
  username?: string;
  full_name?: string;
  profile_picture?: string;
  email?: string;
}

export const getListingById = async (id: string): Promise<{ listing: Listing; owner: ItemOwner | null } | undefined> => {
  if (USE_API) {
    const res = await api.get(`/items/${id}`);
    const data = res.data.data || res.data;
    // Backend returns { item, owner } for single item
    const item = data.item || data;
    const owner: ItemOwner | null = data.owner || null;
    return { listing: mapItem(item), owner };
  }
  await new Promise((r) => setTimeout(r, 300));
  const found = mockListings.find((l) => l.id === id);
  return found ? { listing: found, owner: null } : undefined;
};

export const searchListings = async (query: string): Promise<Listing[]> => {
  if (USE_API) {
    const res = await api.get('/items', { params: { search: query } });
    return (res.data.data || res.data).map(mapItem);
  }
  await new Promise((r) => setTimeout(r, 400));
  const q = query.toLowerCase();
  return mockListings.filter(
    (l) =>
      l.title.toLowerCase().includes(q) ||
      l.description.toLowerCase().includes(q) ||
      l.category.toLowerCase().includes(q)
  );
};

export const filterListings = async (filter: ListingFilter): Promise<Listing[]> => {
  if (USE_API) {
    const params: Record<string, any> = {};
    if (filter.query) params.search = filter.query;
    if (filter.category) params.category = filter.category;
    if (filter.location) params.location = filter.location;
    if (filter.minPrice !== undefined) params.min_price = filter.minPrice;
    if (filter.maxPrice !== undefined) params.max_price = filter.maxPrice;
    if (filter.sortBy) params.sort_by = filter.sortBy;
    if (filter.availability === 'available') params.availability = true;
    else if (filter.availability === 'unavailable') params.availability = false;
    const res = await api.get('/items', { params });
    return (res.data.data || res.data).map(mapItem);
  }
  await new Promise((r) => setTimeout(r, 400));
  let results = [...mockListings];

  if (filter.category) {
    results = results.filter((l) => l.category === filter.category);
  }
  if (filter.minPrice !== undefined) {
    results = results.filter((l) => l.pricePerDay >= filter.minPrice!);
  }
  if (filter.maxPrice !== undefined) {
    results = results.filter((l) => l.pricePerDay <= filter.maxPrice!);
  }
  if (filter.rating !== undefined) {
    results = results.filter((l) => l.rating >= filter.rating!);
  }
  if (filter.query) {
    const q = filter.query.toLowerCase();
    results = results.filter(
      (l) => l.title.toLowerCase().includes(q) || l.description.toLowerCase().includes(q)
    );
  }
  if (filter.sortBy) {
    switch (filter.sortBy) {
      case 'newest':
        results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'price_low':
        results.sort((a, b) => a.pricePerDay - b.pricePerDay);
        break;
      case 'price_high':
        results.sort((a, b) => b.pricePerDay - a.pricePerDay);
        break;
      case 'rating':
        results.sort((a, b) => b.rating - a.rating);
        break;
      case 'popular':
        results.sort((a, b) => b.likes - a.likes);
        break;
    }
  }

  return results;
};

export const getListingsByCategory = async (category: string): Promise<Listing[]> => {
  if (USE_API) {
    const res = await api.get('/items', { params: { category } });
    return (res.data.data || res.data).map(mapItem);
  }
  await new Promise((r) => setTimeout(r, 400));
  return mockListings.filter((l) => l.category === category);
};

export const getCategories = async (): Promise<Category[]> => {
  // Backend has no /categories endpoint — use local categories
  await new Promise((r) => setTimeout(r, 100));
  return mockCategories;
};

export const getRecommendedListings = async (): Promise<Listing[]> => {
  if (USE_API) {
    // Use items endpoint sorted by popular, limited
    const res = await api.get('/items', { params: { sort_by: 'popular', limit: 5 } });
    return (res.data.data || res.data).map(mapItem);
  }
  await new Promise((r) => setTimeout(r, 500));
  return mockListings.filter((l) => l.rating >= 4.7).slice(0, 5);
};

export const getRecentlyViewedListings = async (): Promise<Listing[]> => {
  if (USE_API) {
    try {
      const res = await api.get('/viewed-items');
      const viewedItems = res.data.data || res.data || [];
      // viewed-items returns item references; extract item IDs and fetch
      if (viewedItems.length === 0) return [];
      const ids = viewedItems.map((v: any) => v.item_id).filter(Boolean).join(',');
      if (!ids) return [];
      const itemsRes = await api.get('/items', { params: { ids } });
      return (itemsRes.data.data || itemsRes.data).map(mapItem);
    } catch {
      return [];
    }
  }
  await new Promise((r) => setTimeout(r, 300));
  return []; // Return empty by default, handled by store persistence
};

export const createItem = async (data: Record<string, any>): Promise<any> => {
  if (!USE_API) {
    await new Promise((r) => setTimeout(r, 300));
    return { id: `item_${Date.now()}`, ...data, created_at: new Date().toISOString() };
  }
  const res = await api.post('/items', data);
  return res.data.data || res.data;
};

export const updateItem = async (id: string, data: Record<string, any>): Promise<any> => {
  if (!USE_API) {
    await new Promise((r) => setTimeout(r, 300));
    return { id, ...data, updated_at: new Date().toISOString() };
  }
  const res = await api.put(`/items/${id}`, data);
  return res.data.data || res.data;
};

export const deleteItem = async (id: string): Promise<void> => {
  if (!USE_API) {
    await new Promise((r) => setTimeout(r, 200));
    return;
  }
  await api.delete(`/items/${id}`);
};

export const getItemsByOwner = async (ownerId: string): Promise<Listing[]> => {
  if (!USE_API) {
    await new Promise((r) => setTimeout(r, 300));
    return mockListings.filter((l) => l.ownerId === ownerId);
  }
  const res = await api.get('/items', { params: { owner_id: ownerId } });
  return (res.data.data || res.data).map(mapItem);
};

export const uploadFile = async (uri: string, type: string = 'image'): Promise<string> => {
  if (!USE_API) {
    // When API is not connected, use the local URI directly
    await new Promise((r) => setTimeout(r, 200));
    return uri;
  }

  const formData = new FormData();
  const filename = uri.split('/').pop() || `${type}_${Date.now()}`;
  const match = /\.(\w+)$/.exec(filename);
  const mimeType = type === 'video'
    ? `video/${match?.[1] || 'mp4'}`
    : `image/${match?.[1] || 'jpeg'}`;

  formData.append('file', {
    uri,
    name: filename,
    type: mimeType,
  } as any);

  const response = await api.post('/file/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data.data.file_url;
};

export const trackViewedItem = async (userEmail: string, itemId: string): Promise<void> => {
  if (!USE_API) return;
  try {
    await api.post('/viewed-items', {
      user_email: userEmail,
      item_id: itemId,
      viewed_date: new Date().toISOString(),
    });
  } catch {
    // non-critical, silently fail
  }
};

// ── Favorites API ──

export interface FavoriteData {
  id: string;
  user_email: string;
  item_id: string;
  created_at: string;
}

export const getFavorites = async (userEmail: string): Promise<FavoriteData[]> => {
  if (!USE_API) return [];
  const res = await api.get('/favorites', { params: { user_email: userEmail } });
  return res.data.data || res.data || [];
};

export const addFavorite = async (itemId: string, userEmail: string): Promise<FavoriteData> => {
  const res = await api.post('/favorites', { item_id: itemId, user_email: userEmail });
  return res.data.data || res.data;
};

export const removeFavorite = async (itemId: string, userEmail: string): Promise<void> => {
  await api.delete('/favorites', { data: { item_id: itemId, user_email: userEmail } });
};
