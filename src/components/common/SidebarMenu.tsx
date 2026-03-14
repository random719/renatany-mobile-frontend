import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useClerk, useUser } from "@clerk/expo";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Text } from "react-native-paper";
import { useAuthStore } from "../../store/authStore";
import { useListingStore } from "../../store/listingStore";
import { useUIStore } from "../../store/uiStore";
import { colors, typography } from "../../theme";

const { width, height } = Dimensions.get("window");
const SIDEBAR_WIDTH = Math.min(width * 0.8, 320);
const ADMIN_EMAILS = new Set(["collegeworks0910@gmail.com", "admin@rentany.fr"]);

export const SidebarMenu = () => {
  const navigation = useNavigation<any>();
  const { signOut } = useClerk();
  const { user: clerkUser } = useUser();
  const { isSidebarVisible: isVisible, closeSidebar: onClose } = useUIStore();
  const { logout } = useAuthStore();
  const { activeFilter, applyFilter } = useListingStore();
  const [currentRouteName, setCurrentRouteName] = useState("HomeTab"); // Default to Browse All
  const primaryEmail =
    clerkUser?.primaryEmailAddress?.emailAddress?.toLowerCase() || "";
  const metadataRole =
    typeof clerkUser?.publicMetadata?.role === "string"
      ? clerkUser.publicMetadata.role.toLowerCase()
      : "";
  const isAdmin = metadataRole === "admin" || ADMIN_EMAILS.has(primaryEmail);
  const isAdminDashboard = currentRouteName === "AdminDashboard";
  const derivedHandle =
    clerkUser?.username ||
    (primaryEmail.includes("@") ? primaryEmail.split("@")[0] : "");

  // Helper to resolve the deepest route name from navigation state
  const resolveRouteName = useCallback(() => {
    try {
      const state = navigation.getState();
      if (!state) return;
      let route: any = state.routes[state.index];
      while (route.state) {
        route = route.state.routes[route.state.index];
      }
      setCurrentRouteName(route.name);
    } catch (e) {
      console.log("Error getting navigation state:", e);
    }
  }, [navigation]);

  // Track route changes continuously so active state is always up to date
  useEffect(() => {
    const unsubscribe = navigation.addListener("state", resolveRouteName);
    return unsubscribe;
  }, [navigation, resolveRouteName]);

  // Also resolve when sidebar opens (in case state event already fired)
  useEffect(() => {
    if (isVisible) {
      resolveRouteName();
    }
  }, [isVisible, resolveRouteName]);
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
              <MaterialCommunityIcons
                name="home-outline"
                size={24}
                color="#FFFFFF"
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

        <Text style={styles.tagline}>Rent anything, from anyone.</Text>
        <View style={styles.divider} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Text style={styles.sectionTitle}>NAVIGATE</Text>
          {(() => {
            const isFavorites = ["Favorites", "FavoritesTab"].includes(
              currentRouteName,
            );
            const isProfile = [
              "Profile",
              "ProfileTab",
              "EditProfile",
              "Settings",
            ].includes(currentRouteName);
            const isListItem = currentRouteName === "ListItemTab";
            const isRentalHistory = currentRouteName === "RentalHistory";
            const isConversations = currentRouteName === "MyConversations";
            const isDisputes = currentRouteName === "Disputes";
            const isSavedSearches = currentRouteName === "SavedSearches";
            const isBulkEditItems = currentRouteName === "BulkEditItems";
            const isBrowseAll =
              !isFavorites &&
              !isProfile &&
              !isListItem &&
              !isRentalHistory &&
              !isConversations &&
              !isDisputes &&
              !isSavedSearches &&
              !isBulkEditItems &&
              !isAdminDashboard;

            return (
              <>
                {renderNavItem(
                  "home-outline",
                  "Browse All",
                  () => navigation.navigate("Main", { screen: "HomeTab" }),
                  isBrowseAll,
                )}
                {!isAdmin &&
                  renderNavItem(
                    "heart-outline",
                    "Favorites",
                    () => navigation.navigate("Main", { screen: "FavoritesTab" }),
                    isFavorites,
                  )}
                {!isAdmin &&
                  renderNavItem(
                    "bookmark-outline",
                    "Saved Searches",
                    () => navigation.navigate("SavedSearches"),
                    isSavedSearches,
                  )}
                {!isAdmin &&
                  renderNavItem(
                    "clock-outline",
                    "Rental History",
                    () => navigation.navigate("RentalHistory"),
                    isRentalHistory,
                  )}
                {!isAdmin &&
                  renderNavItem(
                    "plus",
                    "List Item",
                    () => navigation.navigate("Main", { screen: "ListItemTab" }),
                    isListItem,
                  )}
                {!isAdmin &&
                  renderNavItem(
                    "square-edit-outline",
                    "Bulk Edit Items",
                    () => navigation.navigate("BulkEditItems"),
                    isBulkEditItems
                  )}
                {!isAdmin &&
                  renderNavItem(
                    "account-outline",
                    "My Profile",
                    () => navigation.navigate("Main", { screen: "ProfileTab" }),
                    isProfile,
                  )}
                {!isAdmin &&
                  renderNavItem(
                    "chat-outline",
                    "My Conversations",
                    () => navigation.navigate("MyConversations"),
                    isConversations,
                  )}
                {!isAdmin &&
                  renderNavItem(
                    "alert-outline",
                    "Disputes",
                    () => navigation.navigate("Disputes"),
                    isDisputes,
                  )}
              </>
            );
          })()}

          {isAdmin && (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionTitle}>ADMIN</Text>
              {renderAdminNavItem(
                "chart-bar",
                "Admin: Dashboard",
                () => navigation.navigate("AdminDashboard"),
                isAdminDashboard,
              )}
              {renderAdminNavItem(
                "clock-outline",
                "Admin: Review Pending Requests",
                () => navigation.navigate("AdminModeration"),
              )}
              {renderAdminNavItem(
                "file-document-outline",
                "Admin: Reports Listing",
                () => navigation.navigate("AdminListingReports"),
              )}
              {renderAdminNavItem(
                "alert-outline",
                "Admin: Disputes",
                () => navigation.navigate("AdminDisputes"),
              )}
              {renderAdminNavItem(
                "alert-rhombus-outline",
                "Admin: User Reports",
                () => navigation.navigate("AdminUserReports"),
              )}
              {renderAdminNavItem(
                "shield-check-outline",
                "Admin: Fraud Reports",
                () => navigation.navigate("AdminFraudReports"),
              )}
            </>
          )}

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>CATEGORIES</Text>
          {renderNavItem("cellphone", "Electronics", () => {
            applyFilter({ ...activeFilter, category: "Electronics" });
            navigation.navigate("Main", { screen: "SearchTab" });
          })}
          {renderNavItem("cog-outline", "Tools", () => {
            applyFilter({ ...activeFilter, category: "Tools" });
            navigation.navigate("Main", { screen: "SearchTab" });
          })}
          {renderNavItem("account-outline", "Fashion", () => {
            applyFilter({ ...activeFilter, category: "Fashion" });
            navigation.navigate("Main", { screen: "SearchTab" });
          })}
          {renderNavItem("check-decagram-outline", "Sports", () => {
            applyFilter({ ...activeFilter, category: "Sports" });
            navigation.navigate("Main", { screen: "SearchTab" });
          })}
          {renderNavItem("swap-horizontal", "Vehicles", () => {
            applyFilter({ ...activeFilter, category: "Vehicles" });
            navigation.navigate("Main", { screen: "SearchTab" });
          })}
          {renderNavItem("home-outline", "Home", () => {
            applyFilter({ ...activeFilter, category: "Home" });
            navigation.navigate("Main", { screen: "SearchTab" });
          })}
          {renderNavItem("book-open-outline", "Books", () => {
            applyFilter({ ...activeFilter, category: "Books" });
            navigation.navigate("Main", { screen: "SearchTab" });
          })}
          {renderNavItem("music-note-outline", "Music", () => {
            applyFilter({ ...activeFilter, category: "Music" });
            navigation.navigate("Main", { screen: "SearchTab" });
          })}
          {renderNavItem("camera-outline", "Photography", () => {
            applyFilter({ ...activeFilter, category: "Photography" });
            navigation.navigate("Main", { screen: "SearchTab" });
          })}
          {renderNavItem("shape-outline", "Other", () => {
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
            <Text style={styles.signOutText}>Sign Out</Text>
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
