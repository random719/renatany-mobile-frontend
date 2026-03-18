import { MaterialCommunityIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { FAB } from 'react-native-paper';
import { useI18n } from '../i18n';
import { useIsAdmin } from '../hooks/useIsAdmin';
import { CategoriesScreen } from '../screens/categories/CategoriesScreen';
import { CategoryDetailScreen } from '../screens/categories/CategoryDetailScreen';
import { FavoritesScreen } from '../screens/favorites/FavoritesScreen';
import { HomeScreen } from '../screens/home/HomeScreen';
import { CreateListingScreen } from '../screens/listing/CreateListingScreen';
import { ListingDetailScreen } from '../screens/listing/ListingDetailScreen';
import { MyListingReportsScreen } from '../screens/profile/MyListingReportsScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { FilterScreen } from '../screens/search/FilterScreen';
import { SavedSearchesScreen } from '../screens/search/saved/SavedSearchesScreen';
import { SearchScreen } from '../screens/search/SearchScreen';
import { colors } from '../theme';
import {
  FavoritesStackParamList,
  HomeStackParamList,
  MainTabParamList,
  ProfileStackParamList,
  SearchStackParamList
} from '../types/navigation';


// --- Home Stack ---
const HomeStack = createStackNavigator<HomeStackParamList>();
const HomeStackNavigator = () => {
  const { t } = useI18n();

  return (
  <HomeStack.Navigator>
    <HomeStack.Screen
      name="Home"
      component={HomeScreen}
      options={{ headerShown: false }}
    />
    <HomeStack.Screen
      name="ListingDetail"
      component={ListingDetailScreen}
      options={{ headerShown: false }}
    />
    <HomeStack.Screen
      name="Categories"
      component={CategoriesScreen}
      options={{ title: t('home.allCategories') }}
    />
    <HomeStack.Screen
      name="CategoryDetail"
      component={CategoryDetailScreen}
      options={{ title: t('savedSearches.searchCriteria') }}
    />
  </HomeStack.Navigator>
  );
};

// --- Search Stack ---
const SearchStack = createStackNavigator<SearchStackParamList>();
const SearchStackNavigator = () => {
  const { t } = useI18n();

  return (
  <SearchStack.Navigator>
    <SearchStack.Screen
      name="Search"
      component={SearchScreen}
      options={{ headerShown: false }}
    />
    <SearchStack.Screen
      name="Filter"
      component={FilterScreen}
      options={{ title: t('search.advancedFilters'), presentation: 'modal' }}
    />
    <SearchStack.Screen
      name="ListingDetail"
      component={ListingDetailScreen}
      options={{ headerShown: false }}
    />
  </SearchStack.Navigator>
  );
};

// --- ListItem Stack ---
const ListItemStack = createStackNavigator();
const ListItemStackNavigator = () => (
  <ListItemStack.Navigator>
    <ListItemStack.Screen
      name="CreateListing"
      component={CreateListingScreen}
      options={{ headerShown: false }}
    />
  </ListItemStack.Navigator>
);

// --- Favorites Stack (placeholder) ---
const FavoritesStack = createStackNavigator<FavoritesStackParamList>();
const FavoritesStackNavigator = () => (
  <FavoritesStack.Navigator>
    <FavoritesStack.Screen
      name="Favorites"
      component={FavoritesScreen}
      options={{ headerShown: false }}
    />
    <FavoritesStack.Screen
      name="SavedSearches"
      component={SavedSearchesScreen}
      options={{ headerShown: false }}
    />
    <FavoritesStack.Screen
      name="ListingDetail"
      component={ListingDetailScreen}
      options={{ headerShown: false }}
    />
  </FavoritesStack.Navigator>
);

// --- Profile Stack (placeholder) ---
const ProfileStack = createStackNavigator<ProfileStackParamList>();
const ProfileStackNavigator = () => (
  <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
    <ProfileStack.Screen
      name="Profile"
      component={ProfileScreen}
    />
    <ProfileStack.Screen
      name="MyListingReports"
      component={MyListingReportsScreen}
    />
  </ProfileStack.Navigator>
);

// --- Shared tab screen options ---
const TAB_SCREEN_OPTIONS = {
  headerShown: false,
  tabBarActiveTintColor: colors.primary,
  tabBarInactiveTintColor: colors.textSecondary,
  tabBarStyle: {
    backgroundColor: colors.cardLight,
    borderTopColor: colors.border,
    height: 70,
    paddingBottom: 4,
    paddingTop: 4,
  },
};

// --- Admin Tab (no + button) ---
const AdminTab = createBottomTabNavigator<MainTabParamList>();
const AdminTabNavigator = () => {
  const { t } = useI18n();

  return (
  <AdminTab.Navigator screenOptions={TAB_SCREEN_OPTIONS}>
    <AdminTab.Screen
      name="HomeTab"
      component={HomeStackNavigator}
      options={{
        tabBarLabel: t('nav.home'),
        tabBarIcon: ({ color, size }) => (
          <MaterialCommunityIcons name="home" size={size} color={color} />
        ),
      }}
    />
    <AdminTab.Screen
      name="SearchTab"
      component={SearchStackNavigator}
      options={{
        tabBarLabel: t('nav.search'),
        tabBarIcon: ({ color, size }) => (
          <MaterialCommunityIcons name="magnify" size={size} color={color} />
        ),
      }}
    />
    <AdminTab.Screen
      name="ProfileTab"
      component={ProfileStackNavigator}
      options={{
        tabBarLabel: t('nav.profile'),
        tabBarIcon: ({ color, size }) => (
          <MaterialCommunityIcons name="account-outline" size={size} color={color} />
        ),
      }}
    />
  </AdminTab.Navigator>
  );
};

// --- User Tab (with + button) ---
const UserTab = createBottomTabNavigator<MainTabParamList>();
const UserTabNavigator = () => {
  const { t } = useI18n();

  return (
  <UserTab.Navigator screenOptions={TAB_SCREEN_OPTIONS}>
    <UserTab.Screen
      name="HomeTab"
      component={HomeStackNavigator}
      options={{
        tabBarLabel: t('nav.home'),
        tabBarIcon: ({ color, size }) => (
          <MaterialCommunityIcons name="home" size={size} color={color} />
        ),
      }}
    />
    <UserTab.Screen
      name="SearchTab"
      component={SearchStackNavigator}
      options={{
        tabBarLabel: t('nav.search'),
        tabBarIcon: ({ color, size }) => (
          <MaterialCommunityIcons name="magnify" size={size} color={color} />
        ),
      }}
    />
    <UserTab.Screen
      name="ListItemTab"
      component={ListItemStackNavigator}
      options={{
        tabBarLabel: () => null,
        tabBarIcon: () => (
          <View style={styles.fabContainer}>
            <FAB
              icon="plus"
              size="small"
              style={styles.fab}
              color="#FFFFFF"
            />
          </View>
        ),
      }}
    />
    <UserTab.Screen
      name="FavoritesTab"
      component={FavoritesStackNavigator}
      options={{
        tabBarLabel: t('nav.favorites'),
        tabBarIcon: ({ color, size }) => (
          <MaterialCommunityIcons name="heart-outline" size={size} color={color} />
        ),
      }}
    />
    <UserTab.Screen
      name="ProfileTab"
      component={ProfileStackNavigator}
      options={{
        tabBarLabel: t('nav.profile'),
        tabBarIcon: ({ color, size }) => (
          <MaterialCommunityIcons name="account-outline" size={size} color={color} />
        ),
      }}
    />
  </UserTab.Navigator>
  );
};

// --- Main Tab Navigator ---
export const MainTabNavigator = () => {
  const { isAdmin } = useIsAdmin();

  return isAdmin ? <AdminTabNavigator /> : <UserTabNavigator />;
};

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  fabContainer: {
    top: -12,
  },
  fab: {
    backgroundColor: colors.primary,
    borderRadius: 28,
  },
});
