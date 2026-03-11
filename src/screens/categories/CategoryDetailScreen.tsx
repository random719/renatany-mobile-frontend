import React, { useEffect } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useUser } from '@clerk/expo';
import { ListingCard } from '../../components/listing/ListingCard';
import { useListingStore } from '../../store/listingStore';
import { HomeStackParamList } from '../../types/navigation';
import { colors, typography } from '../../theme';

type Nav = StackNavigationProp<HomeStackParamList, 'CategoryDetail'>;
type Route = RouteProp<HomeStackParamList, 'CategoryDetail'>;

export const CategoryDetailScreen = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { user } = useUser();
  const userEmail = user?.emailAddresses?.[0]?.emailAddress;
  const { category } = route.params;
  const { categoryListings, isLoading, fetchByCategory, toggleLike } = useListingStore();

  useEffect(() => {
    fetchByCategory(category);
  }, [category, fetchByCategory]);

  useEffect(() => {
    navigation.setOptions({ title: category });
  }, [category, navigation]);

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={categoryListings}
        numColumns={2}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.gridRow}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text variant="bodyLarge" style={styles.emptyText}>
              No items in {category} yet
            </Text>
          </View>
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
  cardWrapper: {
    flex: 1,
    maxWidth: '48%',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 48,
  },
  emptyText: {
    color: colors.textSecondary,
  },
});
