import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { ListingCard } from '../../components/listing/ListingCard';
import { useListingStore } from '../../store/listingStore';
import { colors } from '../../theme';
import { SearchStackParamList } from '../../types/navigation';

type Nav = StackNavigationProp<SearchStackParamList, 'Search'>;

export const SearchScreen = () => {
  const navigation = useNavigation<Nav>();
  const { searchResults, isLoading, search, toggleLike, clearSearch, categories } =
    useListingStore();
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');

  const handleSearch = useCallback(() => {
    if (query.trim()) {
      search(query.trim());
    }
  }, [query, search]);

  const handleClear = () => {
    setQuery('');
    clearSearch();
  };

  return (
    <View style={styles.container}>
      {/* Search Header Container */}
      <View style={styles.searchHeader}>
        {/* Title & Save Search Row */}
        <View style={styles.headerTitleRow}>
          <Text variant="headlineSmall" style={styles.headerTitle}>
            Search & Filter
          </Text>
          <TouchableOpacity style={styles.saveBtn}>
            <MaterialCommunityIcons name="bookmark-outline" size={18} color={colors.textPrimary} />
            <Text style={styles.saveBtnText}>Save Search</Text>
          </TouchableOpacity>
        </View>

        {/* Inputs */}
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
          />
        </View>

        {/* Categories Dropdown Fake Button */}
        <TouchableOpacity style={styles.dropdownBtn}>
          <Text style={styles.dropdownText}>All Categories</Text>
          <MaterialCommunityIcons name="chevron-down" size={20} color="#6B7280" />
        </TouchableOpacity>

        {/* Advanced Filters & Relevance Row */}
        <View style={styles.filtersRow}>
          <TouchableOpacity style={styles.actionBtnRow}>
            <MaterialCommunityIcons name="tune-variant" size={18} color={colors.textPrimary} />
            <Text style={styles.actionBtnText}>Advanced Filters</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtnRow}>
            <MaterialCommunityIcons name="swap-vertical" size={18} color={colors.textPrimary} />
            <Text style={styles.actionBtnText}>Relevance</Text>
            <MaterialCommunityIcons name="chevron-down" size={18} color="#6B7280" style={styles.chevronIcon} />
          </TouchableOpacity>
        </View>

        {/* View Toggle */}
        <View style={styles.viewToggleGroup}>
          <TouchableOpacity
            style={[styles.viewToggleBtn, viewMode === 'grid' && styles.viewToggleBtnActive]}
            onPress={() => setViewMode('grid')}
          >
            <MaterialCommunityIcons
              name="grid"
              size={20}
              color={viewMode === 'grid' ? '#111827' : '#6B7280'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewToggleBtn, viewMode === 'map' && styles.viewToggleBtnActive]}
            onPress={() => setViewMode('map')}
          >
            <MaterialCommunityIcons
              name="map-outline"
              size={20}
              color={viewMode === 'map' ? '#111827' : '#6B7280'}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Grid Content */}
      <View style={styles.contentWrapper}>
        {isLoading ? (
          <ActivityIndicator style={styles.loader} size="large" />
        ) : (
          <FlatList
            data={searchResults}
            numColumns={2}
            contentContainerStyle={styles.grid}
            columnWrapperStyle={styles.gridRow}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              query ? (
                <View style={styles.empty}>
                  <Text variant="bodyLarge" style={styles.emptyText}>
                    No items found for "{query}"
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
    paddingTop: 48, // Header spacing
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
    fontSize: 13,
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
    fontSize: 15,
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
    fontSize: 15,
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
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  chevronIcon: {
    marginLeft: 8,
  },
  viewToggleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    overflow: 'hidden',
  },
  viewToggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  viewToggleBtnActive: {
    backgroundColor: '#F3F4F6',
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
});
