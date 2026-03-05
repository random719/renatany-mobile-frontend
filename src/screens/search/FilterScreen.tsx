import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Chip, RadioButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useListingStore } from '../../store/listingStore';
import { ListingFilter } from '../../types/listing';
import { colors } from '../../theme';

const SORT_OPTIONS: { label: string; value: ListingFilter['sortBy'] }[] = [
  { label: 'Newest', value: 'newest' },
  { label: 'Price: Low to High', value: 'price_low' },
  { label: 'Price: High to Low', value: 'price_high' },
  { label: 'Highest Rated', value: 'rating' },
  { label: 'Most Popular', value: 'popular' },
];

const PRICE_RANGES = [
  { label: 'Under €10', min: 0, max: 10 },
  { label: '€10 - €25', min: 10, max: 25 },
  { label: '€25 - €50', min: 25, max: 50 },
  { label: '€50+', min: 50, max: undefined },
];

export const FilterScreen = () => {
  const navigation = useNavigation();
  const { categories, activeFilter, applyFilter } = useListingStore();
  const [selectedCategory, setSelectedCategory] = useState(activeFilter.category || '');
  const [sortBy, setSortBy] = useState<ListingFilter['sortBy']>(activeFilter.sortBy);
  const [priceRange, setPriceRange] = useState<{ min?: number; max?: number }>({
    min: activeFilter.minPrice,
    max: activeFilter.maxPrice,
  });
  const [minRating, setMinRating] = useState(activeFilter.rating);

  const handleApply = () => {
    const filter: ListingFilter = {
      category: selectedCategory || undefined,
      sortBy,
      minPrice: priceRange.min,
      maxPrice: priceRange.max,
      rating: minRating,
    };
    applyFilter(filter);
    navigation.goBack();
  };

  const handleReset = () => {
    setSelectedCategory('');
    setSortBy(undefined);
    setPriceRange({});
    setMinRating(undefined);
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Category */}
        <Text variant="titleSmall" style={styles.sectionLabel}>
          Category
        </Text>
        <View style={styles.chipRow}>
          {categories.map((cat) => (
            <Chip
              key={cat.id}
              selected={selectedCategory === cat.name}
              onPress={() =>
                setSelectedCategory(selectedCategory === cat.name ? '' : cat.name)
              }
              style={styles.chip}
            >
              {cat.name}
            </Chip>
          ))}
        </View>

        {/* Price Range */}
        <Text variant="titleSmall" style={styles.sectionLabel}>
          Price Range
        </Text>
        <View style={styles.chipRow}>
          {PRICE_RANGES.map((range) => {
            const isSelected =
              priceRange.min === range.min && priceRange.max === range.max;
            return (
              <Chip
                key={range.label}
                selected={isSelected}
                onPress={() =>
                  setPriceRange(isSelected ? {} : { min: range.min, max: range.max })
                }
                style={styles.chip}
              >
                {range.label}
              </Chip>
            );
          })}
        </View>

        {/* Min Rating */}
        <Text variant="titleSmall" style={styles.sectionLabel}>
          Minimum Rating
        </Text>
        <View style={styles.chipRow}>
          {[3, 3.5, 4, 4.5].map((r) => (
            <Chip
              key={r}
              selected={minRating === r}
              onPress={() => setMinRating(minRating === r ? undefined : r)}
              style={styles.chip}
            >
              {r}+ Stars
            </Chip>
          ))}
        </View>

        {/* Sort By */}
        <Text variant="titleSmall" style={styles.sectionLabel}>
          Sort By
        </Text>
        <RadioButton.Group
          value={sortBy || ''}
          onValueChange={(v) => setSortBy(v as ListingFilter['sortBy'])}
        >
          {SORT_OPTIONS.map((opt) => (
            <RadioButton.Item
              key={opt.value}
              label={opt.label}
              value={opt.value || ''}
              style={styles.radioItem}
            />
          ))}
        </RadioButton.Group>
      </ScrollView>

      <View style={styles.footer}>
        <Button mode="outlined" onPress={handleReset} style={styles.resetBtn}>
          Reset
        </Button>
        <Button mode="contained" onPress={handleApply} style={styles.applyBtn}>
          Apply Filters
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  sectionLabel: {
    color: colors.textPrimary,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    marginBottom: 4,
  },
  radioItem: {
    paddingVertical: 4,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.cardLight,
  },
  resetBtn: {
    flex: 1,
    borderColor: colors.border,
  },
  applyBtn: {
    flex: 2,
    backgroundColor: colors.primary,
  },
});
