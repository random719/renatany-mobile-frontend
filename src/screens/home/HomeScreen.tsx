import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
  useWindowDimensions,
  ScrollView as RNScrollView,
} from "react-native";
import { WebView } from "react-native-webview";
import { ActivityIndicator, Menu, Text } from "react-native-paper";
import { TrustBadge } from "../../components/common/TrustBadge";
import { CategoryRow } from "../../components/home/CategoryRow";
import { Footer } from "../../components/home/Footer";
import { HeroBanner } from "../../components/home/HeroBanner";
import { HomeSearchFilter } from "../../components/home/HomeSearchFilter";
import { HowItWorks } from "../../components/home/HowItWorks";
import { Testimonials } from "../../components/home/Testimonials";
import { ListingCard } from "../../components/listing/ListingCard";
import { useUser } from "@clerk/expo";
import { useListingStore } from "../../store/listingStore";
import { useUIStore } from "../../store/uiStore";
import { colors, typography } from "../../theme";
import { Category, Listing, ListingFilter } from "../../types/listing";
import { HomeStackParamList } from "../../types/navigation";

// Extend the local type for this specific navigation call
type ExtendedHomeStackParamList = HomeStackParamList & { SearchTab: undefined };
type Nav = StackNavigationProp<ExtendedHomeStackParamList, "Home">;

export const HomeScreen = () => {
  const navigation = useNavigation<Nav>();
  const { user } = useUser();
  const openSidebar = useUIStore((s) => s.openSidebar);
  const {
    listings,
    recommended,
    recentlyViewed,
    categories,
    isLoading,
    isLoadingMore,
    hasMoreListings,
    fetchListings,
    fetchMoreListings,
    fetchRecommended,
    fetchRecentlyViewed,
    fetchCategories,
    fetchFavorites,
    toggleLike,
    applyFilter,
    setActiveFilter,
    availableCount,
    fetchItemsStats,
  } = useListingStore();

  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [categoryMenuVisible, setCategoryMenuVisible] = useState(false);
  const [sortMenuVisible, setSortMenuVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [selectedSort, setSelectedSort] = useState<string>("Relevance");
  const { height: screenHeight } = useWindowDimensions();
  const scrollViewRef = React.useRef<RNScrollView>(null);
  const allItemsRef = React.useRef<View>(null);

  const SORT_OPTIONS = [
    { label: "Relevance", value: undefined },
    { label: "Newest", value: "newest" as const },
    { label: "Price: Low", value: "price_low" as const },
    { label: "Price: High", value: "price_high" as const },
    { label: "Rating", value: "rating" as const },
    { label: "Popular", value: "popular" as const },
  ];

  const userEmail = user?.emailAddresses?.[0]?.emailAddress;

  const loadData = useCallback(() => {
    if (userEmail) fetchFavorites(userEmail);
    fetchListings();
    fetchRecommended();
    fetchRecentlyViewed();
    fetchCategories();
    fetchItemsStats();
  }, [fetchListings, fetchRecommended, fetchRecentlyViewed, fetchCategories, fetchFavorites, fetchItemsStats, userEmail]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleListingPress = (listing: Listing) => {
    navigation.navigate("ListingDetail", { listingId: listing.id });
  };

  const handleCategoryPress = (category: Category) => {
    navigation.navigate("CategoryDetail", { category: category.name });
  };

  const handleViewAllCategories = () => {
    navigation.navigate("Categories");
  };

  // Build filter from current UI state and re-fetch listings
  const applyCurrentFilters = useCallback((overrides?: Partial<ListingFilter>) => {
    const filter: ListingFilter = {};
    const q = overrides?.query ?? query.trim();
    const loc = overrides?.location ?? location.trim();
    const cat = overrides?.category !== undefined ? overrides.category : selectedCategory;
    const sort = overrides?.sortBy !== undefined ? overrides.sortBy : SORT_OPTIONS.find((o) => o.label === selectedSort)?.value;

    if (q) filter.query = q;
    if (loc) filter.location = loc;
    if (cat) filter.category = cat;
    if (sort) filter.sortBy = sort;

    setActiveFilter(filter);
    // fetchListings reads from activeFilter, but setState is async in zustand
    // so we set it directly and then call fetch
    useListingStore.setState({ activeFilter: filter });
    fetchListings();
  }, [query, location, selectedCategory, selectedSort, setActiveFilter, fetchListings]);

  const handleSearchSubmit = () => {
    applyCurrentFilters();
  };

  const handleCategorySelect = (categoryName?: string) => {
    setCategoryMenuVisible(false);
    setSelectedCategory(categoryName);
    applyCurrentFilters({ category: categoryName });
  };

  const handleSortSelect = (label: string) => {
    setSortMenuVisible(false);
    setSelectedSort(label);
    const sortValue = SORT_OPTIONS.find((o) => o.label === label)?.value;
    applyCurrentFilters({ sortBy: sortValue });
  };

  const handleSaveSearch = () => {
    if (!query.trim() && !location.trim() && !selectedCategory) {
      Alert.alert("No Search", "Enter a search query, location, or select a category first.");
      return;
    }
    Alert.alert("Search Saved", "Your search has been saved. You can find it in your Saved Searches.");
  };

  const handleAdvancedFilters = () => {
    // Sync current filters to searchResults via applyFilter before navigating
    const { activeFilter } = useListingStore.getState();
    if (activeFilter.category || activeFilter.query || activeFilter.location || activeFilter.sortBy) {
      applyFilter(activeFilter);
    }
    navigation.navigate("SearchTab" as any);
  };
 
  const handleShowAvailableItems = () => {
    applyCurrentFilters({ availability: 'available' });
    // Scroll to the "All Items" section
    // In React Native, we can use measure to get the position if needed, 
    // or just scroll to a specific offset if we know the layout.
    // For now, let's scroll to the middle of the page to show results.
    scrollViewRef.current?.scrollTo({ y: 300 * 2, animated: true });
  };
 
  const handleGrowingCommunityPress = () => {
    Alert.alert("Growing Community", "Join thousands of users sharing items in your neighborhood!");
  };

  const getActiveFiltersCount = () => {
    const { activeFilter } = useListingStore.getState();
    let count = 0;
    if (activeFilter.category) count++;
    if (activeFilter.query) count++;
    if (activeFilter.location) count++;
    if (activeFilter.sortBy) count++;
    if (activeFilter.minPrice || activeFilter.maxPrice) count++;
    if (activeFilter.rating) count++;
    if (activeFilter.availability && activeFilter.availability !== 'all') count++;
    return count;
  };
 
  const activeFiltersCount = getActiveFiltersCount();
  const hasActiveFilters = activeFiltersCount > 0;
 
  const handleClear = () => {
    setQuery('');
    setLocation('');
    setSelectedCategory(undefined);
    setSelectedSort('Relevance');
    useListingStore.setState({ activeFilter: {} });
    fetchListings();
  };
 
  const renderSection = (
    title: string,
    data: Listing[],
    badge?: string,
    iconName?: keyof typeof MaterialCommunityIcons.glyphMap,
  ) => {
    if (data.length === 0) return null;

    // We expect the "Recommended" section to have the unique UI with the side icon
    const isSpecial =
      title.includes("Recommended") || title.includes("Recently Viewed");

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          {isSpecial && (
            <View
              style={[
                styles.sectionIconBg,
                title.includes("Recently Viewed") && {
                  backgroundColor: colors.accentBlue,
                },
              ]}
            >
              <MaterialCommunityIcons
                name={iconName || "creation"}
                size={24}
                color="#FFFFFF"
              />
            </View>
          )}
          <View style={styles.sectionTitleContainer}>
            <Text variant="headlineSmall" style={styles.sectionTitle}>
              {title}
            </Text>
            {title.includes("Recommended") && (
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
              onToggleLike={() => toggleLike(item.id, userEmail)}
            />
          )}
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={loadData} />
        }
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
          if (distanceFromBottom < 500 && viewMode === "grid") {
            fetchMoreListings();
          }
        }}
        scrollEventThrottle={400}
      >
        <HeroBanner 
          availableCount={availableCount} 
          onMenuPress={openSidebar}
          onItemsAvailablePress={handleShowAvailableItems}
          onGrowingCommunityPress={handleGrowingCommunityPress}
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
            {viewMode === "grid" && renderSection(
              "Recently Viewed",
              recentlyViewed,
              undefined,
              "history",
            )}

            {viewMode === "grid" && renderSection(
              "Recommended for You",
              recommended,
              "AI Powered",
              "creation",
            )}

            {/* Search & Filter Component */}
            <View style={styles.searchHeader}>
              <View style={styles.headerTitleRow}>
                <Text variant="headlineSmall" style={styles.headerTitle}>
                  Search & Filter
                </Text>
                <View style={styles.headerActions}>
                  <TouchableOpacity style={styles.saveBtn} onPress={handleSaveSearch}>
                    <MaterialCommunityIcons
                      name="bookmark-outline"
                      size={18}
                      color={colors.textPrimary}
                    />
                    <Text style={styles.saveBtnText}>Save Search</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputWrapper}>
                <MaterialCommunityIcons
                  name="magnify"
                  size={20}
                  color="#9CA3AF"
                />
                <TextInput
                  style={styles.input}
                  placeholder="Search items..."
                  placeholderTextColor="#9CA3AF"
                  value={query}
                  onChangeText={setQuery}
                  onSubmitEditing={handleSearchSubmit}
                />
              </View>

              <View style={styles.inputWrapper}>
                <MaterialCommunityIcons
                  name="map-marker-outline"
                  size={20}
                  color="#9CA3AF"
                />
                <TextInput
                  style={styles.input}
                  placeholder="Location..."
                  placeholderTextColor="#9CA3AF"
                  value={location}
                  onChangeText={setLocation}
                  onSubmitEditing={handleSearchSubmit}
                />
              </View>

              <Menu
                visible={categoryMenuVisible}
                onDismiss={() => setCategoryMenuVisible(false)}
                anchorPosition="bottom"
                contentStyle={styles.menuContent}
                anchor={
                  <TouchableOpacity style={styles.dropdownBtn} onPress={() => setCategoryMenuVisible(true)}>
                    <Text style={styles.dropdownText}>{selectedCategory || "All Categories"}</Text>
                    <MaterialCommunityIcons
                      name="chevron-down"
                      size={20}
                      color="#6B7280"
                    />
                  </TouchableOpacity>
                }
              >
                <RNScrollView style={styles.menuScroll}>
                  <Menu.Item 
                    onPress={() => handleCategorySelect(undefined)} 
                    title="All Categories" 
                    leadingIcon="view-grid"
                    titleStyle={!selectedCategory ? styles.menuItemActiveText : undefined}
                  />
                  {categories.map((cat) => (
                    <Menu.Item 
                      key={cat.id} 
                      onPress={() => handleCategorySelect(cat.name)} 
                      title={cat.name} 
                      leadingIcon={cat.icon as any}
                      titleStyle={selectedCategory === cat.name ? styles.menuItemActiveText : undefined}
                    />
                  ))}
                </RNScrollView>
              </Menu>

              <View style={styles.filtersRow}>
                <TouchableOpacity style={styles.actionBtnRow} onPress={handleAdvancedFilters}>
                  <MaterialCommunityIcons
                    name="tune-variant"
                    size={18}
                    color={colors.textPrimary}
                  />
                  <Text style={styles.actionBtnText}>Advanced Filters</Text>
                  {activeFiltersCount > 0 && (
                    <View style={styles.filterBadge}>
                      <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <Menu
                  visible={sortMenuVisible}
                  onDismiss={() => setSortMenuVisible(false)}
                  anchorPosition="bottom"
                  contentStyle={styles.menuContent}
                  anchor={
                    <TouchableOpacity style={styles.actionBtnRow} onPress={() => setSortMenuVisible(true)}>
                      <MaterialCommunityIcons
                        name="swap-vertical"
                        size={18}
                        color={colors.textPrimary}
                      />
                      <Text style={styles.actionBtnText}>{selectedSort}</Text>
                      <MaterialCommunityIcons
                        name="chevron-down"
                        size={18}
                        color="#6B7280"
                        style={styles.chevronIcon}
                      />
                    </TouchableOpacity>
                  }
                >
                  {SORT_OPTIONS.map((opt) => (
                    <Menu.Item key={opt.label} onPress={() => handleSortSelect(opt.label)} title={opt.label} />
                  ))}
                </Menu>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "flex-start",
                  marginBottom: 16,
                }}
              >
                <View style={styles.viewToggleGroup}>
                  <TouchableOpacity
                    style={[
                      styles.viewToggleBtn,
                      viewMode === "grid" && styles.viewToggleBtnActive,
                    ]}
                    onPress={() => setViewMode("grid")}
                  >
                    <MaterialCommunityIcons
                      name="grid"
                      size={20}
                      color={viewMode === "grid" ? "#111827" : "#6B7280"}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.viewToggleBtn,
                      viewMode === "map" && styles.viewToggleBtnActive,
                    ]}
                    onPress={() => setViewMode("map")}
                  >
                    <MaterialCommunityIcons
                      name="map-outline"
                      size={20}
                      color={viewMode === "map" ? "#111827" : "#6B7280"}
                    />
                  </TouchableOpacity>
                </View>
              </View>
 
              {/* Active filter pills */}
              {hasActiveFilters && (
                <View style={styles.activeFiltersContainer}>
                  <TouchableOpacity onPress={handleClear} style={styles.clearAllBtn}>
                    <MaterialCommunityIcons name="close" size={16} color="#6B7280" />
                    <Text style={styles.clearAllText}>Clear ({activeFiltersCount})</Text>
                  </TouchableOpacity>
 
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagsContainer}>
                    {selectedCategory && (
                      <View style={styles.filterTag}>
                        <Text style={styles.filterTagText}>{selectedCategory}</Text>
                        <TouchableOpacity onPress={() => handleCategorySelect(undefined)}>
                          <MaterialCommunityIcons name="close" size={14} color="#4B5563" />
                        </TouchableOpacity>
                      </View>
                    )}
                    {query.trim() !== '' && (
                      <View style={styles.filterTag}>
                        <Text style={styles.filterTagText}>"{query}"</Text>
                        <TouchableOpacity
                          onPress={() => {
                            setQuery('');
                            applyCurrentFilters({ query: '' });
                          }}
                        >
                          <MaterialCommunityIcons name="close" size={14} color="#4B5563" />
                        </TouchableOpacity>
                      </View>
                    )}
                    {location.trim() !== '' && (
                      <View style={styles.filterTag}>
                        <Text style={styles.filterTagText}>{location}</Text>
                        <TouchableOpacity
                          onPress={() => {
                            setLocation('');
                            applyCurrentFilters({ location: '' });
                          }}
                        >
                          <MaterialCommunityIcons name="close" size={14} color="#4B5563" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </ScrollView>
                </View>
              )}
 
              {viewMode === "map" ? (
                <View style={styles.mapContainer}>
                  {Platform.OS === "web" ? (
                    <View
                      style={[
                        styles.mapPlaceholder,
                        {
                          height: 400,
                          backgroundColor: "#E5E7EB",
                          borderRadius: 12,
                          overflow: "hidden",
                        },
                      ]}
                    >
                      <iframe
                        src="https://www.openstreetmap.org/export/embed.html?bbox=-40,-30,40,30&layer=mapnik&marker=0,0"
                        style={{ width: "100%", height: "100%", border: 0 }}
                        title="Map View"
                      />
                    </View>
                  ) : (
                    <View
                      style={[
                        styles.mapPlaceholder,
                        {
                          height: 400,
                          backgroundColor: "#E5E7EB",
                          borderRadius: 12,
                          overflow: "hidden",
                        },
                      ]}
                    >
                      <WebView
                        source={{
                          uri: "https://www.openstreetmap.org/export/embed.html?bbox=-40,-30,40,30&layer=mapnik&marker=0,0",
                        }}
                        style={{ flex: 1 }}
                        scrollEnabled={false}
                      />
                    </View>
                  )}
                  <View style={styles.mapFooter}>
                    <Text style={styles.mapFooterText}>
                      🌍 Leaflet | © OpenStreetMap contributors
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.gridContainer} ref={allItemsRef}>
                  <View style={styles.allItemsHeader}>
                    <MaterialCommunityIcons name="star" size={24} color="#8B5CF6" />
                    <Text variant="headlineSmall" style={styles.allItemsTitle}>
                      All Items
                    </Text>
                  </View>
                  {listings.map((item) => (
                    <View key={item.id} style={styles.gridItemWrapper}>
                      <ListingCard
                        listing={item}
                        onPress={() => handleListingPress(item)}
                        onToggleLike={() => toggleLike(item.id, userEmail)}
                      />
                    </View>
                  ))}
                  {isLoadingMore && (
                    <ActivityIndicator style={{ marginVertical: 16 }} size="small" />
                  )}
                  {!hasMoreListings && listings.length > 0 && (
                    <Text style={styles.endOfListText}>No more items to show</Text>
                  )}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  linksRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
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
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  trustRow: {
    flexDirection: "row",
  },
  section: {
    marginTop: 24,
    backgroundColor: colors.backgroundLight,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  sectionIconBg: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#8B5CF6", // Purple color
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitleContainer: {
    flex: 1,
  },
  sectionTitle: {
    color: "#111827",
    fontWeight: "700",
    fontSize: typography.title,
    marginBottom: 4,
  },
  sectionSubtitleText: {
    color: "#6B7280",
    fontSize: typography.body,
  },
  aiBadge: {
    backgroundColor: "#F3E8FF",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: "#E9D5FF",
  },
  aiBadgeTextVertical: {
    color: "#7C3AED",
    fontWeight: "700",
    fontSize: typography.tiny,
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
    width: "100%", // Full width items
    marginBottom: 20, // Give them plenty of breathing room vertically
  },
  loader: {
    marginTop: 48,
  },
  activeFiltersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 16,
    gap: 12,
  },
  clearAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingRight: 12,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  clearAllText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  tagsContainer: {
    flex: 1,
  },
  filterTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
    gap: 6,
  },
  filterTagText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
  },
  filterBadge: {
    backgroundColor: '#8B5CF6',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginLeft: 4,
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  searchHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    backgroundColor: "#FFFFFF",
    marginTop: 24,
  },
  headerTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerTitle: {
    color: "#111827",
    fontWeight: "700",
    fontSize: typography.title,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  saveBtnText: {
    fontSize: typography.caption,
    fontWeight: "500",
    color: "#111827",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
  },
  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: typography.label,
    color: "#111827",
  },
  viewToggleGroup: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    overflow: "hidden",
  },
  viewToggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
  },
  viewToggleBtnActive: {
    backgroundColor: "#F3F4F6",
  },
  mapContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  mapPlaceholder: {
    backgroundColor: "#E5E7EB",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  mapPlaceholderText: {
    color: "#6B7280",
    fontWeight: "600",
  },
  mapFooter: {
    alignItems: "flex-end",
    paddingTop: 8,
  },
  mapFooterText: {
    fontSize: typography.caption,
    color: "#6B7280",
  },
  dropdownBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 16,
    backgroundColor: "#FFFFFF",
  },
  dropdownText: {
    fontSize: typography.label,
    color: "#111827",
  },
  filtersRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  actionBtnRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    height: 44,
  },
  actionBtnText: {
    fontSize: typography.body,
    fontWeight: "500",
    color: "#111827",
  },
  chevronIcon: {
    marginLeft: 8,
  },
  allItemsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  allItemsTitle: {
    color: "#111827",
    fontWeight: "700",
    fontSize: typography.title,
  },
  menuContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  menuScroll: {
    maxHeight: 300,
  },
  menuItemActiveText: {
    color: colors.primary,
    fontWeight: '600',
  },
  endOfListText: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: typography.body,
    paddingVertical: 16,
  },
});
