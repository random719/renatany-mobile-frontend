import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, TextInput, TouchableOpacity, View, Modal, ScrollView } from 'react-native';
import { ActivityIndicator, Menu, Text, Checkbox } from 'react-native-paper';
import { useUser } from '@clerk/expo';
import { GlobalHeader } from '../../components/common/GlobalHeader';
import { ListingCard } from '../../components/listing/ListingCard';
import { useListingStore } from '../../store/listingStore';
import { colors, typography } from '../../theme';
import { ListingFilter } from '../../types/listing';
import { SearchStackParamList } from '../../types/navigation';

type Nav = StackNavigationProp<SearchStackParamList, 'Search'>;

export const SearchScreen = () => {
  const navigation = useNavigation<Nav>();
  const { user } = useUser();
  const userEmail = user?.emailAddresses?.[0]?.emailAddress;
  const {
    searchResults,
    listings,
    isLoading,
    isLoadingMore,
    hasMoreListings,
    toggleLike,
    clearSearch,
    categories,
    activeFilter,
    applyFilter,
    fetchListings,
    fetchMoreListings,
    setActiveFilter,
    fetchCategories,
    createSavedSearch,
  } = useListingStore();

  const [query, setQuery] = useState(activeFilter.query || '');
  const [location, setLocation] = useState(activeFilter.location || '');

  // Modal state
  const [isCategoryMenuVisible, setIsCategoryMenuVisible] = useState(false);
  const [isAdvancedFilterModalVisible, setIsAdvancedFilterModalVisible] = useState(false);

  // Sort state
  const [sortMenuVisible, setSortMenuVisible] = useState(false);
  const [isAvailabilityMenuVisible, setIsAvailabilityMenuVisible] = useState(false);
  const [selectedSort, setSelectedSort] = useState<string>(() => {
    const match = SORT_OPTIONS.find((o) => o.value === activeFilter.sortBy);
    return match?.label || 'Relevance';
  });

  // Advanced Filter state
  const [minPrice, setMinPrice] = useState(activeFilter.minPrice?.toString() || '');
  const [maxPrice, setMaxPrice] = useState(activeFilter.maxPrice?.toString() || '');
  const [availability, setAvailability] = useState<string>(
    activeFilter.availability === 'available' ? 'Available Now' :
    activeFilter.availability === 'unavailable' ? 'Unavailable' : 'All Items'
  );
  const [hasDateRange, setHasDateRange] = useState(false);
  const [hasDistance, setHasDistance] = useState(false);
  const [hasRating, setHasRating] = useState(!!activeFilter.rating);

  // Save Search modal state
  const [saveSearchModalVisible, setSaveSearchModalVisible] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState('');
  const [isSavingSearch, setIsSavingSearch] = useState(false);

  const hasActiveFilters = !!(
    activeFilter.category ||
    activeFilter.query ||
    activeFilter.location ||
    activeFilter.minPrice ||
    activeFilter.maxPrice ||
    activeFilter.rating ||
    (activeFilter.availability && activeFilter.availability !== 'all')
  );

  // Load categories + initial listings on mount
  useEffect(() => {
    fetchCategories();
    // If there are active filters, apply them to populate searchResults
    if (hasActiveFilters) {
      applyFilter(activeFilter);
    } else {
      fetchListings();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync local state when activeFilter changes externally (e.g. from HomeScreen)
  useEffect(() => {
    setQuery(activeFilter.query || '');
    setLocation(activeFilter.location || '');
    setMinPrice(activeFilter.minPrice?.toString() || '');
    setMaxPrice(activeFilter.maxPrice?.toString() || '');
    setHasRating(!!activeFilter.rating);
    const sortMatch = SORT_OPTIONS.find((o) => o.value === activeFilter.sortBy);
    setSelectedSort(sortMatch?.label || 'Relevance');
    if (activeFilter.availability === 'available') setAvailability('Available Now');
    else if (activeFilter.availability === 'unavailable') setAvailability('Unavailable');
    else setAvailability('All Items');
  }, [activeFilter.query, activeFilter.location, activeFilter.category, activeFilter.sortBy, activeFilter.minPrice, activeFilter.maxPrice, activeFilter.rating, activeFilter.availability]);

  const dataSource = hasActiveFilters ? searchResults : listings;

  const handleSearch = useCallback(() => {
    const filter: ListingFilter = { ...activeFilter };
    if (query.trim()) filter.query = query.trim();
    else delete filter.query;
    if (location.trim()) filter.location = location.trim();
    else delete filter.location;
    applyFilter(filter);
  }, [query, location, activeFilter, applyFilter]);

  const handleClear = () => {
    setQuery('');
    setLocation('');
    setMinPrice('');
    setMaxPrice('');
    setAvailability('All Items');
    setHasDateRange(false);
    setHasDistance(false);
    setHasRating(false);
    setSelectedSort('Relevance');
    setActiveFilter({});
    clearSearch();
    fetchListings();
  };

  const handleApplyAdvancedFilters = useCallback(() => {
    setIsAdvancedFilterModalVisible(false);
    const updatedFilter: ListingFilter = { ...activeFilter };

    if (minPrice.trim()) updatedFilter.minPrice = parseFloat(minPrice);
    else delete updatedFilter.minPrice;
    if (maxPrice.trim()) updatedFilter.maxPrice = parseFloat(maxPrice);
    else delete updatedFilter.maxPrice;
    if (hasRating) updatedFilter.rating = 4.0;
    else delete updatedFilter.rating;

    // Availability
    if (availability === 'Available Now') updatedFilter.availability = 'available';
    else if (availability === 'Unavailable') updatedFilter.availability = 'unavailable';
    else delete updatedFilter.availability;

    applyFilter(updatedFilter);
  }, [activeFilter, minPrice, maxPrice, hasRating, availability, applyFilter]);

  const handleSortSelect = useCallback(
    (label: string, value?: ListingFilter['sortBy']) => {
      setSortMenuVisible(false);
      setSelectedSort(label);
      const updatedFilter: ListingFilter = { ...activeFilter };
      if (value) updatedFilter.sortBy = value;
      else delete updatedFilter.sortBy;
      applyFilter(updatedFilter);
    },
    [activeFilter, applyFilter],
  );

  const handleSelectCategory = (categoryName?: string) => {
    setIsCategoryMenuVisible(false);
    if (categoryName) {
      applyFilter({ ...activeFilter, category: categoryName });
    } else {
      const { category: _, ...rest } = activeFilter;
      applyFilter(rest);
    }
  };

  const handleSaveSearch = () => {
    if (!query.trim() && !location.trim() && !activeFilter.category) {
      Alert.alert('No Search', 'Enter a search query, location, or select a category first.');
      return;
    }
    setSaveSearchName('');
    setSaveSearchModalVisible(true);
  };

  const handleConfirmSaveSearch = async () => {
    if (!saveSearchName.trim()) {
      Alert.alert('Error', 'Please enter a name for your saved search.');
      return;
    }
    setIsSavingSearch(true);
    try {
      await createSavedSearch(saveSearchName.trim(), activeFilter);
      setSaveSearchModalVisible(false);
      Alert.alert('Search Saved', "You'll receive notifications when new items match your criteria.");
    } catch {
      Alert.alert('Error', 'Failed to save search. Please try again.');
    } finally {
      setIsSavingSearch(false);
    }
  };

  const handleLoadMore = () => {
    if (hasActiveFilters) return; // filtered results come in one batch
    fetchMoreListings();
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (activeFilter.category) count++;
    if (activeFilter.query) count++;
    if (activeFilter.location) count++;
    if (activeFilter.minPrice || activeFilter.maxPrice) count++;
    if (activeFilter.rating) count++;
    if (activeFilter.availability && activeFilter.availability !== 'all') count++;
    return count;
  };
  const activeFiltersCount = getActiveFiltersCount();

  const renderHeader = () => (
    <View style={styles.searchHeader}>
      <View style={styles.headerTitleRow}>
        <Text variant="headlineSmall" style={styles.headerTitle}>
          Search & Filter
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSaveSearch}>
            <MaterialCommunityIcons name="bookmark-outline" size={18} color={colors.textPrimary} />
            <Text style={styles.saveBtnText}>Save Search</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search input */}
      <View style={styles.inputWrapper}>
        <MaterialCommunityIcons name="magnify" size={20} color="#9CA3AF" />
        <TextInput
          style={styles.input}
          placeholder="Search items..."
          placeholderTextColor="#9CA3AF"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => { setQuery(''); }}>
            <MaterialCommunityIcons name="close-circle" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Location input */}
      <View style={styles.inputWrapper}>
        <MaterialCommunityIcons name="map-marker-outline" size={20} color="#9CA3AF" />
        <TextInput
          style={styles.input}
          placeholder="Location..."
          placeholderTextColor="#9CA3AF"
          value={location}
          onChangeText={setLocation}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        {location.length > 0 && (
          <TouchableOpacity onPress={() => { setLocation(''); }}>
            <MaterialCommunityIcons name="close-circle" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Search button */}
      {/* <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
        <MaterialCommunityIcons name="magnify" size={20} color="#FFFFFF" />
        <Text style={styles.searchBtnText}>Search</Text>
      </TouchableOpacity> */}

      {/* Category dropdown */}
      <Menu
        visible={isCategoryMenuVisible}
        onDismiss={() => setIsCategoryMenuVisible(false)}
        anchorPosition="bottom"
        contentStyle={styles.menuContent}
        anchor={
          <TouchableOpacity
            style={styles.dropdownBtn}
            onPress={() => setIsCategoryMenuVisible(true)}
          >
            <Text style={styles.dropdownText}>
              {activeFilter.category || 'All Categories'}
            </Text>
            <MaterialCommunityIcons name="chevron-down" size={20} color="#6B7280" />
          </TouchableOpacity>
        }
      >
        <ScrollView style={styles.menuScroll}>
          <Menu.Item
            title="All Categories"
            leadingIcon="view-grid"
            onPress={() => handleSelectCategory(undefined)}
            titleStyle={!activeFilter.category ? styles.menuItemActiveText : undefined}
          />
          {categories.map((c) => (
            <Menu.Item
              key={c.id}
              title={c.name}
              leadingIcon={c.icon as any}
              onPress={() => handleSelectCategory(c.name)}
              titleStyle={activeFilter.category === c.name ? styles.menuItemActiveText : undefined}
            />
          ))}
        </ScrollView>
      </Menu>

      {/* Filters row: Advanced Filters + Sort */}
      <View style={styles.filtersRow}>
        <TouchableOpacity
          style={styles.actionBtnRow}
          onPress={() => setIsAdvancedFilterModalVisible(true)}
        >
          <MaterialCommunityIcons name="tune-variant" size={18} color={colors.textPrimary} />
          <Text style={styles.actionBtnText}>Advanced Filters</Text>
          {activeFiltersCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        <Menu
          visible={sortMenuVisible}
          onDismiss={() => setSortMenuVisible(false)}
          anchorPosition="bottom"
          contentStyle={styles.menuContent}
          anchor={
            <TouchableOpacity style={styles.actionBtnRow} onPress={() => setSortMenuVisible(true)}>
              <MaterialCommunityIcons name="swap-vertical" size={18} color={colors.textPrimary} />
              <Text style={styles.actionBtnText}>{selectedSort}</Text>
              <MaterialCommunityIcons name="chevron-down" size={18} color="#6B7280" style={styles.chevronIcon} />
            </TouchableOpacity>
          }
        >
          {SORT_OPTIONS.map((opt) => (
            <Menu.Item
              key={opt.label}
              onPress={() => handleSortSelect(opt.label, opt.value)}
              title={opt.label}
              titleStyle={selectedSort === opt.label ? styles.menuItemActiveText : undefined}
            />
          ))}
        </Menu>
      </View>

      {/* Active filter pills */}
      {hasActiveFilters && (
        <View style={styles.activeFiltersContainer}>
          <TouchableOpacity onPress={handleClear} style={styles.clearAllBtn}>
            <MaterialCommunityIcons name="close" size={16} color="#6B7280" />
            <Text style={styles.clearAllText}>Clear ({activeFiltersCount})</Text>
          </TouchableOpacity>

          <View style={styles.tagsContainer}>
            {activeFilter.category && (
              <View style={styles.filterTag}>
                <Text style={styles.filterTagText}>{activeFilter.category}</Text>
                <TouchableOpacity onPress={() => handleSelectCategory(undefined)}>
                  <MaterialCommunityIcons name="close" size={14} color="#4B5563" />
                </TouchableOpacity>
              </View>
            )}
            {activeFilter.query && (
              <View style={styles.filterTag}>
                <Text style={styles.filterTagText}>"{activeFilter.query}"</Text>
                <TouchableOpacity
                  onPress={() => {
                    setQuery('');
                    const { query: _, ...rest } = activeFilter;
                    applyFilter(rest);
                  }}
                >
                  <MaterialCommunityIcons name="close" size={14} color="#4B5563" />
                </TouchableOpacity>
              </View>
            )}
            {activeFilter.location && (
              <View style={styles.filterTag}>
                <Text style={styles.filterTagText}>{activeFilter.location}</Text>
                <TouchableOpacity
                  onPress={() => {
                    setLocation('');
                    const { location: _, ...rest } = activeFilter;
                    applyFilter(rest);
                  }}
                >
                  <MaterialCommunityIcons name="close" size={14} color="#4B5563" />
                </TouchableOpacity>
              </View>
            )}
            {(activeFilter.minPrice || activeFilter.maxPrice) && (
              <View style={styles.filterTag}>
                <Text style={styles.filterTagText}>
                  ${activeFilter.minPrice || 0} - ${activeFilter.maxPrice || 'Any'}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setMinPrice('');
                    setMaxPrice('');
                    const { minPrice: _min, maxPrice: _max, ...rest } = activeFilter;
                    applyFilter(rest);
                  }}
                >
                  <MaterialCommunityIcons name="close" size={14} color="#4B5563" />
                </TouchableOpacity>
              </View>
            )}
            {activeFilter.availability && activeFilter.availability !== 'all' && (
              <View style={styles.filterTag}>
                <Text style={styles.filterTagText}>
                  {activeFilter.availability === 'available' ? 'Available' : 'Unavailable'}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setAvailability('All Items');
                    const { availability: _, ...rest } = activeFilter;
                    applyFilter(rest);
                  }}
                >
                  <MaterialCommunityIcons name="close" size={14} color="#4B5563" />
                </TouchableOpacity>
              </View>
            )}
            {activeFilter.rating && (
              <View style={styles.filterTag}>
                <Text style={styles.filterTagText}>{activeFilter.rating}+ Stars</Text>
                <TouchableOpacity
                  onPress={() => {
                    setHasRating(false);
                    const { rating: _r, ...rest } = activeFilter;
                    applyFilter(rest);
                  }}
                >
                  <MaterialCommunityIcons name="close" size={14} color="#4B5563" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Results count */}
      <View style={styles.resultsRow}>
        <MaterialCommunityIcons name="star" size={18} color={colors.primary} />
        <Text style={styles.resultsText}>
          {hasActiveFilters ? `${searchResults.length} result${searchResults.length !== 1 ? 's' : ''}` : 'All Items'}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <GlobalHeader />
      <View style={styles.contentWrapper}>
        {isLoading && dataSource.length === 0 ? (
          <FlatList
            key="loading"
            data={[]}
            ListHeaderComponent={renderHeader()}
            ListEmptyComponent={<ActivityIndicator style={styles.loader} size="large" color={colors.primary} />}
            renderItem={() => null}
          />
        ) : (
          <FlatList
            key="grid"
            data={dataSource}
            ListHeaderComponent={renderHeader()}
            numColumns={2}
            contentContainerStyle={styles.grid}
            columnWrapperStyle={styles.gridRow}
            keyExtractor={(item) => item.id}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              isLoadingMore ? (
                <View style={styles.loadingMore}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.loadingMoreText}>Loading more items...</Text>
                </View>
              ) : !hasMoreListings && dataSource.length > 0 && !hasActiveFilters ? (
                <Text style={styles.endText}>No more items to load</Text>
              ) : (
                <View style={{ height: 40 }} />
              )
            }
            ListEmptyComponent={
              !isLoading ? (
                <View style={styles.empty}>
                  <MaterialCommunityIcons name="magnify-close" size={48} color="#D1D5DB" />
                  <Text variant="bodyLarge" style={styles.emptyText}>
                    {hasActiveFilters
                      ? 'No items found matching your filters.'
                      : 'No items available yet.'}
                  </Text>
                  {hasActiveFilters && (
                    <TouchableOpacity style={styles.clearFiltersBtn} onPress={handleClear}>
                      <Text style={styles.clearFiltersBtnText}>Clear Filters</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : null
            }
            renderItem={({ item }) => (
              <View style={styles.cardWrapper}>
                <ListingCard
                  listing={item}
                  onPress={() => navigation.navigate('ListingDetail', { listingId: item.id })}
                  onToggleLike={() => toggleLike(item.id, userEmail)}
                />
              </View>
            )}
          />
        )}
      </View>

      {/* Save Search Modal */}
      <Modal
        visible={saveSearchModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSaveSearchModalVisible(false)}
      >
        <View style={styles.saveModalOverlay}>
          <View style={styles.saveModalContent}>
            <Text style={styles.saveModalTitle}>Save This Search</Text>
            <Text style={styles.saveModalSubtitle}>
              Give your search a name so you can easily find it later.
            </Text>
            <TextInput
              style={styles.saveModalInput}
              placeholder="e.g., Weekend Camera Gear"
              placeholderTextColor="#9CA3AF"
              value={saveSearchName}
              onChangeText={setSaveSearchName}
              autoFocus
            />
            <Text style={styles.saveModalHint}>
              You'll receive notifications when new items match your search criteria.
            </Text>
            <View style={styles.saveModalActions}>
              <TouchableOpacity
                style={styles.saveModalCancelBtn}
                onPress={() => setSaveSearchModalVisible(false)}
                disabled={isSavingSearch}
              >
                <Text style={styles.saveModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveModalSaveBtn, (!saveSearchName.trim() || isSavingSearch) && { opacity: 0.5 }]}
                onPress={handleConfirmSaveSearch}
                disabled={!saveSearchName.trim() || isSavingSearch}
              >
                <Text style={styles.saveModalSaveText}>
                  {isSavingSearch ? 'Saving...' : 'Save Search'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Advanced Filters Modal */}
      <Modal
        visible={isAdvancedFilterModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsAdvancedFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.advancedFilterModal]}>
            <View style={styles.modalHeader}>
              <Text variant="titleMedium" style={styles.modalTitle}>
                Advanced Filters
              </Text>
              <TouchableOpacity onPress={() => setIsAdvancedFilterModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.advancedFilterBody}>
              {/* Price Range */}
              <Text style={styles.advancedFilterLabel}>
                <MaterialCommunityIcons name="currency-usd" size={16} color="#111827" /> Price Range
                ($/day)
              </Text>
              <View style={styles.priceInputsRow}>
                <View style={styles.priceInputWrapper}>
                  <TextInput
                    style={styles.priceInput}
                    placeholder="Min price"
                    placeholderTextColor="#9CA3AF"
                    value={minPrice}
                    onChangeText={setMinPrice}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.priceInputWrapper}>
                  <TextInput
                    style={styles.priceInput}
                    placeholder="Max price"
                    placeholderTextColor="#9CA3AF"
                    value={maxPrice}
                    onChangeText={setMaxPrice}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Availability */}
              <Text style={styles.advancedFilterLabel}>Availability</Text>
              <Menu
                visible={isAvailabilityMenuVisible}
                onDismiss={() => setIsAvailabilityMenuVisible(false)}
                anchorPosition="bottom"
                contentStyle={styles.menuContent}
                anchor={
                  <TouchableOpacity
                    style={styles.availabilityDropdown}
                    onPress={() => setIsAvailabilityMenuVisible(true)}
                  >
                    <Text style={styles.availabilityText}>{availability}</Text>
                    <MaterialCommunityIcons name="chevron-down" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                }
              >
                {['All Items', 'Available Now', 'Unavailable'].map((opt) => (
                  <Menu.Item
                    key={opt}
                    title={opt}
                    onPress={() => {
                      setAvailability(opt);
                      setIsAvailabilityMenuVisible(false);
                    }}
                    titleStyle={availability === opt ? styles.menuItemActiveText : undefined}
                  />
                ))}
              </Menu>

              <View style={styles.filterDivider} />

              {/* Date Range */}
              <View style={styles.checkboxRow}>
                <View style={styles.checkboxLabelRow}>
                  <MaterialCommunityIcons name="calendar-range-outline" size={20} color="#111827" />
                  <Text style={styles.checkboxLabel}>Date Range</Text>
                </View>
                <Checkbox.Android
                  status={hasDateRange ? 'checked' : 'unchecked'}
                  onPress={() => setHasDateRange(!hasDateRange)}
                  color={colors.primary}
                  uncheckedColor="#D1D5DB"
                />
              </View>

              <View style={styles.filterDivider} />

              {/* Distance */}
              <View style={styles.checkboxRow}>
                <View style={styles.checkboxLabelRow}>
                  <MaterialCommunityIcons name="near-me" size={20} color="#111827" />
                  <Text style={styles.checkboxLabel}>Distance</Text>
                </View>
                <Checkbox.Android
                  status={hasDistance ? 'checked' : 'unchecked'}
                  onPress={() => setHasDistance(!hasDistance)}
                  color={colors.primary}
                  uncheckedColor="#D1D5DB"
                />
              </View>

              <View style={styles.filterDivider} />

              {/* Rating */}
              <View style={styles.checkboxRow}>
                <View style={styles.checkboxLabelRow}>
                  <MaterialCommunityIcons name="star-outline" size={20} color="#111827" />
                  <Text style={styles.checkboxLabel}>Rating (4+ stars)</Text>
                </View>
                <Checkbox.Android
                  status={hasRating ? 'checked' : 'unchecked'}
                  onPress={() => setHasRating(!hasRating)}
                  color={colors.primary}
                  uncheckedColor="#D1D5DB"
                />
              </View>

              {/* Apply / Reset buttons */}
              <View style={{ marginTop: 24, gap: 12, paddingBottom: 20 }}>
                <TouchableOpacity
                  style={styles.applyBtn}
                  onPress={handleApplyAdvancedFilters}
                >
                  <Text style={styles.applyBtnText}>Apply Filters</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.resetBtn}
                  onPress={() => {
                    setMinPrice('');
                    setMaxPrice('');
                    setAvailability('All Items');
                    setHasDateRange(false);
                    setHasDistance(false);
                    setHasRating(false);
                    setIsAdvancedFilterModalVisible(false);
                    const { minPrice: _min, maxPrice: _max, rating: _r, availability: _a, ...rest } =
                      activeFilter;
                    applyFilter(rest);
                  }}
                >
                  <Text style={styles.resetBtnText}>Reset Filters</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const SORT_OPTIONS: {
  label: string;
  value?: 'newest' | 'price_low' | 'price_high' | 'rating' | 'popular';
}[] = [
  { label: 'Relevance', value: undefined },
  { label: 'Newest', value: 'newest' },
  { label: 'Price: Low', value: 'price_low' },
  { label: 'Price: High', value: 'price_high' },
  { label: 'Rating', value: 'rating' },
  { label: 'Popular', value: 'popular' },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  searchHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    color: '#111827',
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  saveBtnText: {
    fontSize: typography.caption,
    fontWeight: '500',
    color: '#111827',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: typography.label,
    color: '#111827',
  },
  searchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 48,
    marginBottom: 16,
  },
  searchBtnText: {
    color: '#FFFFFF',
    fontSize: typography.body,
    fontWeight: '600',
  },
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  dropdownText: {
    fontSize: typography.label,
    color: '#111827',
  },
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  actionBtnRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    height: 44,
  },
  actionBtnText: {
    fontSize: typography.body,
    fontWeight: '500',
    color: '#111827',
  },
  filterBadge: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  chevronIcon: {
    marginLeft: 4,
  },
  resultsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  resultsText: {
    fontSize: typography.body,
    fontWeight: '600',
    color: '#111827',
  },
  contentWrapper: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  grid: {
    padding: 16,
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardWrapper: {
    flex: 1,
    maxWidth: '48%',
  },
  loader: {
    marginTop: 48,
  },
  loadingMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 20,
  },
  loadingMoreText: {
    color: '#6B7280',
    fontSize: typography.body,
  },
  endText: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: typography.caption,
    paddingVertical: 20,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 48,
    gap: 12,
  },
  emptyText: {
    color: '#6B7280',
    textAlign: 'center',
  },
  clearFiltersBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  clearFiltersBtnText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: typography.body,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 40,
  },
  advancedFilterModal: {
    height: 'auto',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontWeight: '700',
    color: '#111827',
  },
  advancedFilterBody: {
    padding: 20,
  },
  advancedFilterLabel: {
    fontSize: typography.body,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  priceInputsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  priceInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
  },
  priceInput: {
    flex: 1,
    fontSize: typography.body,
    color: '#111827',
  },
  availabilityDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 14,
    height: 44,
    marginBottom: 24,
  },
  availabilityText: {
    fontSize: typography.body,
    color: '#111827',
  },
  filterDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 12,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  checkboxLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkboxLabel: {
    fontSize: typography.body,
    fontWeight: '500',
    color: '#111827',
  },
  applyBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: typography.body,
  },
  resetBtn: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  resetBtnText: {
    color: '#6B7280',
    fontWeight: '600',
    fontSize: typography.body,
  },
  menuContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  menuScroll: {
    maxHeight: 300,
  },
  menuItemActiveText: {
    color: colors.primary,
    fontWeight: '600',
  },
  activeFiltersContainer: {
    marginTop: 4,
    marginBottom: 12,
  },
  clearAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    alignSelf: 'flex-start',
    gap: 4,
  },
  clearAllText: {
    color: '#6B7280',
    fontSize: typography.body,
    fontWeight: '500',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  filterTagText: {
    fontSize: typography.caption,
    color: '#111827',
    fontWeight: '500',
  },
  saveModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  saveModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  saveModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  saveModalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
  },
  saveModalInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 15,
    color: '#111827',
    marginBottom: 12,
  },
  saveModalHint: {
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 24,
  },
  saveModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  saveModalCancelBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  saveModalCancelText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6B7280',
  },
  saveModalSaveBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#111827',
  },
  saveModalSaveText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
