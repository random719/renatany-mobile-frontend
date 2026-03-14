import { useAuth } from '@clerk/expo';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import React, { useEffect } from 'react';
import { SidebarMenu } from '../components/common/SidebarMenu';
import { AdminDashboardScreen } from '../screens/admin/AdminDashboardScreen';
import { AdminDisputesScreen } from '../screens/admin/AdminDisputesScreen';
import { AdminFraudReportsScreen } from '../screens/admin/AdminFraudReportsScreen';
import { AdminListingReportsScreen } from '../screens/admin/AdminListingReportsScreen';
import { AdminModerationScreen } from '../screens/admin/AdminModerationScreen';
import { AdminUserReportsScreen } from '../screens/admin/AdminUserReportsScreen';
import { BookingConfirmScreen } from '../screens/booking/BookingConfirmScreen';
import { BookingScreen } from '../screens/booking/BookingScreen';
import { BookingSuccessScreen } from '../screens/booking/BookingSuccessScreen';
import { ChatScreen } from '../screens/chat/ChatScreen';
import { DisputeDetailScreen } from '../screens/disputes/DisputeDetailScreen';
import { DisputesScreen } from '../screens/disputes/DisputesScreen';
import { BulkEditItemsScreen } from '../screens/listing/BulkEditItemsScreen';
import { CreateListingScreen } from '../screens/listing/CreateListingScreen';
import { ManageAvailabilityScreen } from '../screens/listing/ManageAvailabilityScreen';
import { ConversationsScreen } from '../screens/messages/ConversationsScreen';
import { NotificationsScreen } from '../screens/notifications/NotificationsScreen';
import { RentalDetailScreen } from '../screens/rentals/RentalDetailScreen';
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
            <Stack.Screen name="RentalDetail" component={RentalDetailScreen} />
            <Stack.Screen name="MyConversations" component={ConversationsScreen} />
            <Stack.Screen name="Disputes" component={DisputesScreen} />
            <Stack.Screen name="DisputeDetail" component={DisputeDetailScreen} />
            <Stack.Screen name="SavedSearches" component={SavedSearchesScreen} />
            <Stack.Screen name="Booking" component={BookingScreen} />
            <Stack.Screen name="BookingConfirm" component={BookingConfirmScreen} />
            <Stack.Screen name="BookingSuccess" component={BookingSuccessScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
            <Stack.Screen name="AdminModeration" component={AdminModerationScreen} />
            <Stack.Screen name="AdminDisputes" component={AdminDisputesScreen} />
            <Stack.Screen name="AdminUserReports" component={AdminUserReportsScreen} />
            <Stack.Screen name="AdminFraudReports" component={AdminFraudReportsScreen} />
            <Stack.Screen name="AdminListingReports" component={AdminListingReportsScreen} />
            <Stack.Screen name="BulkEditItems" component={BulkEditItemsScreen} />
            <Stack.Screen name="CreateListing" component={CreateListingScreen} />
            <Stack.Screen name="EditItem" component={CreateListingScreen} />
            <Stack.Screen name="ManageAvailability" component={ManageAvailabilityScreen} />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
