import { create } from 'zustand';
import { Listing, Category, ListingFilter } from '../types/listing';
import * as listingService from '../services/listingService';

interface ListingState {
  listings: Listing[];
  recommended: Listing[];
  recentlyViewed: Listing[];
  categories: Category[];
  selectedListing: Listing | null;
  searchResults: Listing[];
  categoryListings: Listing[];
  isLoading: boolean;
  error: string | null;
  activeFilter: ListingFilter;
  fetchListings: () => Promise<void>;
  fetchRecommended: () => Promise<void>;
  fetchRecentlyViewed: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchListingById: (id: string) => Promise<void>;
  search: (query: string) => Promise<void>;
  applyFilter: (filter: ListingFilter) => Promise<void>;
  fetchByCategory: (category: string) => Promise<void>;
  toggleLike: (id: string) => void;
  clearSearch: () => void;
  setActiveFilter: (filter: ListingFilter) => void;
}

export const useListingStore = create<ListingState>((set, get) => ({
  listings: [],
  recommended: [],
  recentlyViewed: [],
  categories: [],
  selectedListing: null,
  searchResults: [],
  categoryListings: [],
  isLoading: false,
  error: null,
  activeFilter: {},

  fetchListings: async () => {
    set({ isLoading: true, error: null });
    try {
      const listings = await listingService.getListings();
      set({ listings, isLoading: false });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to fetch listings';
      set({ error: message, isLoading: false });
    }
  },

  fetchRecommended: async () => {
    try {
      const recommended = await listingService.getRecommendedListings();
      set({ recommended });
    } catch {
      // silent fail for recommendations
    }
  },

  fetchRecentlyViewed: async () => {
    try {
      const recentlyViewed = await listingService.getRecentlyViewedListings();
      set({ recentlyViewed });
    } catch {
      // silent fail
    }
  },

  fetchCategories: async () => {
    try {
      const categories = await listingService.getCategories();
      set({ categories });
    } catch {
      // silent fail
    }
  },

  fetchListingById: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const listing = await listingService.getListingById(id);
      set({ selectedListing: listing || null, isLoading: false });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to fetch listing';
      set({ error: message, isLoading: false });
    }
  },

  search: async (query: string) => {
    set({ isLoading: true, error: null });
    try {
      const searchResults = await listingService.searchListings(query);
      set({ searchResults, isLoading: false });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Search failed';
      set({ error: message, isLoading: false });
    }
  },

  applyFilter: async (filter: ListingFilter) => {
    set({ isLoading: true, error: null, activeFilter: filter });
    try {
      const searchResults = await listingService.filterListings(filter);
      set({ searchResults, isLoading: false });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Filter failed';
      set({ error: message, isLoading: false });
    }
  },

  fetchByCategory: async (category: string) => {
    set({ isLoading: true, error: null });
    try {
      const categoryListings = await listingService.getListingsByCategory(category);
      set({ categoryListings, isLoading: false });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to fetch category';
      set({ error: message, isLoading: false });
    }
  },

  toggleLike: (id: string) => {
    const { listings, recommended, recentlyViewed, searchResults, categoryListings, selectedListing } = get();
    const toggle = (list: Listing[]) =>
      list.map((l) =>
        l.id === id ? { ...l, isLiked: !l.isLiked, likes: l.isLiked ? l.likes - 1 : l.likes + 1 } : l
      );
    set({
      listings: toggle(listings),
      recommended: toggle(recommended),
      recentlyViewed: toggle(recentlyViewed),
      searchResults: toggle(searchResults),
      categoryListings: toggle(categoryListings),
      selectedListing:
        selectedListing?.id === id
          ? { ...selectedListing, isLiked: !selectedListing.isLiked, likes: selectedListing.isLiked ? selectedListing.likes - 1 : selectedListing.likes + 1 }
          : selectedListing,
    });
  },

  clearSearch: () => set({ searchResults: [], activeFilter: {} }),

  setActiveFilter: (filter: ListingFilter) => set({ activeFilter: filter }),
}));
