import React, { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Searchbar, Text, ActivityIndicator, Chip } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ListingCard } from '../../components/listing/ListingCard';
import { useListingStore } from '../../store/listingStore';
import { SearchStackParamList } from '../../types/navigation';
import { colors } from '../../theme';

type Nav = StackNavigationProp<SearchStackParamList, 'Search'>;

export const SearchScreen = () => {
  const navigation = useNavigation<Nav>();
  const { searchResults, isLoading, search, toggleLike, clearSearch, categories } =
    useListingStore();
  const [query, setQuery] = useState('');

  const handleSearch = useCallback(() => {
    if (query.trim()) {
      search(query.trim());
    }
  }, [query, search]);

  const handleClear = () => {
    setQuery('');
    clearSearch();
  };

  const handleCategoryChip = (categoryName: string) => {
    setQuery(categoryName);
    search(categoryName);
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchHeader}>
        <Searchbar
          placeholder="Search items..."
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          onClearIconPress={handleClear}
          style={styles.searchbar}
        />
      </View>

      {searchResults.length === 0 && !isLoading && !query && (
        <View style={styles.suggestionsContainer}>
          <Text variant="titleSmall" style={styles.suggestionsTitle}>
            Popular Categories
          </Text>
          <View style={styles.chipRow}>
            {categories.slice(0, 6).map((cat) => (
              <Chip
                key={cat.id}
                mode="outlined"
                onPress={() => handleCategoryChip(cat.name)}
                style={styles.chip}
              >
                {cat.name}
              </Chip>
            ))}
          </View>
        </View>
      )}

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
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  searchHeader: {
    padding: 16,
    backgroundColor: colors.cardLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchbar: {
    borderRadius: 12,
    elevation: 0,
    backgroundColor: colors.backgroundLight,
  },
  suggestionsContainer: {
    padding: 16,
  },
  suggestionsTitle: {
    color: colors.textPrimary,
    fontWeight: '600',
    marginBottom: 12,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderColor: colors.border,
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
    color: colors.textSecondary,
  },
});
