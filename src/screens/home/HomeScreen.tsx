import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { TrustBadge } from '../../components/common/TrustBadge';
import { CategoryRow } from '../../components/home/CategoryRow';
import { Footer } from '../../components/home/Footer';
import { HeroBanner } from '../../components/home/HeroBanner';
import { HomeSearchFilter } from '../../components/home/HomeSearchFilter';
import { HowItWorks } from '../../components/home/HowItWorks';
import { SidebarMenu } from '../../components/home/SidebarMenu';
import { Testimonials } from '../../components/home/Testimonials';
import { ListingCard } from '../../components/listing/ListingCard';
import { useListingStore } from '../../store/listingStore';
import { colors } from '../../theme';
import { Category, Listing } from '../../types/listing';
import { HomeStackParamList } from '../../types/navigation';

// Extend the local type for this specific navigation call
type ExtendedHomeStackParamList = HomeStackParamList & { Search: undefined };
type Nav = StackNavigationProp<ExtendedHomeStackParamList, 'Home'>;

export const HomeScreen = () => {
  const navigation = useNavigation<Nav>();
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
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

    // We expect the "Recommended" section to have the unique UI with the side icon
    const isRecommended = title.includes('Recommended');

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          {isRecommended && (
            <View style={styles.sectionIconBg}>
              <MaterialCommunityIcons name="creation" size={24} color="#FFFFFF" />
            </View>
          )}
          <View style={styles.sectionTitleContainer}>
            <Text variant="headlineSmall" style={styles.sectionTitle}>
              {title}
            </Text>
            {isRecommended && (
              <Text variant="bodyMedium" style={styles.sectionSubtitleText}>
                Based on your activity and preferences
              </Text>
            )}
          </View>
          {badge && (
            <View style={styles.aiBadge}>
              <Text variant="labelSmall" style={styles.aiBadgeTextVertical}>
                AI
              </Text>
              <Text variant="labelSmall" style={styles.aiBadgeTextVertical}>
                Powered
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
              style={{ width: 280 }} // Explicit strict width for horizon lists
              onPress={() => handleListingPress(item)}
              onToggleLike={() => toggleLike(item.id)}
            />
          )}
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadData} />}
      >
        <HeroBanner
          itemCount={listings.length}
          onMenuPress={() => setIsSidebarVisible(true)}
        />

        {/* Trust Badges - Card Style Grid */}
        <View style={styles.trustSectionContainer}>
          <View style={styles.trustSection}>
            <View style={styles.trustRow}>
              <TrustBadge
                icon="shield-outline"
                title="Verified Users"
                subtitle="ID checked"
                iconColor={colors.accentEmerald}
              />
              <TrustBadge
                icon="credit-card-outline"
                title="Secure Payments"
                subtitle="Stripe protected"
                iconColor={colors.accentEmerald}
              />
            </View>
            <View style={styles.trustRow}>
              <TrustBadge
                icon="account-group-outline"
                title="Deposit Protection"
                subtitle="Fully refundable"
                iconColor={colors.accentEmerald}
              />
              <TrustBadge
                icon="clock-outline"
                title="24/7 Support"
                subtitle="Always here to help"
                iconColor={colors.accentEmerald}
              />
            </View>
          </View>
        </View>

        {isLoading && recommended.length === 0 ? (
          <ActivityIndicator style={styles.loader} size="large" />
        ) : (
          <>
            {renderSection('Recommended for You', recommended, 'AI Powered')}

            {/* Search & Filter Component */}
            <HomeSearchFilter onSearch={(query) => console.log('Searching:', query)} />

            {/* All Items Grid */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconBg}>
                  <MaterialCommunityIcons name="star" size={24} color="#FFFFFF" />
                </View>
                <View style={styles.sectionTitleContainer}>
                  <Text variant="headlineSmall" style={styles.sectionTitle}>
                    All Items
                  </Text>
                </View>
              </View>

              <View style={styles.gridContainer}>
                {listings.slice(0, 4).map((item) => (
                  <View key={item.id} style={styles.gridItemWrapper}>
                    <ListingCard
                      listing={item}
                      onPress={() => handleListingPress(item)}
                      onToggleLike={() => toggleLike(item.id)}
                    />
                  </View>
                ))}
              </View>

              {listings.length > 4 && (
                <View style={styles.viewAllContainer}>
                  <TouchableOpacity
                    style={styles.viewAllButton}
                    onPress={() => navigation.navigate('Search')}
                  >
                    <Text style={styles.viewAllText}>View All</Text>
                    <MaterialCommunityIcons name="arrow-right" size={16} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <CategoryRow
              categories={categories}
              onPress={handleCategoryPress}
              onViewAll={handleViewAllCategories}
            />

            {/* How It Works Section */}
            <HowItWorks />

            {/* Testimonials Section */}
            <Testimonials />
          </>
        )}

        {/* Footer Section */}
        <Footer />
      </ScrollView>

      <SidebarMenu
        isVisible={isSidebarVisible}
        onClose={() => setIsSidebarVisible(false)}
      />
    </View>
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
  trustSectionContainer: {
    padding: 16,
    paddingTop: 32,
    backgroundColor: colors.backgroundLight,
  },
  trustSection: {
    backgroundColor: colors.cardLight,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  trustRow: {
    flexDirection: 'row',
  },
  section: {
    marginTop: 24,
    backgroundColor: colors.backgroundLight,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  sectionIconBg: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#8B5CF6', // Purple color
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitleContainer: {
    flex: 1,
  },
  sectionTitle: {
    color: '#111827',
    fontWeight: '700',
    fontSize: 22,
    marginBottom: 4,
  },
  sectionSubtitleText: {
    color: '#6B7280',
    fontSize: 14,
  },
  aiBadge: {
    backgroundColor: '#F3E8FF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  aiBadgeTextVertical: {
    color: '#7C3AED',
    fontWeight: '700',
    fontSize: 11,
    lineHeight: 14,
  },
  horizontalList: {
    paddingHorizontal: 16,
    gap: 16,
  },
  gridContainer: {
    paddingHorizontal: 16,
    // Switch to single column stack instead of row wrap
  },
  gridItemWrapper: {
    width: '100%', // Full width items
    marginBottom: 20, // Give them plenty of breathing room vertically
  },
  viewAllContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
    alignItems: 'center',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  viewAllText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  loader: {
    marginTop: 48,
  },
});
