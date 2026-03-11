import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as listingService from '../services/listingService';
import { Category, Listing, ListingFilter } from '../types/listing';

const ITEMS_PER_PAGE = 20;

interface ListingState {
  listings: Listing[];
  recommended: Listing[];
  recentlyViewed: Listing[];
  userItems: Listing[];
  categories: Category[];
  selectedListing: Listing | null;
  searchResults: Listing[];
  categoryListings: Listing[];
  isLoading: boolean;
  isLoadingMore: boolean;
  isSubmitting: boolean;
  hasMoreListings: boolean;
  error: string | null;
  activeFilter: ListingFilter;
  fetchListings: () => Promise<void>;
  fetchMoreListings: () => Promise<void>;
  fetchRecommended: () => Promise<void>;
  fetchRecentlyViewed: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchListingById: (id: string) => Promise<void>;
  fetchUserItems: (ownerId: string) => Promise<void>;
  createItem: (data: Record<string, any>) => Promise<any>;
  updateItem: (id: string, data: Record<string, any>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  search: (query: string) => Promise<void>;
  applyFilter: (filter: ListingFilter) => Promise<void>;
  fetchByCategory: (category: string) => Promise<void>;
  toggleLike: (id: string) => void;
  addToRecentlyViewed: (listing: Listing) => void;
  clearSearch: () => void;
  setActiveFilter: (filter: ListingFilter) => void;
}

export const useListingStore = create<ListingState>()(
  persist(
    (set, get) => ({
      listings: [],
      recommended: [],
      recentlyViewed: [],
      userItems: [],
      categories: [],
      selectedListing: null,
      searchResults: [],
      categoryListings: [],
      isLoading: false,
      isLoadingMore: false,
      isSubmitting: false,
      hasMoreListings: true,
      error: null,
      activeFilter: {},

      fetchListings: async () => {
        set({ isLoading: true, error: null });
        try {
          const listings = await listingService.getListings({ limit: ITEMS_PER_PAGE, offset: 0 });
          set({ listings, isLoading: false, hasMoreListings: listings.length >= ITEMS_PER_PAGE });
        } catch (e: unknown) {
          const message = e instanceof Error ? e.message : 'Failed to fetch listings';
          set({ error: message, isLoading: false });
        }
      },

      fetchMoreListings: async () => {
        const { isLoadingMore, hasMoreListings, listings } = get();
        if (isLoadingMore || !hasMoreListings) return;
        set({ isLoadingMore: true });
        try {
          const more = await listingService.getListings({ limit: ITEMS_PER_PAGE, offset: listings.length });
          set({
            listings: [...listings, ...more],
            isLoadingMore: false,
            hasMoreListings: more.length >= ITEMS_PER_PAGE,
          });
        } catch {
          set({ isLoadingMore: false });
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
          // Only update if we actually get items from the server (e.g. for syncing)
          if (recentlyViewed && recentlyViewed.length > 0) {
            set({ recentlyViewed });
          }
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

      fetchUserItems: async (ownerId: string) => {
        set({ isLoading: true, error: null });
        try {
          const userItems = await listingService.getItemsByOwner(ownerId);
          set({ userItems, isLoading: false });
        } catch (e: unknown) {
          const message = e instanceof Error ? e.message : 'Failed to fetch your items';
          set({ error: message, isLoading: false });
        }
      },

      createItem: async (data: Record<string, any>) => {
        set({ isSubmitting: true, error: null });
        try {
          const result = await listingService.createItem(data);
          const { userItems, listings } = get();
          const newItem: Listing = {
            id: result.id || `item_${Date.now()}`,
            title: data.title || '',
            description: data.description || '',
            pricePerDay: Number(data.price_per_day) || 0,
            category: data.category || '',
            images: data.images || [],
            ownerId: data.owner_id || '',
            ownerName: data.owner_name || '',
            location: data.location || '',
            rating: 0,
            likes: 0,
            isLiked: false,
            condition: data.condition || 'Good',
            deposit: Number(data.deposit) || 0,
            min_rental_days: Number(data.min_rental_days) || 1,
            max_rental_days: Number(data.max_rental_days) || 30,
            delivery_options: data.delivery_options || [],
            createdAt: new Date().toISOString(),
            ...result,
          };
          set({ userItems: [newItem, ...userItems], listings: [newItem, ...listings], isSubmitting: false });
          return result;
        } catch (e: unknown) {
          const message = e instanceof Error ? e.message : 'Failed to create listing';
          set({ error: message, isSubmitting: false });
          throw e;
        }
      },

      updateItem: async (id: string, data: Record<string, any>) => {
        set({ isSubmitting: true, error: null });
        try {
          await listingService.updateItem(id, data);
          set({ isSubmitting: false });
        } catch (e: unknown) {
          const message = e instanceof Error ? e.message : 'Failed to update item';
          set({ error: message, isSubmitting: false });
          throw e;
        }
      },

      deleteItem: async (id: string) => {
        set({ isSubmitting: true, error: null });
        try {
          await listingService.deleteItem(id);
          const { userItems } = get();
          set({
            userItems: userItems.filter((item) => item.id !== id),
            isSubmitting: false,
          });
        } catch (e: unknown) {
          const message = e instanceof Error ? e.message : 'Failed to delete item';
          set({ error: message, isSubmitting: false });
          throw e;
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

      addToRecentlyViewed: (listing: Listing) => {
        const { recentlyViewed } = get();
        // Remove if already exists to move to top
        const filtered = recentlyViewed.filter((item) => item.id !== listing.id);
        const updated = [listing, ...filtered].slice(0, 10);
        set({ recentlyViewed: updated });
      },

      clearSearch: () => set({ searchResults: [], activeFilter: {} }),

      setActiveFilter: (filter: ListingFilter) => set({ activeFilter: filter }),
    }),
    {
      name: 'listing-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        recentlyViewed: state.recentlyViewed,
      }),
    }
  )
);
