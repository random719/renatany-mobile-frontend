import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as listingService from '../services/listingService';
import { Category, Listing, ListingFilter, SavedSearch } from '../types/listing';

const ITEMS_PER_PAGE = 20;

// Helper: mark isLiked on listings based on favoriteItemIds
const markFavorites = (items: Listing[], favIds: Set<string>): Listing[] =>
  items.map((item) => ({ ...item, isLiked: favIds.has(item.id) }));

interface ListingState {
  listings: Listing[];
  recommended: Listing[];
  recentlyViewed: Listing[];
  userItems: Listing[];
  categories: Category[];
  selectedListing: Listing | null;
  selectedListingOwner: listingService.ItemOwner | null;
  searchResults: Listing[];
  categoryListings: Listing[];
  isLoading: boolean;
  isLoadingMore: boolean;
  isSubmitting: boolean;
  hasMoreListings: boolean;
  error: string | null;
  activeFilter: ListingFilter;
  availableCount: number | null;
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
  toggleLike: (id: string, userEmail?: string) => void;
  addToRecentlyViewed: (listing: Listing) => void;
  clearSearch: () => void;
  setActiveFilter: (filter: ListingFilter) => void;
  favoriteItemIds: Set<string>;
  fetchFavorites: (userEmail: string) => Promise<void>;
  favoriteItems: Listing[];
  isFavoritesLoading: boolean;
  fetchItemsStats: () => Promise<void>;
  savedSearches: SavedSearch[];
  isSavedSearchesLoading: boolean;
  fetchSavedSearches: () => Promise<void>;
  createSavedSearch: (name: string, filters: ListingFilter) => Promise<void>;
  updateSavedSearch: (id: string, data: Record<string, any>) => Promise<void>;
  deleteSavedSearch: (id: string) => Promise<void>;
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
      selectedListingOwner: null,
      searchResults: [],
      categoryListings: [],
      isLoading: false,
      isLoadingMore: false,
      isSubmitting: false,
      hasMoreListings: true,
      error: null,
      activeFilter: {},
      availableCount: null,
      favoriteItemIds: new Set<string>(),
      favoriteItems: [],
      isFavoritesLoading: false,
      savedSearches: [],
      isSavedSearchesLoading: false,

      fetchListings: async () => {
        const { activeFilter } = get();
        set({ isLoading: true, error: null });
        try {
          const params: Record<string, any> = { limit: ITEMS_PER_PAGE, offset: 0 };
          if (activeFilter.query) params.search = activeFilter.query;
          if (activeFilter.category) params.category = activeFilter.category;
          if (activeFilter.location) params.location = activeFilter.location;
          if (activeFilter.minPrice !== undefined) params.min_price = activeFilter.minPrice;
          if (activeFilter.maxPrice !== undefined) params.max_price = activeFilter.maxPrice;
          if (activeFilter.sortBy) params.sort_by = activeFilter.sortBy;
          const raw = await listingService.getListings(params);
          const listings = markFavorites(raw, get().favoriteItemIds);
          set({ listings, isLoading: false, hasMoreListings: raw.length >= ITEMS_PER_PAGE });
        } catch (e: unknown) {
          const message = e instanceof Error ? e.message : 'Failed to fetch listings';
          set({ error: message, isLoading: false });
        }
      },

      fetchMoreListings: async () => {
        const { isLoadingMore, hasMoreListings, listings, activeFilter } = get();
        if (isLoadingMore || !hasMoreListings) return;
        set({ isLoadingMore: true });
        try {
          const params: Record<string, any> = { limit: ITEMS_PER_PAGE, offset: listings.length };
          if (activeFilter.query) params.search = activeFilter.query;
          if (activeFilter.category) params.category = activeFilter.category;
          if (activeFilter.location) params.location = activeFilter.location;
          if (activeFilter.minPrice !== undefined) params.min_price = activeFilter.minPrice;
          if (activeFilter.maxPrice !== undefined) params.max_price = activeFilter.maxPrice;
          if (activeFilter.sortBy) params.sort_by = activeFilter.sortBy;
          const raw = await listingService.getListings(params);
          const more = markFavorites(raw, get().favoriteItemIds);
          set({
            listings: [...listings, ...more],
            isLoadingMore: false,
            hasMoreListings: raw.length >= ITEMS_PER_PAGE,
          });
        } catch {
          set({ isLoadingMore: false });
        }
      },

      fetchRecommended: async () => {
        try {
          const raw = await listingService.getRecommendedListings();
          const recommended = markFavorites(raw, get().favoriteItemIds);
          set({ recommended });
        } catch {
          // silent fail for recommendations
        }
      },

      fetchRecentlyViewed: async () => {
        try {
          const raw = await listingService.getRecentlyViewedListings();
          // Only update if we actually get items from the server (e.g. for syncing)
          if (raw && raw.length > 0) {
            const recentlyViewed = markFavorites(raw, get().favoriteItemIds);
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
 
      fetchItemsStats: async () => {
        try {
          const res = await listingService.getItemsStats();
          set({ availableCount: res.total_available });
        } catch {
          // silent fail
        }
      },
 
      fetchListingById: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
          const result = await listingService.getListingById(id);
          const listing = result?.listing || null;
          set({
            selectedListing: listing ? { ...listing, isLiked: get().favoriteItemIds.has(listing.id) } : null,
            selectedListingOwner: result?.owner || null,
            isLoading: false,
          });
        } catch (e: unknown) {
          const message = e instanceof Error ? e.message : 'Failed to fetch listing';
          set({ error: message, isLoading: false });
        }
      },

      search: async (query: string) => {
        set({ isLoading: true, error: null });
        try {
          const raw = await listingService.searchListings(query);
          const searchResults = markFavorites(raw, get().favoriteItemIds);
          set({ searchResults, isLoading: false });
        } catch (e: unknown) {
          const message = e instanceof Error ? e.message : 'Search failed';
          set({ error: message, isLoading: false });
        }
      },

      applyFilter: async (filter: ListingFilter) => {
        set({ isLoading: true, error: null, activeFilter: filter });
        try {
          const raw = await listingService.filterListings(filter);
          const searchResults = markFavorites(raw, get().favoriteItemIds);
          set({ searchResults, isLoading: false });
        } catch (e: unknown) {
          const message = e instanceof Error ? e.message : 'Filter failed';
          set({ error: message, isLoading: false });
        }
      },

      fetchUserItems: async (ownerId: string) => {
        set({ isLoading: true, error: null });
        try {
          const raw = await listingService.getItemsByOwner(ownerId);
          const userItems = markFavorites(raw, get().favoriteItemIds);
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
          const raw = await listingService.getListingsByCategory(category);
          const categoryListings = markFavorites(raw, get().favoriteItemIds);
          set({ categoryListings, isLoading: false });
        } catch (e: unknown) {
          const message = e instanceof Error ? e.message : 'Failed to fetch category';
          set({ error: message, isLoading: false });
        }
      },

      toggleLike: (id: string, userEmail?: string) => {
        const { listings, recommended, recentlyViewed, searchResults, categoryListings, selectedListing, favoriteItemIds, favoriteItems } = get();
        const isCurrentlyLiked = favoriteItemIds.has(id);
        const toggle = (list: Listing[]) =>
          list.map((l) =>
            l.id === id ? { ...l, isLiked: !isCurrentlyLiked, likes: isCurrentlyLiked ? l.likes - 1 : l.likes + 1 } : l
          );

        // Optimistic update
        const newFavoriteIds = new Set(favoriteItemIds);
        let newFavoriteItems = [...favoriteItems];
        if (isCurrentlyLiked) {
          newFavoriteIds.delete(id);
          newFavoriteItems = newFavoriteItems.filter((item) => item.id !== id);
        } else {
          newFavoriteIds.add(id);
          // Find the item from any listing array to add to favoriteItems
          const item = listings.find((l) => l.id === id)
            || recommended.find((l) => l.id === id)
            || searchResults.find((l) => l.id === id)
            || categoryListings.find((l) => l.id === id)
            || (selectedListing?.id === id ? selectedListing : null);
          if (item) {
            newFavoriteItems = [{ ...item, isLiked: true, likes: item.likes + 1 }, ...newFavoriteItems];
          }
        }

        set({
          listings: toggle(listings),
          recommended: toggle(recommended),
          recentlyViewed: toggle(recentlyViewed),
          searchResults: toggle(searchResults),
          categoryListings: toggle(categoryListings),
          favoriteItemIds: newFavoriteIds,
          favoriteItems: newFavoriteItems,
          selectedListing:
            selectedListing?.id === id
              ? { ...selectedListing, isLiked: !isCurrentlyLiked, likes: isCurrentlyLiked ? selectedListing.likes - 1 : selectedListing.likes + 1 }
              : selectedListing,
        });

        // Fire API call in background (don't await)
        if (userEmail) {
          if (isCurrentlyLiked) {
            listingService.removeFavorite(id, userEmail).catch(() => {
              // Revert on failure
              const revert = new Set(get().favoriteItemIds);
              revert.add(id);
              set({ favoriteItemIds: revert });
            });
          } else {
            listingService.addFavorite(id, userEmail).catch(() => {
              const revert = new Set(get().favoriteItemIds);
              revert.delete(id);
              set({ favoriteItemIds: revert });
            });
          }
        }
      },

      addToRecentlyViewed: (listing: Listing) => {
        const { recentlyViewed } = get();
        // Remove if already exists to move to top
        const filtered = recentlyViewed.filter((item) => item.id !== listing.id);
        const updated = [listing, ...filtered].slice(0, 10);
        set({ recentlyViewed: updated });
      },

      fetchFavorites: async (userEmail: string) => {
        set({ isFavoritesLoading: true });
        try {
          const favorites = await listingService.getFavorites(userEmail);
          const itemIds = favorites.map((f) => f.item_id).filter(Boolean);
          const favoriteItemIds = new Set<string>(itemIds);

          // Fetch item details for each favorite
          const itemPromises = itemIds.map(async (id) => {
            try {
              const result = await listingService.getListingById(id);
              return result?.listing || null;
            } catch {
              return null;
            }
          });
          const items = (await Promise.all(itemPromises)).filter((item): item is Listing => item !== null);

          // Re-mark isLiked on all existing listing arrays
          const state = get();
          set({
            favoriteItemIds,
            favoriteItems: items.map((item) => ({ ...item, isLiked: true })),
            isFavoritesLoading: false,
            listings: markFavorites(state.listings, favoriteItemIds),
            recommended: markFavorites(state.recommended, favoriteItemIds),
            recentlyViewed: markFavorites(state.recentlyViewed, favoriteItemIds),
            searchResults: markFavorites(state.searchResults, favoriteItemIds),
            categoryListings: markFavorites(state.categoryListings, favoriteItemIds),
            selectedListing: state.selectedListing
              ? { ...state.selectedListing, isLiked: favoriteItemIds.has(state.selectedListing.id) }
              : null,
          });
        } catch {
          set({ isFavoritesLoading: false });
        }
      },

      fetchSavedSearches: async () => {
        set({ isSavedSearchesLoading: true });
        try {
          const savedSearches = await listingService.getSavedSearches();
          set({ savedSearches, isSavedSearchesLoading: false });
        } catch {
          set({ isSavedSearchesLoading: false });
        }
      },

      createSavedSearch: async (name: string, filters: ListingFilter) => {
        const apiFilters: Record<string, any> = {};
        if (filters.category) apiFilters.category = filters.category;
        if (filters.location) apiFilters.location = filters.location;
        if (filters.minPrice !== undefined) apiFilters.min_price = filters.minPrice;
        if (filters.maxPrice !== undefined) apiFilters.max_price = filters.maxPrice;
        if (filters.query) apiFilters.search_query = filters.query;

        const newSearch = await listingService.createSavedSearch({
          name,
          filters: apiFilters,
          notify_new_items: true,
        });
        set({ savedSearches: [newSearch, ...get().savedSearches] });
      },

      updateSavedSearch: async (id: string, data: Record<string, any>) => {
        const updated = await listingService.updateSavedSearch(id, data);
        set({
          savedSearches: get().savedSearches.map((s) => (s.id === id ? updated : s)),
        });
      },

      deleteSavedSearch: async (id: string) => {
        await listingService.deleteSavedSearch(id);
        set({ savedSearches: get().savedSearches.filter((s) => s.id !== id) });
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
