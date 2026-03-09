import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import { SidebarMenu } from '../components/common/SidebarMenu';
import { DisputesScreen } from '../screens/disputes/DisputesScreen';
import { ConversationsScreen } from '../screens/messages/ConversationsScreen';
import { RentalHistoryScreen } from '../screens/rentals/RentalHistoryScreen';
import { SavedSearchesScreen } from '../screens/search/saved/SavedSearchesScreen';
import { useAuthStore } from '../store/authStore';
import { AuthNavigator } from './AuthNavigator';
import { MainTabNavigator } from './MainTabNavigator';

const Stack = createStackNavigator();

export const AppNavigator = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <NavigationContainer>
      <SidebarMenu />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <>
            <Stack.Screen name="Main" component={MainTabNavigator} />
            <Stack.Screen name="RentalHistory" component={RentalHistoryScreen} />
            <Stack.Screen name="MyConversations" component={ConversationsScreen} />
            <Stack.Screen name="Disputes" component={DisputesScreen} />
            <Stack.Screen name="SavedSearches" component={SavedSearchesScreen} />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
