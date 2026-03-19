import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import React, { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Modal,
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
import { useI18n } from "../../i18n";
import { useListingStore } from "../../store/listingStore";
import { useUIStore } from "../../store/uiStore";
import { colors, typography } from "../../theme";
import { Category, Listing, ListingFilter } from "../../types/listing";
import { HomeStackParamList } from "../../types/navigation";
import { toast } from "../../store/toastStore";

// Extend the local type for this specific navigation call
type ExtendedHomeStackParamList = HomeStackParamList & { SearchTab: undefined };
type Nav = StackNavigationProp<ExtendedHomeStackParamList, "Home">;
type SortKey = "relevance" | "newest" | "priceLow" | "priceHigh" | "rating" | "popular";

export const HomeScreen = () => {
  const navigation = useNavigation<Nav>();
  const { user } = useUser();
  const { t } = useI18n();
  const openSidebar = useUIStore((s) => s.openSidebar);
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
    fetchFavorites,
    toggleLike,
    applyFilter,
    setActiveFilter,
    availableCount,
    fetchItemsStats,
    createSavedSearch,
  } = useListingStore();

  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [categoryMenuVisible, setCategoryMenuVisible] = useState(false);
  const [sortMenuVisible, setSortMenuVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [selectedSortKey, setSelectedSortKey] = useState<SortKey>("relevance");
  const [saveSearchModalVisible, setSaveSearchModalVisible] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState("");
  const [isSavingSearch, setIsSavingSearch] = useState(false);
  const { height: screenHeight } = useWindowDimensions();
  const scrollViewRef = React.useRef<RNScrollView>(null);
  const allItemsRef = React.useRef<View>(null);

  const SORT_OPTIONS = [
    { key: "relevance" as const, label: t("home.sort.relevance"), value: undefined },
    { key: "newest" as const, label: t("home.sort.newest"), value: "newest" as const },
    { key: "priceLow" as const, label: t("home.sort.priceLow"), value: "price_low" as const },
    { key: "priceHigh" as const, label: t("home.sort.priceHigh"), value: "price_high" as const },
    { key: "rating" as const, label: t("home.sort.rating"), value: "rating" as const },
    { key: "popular" as const, label: t("home.sort.popular"), value: "popular" as const },
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
    const sort = overrides?.sortBy !== undefined ? overrides.sortBy : SORT_OPTIONS.find((o) => o.key === selectedSortKey)?.value;

    if (q) filter.query = q;
    if (loc) filter.location = loc;
    if (cat) filter.category = cat;
    if (sort) filter.sortBy = sort;

    setActiveFilter(filter);
    // fetchListings reads from activeFilter, but setState is async in zustand
    // so we set it directly and then call fetch
    useListingStore.setState({ activeFilter: filter });
    fetchListings();
  }, [query, location, selectedCategory, selectedSortKey, setActiveFilter, fetchListings]);

  const handleSearchSubmit = () => {
    applyCurrentFilters();
  };

  const handleCategorySelect = (categoryName?: string) => {
    setCategoryMenuVisible(false);
    setSelectedCategory(categoryName);
    applyCurrentFilters({ category: categoryName });
  };

  const handleSortSelect = (key: SortKey) => {
    setSortMenuVisible(false);
    setSelectedSortKey(key);
    const sortValue = SORT_OPTIONS.find((o) => o.key === key)?.value;
    applyCurrentFilters({ sortBy: sortValue });
  };

  const handleSaveSearch = () => {
    if (!query.trim() && !location.trim() && !selectedCategory) {
      toast.warning(t("home.toasts.emptySearch"));
      return;
    }
    setSaveSearchName("");
    setSaveSearchModalVisible(true);
  };

  const handleConfirmSaveSearch = async () => {
    if (!saveSearchName.trim()) {
      toast.error(t("home.toasts.enterSearchName"));
      return;
    }
    setIsSavingSearch(true);
    try {
      const filter: ListingFilter = {};
      if (query.trim()) filter.query = query.trim();
      if (location.trim()) filter.location = location.trim();
      if (selectedCategory) filter.category = selectedCategory;
      await createSavedSearch(saveSearchName.trim(), filter);
      setSaveSearchModalVisible(false);
      toast.success(t("home.toasts.searchSaved"));
    } catch {
      toast.error(t("home.toasts.saveSearchFailed"));
    } finally {
      setIsSavingSearch(false);
    }
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
    toast.info(t("home.toasts.growingCommunity"));
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

  const getCategoryLabel = useCallback(
    (categoryName?: string) => {
      if (!categoryName) return t("home.allCategories");

      const normalized = categoryName.trim().toLowerCase();
      const keyByName: Record<string, string> = {
        electronics: "home.category.electronics",
        tools: "home.category.tools",
        fashion: "home.category.fashion",
        sports: "home.category.sports",
        vehicles: "home.category.vehicles",
        home: "home.category.home",
        books: "home.category.books",
        music: "home.category.music",
        photography: "home.category.photography",
        other: "home.category.other",
      };

      return keyByName[normalized] ? t(keyByName[normalized]) : categoryName;
    },
    [t],
  );
 
  const handleClear = () => {
    setQuery('');
    setLocation('');
    setSelectedCategory(undefined);
    setSelectedSortKey("relevance");
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
      title.includes(t("home.recommendedForYou")) || title.includes(t("home.recentlyViewed"));

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          {isSpecial && (
            <View
              style={[
                styles.sectionIconBg,
                title.includes(t("home.recentlyViewed")) && {
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
            {title.includes(t("home.recommendedForYou")) && (
              <Text variant="bodyMedium" style={styles.sectionSubtitleText}>
                {t("home.recommendedSubtitle")}
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
                title={t("home.trust.verifiedUsers")}
                subtitle={t("home.trust.idChecked")}
                iconColor={colors.accentEmerald}
              />
              <TrustBadge
                icon="credit-card-outline"
                title={t("home.trust.securePayments")}
                subtitle={t("home.trust.stripeProtected")}
                iconColor={colors.accentEmerald}
              />
            </View>
            <View style={styles.trustRow}>
              <TrustBadge
                icon="account-group-outline"
                title={t("home.trust.depositProtection")}
                subtitle={t("home.trust.fullyRefundable")}
                iconColor={colors.accentEmerald}
              />
              <TrustBadge
                icon="clock-outline"
                title={t("home.trust.support247")}
                subtitle={t("home.trust.alwaysHere")}
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
              t("home.recentlyViewed"),
              recentlyViewed,
              undefined,
              "history",
            )}

            {viewMode === "grid" && renderSection(
              t("home.recommendedForYou"),
              recommended,
              "AI Powered",
              "creation",
            )}

            {/* Search & Filter Component */}
            <View style={styles.searchHeader}>
              <View style={styles.headerTitleRow}>
                <Text variant="headlineSmall" style={styles.headerTitle}>
                  {t("home.searchAndFilter")}
                </Text>
                <View style={styles.headerActions}>
                  <TouchableOpacity style={styles.saveBtn} onPress={handleSaveSearch}>
                    <MaterialCommunityIcons
                      name="bookmark-outline"
                      size={18}
                      color={colors.textPrimary}
                    />
                    <Text style={styles.saveBtnText}>{t("home.saveSearch")}</Text>
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
                  placeholder={t("home.searchItemsPlaceholder")}
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
                  placeholder={t("home.locationPlaceholder")}
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
                    <Text style={styles.dropdownText}>{getCategoryLabel(selectedCategory)}</Text>
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
                    title={t("home.allCategories")}
                    leadingIcon="view-grid"
                    titleStyle={!selectedCategory ? styles.menuItemActiveText : undefined}
                  />
                  {categories.map((cat) => (
                    <Menu.Item 
                      key={cat.id} 
                      onPress={() => handleCategorySelect(cat.name)} 
                      title={getCategoryLabel(cat.name)} 
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
                  <Text style={styles.actionBtnText}>{t("home.advancedFilters")}</Text>
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
                      <Text style={styles.actionBtnText}>
                        {SORT_OPTIONS.find((opt) => opt.key === selectedSortKey)?.label ?? t("home.sort.relevance")}
                      </Text>
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
                    <Menu.Item key={opt.key} onPress={() => handleSortSelect(opt.key)} title={opt.label} />
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
                    <Text style={styles.clearAllText}>{t("home.clear", { count: activeFiltersCount })}</Text>
                  </TouchableOpacity>
 
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagsContainer}>
                    {selectedCategory && (
                      <View style={styles.filterTag}>
                        <Text style={styles.filterTagText}>{getCategoryLabel(selectedCategory)}</Text>
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
                      {t("home.allItems")}
                    </Text>
                    <TouchableOpacity
                      style={styles.viewAllBtn}
                      onPress={() => navigation.navigate('SearchTab' as any)}
                    >
                      <Text style={styles.viewAllText}>{t("home.viewAll")}</Text>
                      <MaterialCommunityIcons name="chevron-right" size={16} color={colors.primary} />
                    </TouchableOpacity>
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

      {/* Save Search Modal */}
      <Modal
        visible={saveSearchModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSaveSearchModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t("home.saveSearchTitle")}</Text>
            <Text style={styles.modalSubtitle}>
              {t("home.saveSearchSubtitle")}
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder={t("home.saveSearchPlaceholder")}
              placeholderTextColor="#9CA3AF"
              value={saveSearchName}
              onChangeText={setSaveSearchName}
              autoFocus
            />
            <Text style={styles.modalHint}>
              {t("home.saveSearchHint")}
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setSaveSearchModalVisible(false)}
                disabled={isSavingSearch}
              >
                <Text style={styles.modalCancelText}>{t("home.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, (!saveSearchName.trim() || isSavingSearch) && { opacity: 0.5 }]}
                onPress={handleConfirmSaveSearch}
                disabled={!saveSearchName.trim() || isSavingSearch}
              >
                <Text style={styles.modalSaveText}>
                  {isSavingSearch ? t("home.saving") : t("home.saveSearch")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    flex: 1,
    color: "#111827",
    fontWeight: "700",
    fontSize: typography.title,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllText: {
    fontSize: typography.body,
    fontWeight: '600',
    color: colors.primary,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 15,
    color: '#111827',
    marginBottom: 12,
  },
  modalHint: {
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancelBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6B7280',
  },
  modalSaveBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#111827',
  },
  modalSaveText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
