import { MaterialCommunityIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { FAB } from 'react-native-paper';
import { CategoriesScreen } from '../screens/categories/CategoriesScreen';
import { CategoryDetailScreen } from '../screens/categories/CategoryDetailScreen';
import { HomeScreen } from '../screens/home/HomeScreen';
import { ListingDetailScreen } from '../screens/listing/ListingDetailScreen';
import { FilterScreen } from '../screens/search/FilterScreen';
import { SearchScreen } from '../screens/search/SearchScreen';
import { colors } from '../theme';
import {
  FavoritesStackParamList,
  HomeStackParamList,
  MainTabParamList,
  ProfileStackParamList,
  SearchStackParamList,
} from '../types/navigation';

// Placeholder screens for tabs not yet built (Flow 3)
import { View as RNView } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { useAuthStore } from '../store/authStore';

const PlaceholderFavorites = () => (
  <RNView style={styles.placeholder}>
    <Text variant="headlineSmall">Favorites</Text>
    <Text variant="bodyMedium" style={{ color: colors.textSecondary, marginTop: 8 }}>
      Coming in Flow 3
    </Text>
  </RNView>
);

const PlaceholderProfile = () => {
  const { user, logout } = useAuthStore();
  return (
    <RNView style={styles.placeholder}>
      <Text variant="headlineSmall">Welcome, {user?.name || 'User'}!</Text>
      <Text variant="bodyMedium" style={{ color: colors.textSecondary, marginTop: 8 }}>
        Profile coming in Flow 3
      </Text>
      <Button mode="outlined" onPress={logout} style={{ marginTop: 24 }}>
        Sign Out
      </Button>
    </RNView>
  );
};

// --- Home Stack ---
const HomeStack = createStackNavigator<HomeStackParamList>();
const HomeStackNavigator = () => (
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
      options={{ title: 'All Categories' }}
    />
    <HomeStack.Screen
      name="CategoryDetail"
      component={CategoryDetailScreen}
      options={{ title: 'Category' }}
    />
  </HomeStack.Navigator>
);

// --- Search Stack ---
const SearchStack = createStackNavigator<SearchStackParamList>();
const SearchStackNavigator = () => (
  <SearchStack.Navigator>
    <SearchStack.Screen
      name="Search"
      component={SearchScreen}
      options={{ headerShown: false }}
    />
    <SearchStack.Screen
      name="Filter"
      component={FilterScreen}
      options={{ title: 'Filters', presentation: 'modal' }}
    />
    <SearchStack.Screen
      name="ListingDetail"
      component={ListingDetailScreen}
      options={{ headerShown: false }}
    />
  </SearchStack.Navigator>
);

// --- Favorites Stack (placeholder) ---
const FavoritesStack = createStackNavigator<FavoritesStackParamList>();
const FavoritesStackNavigator = () => (
  <FavoritesStack.Navigator>
    <FavoritesStack.Screen
      name="Favorites"
      component={PlaceholderFavorites}
      options={{ title: 'Favorites' }}
    />
  </FavoritesStack.Navigator>
);

// --- Profile Stack (placeholder) ---
const ProfileStack = createStackNavigator<ProfileStackParamList>();
const ProfileStackNavigator = () => (
  <ProfileStack.Navigator>
    <ProfileStack.Screen
      name="Profile"
      component={PlaceholderProfile}
      options={{ title: 'Profile' }}
    />
  </ProfileStack.Navigator>
);

// --- Main Tabs ---
const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainTabNavigator = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.textSecondary,
      tabBarStyle: {
        backgroundColor: colors.cardLight,
        borderTopColor: colors.border,
        height: 60,
        paddingBottom: 8,
        paddingTop: 4,
      },
    }}
  >
    <Tab.Screen
      name="HomeTab"
      component={HomeStackNavigator}
      options={{
        tabBarLabel: 'Home',
        tabBarIcon: ({ color, size }) => (
          <MaterialCommunityIcons name="home" size={size} color={color} />
        ),
      }}
    />
    <Tab.Screen
      name="SearchTab"
      component={SearchStackNavigator}
      options={{
        tabBarLabel: 'Search',
        tabBarIcon: ({ color, size }) => (
          <MaterialCommunityIcons name="magnify" size={size} color={color} />
        ),
      }}
    />
    <Tab.Screen
      name="ListItemTab"
      component={PlaceholderFavorites}
      listeners={({ navigation }) => ({
        tabPress: (e) => {
          e.preventDefault();
          // Will navigate to CreateListingScreen in Flow 3
        },
      })}
      options={{
        tabBarLabel: '',
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
    <Tab.Screen
      name="FavoritesTab"
      component={FavoritesStackNavigator}
      options={{
        tabBarLabel: 'Favorites',
        tabBarIcon: ({ color, size }) => (
          <MaterialCommunityIcons name="heart-outline" size={size} color={color} />
        ),
      }}
    />
    <Tab.Screen
      name="ProfileTab"
      component={ProfileStackNavigator}
      options={{
        tabBarLabel: 'Profile',
        tabBarIcon: ({ color, size }) => (
          <MaterialCommunityIcons name="account-outline" size={size} color={color} />
        ),
      }}
    />
  </Tab.Navigator>
);

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
