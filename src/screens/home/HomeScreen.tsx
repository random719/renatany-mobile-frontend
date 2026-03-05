import React, { useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, FlatList, RefreshControl } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { HeroBanner } from '../../components/home/HeroBanner';
import { CategoryRow } from '../../components/home/CategoryRow';
import { TrustBadge } from '../../components/common/TrustBadge';
import { ListingCard } from '../../components/listing/ListingCard';
import { useListingStore } from '../../store/listingStore';
import { HomeStackParamList } from '../../types/navigation';
import { colors } from '../../theme';
import { Listing, Category } from '../../types/listing';

type Nav = StackNavigationProp<HomeStackParamList, 'Home'>;

export const HomeScreen = () => {
  const navigation = useNavigation<Nav>();
  const {
    listings,
    recommended,
    recentlyViewed,
    categories,
    isLoading,
    fetchListings,
    fetchRecommended,
    fetchRecentlyViewed,
    fetchCategories,
    toggleLike,
  } = useListingStore();

  const loadData = useCallback(() => {
    fetchListings();
    fetchRecommended();
    fetchRecentlyViewed();
    fetchCategories();
  }, [fetchListings, fetchRecommended, fetchRecentlyViewed, fetchCategories]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleListingPress = (listing: Listing) => {
    navigation.navigate('ListingDetail', { listingId: listing.id });
  };

  const handleCategoryPress = (category: Category) => {
    navigation.navigate('CategoryDetail', { category: category.name });
  };

  const handleViewAllCategories = () => {
    navigation.navigate('Categories');
  };

  const renderSection = (title: string, data: Listing[], badge?: string) => {
    if (data.length === 0) return null;
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            {title}
          </Text>
          {badge && (
            <View style={styles.aiBadge}>
              <MaterialCommunityIcons name="creation" size={14} color={colors.accentBlue} />
              <Text variant="labelSmall" style={styles.aiBadgeText}>
                {badge}
              </Text>
            </View>
          )}
        </View>
        <FlatList
          data={data}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ListingCard
              listing={item}
              onPress={() => handleListingPress(item)}
              onToggleLike={() => toggleLike(item.id)}
            />
          )}
        />
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadData} />}
    >
      <HeroBanner itemCount={listings.length} />

      {/* Privacy & Contact links */}
      <View style={styles.linksRow}>
        <Text variant="bodySmall" style={styles.link}>
          Privacy Policy
        </Text>
        <Text variant="bodySmall" style={styles.linkDot}>
          {' \u2022 '}
        </Text>
        <Text variant="bodySmall" style={styles.link}>
          Contact Us
        </Text>
      </View>

      {/* Trust Badges - 2x2 Grid */}
      <View style={styles.trustSection}>
        <View style={styles.trustRow}>
          <TrustBadge
            icon="shield-check-outline"
            title="Verified Users"
            subtitle="ID checked"
            iconColor={colors.accentEmerald}
          />
          <TrustBadge
            icon="lock-outline"
            title="Secure Payments"
            subtitle="Stripe protected"
            iconColor={colors.accentBlue}
          />
        </View>
        <View style={styles.trustRow}>
          <TrustBadge
            icon="cash-lock"
            title="Deposit Protection"
            subtitle="Funds secured"
            iconColor={colors.accentEmerald}
          />
          <TrustBadge
            icon="headset"
            title="24/7 Support"
            subtitle="Always available"
            iconColor={colors.accentEmerald}
          />
        </View>
      </View>

      {isLoading && recommended.length === 0 ? (
        <ActivityIndicator style={styles.loader} size="large" />
      ) : (
        <>
          {renderSection('Recommended for You', recommended, 'AI Powered')}
          {renderSection('Recently Viewed', recentlyViewed)}
          <CategoryRow
            categories={categories}
            onPress={handleCategoryPress}
            onViewAll={handleViewAllCategories}
          />
        </>
      )}

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  linksRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  link: {
    color: colors.accentBlue,
  },
  linkDot: {
    color: colors.textSecondary,
  },
  trustSection: {
    backgroundColor: colors.cardLight,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  trustRow: {
    flexDirection: 'row',
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    gap: 4,
  },
  aiBadgeText: {
    color: colors.accentBlue,
  },
  horizontalList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  loader: {
    marginTop: 48,
  },
  bottomSpacer: {
    height: 32,
  },
});
