import { api } from './api';
import { mockListings } from '../data/listings';
import { mockCategories } from '../data/categories';
import { Listing, Category, ListingFilter } from '../types/listing';

const USE_API = false;

export const getListings = async (): Promise<Listing[]> => {
  if (USE_API) return api.get('/listings').then((r) => r.data);
  await new Promise((r) => setTimeout(r, 500));
  return mockListings;
};

export const getListingById = async (id: string): Promise<Listing | undefined> => {
  if (USE_API) return api.get(`/listings/${id}`).then((r) => r.data);
  await new Promise((r) => setTimeout(r, 300));
  return mockListings.find((l) => l.id === id);
};

export const searchListings = async (query: string): Promise<Listing[]> => {
  if (USE_API) return api.get('/listings/search', { params: { q: query } }).then((r) => r.data);
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
  if (USE_API) return api.get('/listings/filter', { params: filter }).then((r) => r.data);
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
  if (USE_API) return api.get(`/categories/${category}/listings`).then((r) => r.data);
  await new Promise((r) => setTimeout(r, 400));
  return mockListings.filter((l) => l.category === category);
};

export const getCategories = async (): Promise<Category[]> => {
  if (USE_API) return api.get('/categories').then((r) => r.data);
  await new Promise((r) => setTimeout(r, 300));
  return mockCategories;
};

export const getRecommendedListings = async (): Promise<Listing[]> => {
  if (USE_API) return api.get('/listings/recommended').then((r) => r.data);
  await new Promise((r) => setTimeout(r, 500));
  return mockListings.filter((l) => l.rating >= 4.7).slice(0, 5);
};

export const getRecentlyViewedListings = async (): Promise<Listing[]> => {
  if (USE_API) return api.get('/listings/recently-viewed').then((r) => r.data);
  await new Promise((r) => setTimeout(r, 300));
  return mockListings.slice(0, 4);
};
