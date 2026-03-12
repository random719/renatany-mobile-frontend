import { useAuth } from '@clerk/expo';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import React, { useEffect } from 'react';
import { SidebarMenu } from '../components/common/SidebarMenu';
import { AdminDashboardScreen } from '../screens/admin/AdminDashboardScreen';
import { AdminDisputesScreen } from '../screens/admin/AdminDisputesScreen';
import { AdminFraudReportsScreen } from '../screens/admin/AdminFraudReportsScreen';
import { AdminModerationScreen } from '../screens/admin/AdminModerationScreen';
import { AdminUserReportsScreen } from '../screens/admin/AdminUserReportsScreen';
import { AdminListingReportsScreen } from '../screens/admin/AdminListingReportsScreen';
import { DisputesScreen } from '../screens/disputes/DisputesScreen';
import { BulkEditItemsScreen } from '../screens/listing/BulkEditItemsScreen';
import { ConversationsScreen } from '../screens/messages/ConversationsScreen';
import { RentalHistoryScreen } from '../screens/rentals/RentalHistoryScreen';
import { SavedSearchesScreen } from '../screens/search/saved/SavedSearchesScreen';
import { useAuthStore } from '../store/authStore';
import { RootStackParamList } from '../types/navigation';
import { AuthNavigator } from './AuthNavigator';
import { MainTabNavigator } from './MainTabNavigator';

const Stack = createStackNavigator<RootStackParamList>();

export const AppNavigator = () => {
  const { isSignedIn, getToken } = useAuth();
  const setToken = useAuthStore((s) => s.setToken);

  useEffect(() => {
    const syncToken = async () => {
      if (isSignedIn) {
        try {
          const token = await getToken();
          setToken(token);
          useAuthStore.setState({ isAuthenticated: true });
        } catch (e) {
          console.error("Failed to get Clerk token", e);
        }
      } else {
        setToken(null);
        useAuthStore.setState({ isAuthenticated: false });
      }
    };
    syncToken();
  }, [isSignedIn, getToken, setToken]);

  return (
    <NavigationContainer>
      <SidebarMenu />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isSignedIn ? (
          <>
            <Stack.Screen name="Main" component={MainTabNavigator} />
            <Stack.Screen name="RentalHistory" component={RentalHistoryScreen} />
            <Stack.Screen name="MyConversations" component={ConversationsScreen} />
            <Stack.Screen name="Disputes" component={DisputesScreen} />
            <Stack.Screen name="SavedSearches" component={SavedSearchesScreen} />
            <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
            <Stack.Screen name="AdminModeration" component={AdminModerationScreen} />
            <Stack.Screen name="AdminDisputes" component={AdminDisputesScreen} />
            <Stack.Screen name="AdminUserReports" component={AdminUserReportsScreen} />
            <Stack.Screen name="AdminFraudReports" component={AdminFraudReportsScreen} />
            <Stack.Screen name="AdminListingReports" component={AdminListingReportsScreen} />
            <Stack.Screen name="BulkEditItems" component={BulkEditItemsScreen} />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
