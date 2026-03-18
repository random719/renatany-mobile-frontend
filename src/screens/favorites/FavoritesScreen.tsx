import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useUser } from '@clerk/expo';
import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Button, Text } from 'react-native-paper';
import { GlobalHeader } from '../../components/common/GlobalHeader';
import { Footer } from '../../components/home/Footer';
import { ListingCard } from '../../components/listing/ListingCard';
import { useI18n } from '../../i18n';
import { useListingStore } from '../../store/listingStore';
import { colors, typography } from '../../theme';
import { FavoritesStackParamList } from '../../types/navigation';

type Nav = StackNavigationProp<FavoritesStackParamList, 'Favorites'>;

const ITEMS_PER_PAGE = 20;

export const FavoritesScreen = () => {
  const navigation = useNavigation<Nav>();
  const { t } = useI18n();
  const { user } = useUser();
  const {
    favoriteItems,
    isFavoritesLoading,
    fetchFavorites,
    toggleLike,
  } = useListingStore();

  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const userEmail = user?.emailAddresses?.[0]?.emailAddress;

  const loadFavorites = useCallback(() => {
    if (userEmail) {
      fetchFavorites(userEmail);
    }
  }, [userEmail, fetchFavorites]);

  // Re-fetch every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadFavorites();
    }, [loadFavorites]),
  );

  const handleRefresh = useCallback(async () => {
    if (!userEmail) return;
    setRefreshing(true);
    await fetchFavorites(userEmail);
    setRefreshing(false);
    setPage(1);
  }, [userEmail, fetchFavorites]);

  const paginatedData = useMemo(() => {
    return favoriteItems.slice(0, page * ITEMS_PER_PAGE);
  }, [favoriteItems, page]);

  const handleLoadMore = () => {
    if (page * ITEMS_PER_PAGE < favoriteItems.length) {
      setPage((prev) => prev + 1);
    }
  };

  const handleToggleLike = useCallback(
    (id: string) => {
      toggleLike(id, userEmail);
    },
    [toggleLike, userEmail],
  );

  const totalPages = Math.max(1, Math.ceil(favoriteItems.length / ITEMS_PER_PAGE));

  return (
    <View style={styles.container}>
      <GlobalHeader />
      <FlatList
        data={paginatedData}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        keyExtractor={(item) => item.id}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          <View style={styles.headerSection}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.goBack()}
            >
              <MaterialCommunityIcons name="arrow-left" size={20} color={colors.textSecondary} />
              <Text style={styles.backBtnText}>{t('common.backToBrowse')}</Text>
            </TouchableOpacity>

            <View style={styles.titleRow}>
              <MaterialCommunityIcons name="heart" size={32} color="#EF4444" />
              <Text variant="headlineMedium" style={styles.title}>
                {t('favorites.title')}
              </Text>
            </View>

            <Text variant="bodyLarge" style={styles.countText}>
              {isFavoritesLoading
                ? t('common.loading')
                : `${t(favoriteItems.length === 1 ? 'favorites.count' : 'favorites.count_plural', { count: favoriteItems.length })}${totalPages > 1 ? ` ${t('favorites.page', { page: Math.min(page, totalPages), total: totalPages })}` : ''}`}
            </Text>
          </View>
        }
        ListEmptyComponent={
          isFavoritesLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>{t('favorites.loading')}</Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="heart-outline" size={64} color="#D1D5DB" />
              <Text variant="bodyLarge" style={styles.emptyTitle}>
                {t('favorites.emptyTitle')}
              </Text>
              <Text variant="bodyMedium" style={styles.emptySubtitle}>
                {t('favorites.emptySubtitle')}
              </Text>
              <Button
                mode="contained"
                onPress={() => navigation.getParent()?.navigate('HomeTab')}
                style={styles.browseButton}
              >
                {t('favorites.browseItems')}
              </Button>
            </View>
          )
        }
        renderItem={({ item }) => (
          <View style={styles.cardWrapper}>
            <ListingCard
              listing={item}
              onPress={() => navigation.navigate('ListingDetail', { listingId: item.id })}
              onToggleLike={() => handleToggleLike(item.id)}
            />
          </View>
        )}
        ListFooterComponent={
          <>
            {page * ITEMS_PER_PAGE < favoriteItems.length && (
              <ActivityIndicator style={{ paddingVertical: 20 }} color={colors.primary} />
            )}
            <Footer />
          </>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  listContent: {
    paddingBottom: 0,
  },
  headerSection: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 32,
  },
  backBtnText: {
    color: '#334155',
    fontSize: typography.body,
    fontWeight: '500',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  title: {
    fontWeight: '800',
    color: '#111827',
  },
  countText: {
    color: '#64748B',
    fontSize: typography.tabLabel,
  },
  gridRow: {
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  cardWrapper: {
    flex: 1,
    maxWidth: '48%',
    marginBottom: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  loadingText: {
    color: colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  emptyTitle: {
    color: '#6B7280',
    marginTop: 8,
  },
  emptySubtitle: {
    color: '#9CA3AF',
    textAlign: 'center',
  },
  browseButton: {
    marginTop: 12,
  },
});
