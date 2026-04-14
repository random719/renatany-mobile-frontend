import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { navigationRef } from "../../navigation/AppNavigator";
import { useClerk, useUser } from "@clerk/expo";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  Image,
} from "react-native";
import { Text } from "react-native-paper";
import { useI18n } from "../../i18n";
import { useIsAdmin } from "../../hooks/useIsAdmin";
import { useAuthStore } from "../../store/authStore";
import { useListingStore } from "../../store/listingStore";
import { useUIStore } from "../../store/uiStore";
import { colors, typography } from "../../theme";

const { width, height } = Dimensions.get("window");
const SIDEBAR_WIDTH = Math.min(width * 0.8, 320);

export const SidebarMenu = () => {
  const navigation = useNavigation<any>();
  const { signOut } = useClerk();
  const { user: clerkUser } = useUser();
  const { isAdmin } = useIsAdmin();
  const { t } = useI18n();
  const { isSidebarVisible: isVisible, closeSidebar: onClose } = useUIStore();
  const { logout } = useAuthStore();
  const { activeFilter, applyFilter } = useListingStore();
  const primaryEmail =
    clerkUser?.primaryEmailAddress?.emailAddress?.toLowerCase() || "";
  const derivedHandle =
    clerkUser?.username ||
    (primaryEmail.includes("@") ? primaryEmail.split("@")[0] : "");

  // Resolve the deepest active route name from the navigation ref
  const getActiveRouteName = (): string => {
    try {
      const state = navigationRef.current?.getRootState();
      if (!state) return "Home";
      let route: any = state.routes[state.index];
      while (route.state) {
        route = route.state.routes[route.state.index];
      }
      return route.name as string;
    } catch {
      return "Home";
    }
  };

  // Resolve fresh on every render when sidebar is visible
  const latestRoute = isVisible ? getActiveRouteName() : "Home";
  const isAdminDashboard = latestRoute === "AdminDashboard";
  const isAdminModeration = latestRoute === "AdminModeration";
  const isAdminListingReports = latestRoute === "AdminListingReports";
  const isAdminDisputes = latestRoute === "AdminDisputes";
  const isAdminUserReports = latestRoute === "AdminUserReports";
  const isAdminSecurity = latestRoute === "AdminSecurity";
  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [isMounted, setIsMounted] = React.useState(isVisible);

  useEffect(() => {
    if (isVisible) {
      setIsMounted(true);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -SIDEBAR_WIDTH,
          duration: 250,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIsMounted(false);
      });
    }
  }, [isVisible, slideAnim, fadeAnim]);

  if (!isMounted) {
    return null;
  }

  const renderNavItem = (
    icon: any,
    label: string,
    onPress?: () => void,
    isActive = false,
  ) => (
    <TouchableOpacity
      style={[styles.navItem, isActive && styles.navItemActive]}
      onPress={() => {
        if (onPress) {
          onPress();
          onClose();
        }
      }}
    >
      <MaterialCommunityIcons
        name={icon}
        size={22}
        color={isActive ? "#FFFFFF" : colors.textPrimary}
      />
      <Text style={[styles.navItemText, isActive && styles.navItemTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderAdminNavItem = (
    icon: any,
    label: string,
    onPress?: () => void,
    isActive = false,
  ) => (
    <TouchableOpacity
      style={[styles.adminNavItem, isActive && styles.adminNavItemActive]}
      onPress={() => {
        if (onPress) {
          onPress();
          onClose();
        }
      }}
    >
      <MaterialCommunityIcons
        name={icon}
        size={22}
        color={isActive ? "#FFFFFF" : "#DC2626"}
      />
      <Text
        style={[
          styles.adminNavItemText,
          isActive && styles.adminNavItemTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const categoryLabels: Record<string, string> = {
    Electronics: t("home.category.electronics"),
    Tools: t("home.category.tools"),
    Fashion: t("home.category.fashion"),
    Sports: t("home.category.sports"),
    Vehicles: t("home.category.vehicles"),
    Home: t("home.category.home"),
    Books: t("home.category.books"),
    Music: t("home.category.music"),
    Photography: t("home.category.photography"),
    Other: t("home.category.other"),
  };

  return (
    <View style={styles.overlayContainer}>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
      </TouchableWithoutFeedback>

      <Animated.View
        style={[styles.sidebar, { transform: [{ translateX: slideAnim }] }]}
      >
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <View style={styles.logoIcon}>
              <Image
                source={require("../../../assets/logo.png")}
                style={{ width: 28, height: 28, borderRadius: 14 }}
                resizeMode="cover"
              />
            </View>
            <Text style={styles.logoText}>Rentany</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <MaterialCommunityIcons
              name="close"
              size={20}
              color={colors.textPrimary}
            />
          </TouchableOpacity>
        </View>

        <Text style={styles.tagline}>{t("footer.description")}</Text>
        <View style={styles.divider} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Text style={styles.sectionTitle}>{t("nav.navigate")}</Text>
          {(() => {
            const isFavorites = ["Favorites", "FavoritesTab"].includes(latestRoute);
            const isProfile = ["Profile", "ProfileTab", "EditProfile", "Settings", "MyListingReports"].includes(latestRoute);
            const isListItem = ["ListItemTab", "CreateListing"].includes(latestRoute);
            const isRentalHistory = ["RentalHistory", "RentalDetail"].includes(latestRoute);
            const isConversations = ["MyConversations", "Chat"].includes(latestRoute);
            const isDisputes = ["Disputes", "DisputeDetail"].includes(latestRoute);
            const isSavedSearches = latestRoute === "SavedSearches";
            const isBulkEditItems = ["BulkEditItems", "EditItem"].includes(latestRoute);
            const isReferral = latestRoute === "Referral";
            const isBrowseAll = ["Home", "HomeTab", "ListingDetail", "Search", "SearchTab", "Categories", "CategoryDetail"].includes(latestRoute);

            return (
              <>
                {renderNavItem(
                  "home-outline",
                  t("nav.browseAll"),
                  () => navigation.navigate("Main", { screen: "HomeTab" }),
                  isBrowseAll,
                )}
                {!isAdmin &&
                  renderNavItem(
                    "heart-outline",
                    t("nav.favorites"),
                    () => navigation.navigate("Main", { screen: "FavoritesTab" }),
                    isFavorites,
                  )}
                {!isAdmin &&
                  renderNavItem(
                    "bookmark-outline",
                    t("nav.savedSearches"),
                    () => navigation.navigate("Main", { screen: "FavoritesTab", params: { screen: "SavedSearches" } }),
                    isSavedSearches,
                  )}
                {!isAdmin &&
                  renderNavItem(
                    "clock-outline",
                    t("nav.rentalHistory"),
                    () => navigation.navigate("RentalHistory"),
                    isRentalHistory,
                  )}
                {!isAdmin &&
                  renderNavItem(
                    "plus",
                    t("nav.listItem"),
                    () => navigation.navigate("Main", { screen: "ListItemTab" }),
                    isListItem,
                  )}
                {!isAdmin &&
                  renderNavItem(
                    "square-edit-outline",
                    t("nav.bulkEditItems"),
                    () => navigation.navigate("BulkEditItems"),
                    isBulkEditItems
                  )}
                {!isAdmin &&
                  renderNavItem(
                    "account-outline",
                    t("nav.myProfile"),
                    () => navigation.navigate("Main", { screen: "ProfileTab" }),
                    isProfile,
                  )}
                {!isAdmin &&
                  renderNavItem(
                    "chat-outline",
                    t("nav.conversations"),
                    () => navigation.navigate("MyConversations"),
                    isConversations,
                  )}
                {!isAdmin &&
                  renderNavItem(
                    "alert-outline",
                    t("nav.disputes"),
                    () => navigation.navigate("Disputes"),
                    isDisputes,
                  )}
                {!isAdmin &&
                  renderNavItem(
                    "account-group",
                    t("nav.referralProgram"),
                    () => navigation.navigate("Referral"),
                    isReferral,
                  )}
              </>
            );
          })()}

          {isAdmin && (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionTitle}>{t("nav.admin")}</Text>
              {renderAdminNavItem(
                "chart-bar",
                t("nav.adminDashboard"),
                () => navigation.navigate("AdminDashboard"),
                isAdminDashboard,
              )}
              {renderAdminNavItem(
                "clock-outline",
                t("nav.moderation"),
                () => navigation.navigate("AdminModeration"),
                isAdminModeration,
              )}
              {renderAdminNavItem(
                "file-document-outline",
                t("nav.listingReports"),
                () => navigation.navigate("AdminListingReports"),
                isAdminListingReports,
              )}
              {renderAdminNavItem(
                "alert-outline",
                t("nav.disputeCenter"),
                () => navigation.navigate("AdminDisputes"),
                isAdminDisputes,
              )}
              {renderAdminNavItem(
                "alert-rhombus-outline",
                t("nav.userReports"),
                () => navigation.navigate("AdminUserReports"),
                isAdminUserReports,
              )}
              {renderAdminNavItem(
                "shield-cog-outline",
                t("nav.security"),
                () => navigation.navigate("AdminSecurity"),
                isAdminSecurity,
              )}
            </>
          )}

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>{t("nav.categories")}</Text>
          {renderNavItem("cellphone", categoryLabels.Electronics, () => {
            applyFilter({ ...activeFilter, category: "Electronics" });
            navigation.navigate("Main", { screen: "SearchTab" });
          })}
          {renderNavItem("cog-outline", categoryLabels.Tools, () => {
            applyFilter({ ...activeFilter, category: "Tools" });
            navigation.navigate("Main", { screen: "SearchTab" });
          })}
          {renderNavItem("account-outline", categoryLabels.Fashion, () => {
            applyFilter({ ...activeFilter, category: "Fashion" });
            navigation.navigate("Main", { screen: "SearchTab" });
          })}
          {renderNavItem("check-decagram-outline", categoryLabels.Sports, () => {
            applyFilter({ ...activeFilter, category: "Sports" });
            navigation.navigate("Main", { screen: "SearchTab" });
          })}
          {renderNavItem("swap-horizontal", categoryLabels.Vehicles, () => {
            applyFilter({ ...activeFilter, category: "Vehicles" });
            navigation.navigate("Main", { screen: "SearchTab" });
          })}
          {renderNavItem("home-outline", categoryLabels.Home, () => {
            applyFilter({ ...activeFilter, category: "Home" });
            navigation.navigate("Main", { screen: "SearchTab" });
          })}
          {renderNavItem("book-open-outline", categoryLabels.Books, () => {
            applyFilter({ ...activeFilter, category: "Books" });
            navigation.navigate("Main", { screen: "SearchTab" });
          })}
          {renderNavItem("music-note-outline", categoryLabels.Music, () => {
            applyFilter({ ...activeFilter, category: "Music" });
            navigation.navigate("Main", { screen: "SearchTab" });
          })}
          {renderNavItem("camera-outline", categoryLabels.Photography, () => {
            applyFilter({ ...activeFilter, category: "Photography" });
            navigation.navigate("Main", { screen: "SearchTab" });
          })}
          {renderNavItem("shape-outline", categoryLabels.Other, () => {
            applyFilter({ ...activeFilter, category: "Other" });
            navigation.navigate("Main", { screen: "SearchTab" });
          })}

          <View style={styles.bottomSpacer} />
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.footerProfileRow}>
            <View style={styles.footerAvatar}>
              <MaterialCommunityIcons
                name="account-outline"
                size={18}
                color={colors.textPrimary}
              />
            </View>
            <Text style={styles.footerHandle}>@{derivedHandle || "guest"}</Text>
          </View>
          <TouchableOpacity
            style={styles.signOutBtn}
            onPress={async () => {
              try {
                await signOut();
              } catch (e) {
                console.log("Clerk sign out failed:", e);
              } finally {
                logout();
                onClose();
              }
            }}
          >
            <MaterialCommunityIcons name="logout" size={18} color="#374151" />
            <Text style={styles.signOutText}>{t("nav.logout")}</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  sidebar: {
    width: SIDEBAR_WIDTH,
    height: "100%",
    backgroundColor: "#FFFFFF",
    position: "absolute",
    left: 0,
    top: 0,
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 8,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logoIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontSize: typography.title,
    fontWeight: "700",
    color: "#111827",
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  tagline: {
    fontSize: typography.body,
    color: "#6B7280",
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 16,
    marginBottom: 16,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: typography.small,
    fontWeight: "700",
    color: "#4B5563",
    paddingHorizontal: 16,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
    gap: 16,
  },
  navItemActive: {
    backgroundColor: colors.accentBlue,
  },
  navItemText: {
    fontSize: typography.label,
    color: colors.textPrimary,
    fontWeight: "500",
  },
  navItemTextActive: {
    color: "#FFFFFF",
  },
  adminNavItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    gap: 16,
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
  },
  adminNavItemActive: {
    backgroundColor: "#DC2626",
    borderColor: "#DC2626",
  },
  adminNavItemText: {
    fontSize: typography.label,
    color: "#DC2626",
    fontWeight: "500",
  },
  adminNavItemTextActive: {
    color: "#FFFFFF",
  },
  bottomSpacer: {
    height: 16,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
    backgroundColor: "#FFFFFF",
  },
  footerProfileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  footerAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  footerHandle: {
    fontSize: typography.sectionTitle,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  signOutBtn: {
    height: 40,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  signOutText: {
    fontSize: typography.tabLabel,
    fontWeight: "500",
    color: "#374151",
  },
});
