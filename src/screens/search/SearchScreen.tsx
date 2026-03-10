import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, TextInput, TouchableOpacity, View, Modal, Platform } from 'react-native';
import { ActivityIndicator, Text, Checkbox } from 'react-native-paper';
import { GlobalHeader } from '../../components/common/GlobalHeader';
import { ListingCard } from '../../components/listing/ListingCard';
import { useListingStore } from '../../store/listingStore';
import { colors, typography } from '../../theme';
import { SearchStackParamList } from '../../types/navigation';

type Nav = StackNavigationProp<SearchStackParamList, 'Search'>;

export const SearchScreen = () => {
  const navigation = useNavigation<Nav>();
  const { searchResults, listings, isLoading, search, toggleLike, clearSearch, categories, activeFilter, applyFilter } =
    useListingStore();
  const [query, setQuery] = useState(activeFilter.query || '');
  const [location, setLocation] = useState(activeFilter.location || '');
  
  // Pagination state
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  
  // Modal state
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  const [isAdvancedFilterModalVisible, setIsAdvancedFilterModalVisible] = useState(false);
  
  // Advanced Filter state
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [availability, setAvailability] = useState('All Items');
  const [hasDateRange, setHasDateRange] = useState(false);
  const [hasDistance, setHasDistance] = useState(false);
  const [hasRating, setHasRating] = useState(false);

  const handleSearch = useCallback(() => {
    setPage(1); // Reset page on new search
    if (query.trim() || location.trim()) {
      applyFilter({
        ...activeFilter,
        query: query.trim() || undefined,
        location: location.trim() || undefined
      });
    } else {
      applyFilter({ ...activeFilter, query: undefined, location: undefined });
    }
  }, [query, location, activeFilter, applyFilter]);

  const handleClear = () => {
    setQuery('');
    setLocation('');
    setPage(1); // Reset page on clear
    applyFilter({}); // Clear all store filters
    clearSearch();
  };

  const handleSelectCategory = (categoryName?: string) => {
    setIsCategoryModalVisible(false);
    setPage(1);
    if (categoryName) {
      applyFilter({ ...activeFilter, category: categoryName });
    } else {
      // Clear category filter
      applyFilter({ ...activeFilter, category: undefined });
    }
  };

  const hasActiveFilters = 
    activeFilter.category || 
    activeFilter.query || 
    activeFilter.location || 
    activeFilter.minPrice || 
    activeFilter.maxPrice || 
    activeFilter.rating;

  const dataSource = hasActiveFilters ? searchResults : listings;

  const handleLoadMore = () => {
    // Only increment if we haven't loaded everything
    if (page * ITEMS_PER_PAGE < dataSource.length) {
      setPage(prev => prev + 1);
    }
  };
  const paginatedData = dataSource.slice(0, page * ITEMS_PER_PAGE);

  const renderHeader = () => (
    <View style={styles.searchHeader}>
      <View style={styles.headerTitleRow}>
        <Text variant="headlineSmall" style={styles.headerTitle}>
          Search & Filter
        </Text>
        <View style={styles.headerActions}>
          {hasActiveFilters && (
            <TouchableOpacity onPress={handleClear} style={[styles.saveBtn, { marginRight: 8, borderColor: 'transparent' }]}>
              <MaterialCommunityIcons name="filter-remove-outline" size={18} color="#DC2626" />
              <Text style={[styles.saveBtnText, { color: '#DC2626' }]}>Clear</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.saveBtn}>
            <MaterialCommunityIcons name="bookmark-outline" size={18} color={colors.textPrimary} />
            <Text style={styles.saveBtnText}>Save Search</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputWrapper}>
        <MaterialCommunityIcons name="magnify" size={20} color="#9CA3AF" />
        <TextInput
          style={styles.input}
          placeholder="Search items..."
          placeholderTextColor="#9CA3AF"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
        />
      </View>

      <View style={styles.inputWrapper}>
        <MaterialCommunityIcons name="map-marker-outline" size={20} color="#9CA3AF" />
        <TextInput
          style={styles.input}
          placeholder="Location..."
          placeholderTextColor="#9CA3AF"
          value={location}
          onChangeText={setLocation}
          onSubmitEditing={handleSearch}
        />
      </View>

      <TouchableOpacity 
        style={styles.dropdownBtn}
        onPress={() => setIsCategoryModalVisible(true)}
      >
        <Text style={styles.dropdownText}>
          {activeFilter.category || 'All Categories'}
        </Text>
        <MaterialCommunityIcons name="chevron-down" size={20} color="#6B7280" />
      </TouchableOpacity>

      <View style={styles.filtersRow}>
        <TouchableOpacity 
          style={styles.actionBtnRow}
          onPress={() => setIsAdvancedFilterModalVisible(true)}
        >
          <MaterialCommunityIcons name="tune-variant" size={18} color={colors.textPrimary} />
          <Text style={styles.actionBtnText}>Advanced Filters</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtnRow}>
          <MaterialCommunityIcons name="swap-vertical" size={18} color={colors.textPrimary} />
          <Text style={styles.actionBtnText}>Relevance</Text>
          <MaterialCommunityIcons name="chevron-down" size={18} color="#6B7280" style={styles.chevronIcon} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <GlobalHeader />
      <View style={styles.contentWrapper}>
        {isLoading ? (
          <ActivityIndicator style={styles.loader} size="large" />
        ) : (
          <FlatList
            data={paginatedData}
            ListHeaderComponent={renderHeader()}
            numColumns={2}
            contentContainerStyle={styles.grid}
            columnWrapperStyle={styles.gridRow}
            keyExtractor={(item) => item.id}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            // Add a bottom spacer for pagination loading indicator space
            ListFooterComponent={
              page * ITEMS_PER_PAGE < dataSource.length ? (
                <ActivityIndicator style={{ paddingVertical: 20 }} color={colors.primary} />
              ) : <View style={{ height: 40 }} />
            }
            ListEmptyComponent={
              hasActiveFilters ? (
                <View style={styles.empty}>
                  <Text variant="bodyLarge" style={styles.emptyText}>
                    No items found matching your filters.
                  </Text>
                </View>
              ) : null
            }
            renderItem={({ item }) => (
              <View style={styles.cardWrapper}>
                <ListingCard
                  listing={item}
                  onPress={() => navigation.navigate('ListingDetail', { listingId: item.id })}
                  onToggleLike={() => toggleLike(item.id)}
                />
              </View>
            )}
          />
        )}
      </View>

      <Modal
        visible={isAdvancedFilterModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsAdvancedFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.advancedFilterModal]}>
            <View style={styles.modalHeader}>
              <Text variant="titleMedium" style={styles.modalTitle}>Advanced Filters</Text>
              <TouchableOpacity onPress={() => setIsAdvancedFilterModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.advancedFilterBody}>
              <Text style={styles.advancedFilterLabel}>
                <MaterialCommunityIcons name="currency-usd" size={16} color="#111827" /> Price Range ($/day)
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
                  <MaterialCommunityIcons name="swap-vertical" size={18} color="#9CA3AF" style={styles.stepperIcon} />
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
                  <MaterialCommunityIcons name="swap-vertical" size={18} color="#9CA3AF" style={styles.stepperIcon} />
                </View>
              </View>

              <Text style={styles.advancedFilterLabel}>Availability</Text>
              <TouchableOpacity style={styles.availabilityDropdown}>
                <Text style={styles.availabilityText}>{availability}</Text>
                <MaterialCommunityIcons name="chevron-down" size={20} color="#9CA3AF" />
              </TouchableOpacity>
              
              <View style={styles.filterDivider} />

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

              <View style={styles.checkboxRow}>
                <View style={styles.checkboxLabelRow}>
                  <MaterialCommunityIcons name="star-outline" size={20} color="#111827" />
                  <Text style={styles.checkboxLabel}>Rating</Text>
                </View>
                <Checkbox.Android
                  status={hasRating ? 'checked' : 'unchecked'}
                  onPress={() => setHasRating(!hasRating)}
                  color={colors.primary}
                  uncheckedColor="#D1D5DB"
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isCategoryModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsCategoryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text variant="titleMedium" style={styles.modalTitle}>Select Category</Text>
              <TouchableOpacity onPress={() => setIsCategoryModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={[{ id: 'all', name: 'All Categories', icon: 'view-grid', count: 0 }, ...categories]}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.categoryItem,
                    (item.id === 'all' && !activeFilter.category) || item.name === activeFilter.category
                      ? styles.categoryItemActive
                      : null
                  ]}
                  onPress={() => handleSelectCategory(item.id === 'all' ? undefined : item.name)}
                >
                  <View style={styles.categoryItemLeft}>
                    <MaterialCommunityIcons 
                      name={item.icon as any} 
                      size={24} 
                      color={(item.id === 'all' && !activeFilter.category) || item.name === activeFilter.category ? colors.primary : '#6B7280'} 
                    />
                    <Text style={[
                      styles.categoryItemText,
                      ((item.id === 'all' && !activeFilter.category) || item.name === activeFilter.category) && styles.categoryItemTextActive
                    ]}>
                      {item.name}
                    </Text>
                  </View>
                  {((item.id === 'all' && !activeFilter.category) || item.name === activeFilter.category) && (
                    <MaterialCommunityIcons name="check" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  searchHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
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
  categoryItemTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  advancedFilterModal: {
    height: 'auto',
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
  stepperIcon: {
    marginLeft: 8,
  },
  chevronIcon: {
    marginLeft: 8,
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
  empty: {
    alignItems: 'center',
    paddingTop: 48,
  },
  emptyText: {
    color: '#6B7280',
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
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  categoryItemActive: {
    backgroundColor: '#F9FAFB',
  },
  categoryItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryItemText: {
    fontSize: typography.body,
    color: '#4B5563',
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
});
