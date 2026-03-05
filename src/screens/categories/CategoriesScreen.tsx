import React, { useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useListingStore } from '../../store/listingStore';
import { HomeStackParamList } from '../../types/navigation';
import { colors } from '../../theme';

type Nav = StackNavigationProp<HomeStackParamList, 'Categories'>;

export const CategoriesScreen = () => {
  const navigation = useNavigation<Nav>();
  const { categories, fetchCategories } = useListingStore();

  useEffect(() => {
    if (categories.length === 0) fetchCategories();
  }, [categories.length, fetchCategories]);

  return (
    <View style={styles.container}>
      <FlatList
        data={categories}
        numColumns={2}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.gridRow}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('CategoryDetail', { category: item.name })}
            activeOpacity={0.7}
          >
            <View style={styles.iconWrapper}>
              <MaterialCommunityIcons
                name={item.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                size={32}
                color={colors.accentBlue}
              />
            </View>
            <Text variant="titleSmall" style={styles.name}>
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
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  grid: {
    padding: 16,
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  card: {
    flex: 1,
    maxWidth: '48%',
    backgroundColor: colors.cardLight,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  name: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  count: {
    color: colors.textSecondary,
    marginTop: 2,
  },
});
