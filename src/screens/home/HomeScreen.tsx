import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import React, { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
  useWindowDimensions,
} from "react-native";
import { WebView } from "react-native-webview";
import { ActivityIndicator, Text } from "react-native-paper";
import { TrustBadge } from "../../components/common/TrustBadge";
import { CategoryRow } from "../../components/home/CategoryRow";
import { Footer } from "../../components/home/Footer";
import { HeroBanner } from "../../components/home/HeroBanner";
import { HomeSearchFilter } from "../../components/home/HomeSearchFilter";
import { HowItWorks } from "../../components/home/HowItWorks";
import { Testimonials } from "../../components/home/Testimonials";
import { ListingCard } from "../../components/listing/ListingCard";
import { useListingStore } from "../../store/listingStore";
import { useUIStore } from "../../store/uiStore";
import { colors, typography } from "../../theme";
import { Category, Listing } from "../../types/listing";
import { HomeStackParamList } from "../../types/navigation";

// Extend the local type for this specific navigation call
type ExtendedHomeStackParamList = HomeStackParamList & { SearchTab: undefined };
type Nav = StackNavigationProp<ExtendedHomeStackParamList, "Home">;

export const HomeScreen = () => {
  const navigation = useNavigation<Nav>();
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
    toggleLike,
  } = useListingStore();

  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const { height: screenHeight } = useWindowDimensions();

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
    navigation.navigate("ListingDetail", { listingId: listing.id });
  };

  const handleCategoryPress = (category: Category) => {
    navigation.navigate("CategoryDetail", { category: category.name });
  };

  const handleViewAllCategories = () => {
    navigation.navigate("Categories");
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
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={loadData} />
        }
      >
        <HeroBanner itemCount={listings.length} onMenuPress={openSidebar} />

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
                  <TouchableOpacity style={styles.saveBtn}>
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
                  onSubmitEditing={() => console.log("search:", query)}
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
                  onSubmitEditing={() => console.log("location:", location)}
                />
              </View>

              <TouchableOpacity style={styles.dropdownBtn}>
                <Text style={styles.dropdownText}>All Categories</Text>
                <MaterialCommunityIcons
                  name="chevron-down"
                  size={20}
                  color="#6B7280"
                />
              </TouchableOpacity>

              <View style={styles.filtersRow}>
                <TouchableOpacity style={styles.actionBtnRow}>
                  <MaterialCommunityIcons
                    name="tune-variant"
                    size={18}
                    color={colors.textPrimary}
                  />
                  <Text style={styles.actionBtnText}>Advanced Filters</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionBtnRow}>
                  <MaterialCommunityIcons
                    name="swap-vertical"
                    size={18}
                    color={colors.textPrimary}
                  />
                  <Text style={styles.actionBtnText}>Relevance</Text>
                  <MaterialCommunityIcons
                    name="chevron-down"
                    size={18}
                    color="#6B7280"
                    style={styles.chevronIcon}
                  />
                </TouchableOpacity>
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
                <View style={styles.gridContainer}>
                  <View style={styles.allItemsHeader}>
                    <MaterialCommunityIcons name="star" size={24} color="#8B5CF6" />
                    <Text variant="headlineSmall" style={styles.allItemsTitle}>
                      All Items
                    </Text>
                  </View>
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
              )}

              {viewMode === "grid" && listings.length > 4 && (
                <View style={styles.viewAllContainer}>
                  <TouchableOpacity
                    style={styles.viewAllButton}
                    onPress={() => navigation.navigate("SearchTab")}
                  >
                    <Text style={styles.viewAllText}>View All</Text>
                    <MaterialCommunityIcons
                      name="arrow-right"
                      size={16}
                      color={colors.primary}
                    />
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
  viewAllContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
    alignItems: "center",
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 8,
  },
  viewAllText: {
    color: colors.primary,
    fontWeight: "600",
    fontSize: typography.body,
  },
  loader: {
    marginTop: 48,
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
});
