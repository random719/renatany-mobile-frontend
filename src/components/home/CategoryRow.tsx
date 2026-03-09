import React from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Category } from '../../types/listing';
import { colors, typography } from '../../theme';

interface CategoryRowProps {
  categories: Category[];
  onPress: (category: Category) => void;
  onViewAll?: () => void;
}

export const CategoryRow = ({ categories, onPress, onViewAll }: CategoryRowProps) => (
  <View style={styles.container}>
    <View style={styles.header}>
      <Text variant="titleMedium" style={styles.sectionTitle}>
        Browse by Category
      </Text>
      {onViewAll && (
        <TouchableOpacity onPress={onViewAll}>
          <Text variant="labelMedium" style={styles.viewAll}>
            View All
          </Text>
        </TouchableOpacity>
      )}
    </View>
    <FlatList
      data={categories}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.list}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <TouchableOpacity style={styles.item} onPress={() => onPress(item)} activeOpacity={0.7}>
          <View style={styles.iconWrapper}>
            <MaterialCommunityIcons
              name={item.icon as keyof typeof MaterialCommunityIcons.glyphMap}
              size={24}
              color={colors.accentBlue}
            />
          </View>
          <Text variant="labelMedium" style={styles.name}>
            {item.name}
          </Text>
          <Text variant="bodySmall" style={styles.count}>
            {item.count} items
          </Text>
        </TouchableOpacity>
      )}
    />
  </View>
);

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  viewAll: {
    color: colors.accentBlue,
  },
  list: {
    paddingHorizontal: 16,
    gap: 12,
  },
  item: {
    alignItems: 'center',
    width: 80,
  },
  iconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  name: {
    color: colors.textPrimary,
    textAlign: 'center',
  },
  count: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
