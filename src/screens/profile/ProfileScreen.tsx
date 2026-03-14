import { useClerk, useUser } from '@clerk/expo';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AppState,
  AppStateStatus,
  FlatList,
  Image,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ActivityIndicator, Button, Surface, Text } from 'react-native-paper';
import { GlobalHeader } from '../../components/common/GlobalHeader';
import { Footer } from '../../components/home/Footer';
import { ListingCard } from '../../components/listing/ListingCard';
import { api } from '../../services/api';
import * as rentalService from '../../services/rentalService';
import * as disputeService from '../../services/disputeService';
import { useAuthStore } from '../../store/authStore';
import { useListingStore } from '../../store/listingStore';
import { RentalRequest, Dispute } from '../../types/models';

interface BackendUser {
  id: string;
  clerk_id?: string;
  email: string;
  username?: string;
  full_name?: string;
  profile_picture?: string;
  bio?: string;
  role?: string;
  created_at?: string;
  preferred_language?: string;
  notification_preferences?: Record<string, boolean>;
  documents?: string[];
  stripe_payment_method_id?: string;
  stripe_account_id?: string;
  payouts_enabled?: boolean;
}

interface WalletData {
  totalEarnings: number;
  completedTransactions: { id: string; item_title: string; item_image?: string; amount: number; rental_start?: string; rental_end?: string; rental_days?: number; date: string }[];
  heldTransactions: { id: string; item_title: string; item_image?: string; amount: number; rental_start?: string; rental_end?: string; rental_days?: number }[];
}

interface Payout {
  id: string;
  user_email: string;
  amount: number;
  status: string;
  created_date: string;
}

type TabKey = 'items' | 'wallet' | 'reviews' | 'rentals' | 'disputes' | 'documents' | 'settings';
type RentalSubTab = 'all' | 'renter' | 'owner' | 'upcoming';
type WalletSubTab = 'completed' | 'held' | 'payouts';

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'it', label: 'Italiano' },
  { value: 'pl', label: 'Polski' },
];

const NOTIFICATION_OPTIONS = [
  { key: 'rental_requests', label: 'Rental Requests', desc: 'New rental requests and approvals' },
  { key: 'messages', label: 'Messages', desc: 'New messages in conversations' },
  { key: 'payment_updates', label: 'Payment Updates', desc: 'Payment confirmations and payouts' },
  { key: 'transaction_completed', label: 'Transaction Completed', desc: 'When a rental transaction is completed' },
  { key: 'payout_initiated', label: 'Payout Initiated', desc: 'When a payout is initiated to your bank' },
  { key: 'reviews', label: 'Reviews', desc: 'New reviews and ratings' },
  { key: 'promotions', label: 'Promotions', desc: 'Deals, tips, and updates' },
];

export const ProfileScreen = () => {
  const { user: clerkUser } = useUser();
  const { signOut } = useClerk();
  const { logout } = useAuthStore();
  const navigation = useNavigation<any>();
  const { userItems, fetchUserItems, isLoading: itemsLoading, toggleLike } = useListingStore();

  const [backendUser, setBackendUser] = useState<BackendUser | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [rentals, setRentals] = useState<RentalRequest[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('items');
  const [rentalSubTab, setRentalSubTab] = useState<RentalSubTab>('all');
  const [walletSubTab, setWalletSubTab] = useState<WalletSubTab>('completed');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Settings form state
  const [settingsForm, setSettingsForm] = useState({
    full_name: '',
    bio: '',
    preferred_language: 'en',
    notification_preferences: {
      email_notifications: true,
      push_notifications: true,
      rental_requests: true,
      messages: true,
      payment_updates: true,
      reviews: true,
      promotions: true,
      transaction_completed: true,
      payout_initiated: true,
    } as Record<string, boolean>,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const userEmail = clerkUser?.emailAddresses?.[0]?.emailAddress;

  const loadProfile = useCallback(async () => {
    if (!clerkUser) return;
    try {
      // Fetch backend user profile
      const userRes = await api.get('/users/me');
      const userData = userRes.data.data || userRes.data;
      setBackendUser(userData);
    } catch {
      // Fall back to Clerk data only
    }
  }, [clerkUser]);

  const loadItems = useCallback(() => {
    if (clerkUser?.id) {
      fetchUserItems(clerkUser.id);
    }
  }, [clerkUser?.id, fetchUserItems]);

  const loadReviews = useCallback(async () => {
    if (!backendUser?.id) return;
    try {
      const res = await api.get('/reviews', { params: { user_id: backendUser.id } });
      setReviews(res.data.data || []);
    } catch {
      setReviews([]);
    }
  }, [backendUser?.id]);

  const loadRentals = useCallback(async () => {
    if (!userEmail) return;
    try {
      const data = await rentalService.getRentalRequests({ renter_email: userEmail, sort: '-created_date' });
      // Also fetch as owner
      const ownerData = await rentalService.getRentalRequests({ owner_email: userEmail, sort: '-created_date' });
      // Merge and deduplicate
      const all = [...data, ...ownerData];
      const unique = all.filter((r, i, self) => self.findIndex((s) => s.id === r.id) === i);
      unique.sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime());
      setRentals(unique);
    } catch {
      setRentals([]);
    }
  }, [userEmail]);

  const loadDisputes = useCallback(async () => {
    if (!userEmail) return;
    try {
      const filedBy = await disputeService.getDisputes({ filed_by_email: userEmail });
      const againstMe = await disputeService.getDisputes({ against_email: userEmail });
      const all = [...(filedBy || []), ...(againstMe || [])];
      const unique = all.filter((d, i, self) => self.findIndex((s) => s.id === d.id) === i);
      unique.sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime());
      setDisputes(unique);
    } catch {
      setDisputes([]);
    }
  }, [userEmail]);

  const loadWallet = useCallback(async () => {
    try {
      const res = await api.get('/wallet');
      setWalletData(res.data.data || res.data);
    } catch {
      setWalletData(null);
    }
    // Also fetch payouts
    try {
      const payoutRes = await api.get('/payouts');
      const allPayouts: Payout[] = payoutRes.data.data || payoutRes.data || [];
      const userPayouts = userEmail
        ? allPayouts.filter((p) => p.user_email === userEmail)
        : allPayouts;
      setPayouts(userPayouts);
    } catch {
      setPayouts([]);
    }
  }, [userEmail]);

  const loadAllData = useCallback(async () => {
    setIsLoading(true);
    await loadProfile();
    loadItems();
    setIsLoading(false);
  }, [loadProfile, loadItems]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Load tab-specific data when tab changes
  useEffect(() => {
    if (activeTab === 'reviews') loadReviews();
    if (activeTab === 'rentals') loadRentals();
    if (activeTab === 'disputes') loadDisputes();
    if (activeTab === 'wallet') loadWallet();
    if (activeTab === 'settings' && backendUser) {
      setSettingsForm({
        full_name: backendUser.full_name || '',
        bio: backendUser.bio || '',
        preferred_language: backendUser.preferred_language || 'en',
        notification_preferences: {
          email_notifications: true,
          push_notifications: true,
          rental_requests: true,
          messages: true,
          payment_updates: true,
          reviews: true,
          promotions: true,
          transaction_completed: true,
          payout_initiated: true,
          ...(backendUser.notification_preferences || {}),
        },
      });
    }
  }, [activeTab, loadReviews, loadRentals, loadDisputes, loadWallet, backendUser]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProfile();
    loadItems();
    if (activeTab === 'reviews') await loadReviews();
    if (activeTab === 'rentals') await loadRentals();
    if (activeTab === 'disputes') await loadDisputes();
    if (activeTab === 'wallet') await loadWallet();
    setRefreshing(false);
  }, [loadProfile, loadItems, loadReviews, loadRentals, loadDisputes, loadWallet, activeTab]);

  const stats = useMemo(() => {
    const totalItems = userItems.length;
    const availableItems = userItems.filter((item) => item.isActive || item.availability).length;
    const avgRating =
      userItems.length > 0
        ? userItems.reduce((sum, item) => sum + (item.rating || 0), 0) / userItems.length
        : 0;
    const totalReviews = reviews.length || userItems.reduce((sum, item) => sum + (item.totalReviews || 0), 0);
    return { totalItems, availableItems, avgRating, totalReviews };
  }, [userItems, reviews]);

  // Rental sub-tab computed data
  const asRenter = useMemo(() => rentals.filter((r) => r.renter_email === userEmail), [rentals, userEmail]);
  const asOwner = useMemo(() => rentals.filter((r) => r.owner_email === userEmail), [rentals, userEmail]);
  const upcomingRentals = useMemo(
    () => rentals.filter((r) => r.status === 'paid' && r.start_date && new Date(r.start_date) > new Date()),
    [rentals]
  );
  const activeRentals = useMemo(
    () => rentals.filter((r) => r.status === 'paid' && r.start_date && new Date(r.start_date) <= new Date()),
    [rentals]
  );
  const completedRentals = useMemo(() => rentals.filter((r) => r.status === 'completed'), [rentals]);

  const filteredRentals = useMemo(() => {
    switch (rentalSubTab) {
      case 'renter': return asRenter;
      case 'owner': return asOwner;
      case 'upcoming': return upcomingRentals;
      default: return rentals;
    }
  }, [rentalSubTab, rentals, asRenter, asOwner, upcomingRentals]);

  // Dispute summary counts
  const disputeCounts = useMemo(() => ({
    open: disputes.filter((d) => d.status === 'open').length,
    under_review: disputes.filter((d) => d.status === 'under_review').length,
    resolved: disputes.filter((d) => d.status === 'resolved').length,
    total: disputes.length,
  }), [disputes]);

  // Wallet computed
  const availableForPayout = useMemo(() => {
    if (!walletData) return 0;
    const payoutTotal = payouts.reduce(
      (sum, p) => (['pending', 'in_transit', 'paid'].includes(p.status) ? sum + p.amount : sum),
      0
    );
    return Math.max(0, walletData.totalEarnings - payoutTotal);
  }, [walletData, payouts]);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (e) {
      console.log('Clerk sign out failed:', e);
    } finally {
      logout();
    }
  };

  const displayName = backendUser?.full_name || clerkUser?.fullName || '';
  const displayUsername =
    backendUser?.username ||
    clerkUser?.username ||
    (userEmail ? userEmail.split('@')[0] : 'guest');
  const avatarUrl = backendUser?.profile_picture || clerkUser?.imageUrl;

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const res = await api.put('/users/me', {
        full_name: settingsForm.full_name,
        bio: settingsForm.bio,
        preferred_language: settingsForm.preferred_language,
        notification_preferences: settingsForm.notification_preferences,
      });
      const updatedUser = res.data?.data || res.data;
      setBackendUser(updatedUser);
      setSaveMessage({ type: 'success', text: 'Settings saved successfully!' });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch {
      setSaveMessage({ type: 'error', text: 'Failed to save settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  const [isUploading, setIsUploading] = useState(false);

  const handleDocumentUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/jpeg', 'image/png', 'image/jpg'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const file = result.assets[0];

      // Check file size (50MB max per backend)
      if (file.size && file.size > 50 * 1024 * 1024) {
        Alert.alert('File Too Large', 'Maximum file size is 50MB.');
        return;
      }

      setIsUploading(true);

      // Use fetch for multipart upload (more reliable than axios in RN)
      const uploadBody = new FormData();
      uploadBody.append('file', {
        uri: file.uri,
        name: file.name || 'document.jpg',
        type: file.mimeType || 'image/jpeg',
      } as any);

      const token = useAuthStore.getState().token;
      const baseUrl = api.defaults.baseURL || '';
      console.log('Uploading to:', `${baseUrl}/file/upload`, 'URI:', file.uri);
      const fetchRes = await fetch(`${baseUrl}/file/upload`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: uploadBody,
      });

      if (!fetchRes.ok) {
        const errorText = await fetchRes.text().catch(() => '');
        console.error('Upload server response:', fetchRes.status, errorText);
        let errorMsg = `Upload failed with status ${fetchRes.status}`;
        try {
          const errorData = JSON.parse(errorText);
          errorMsg = errorData.error || errorData.message || errorMsg;
        } catch {}
        throw new Error(errorMsg);
      }

      const uploadRes = await fetchRes.json();
      const uploadData = uploadRes.data || uploadRes;

      // Backend documents field is [String] — store URLs only
      const fileUrl = uploadData.file_url;
      const currentDocs = backendUser?.documents || [];
      await api.put('/users/me', { documents: [...currentDocs, fileUrl] });
      await loadProfile();

      Alert.alert('Success', 'Document uploaded successfully.');
    } catch (err: any) {
      console.error('Document upload failed:', err);
      Alert.alert('Upload Failed', err?.message || 'Could not upload document. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!backendUser) return;
    Alert.alert('Delete Document', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const idx = parseInt(docId, 10);
            const updated = (backendUser.documents || []).filter((_, i) => i !== idx);
            await api.put('/users/me', { documents: updated });
            await loadProfile();
          } catch {
            Alert.alert('Error', 'Failed to delete document.');
          }
        },
      },
    ]);
  };

  const TABS: { key: TabKey; label: string; icon: string }[] = [
    { key: 'items', label: 'Items', icon: 'package-variant-closed' },
    { key: 'wallet', label: 'Wallet', icon: 'wallet-outline' },
    { key: 'reviews', label: 'Reviews', icon: 'star-outline' },
    { key: 'rentals', label: 'Rentals', icon: 'calendar-outline' },
    { key: 'disputes', label: 'Disputes', icon: 'alert-outline' },
    { key: 'documents', label: 'Docs', icon: 'file-document-outline' },
    { key: 'settings', label: 'Settings', icon: 'cog-outline' },
  ];

  const API_BASE = (process.env.EXPO_PUBLIC_API_URL || 'http://172.28.145.1:5000/api').replace(/\/api$/, '');

  const refreshPaymentStatus = async () => {
    try {
      await api.post('/stripe/payment-method/retrieve').catch(() => {});
      await api.get('/stripe/connect/status').catch(() => {});
      const res = await api.get('/users/me');
      setBackendUser(res.data?.data || res.data);
    } catch (_) {}
  };

  const handleAddPayment = async () => {
    try {
      const res = await api.post('/stripe/payment-method/setup', {
        mobile_success_url: `${API_BASE}/api/stripe/app-return/profile`,
      });
      const url = res.data?.data?.url || res.data?.url;
      if (!url) return;
      let wentBackground = false;
      const sub = AppState.addEventListener('change', async (state: AppStateStatus) => {
        if (state === 'background') wentBackground = true;
        if (state === 'active' && wentBackground) {
          sub.remove();
          await refreshPaymentStatus();
        }
      });
      await Linking.openURL(url);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to start card setup.');
    }
  };

  const handleConnectBank = async () => {
    try {
      const mobileReturnUrl = `${API_BASE}/api/stripe/app-return/stripe/confirm`;
      const res = await api.post('/stripe/connect/onboarding', {
        origin: API_BASE,
        return_path: '/profile',
        mobile_return_url: mobileReturnUrl,
      });
      const url = res.data?.data?.url || res.data?.url;
      if (!url) return;
      let wentBackground = false;
      const sub = AppState.addEventListener('change', async (state: AppStateStatus) => {
        if (state === 'background') wentBackground = true;
        if (state === 'active' && wentBackground) {
          sub.remove();
          await refreshPaymentStatus();
        }
      });
      await Linking.openURL(url);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to start bank setup.');
    }
  };

  if (isLoading && !refreshing) {
    return (
      <View style={styles.mainContainer}>
        <GlobalHeader />
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" />
          <Text style={styles.loaderText}>Loading your profile...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      <GlobalHeader />
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        <View style={styles.contentWrapper}>
          {/* Profile Card */}
          <Surface style={styles.profileCard} elevation={0}>
            <View style={styles.profileHeaderBg} />

            <View style={styles.avatarContainer}>
              <View style={styles.avatarWrapper}>
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <MaterialCommunityIcons name="account" size={48} color="#FFFFFF" />
                  </View>
                )}
              </View>
            </View>

            <View style={styles.userInfoContainer}>
              {displayName ? <Text style={styles.nameText}>{displayName}</Text> : null}
              <Text style={styles.handleText}>@{displayUsername}</Text>

              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statNumber}>{stats.totalItems}</Text>
                  <Text style={styles.statLabel}>Items</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={[styles.statNumber, { color: '#16A34A' }]}>{stats.availableItems}</Text>
                  <Text style={styles.statLabel}>Available</Text>
                </View>
                <View style={styles.statBox}>
                  <View style={styles.ratingRow}>
                    <Text style={[styles.statNumber, { color: '#F59E0B' }]}>{stats.avgRating.toFixed(1)}</Text>
                    <MaterialCommunityIcons name="star" size={16} color="#F59E0B" style={styles.starIcon} />
                  </View>
                  <Text style={styles.statLabel}>({stats.totalReviews} reviews)</Text>
                </View>
              </View>

              <Button
                mode="contained"
                style={styles.listNewBtn}
                labelStyle={styles.listNewBtnLabel}
                onPress={() => navigation.navigate('Main', { screen: 'ListItemTab' })}
              >
                List New Item
              </Button>

              <Button
                mode="outlined"
                icon="logout"
                style={styles.signOutBtn}
                labelStyle={styles.signOutBtnLabel}
                onPress={handleSignOut}
              >
                Sign Out
              </Button>
            </View>
          </Surface>

          {/* Payment Setup Card */}
          <Surface style={styles.card} elevation={0}>
            <Text style={styles.cardTitle}>Payment setup</Text>

            {/* Card status */}
            <View style={styles.badgeRow}>
              {backendUser?.stripe_payment_method_id ? (
                <View style={styles.badgeSuccess}>
                  <MaterialCommunityIcons name="check-circle-outline" size={16} color="#16A34A" />
                  <Text style={styles.badgeSuccessText}>Card connected</Text>
                </View>
              ) : (
                <View style={styles.badgeError}>
                  <MaterialCommunityIcons name="close-circle-outline" size={16} color="#DC2626" />
                  <Text style={styles.badgeErrorText}>Card not connected</Text>
                </View>
              )}
            </View>

            {/* Bank status */}
            <View style={styles.badgeRow}>
              {backendUser?.stripe_account_id ? (
                <View style={styles.badgeSuccess}>
                  <MaterialCommunityIcons name="check-circle-outline" size={16} color="#16A34A" />
                  <Text style={styles.badgeSuccessText}>Bank connected</Text>
                </View>
              ) : (
                <View style={styles.badgeError}>
                  <MaterialCommunityIcons name="close-circle-outline" size={16} color="#DC2626" />
                  <Text style={styles.badgeErrorText}>Bank not connected</Text>
                </View>
              )}
            </View>

            {!backendUser?.stripe_payment_method_id && (
              <>
                <Button
                  mode="contained"
                  icon="credit-card-outline"
                  style={styles.addPaymentBtn}
                  labelStyle={styles.addPaymentBtnLabel}
                  onPress={handleAddPayment}
                >
                  Add payment method
                </Button>
                <Text style={styles.helperText}>Required to rent items</Text>
              </>
            )}

            {!backendUser?.stripe_account_id && (
              <>
                <Button
                  mode="contained"
                  icon="bank-outline"
                  style={styles.connectBankBtn}
                  labelStyle={styles.connectBankBtnLabel}
                  onPress={handleConnectBank}
                >
                  Connect bank account
                </Button>
                <Text style={styles.helperText}>Required to receive payouts</Text>
              </>
            )}
          </Surface>

          {/* Tabs Grid */}
          <Surface style={styles.tabBarSurface} elevation={1}>
            <View style={styles.tabGrid}>
              {TABS.map((tab) => (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.tabGridItem, activeTab === tab.key && styles.tabGridItemActive]}
                  onPress={() => setActiveTab(tab.key)}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name={tab.icon as any}
                    size={22}
                    color={activeTab === tab.key ? '#0F172A' : '#94A3B8'}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </Surface>

          {/* Tab Content */}
          {activeTab === 'items' && (
            <View style={styles.tabContent}>
              {itemsLoading ? (
                <ActivityIndicator style={styles.tabLoader} />
              ) : userItems.length > 0 ? (
                <View style={styles.itemsGrid}>
                  {userItems.map((item) => (
                    <View key={item.id} style={styles.itemCardWrapper}>
                      <ListingCard
                        listing={item}
                        onPress={() =>
                          navigation.navigate('Main', {
                            screen: 'HomeTab',
                            params: { screen: 'ListingDetail', params: { listingId: item.id } },
                          })
                        }
                        onToggleLike={() => toggleLike(item.id, userEmail)}
                      />
                    </View>
                  ))}
                </View>
              ) : (
                <Surface style={styles.emptyCard} elevation={0}>
                  <MaterialCommunityIcons name="package-variant-closed" size={48} color="#94A3B8" />
                  <Text style={styles.emptyTitle}>No items listed yet</Text>
                  <Text style={styles.emptySubtitle}>Start earning by listing your first item</Text>
                  <Button
                    mode="contained"
                    style={styles.emptyBtn}
                    onPress={() => navigation.navigate('Main', { screen: 'ListItemTab' })}
                  >
                    List Your First Item
                  </Button>
                </Surface>
              )}
            </View>
          )}

          {activeTab === 'reviews' && (
            <View style={styles.tabContent}>
              {reviews.length > 0 ? (
                reviews.map((review) => (
                  <Surface key={review.id} style={styles.reviewCard} elevation={0}>
                    <View style={styles.reviewHeader}>
                      <View style={styles.reviewStars}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <MaterialCommunityIcons
                            key={star}
                            name={star <= review.rating ? 'star' : 'star-outline'}
                            size={16}
                            color="#F59E0B"
                          />
                        ))}
                      </View>
                      <Text style={styles.reviewDate}>
                        {new Date(review.created_date).toLocaleDateString()}
                      </Text>
                    </View>
                    <Text style={styles.reviewComment}>{review.comment}</Text>
                    <Text style={styles.reviewAuthor}>by {review.reviewer_email}</Text>
                  </Surface>
                ))
              ) : (
                <Surface style={styles.emptyCard} elevation={0}>
                  <MaterialCommunityIcons name="star-outline" size={48} color="#94A3B8" />
                  <Text style={styles.emptyTitle}>No reviews yet</Text>
                  <Text style={styles.emptySubtitle}>Complete rentals to receive reviews</Text>
                </Surface>
              )}
            </View>
          )}

          {activeTab === 'rentals' && (
            <View style={styles.tabContent}>
              {/* Summary Cards */}
              <View style={styles.summaryGrid}>
                <Surface style={[styles.summaryCard, { backgroundColor: '#EFF6FF' }]} elevation={0}>
                  <Text style={[styles.summaryNumber, { color: '#1E3A8A' }]}>{activeRentals.length}</Text>
                  <Text style={[styles.summaryLabel, { color: '#2563EB' }]}>Active</Text>
                </Surface>
                <Surface style={[styles.summaryCard, { backgroundColor: '#F5F3FF' }]} elevation={0}>
                  <Text style={[styles.summaryNumber, { color: '#581C87' }]}>{upcomingRentals.length}</Text>
                  <Text style={[styles.summaryLabel, { color: '#7C3AED' }]}>Upcoming</Text>
                </Surface>
                <Surface style={[styles.summaryCard, { backgroundColor: '#F0FDF4' }]} elevation={0}>
                  <Text style={[styles.summaryNumber, { color: '#14532D' }]}>{completedRentals.length}</Text>
                  <Text style={[styles.summaryLabel, { color: '#16A34A' }]}>Completed</Text>
                </Surface>
                <Surface style={[styles.summaryCard, { backgroundColor: '#F8FAFC' }]} elevation={0}>
                  <Text style={[styles.summaryNumber, { color: '#0F172A' }]}>{rentals.length}</Text>
                  <Text style={[styles.summaryLabel, { color: '#64748B' }]}>Total</Text>
                </Surface>
              </View>

              {/* Sub-tabs */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subTabBar} contentContainerStyle={styles.subTabBarContent}>
                {([
                  { key: 'all' as RentalSubTab, label: `All (${rentals.length})` },
                  { key: 'renter' as RentalSubTab, label: `As Renter (${asRenter.length})` },
                  { key: 'owner' as RentalSubTab, label: `As Owner (${asOwner.length})` },
                  { key: 'upcoming' as RentalSubTab, label: `Upcoming (${upcomingRentals.length})` },
                ]).map((tab) => (
                  <TouchableOpacity
                    key={tab.key}
                    style={[styles.subTabItem, rentalSubTab === tab.key && styles.subTabItemActive]}
                    onPress={() => setRentalSubTab(tab.key)}
                  >
                    <Text style={[styles.subTabLabel, rentalSubTab === tab.key && styles.subTabLabelActive]}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {filteredRentals.length > 0 ? (
                filteredRentals.map((rental) => {
                  const role = rental.renter_email === userEmail ? 'renter' : 'owner';
                  const rentalCost = rental.total_amount || 0;
                  const platformFee = typeof rental.platform_fee === 'number' ? rental.platform_fee : rentalCost * 0.15;
                  const securityDeposit = typeof rental.security_deposit === 'number' ? rental.security_deposit : 0;
                  const totalPaid = typeof rental.total_paid === 'number' ? rental.total_paid : rentalCost + platformFee + securityDeposit;
                  return (
                    <Surface key={rental.id} style={styles.rentalCard} elevation={0}>
                      <View style={styles.rentalHeader}>
                        <View style={{ flex: 1 }}>
                          <View style={[styles.roleBadge, role === 'renter' ? styles.roleBadgeRenter : styles.roleBadgeOwner]}>
                            <Text style={styles.roleBadgeText}>
                              {role === 'renter' ? 'You rented' : 'You rented out'}
                            </Text>
                          </View>
                        </View>
                        <View
                          style={[
                            styles.statusBadge,
                            rental.status === 'completed' && styles.statusCompleted,
                            rental.status === 'approved' && styles.statusApproved,
                            rental.status === 'paid' && styles.statusApproved,
                            rental.status === 'pending' && styles.statusPending,
                            rental.status === 'rejected' && styles.statusRejected,
                            rental.status === 'cancelled' && styles.statusRejected,
                          ]}
                        >
                          <Text style={styles.statusText}>{rental.status}</Text>
                        </View>
                      </View>
                      {rental.start_date && rental.end_date && (
                        <View style={styles.rentalInfoRow}>
                          <MaterialCommunityIcons name="calendar-outline" size={14} color="#64748B" />
                          <Text style={styles.rentalDates}>
                            {new Date(rental.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} -{' '}
                            {new Date(rental.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </Text>
                        </View>
                      )}
                      <View style={styles.rentalInfoRow}>
                        <MaterialCommunityIcons name="currency-usd" size={14} color="#64748B" />
                        <Text style={styles.rentalAmountBold}>${totalPaid.toFixed(2)}</Text>
                      </View>
                      <Text style={styles.rentalBreakdown}>
                        Rental ${rentalCost.toFixed(2)} · Fee ${platformFee.toFixed(2)} · Deposit ${securityDeposit.toFixed(2)}
                      </Text>
                      <View style={styles.rentalInfoRow}>
                        <MaterialCommunityIcons name="clock-outline" size={14} color="#94A3B8" />
                        <Text style={styles.reviewDate}>
                          Created {new Date(rental.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </Text>
                      </View>
                    </Surface>
                  );
                })
              ) : (
                <Surface style={styles.emptyCard} elevation={0}>
                  <MaterialCommunityIcons name="calendar-outline" size={48} color="#94A3B8" />
                  <Text style={styles.emptyTitle}>No rental history</Text>
                  <Text style={styles.emptySubtitle}>Your rental activity will appear here</Text>
                </Surface>
              )}
            </View>
          )}

          {activeTab === 'disputes' && (
            <View style={styles.tabContent}>
              {/* Summary Cards */}
              <View style={styles.summaryGrid}>
                <Surface style={[styles.summaryCard, { backgroundColor: '#FEF2F2' }]} elevation={0}>
                  <Text style={[styles.summaryNumber, { color: '#DC2626' }]}>{disputeCounts.open}</Text>
                  <Text style={[styles.summaryLabel, { color: '#64748B' }]}>Open</Text>
                </Surface>
                <Surface style={[styles.summaryCard, { backgroundColor: '#FEF3C7' }]} elevation={0}>
                  <Text style={[styles.summaryNumber, { color: '#D97706' }]}>{disputeCounts.under_review}</Text>
                  <Text style={[styles.summaryLabel, { color: '#64748B' }]}>Under Review</Text>
                </Surface>
                <Surface style={[styles.summaryCard, { backgroundColor: '#F0FDF4' }]} elevation={0}>
                  <Text style={[styles.summaryNumber, { color: '#16A34A' }]}>{disputeCounts.resolved}</Text>
                  <Text style={[styles.summaryLabel, { color: '#64748B' }]}>Resolved</Text>
                </Surface>
                <Surface style={[styles.summaryCard, { backgroundColor: '#F8FAFC' }]} elevation={0}>
                  <Text style={[styles.summaryNumber, { color: '#0F172A' }]}>{disputeCounts.total}</Text>
                  <Text style={[styles.summaryLabel, { color: '#64748B' }]}>Total</Text>
                </Surface>
              </View>

              {disputes.length > 0 ? (
                disputes.map((dispute) => {
                  const isFiled = dispute.filed_by_email === userEmail;
                  return (
                    <Surface key={dispute.id} style={styles.rentalCard} elevation={0}>
                      <View style={styles.rentalHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                          <MaterialCommunityIcons name="alert-circle" size={20} color="#DC2626" />
                          <Text style={styles.disputeFiledText}>
                            {isFiled ? 'Filed by you' : 'Filed against you'}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                          <View
                            style={[
                              styles.statusBadge,
                              dispute.status === 'resolved' && styles.statusCompleted,
                              dispute.status === 'open' && { backgroundColor: '#FEE2E2' },
                              dispute.status === 'under_review' && styles.statusPending,
                              dispute.status === 'closed' && styles.statusRejected,
                            ]}
                          >
                            <Text style={styles.statusText}>{dispute.status.replace('_', ' ')}</Text>
                          </View>
                          {dispute.decision && (
                            <View
                              style={[
                                styles.statusBadge,
                                dispute.decision === 'favor_renter' && styles.statusCompleted,
                                dispute.decision === 'favor_owner' && styles.statusApproved,
                                dispute.decision === 'split' && { backgroundColor: '#F3E8FF' },
                              ]}
                            >
                              <Text style={styles.statusText}>{dispute.decision.replace('_', ' ')}</Text>
                            </View>
                          )}
                        </View>
                      </View>

                      {/* Reason box */}
                      <View style={styles.disputeReasonBox}>
                        <Text style={styles.disputeReasonTitle}>Reason: {dispute.reason.replace(/_/g, ' ')}</Text>
                        <Text numberOfLines={2} style={styles.disputeReasonDesc}>{dispute.description}</Text>
                      </View>

                      {/* Resolution */}
                      {dispute.resolution && (
                        <View style={styles.disputeResolutionBox}>
                          <Text style={styles.disputeResolutionTitle}>Resolution:</Text>
                          <Text numberOfLines={2} style={styles.disputeResolutionDesc}>{dispute.resolution}</Text>
                        </View>
                      )}

                      <Text style={styles.reviewDate}>
                        Filed {new Date(dispute.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </Text>
                    </Surface>
                  );
                })
              ) : (
                <Surface style={styles.emptyCard} elevation={0}>
                  <MaterialCommunityIcons name="alert-outline" size={48} color="#94A3B8" />
                  <Text style={styles.emptyTitle}>No disputes</Text>
                  <Text style={styles.emptySubtitle}>You haven't been involved in any disputes</Text>
                </Surface>
              )}
            </View>
          )}

          {/* Wallet Tab */}
          {activeTab === 'wallet' && (
            <View style={styles.tabContent}>
              {/* Balance Cards */}
              <View style={styles.walletBalanceRow}>
                <Surface style={[styles.walletBalanceCard, { backgroundColor: '#F0FDF4' }]} elevation={0}>
                  <View style={styles.walletBalanceInner}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.walletBalanceLabel, { color: '#16A34A' }]}>Available for Payout</Text>
                      <Text style={[styles.walletBalanceBig, { color: '#15803D' }]}>
                        ${availableForPayout.toFixed(2)}
                      </Text>
                      <Text style={[styles.walletBalanceSub, { color: '#16A34A' }]}>Ready to withdraw</Text>
                    </View>
                    <View style={[styles.walletBalanceIcon, { backgroundColor: '#DCFCE7' }]}>
                      <MaterialCommunityIcons name="cash-multiple" size={24} color="#16A34A" />
                    </View>
                  </View>
                </Surface>
                <Surface style={[styles.walletBalanceCard, { backgroundColor: '#EFF6FF' }]} elevation={0}>
                  <View style={styles.walletBalanceInner}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.walletBalanceLabel, { color: '#2563EB' }]}>Lifetime Earnings</Text>
                      <Text style={[styles.walletBalanceBig, { color: '#1D4ED8' }]}>
                        ${walletData?.totalEarnings?.toFixed(2) || '0.00'}
                      </Text>
                      <Text style={[styles.walletBalanceSub, { color: '#2563EB' }]}>After 15% platform fee</Text>
                    </View>
                    <View style={[styles.walletBalanceIcon, { backgroundColor: '#DBEAFE' }]}>
                      <MaterialCommunityIcons name="trending-up" size={24} color="#2563EB" />
                    </View>
                  </View>
                </Surface>
              </View>

              {/* Earnings Details Sub-tabs */}
              <Surface style={styles.walletDetailsCard} elevation={0}>
                <Text style={styles.walletDetailsTitle}>Earnings Details</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subTabBar} contentContainerStyle={styles.subTabBarContent}>
                  {([
                    { key: 'completed' as WalletSubTab, label: `Completed (${walletData?.completedTransactions?.length || 0})` },
                    { key: 'held' as WalletSubTab, label: `Held (${walletData?.heldTransactions?.length || 0})` },
                    { key: 'payouts' as WalletSubTab, label: `Payouts (${payouts.length})` },
                  ]).map((tab) => (
                    <TouchableOpacity
                      key={tab.key}
                      style={[styles.subTabItem, walletSubTab === tab.key && styles.subTabItemActive]}
                      onPress={() => setWalletSubTab(tab.key)}
                    >
                      <Text style={[styles.subTabLabel, walletSubTab === tab.key && styles.subTabLabelActive]}>
                        {tab.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Completed */}
                {walletSubTab === 'completed' && (
                  <>
                    {walletData?.completedTransactions && walletData.completedTransactions.length > 0 ? (
                      walletData.completedTransactions.map((tx) => (
                        <View key={tx.id} style={[styles.walletTxRow, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.walletTxTitle} numberOfLines={1}>{tx.item_title}</Text>
                            {tx.rental_start && tx.rental_end && (
                              <Text style={styles.walletTxMeta}>
                                {new Date(tx.rental_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} -{' '}
                                {new Date(tx.rental_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                {tx.rental_days ? ` · ${tx.rental_days} day${tx.rental_days === 1 ? '' : 's'}` : ''}
                              </Text>
                            )}
                            <Text style={styles.walletTxDate}>
                              Completed {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </Text>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={[styles.walletTxAmount, { color: '#15803D' }]}>+${tx.amount.toFixed(2)}</Text>
                            <View style={[styles.statusBadge, styles.statusCompleted]}><Text style={styles.statusText}>Earned</Text></View>
                          </View>
                        </View>
                      ))
                    ) : (
                      <View style={styles.walletTxEmpty}>
                        <MaterialCommunityIcons name="package-variant-closed" size={36} color="#94A3B8" />
                        <Text style={styles.walletTxEmptyText}>No completed rentals yet</Text>
                      </View>
                    )}
                  </>
                )}

                {/* Held */}
                {walletSubTab === 'held' && (
                  <>
                    {walletData?.heldTransactions && walletData.heldTransactions.length > 0 ? (
                      walletData.heldTransactions.map((tx) => (
                        <View key={tx.id} style={[styles.walletTxRow, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.walletTxTitle} numberOfLines={1}>{tx.item_title}</Text>
                            {tx.rental_start && tx.rental_end && (
                              <Text style={styles.walletTxMeta}>
                                {new Date(tx.rental_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} -{' '}
                                {new Date(tx.rental_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                {tx.rental_days ? ` · ${tx.rental_days} day${tx.rental_days === 1 ? '' : 's'}` : ''}
                              </Text>
                            )}
                            <Text style={styles.walletTxDate}>Rental in progress</Text>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={[styles.walletTxAmount, { color: '#D97706' }]}>${tx.amount.toFixed(2)}</Text>
                            <View style={[styles.statusBadge, styles.statusPending]}><Text style={styles.statusText}>Held</Text></View>
                          </View>
                        </View>
                      ))
                    ) : (
                      <View style={styles.walletTxEmpty}>
                        <MaterialCommunityIcons name="clock-outline" size={36} color="#94A3B8" />
                        <Text style={styles.walletTxEmptyText}>No active rentals</Text>
                      </View>
                    )}
                  </>
                )}

                {/* Payouts */}
                {walletSubTab === 'payouts' && (
                  <>
                    {payouts.length > 0 ? (
                      payouts.map((payout) => (
                        <View key={payout.id} style={[styles.walletTxRow, { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }]}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.walletTxTitle}>Withdrawal</Text>
                            <Text style={styles.walletTxDate}>
                              {new Date(payout.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </Text>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={[styles.walletTxAmount, { color: '#0F172A' }]}>-${payout.amount.toFixed(2)}</Text>
                            <View style={[styles.statusBadge, { backgroundColor: '#F1F5F9' }]}>
                              <Text style={styles.statusText}>{payout.status}</Text>
                            </View>
                          </View>
                        </View>
                      ))
                    ) : (
                      <View style={styles.walletTxEmpty}>
                        <MaterialCommunityIcons name="cash-multiple" size={36} color="#94A3B8" />
                        <Text style={styles.walletTxEmptyText}>No payouts yet</Text>
                      </View>
                    )}
                  </>
                )}
              </Surface>
            </View>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <View style={styles.tabContent}>
              {/* Document Verification Info */}
              <Surface style={styles.docVerificationCard} elevation={0}>
                <View style={styles.docVerificationRow}>
                  <View style={styles.docVerificationIcon}>
                    <MaterialCommunityIcons name="shield-check-outline" size={24} color="#2563EB" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docVerificationTitle}>Document Verification</Text>
                    <Text style={styles.docVerificationDesc}>
                      Upload documents such as your driver's license or ID for verification purposes. All documents are stored securely and encrypted.
                    </Text>
                  </View>
                </View>
              </Surface>

              <Button
                mode="contained"
                icon={isUploading ? undefined : "upload"}
                style={styles.uploadBtn}
                onPress={handleDocumentUpload}
                disabled={isUploading}
                loading={isUploading}
              >
                {isUploading ? 'Uploading...' : 'Upload Document'}
              </Button>
              <Text style={styles.helperText}>JPG, PNG - Max 50MB</Text>

              {backendUser?.documents && backendUser.documents.length > 0 ? (
                <Surface style={styles.docListCard} elevation={1}>
                  <View style={styles.docListHeader}>
                    <Text style={styles.docListTitle}>My Documents</Text>
                    <View style={styles.docCountBadge}>
                      <Text style={styles.docCountText}>{backendUser.documents.length} files</Text>
                    </View>
                  </View>
                  {backendUser.documents.map((docUrl, index) => {
                    const fileName = typeof docUrl === 'string' ? docUrl.split('/').pop() || 'Document' : 'Document';
                    const isImage = typeof docUrl === 'string' && /\.(jpg|jpeg|png|gif|webp)$/i.test(docUrl);
                    return (
                      <View key={index} style={[styles.docItemRow, index > 0 && styles.docItemBorder]}>
                        {isImage ? (
                          <Image source={{ uri: docUrl }} style={styles.docThumbnail} />
                        ) : (
                          <View style={[styles.docThumbnail, styles.docThumbnailPlaceholder]}>
                            <MaterialCommunityIcons name="file-document-outline" size={20} color="#2563EB" />
                          </View>
                        )}
                        <View style={styles.docItemInfo}>
                          <Text style={styles.docItemName} numberOfLines={1}>{fileName}</Text>
                          <Text style={styles.docItemDate}>Uploaded {new Date().toLocaleDateString()}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.docActionBtn}
                          onPress={() => Linking.openURL(docUrl)}
                        >
                          <MaterialCommunityIcons name="eye-outline" size={18} color="#64748B" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.docActionBtn}
                          onPress={() => handleDeleteDocument(String(index))}
                        >
                          <MaterialCommunityIcons name="trash-can-outline" size={18} color="#DC2626" />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </Surface>
              ) : (
                <Surface style={[styles.emptyCard, { marginTop: 16 }]} elevation={0}>
                  <MaterialCommunityIcons name="file-document-outline" size={48} color="#94A3B8" />
                  <Text style={styles.emptyTitle}>No documents</Text>
                  <Text style={styles.emptySubtitle}>Upload ID or other verification documents</Text>
                </Surface>
              )}
            </View>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <View style={styles.tabContent}>
              {saveMessage && (
                <Surface
                  style={[
                    styles.alertCard,
                    saveMessage.type === 'success' ? styles.alertSuccess : styles.alertError,
                  ]}
                  elevation={0}
                >
                  <MaterialCommunityIcons
                    name={saveMessage.type === 'success' ? 'check-circle-outline' : 'alert-circle-outline'}
                    size={18}
                    color={saveMessage.type === 'success' ? '#16A34A' : '#DC2626'}
                  />
                  <Text
                    style={saveMessage.type === 'success' ? styles.alertSuccessText : styles.alertErrorText}
                  >
                    {saveMessage.text}
                  </Text>
                </Surface>
              )}

              {/* Personal Information */}
              <Surface style={styles.settingsCard} elevation={0}>
                <Text style={styles.settingsSectionTitle}>Personal Information</Text>

                <Text style={styles.settingsLabel}>Full Name</Text>
                <View style={styles.settingsInput}>
                  <TextInput
                    style={styles.settingsTextInput}
                    value={settingsForm.full_name}
                    onChangeText={(t) => setSettingsForm((p) => ({ ...p, full_name: t }))}
                    placeholder="Enter your full name"
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                <Text style={[styles.settingsLabel, { marginTop: 16 }]}>Email</Text>
                <View style={[styles.settingsInput, styles.settingsInputDisabled]}>
                  <TextInput
                    style={[styles.settingsTextInput, { color: '#94A3B8' }]}
                    value={userEmail || ''}
                    editable={false}
                  />
                </View>
                <Text style={styles.settingsHint}>Email cannot be changed</Text>

                <Text style={[styles.settingsLabel, { marginTop: 16 }]}>Username</Text>
                <View style={[styles.settingsInput, styles.settingsInputDisabled]}>
                  <TextInput
                    style={[styles.settingsTextInput, { color: '#94A3B8', fontFamily: 'monospace' }]}
                    value={displayUsername}
                    editable={false}
                  />
                </View>
                <Text style={styles.settingsHint}>Username cannot be changed</Text>

                <Text style={[styles.settingsLabel, { marginTop: 16 }]}>Bio</Text>
                <View style={[styles.settingsInput, { height: 100 }]}>
                  <TextInput
                    style={[styles.settingsTextInput, { height: 90, textAlignVertical: 'top' }]}
                    value={settingsForm.bio}
                    onChangeText={(t) => {
                      if (t.length <= 160) setSettingsForm((p) => ({ ...p, bio: t }));
                    }}
                    placeholder="Tell us about yourself..."
                    placeholderTextColor="#94A3B8"
                    multiline
                    numberOfLines={4}
                    maxLength={160}
                  />
                </View>
                <Text style={styles.settingsHint}>{settingsForm.bio.length}/160 characters</Text>

                <Text style={[styles.settingsLabel, { marginTop: 16 }]}>Preferred Language</Text>
                <View style={styles.languageRow}>
                  {LANGUAGES.map((lang) => (
                    <TouchableOpacity
                      key={lang.value}
                      style={[
                        styles.languageChip,
                        settingsForm.preferred_language === lang.value && styles.languageChipActive,
                      ]}
                      onPress={() => setSettingsForm((p) => ({ ...p, preferred_language: lang.value }))}
                    >
                      <Text
                        style={[
                          styles.languageChipText,
                          settingsForm.preferred_language === lang.value && styles.languageChipTextActive,
                        ]}
                      >
                        {lang.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Surface>

              {/* Push Notifications */}
              <Surface style={[styles.settingsCard, { marginTop: 16 }]} elevation={0}>
                <View style={styles.pushNotifHeader}>
                  <MaterialCommunityIcons name="bell-outline" size={20} color="#0F172A" />
                  <Text style={styles.settingsSectionTitle}>Push Notifications</Text>
                </View>
                <Surface
                  style={[
                    styles.pushNotifCard,
                    settingsForm.notification_preferences.push_notifications
                      ? styles.pushNotifCardEnabled
                      : styles.pushNotifCardDisabled,
                  ]}
                  elevation={0}
                >
                  <View style={styles.pushNotifInner}>
                    <View style={styles.pushNotifIconWrap}>
                      <MaterialCommunityIcons
                        name="bell-ring-outline"
                        size={22}
                        color={settingsForm.notification_preferences.push_notifications ? '#16A34A' : '#94A3B8'}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pushNotifTitle}>
                        Push Notifications {settingsForm.notification_preferences.push_notifications ? 'Enabled' : 'Disabled'}
                      </Text>
                      <Text style={styles.pushNotifDesc}>
                        {settingsForm.notification_preferences.push_notifications
                          ? "You'll receive real-time updates"
                          : 'Enable to receive real-time updates'}
                      </Text>
                    </View>
                    <Button
                      mode="outlined"
                      compact
                      style={[
                        styles.pushNotifBtn,
                        settingsForm.notification_preferences.push_notifications
                          ? styles.pushNotifBtnEnabled
                          : styles.pushNotifBtnDisabled,
                      ]}
                      labelStyle={[
                        styles.pushNotifBtnLabel,
                        settingsForm.notification_preferences.push_notifications
                          ? { color: '#16A34A' }
                          : { color: '#2563EB' },
                      ]}
                      onPress={() =>
                        setSettingsForm((p) => ({
                          ...p,
                          notification_preferences: {
                            ...p.notification_preferences,
                            push_notifications: !p.notification_preferences.push_notifications,
                          },
                        }))
                      }
                    >
                      {settingsForm.notification_preferences.push_notifications ? 'Disable' : 'Enable'}
                    </Button>
                  </View>
                </Surface>
              </Surface>

              {/* Notification Preferences */}
              <Surface style={[styles.settingsCard, { marginTop: 16 }]} elevation={0}>
                <Text style={styles.settingsSectionTitle}>Notification Preferences</Text>

                {/* Master email toggle */}
                <View style={styles.notifRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.notifLabel}>Email Notifications</Text>
                    <Text style={styles.notifDesc}>Master switch for all email notifications</Text>
                  </View>
                  <Switch
                    value={settingsForm.notification_preferences.email_notifications ?? true}
                    onValueChange={(val) =>
                      setSettingsForm((p) => ({
                        ...p,
                        notification_preferences: { ...p.notification_preferences, email_notifications: val },
                      }))
                    }
                    trackColor={{ false: '#E2E8F0', true: '#1E293B' }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                {settingsForm.notification_preferences.email_notifications && (
                  <View style={styles.notifSubSection}>
                    {NOTIFICATION_OPTIONS.map((opt) => (
                      <View key={opt.key} style={styles.notifRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.notifLabel}>{opt.label}</Text>
                          <Text style={styles.notifDesc}>{opt.desc}</Text>
                        </View>
                        <Switch
                          value={settingsForm.notification_preferences[opt.key] ?? true}
                          onValueChange={(val) =>
                            setSettingsForm((p) => ({
                              ...p,
                              notification_preferences: { ...p.notification_preferences, [opt.key]: val },
                            }))
                          }
                          trackColor={{ false: '#E2E8F0', true: '#1E293B' }}
                          thumbColor="#FFFFFF"
                        />
                      </View>
                    ))}
                  </View>
                )}
              </Surface>

              {/* Save Button */}
              <Button
                mode="contained"
                icon="content-save-outline"
                style={styles.saveBtn}
                labelStyle={styles.saveBtnLabel}
                onPress={handleSaveSettings}
                loading={isSaving}
                disabled={isSaving}
              >
                Save Changes
              </Button>
            </View>
          )}
        </View>
        <Footer />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  contentWrapper: {
    width: '100%',
    maxWidth: 768,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 48,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loaderText: {
    color: '#64748B',
    fontSize: 14,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 24,
  },
  profileHeaderBg: {
    backgroundColor: '#1E293B',
    height: 100,
    width: '100%',
  },
  avatarContainer: {
    alignItems: 'center',
    marginTop: -52,
  },
  avatarWrapper: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: '#FFFFFF',
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfoContainer: {
    padding: 24,
    paddingTop: 16,
    alignItems: 'center',
  },
  nameText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  handleText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#64748B',
    fontFamily: 'monospace',
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  statBox: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starIcon: {
    marginLeft: 4,
    marginBottom: 4,
  },
  listNewBtn: {
    backgroundColor: '#1E293B',
    width: '100%',
    borderRadius: 12,
    marginBottom: 12,
    paddingVertical: 4,
  },
  listNewBtnLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  signOutBtn: {
    borderColor: '#E2E8F0',
    width: '100%',
    borderRadius: 12,
    paddingVertical: 4,
  },
  signOutBtnLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 20,
  },
  badgeRow: {
    alignItems: 'center',
    marginBottom: 12,
  },
  badgeSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeSuccessText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#16A34A',
    marginLeft: 6,
  },
  badgeError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeErrorText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
    marginLeft: 6,
  },
  addPaymentBtn: {
    backgroundColor: '#2563EB',
    marginTop: 12,
    borderRadius: 8,
    paddingVertical: 4,
  },
  addPaymentBtnLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  connectBankBtn: {
    backgroundColor: '#16A34A',
    marginTop: 20,
    borderRadius: 8,
    paddingVertical: 4,
  },
  connectBankBtnLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  helperText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
  },
  // Tabs
  tabBarSurface: {
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 8,
  },
  tabGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  tabGridItem: {
    width: '33.33%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  tabGridItemActive: {
    backgroundColor: '#F1F5F9',
  },
  tabContent: {
    minHeight: 200,
  },
  tabLoader: {
    paddingVertical: 40,
  },
  // Items grid
  itemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  itemCardWrapper: {
    width: '48%',
    marginBottom: 16,
  },
  // Empty state
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 32,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  emptyBtn: {
    backgroundColor: '#1E293B',
    marginTop: 16,
    borderRadius: 8,
  },
  // Reviews
  reviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewStars: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewComment: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
    marginBottom: 8,
  },
  reviewAuthor: {
    fontSize: 12,
    color: '#94A3B8',
  },
  reviewDate: {
    fontSize: 12,
    color: '#94A3B8',
  },
  // Rentals & Disputes
  rentalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 12,
  },
  rentalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  rentalAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  rentalDates: {
    fontSize: 14,
    color: '#334155',
    marginBottom: 4,
  },
  rentalRole: {
    fontSize: 13,
    color: '#64748B',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'capitalize',
  },
  statusCompleted: {
    backgroundColor: '#DCFCE7',
  },
  statusApproved: {
    backgroundColor: '#DBEAFE',
  },
  statusPending: {
    backgroundColor: '#FEF3C7',
  },
  statusRejected: {
    backgroundColor: '#FEE2E2',
  },
  // Summary grid (rentals / disputes)
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    minWidth: '22%',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryNumber: {
    fontSize: 22,
    fontWeight: '700',
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  // Sub-tabs
  subTabBar: {
    marginBottom: 12,
  },
  subTabBarContent: {
    flexDirection: 'row',
    gap: 6,
  },
  subTabItem: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  subTabItemActive: {
    backgroundColor: '#1E293B',
  },
  subTabLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  subTabLabelActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  // Rental info rows
  rentalInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  rentalAmountBold: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  rentalBreakdown: {
    fontSize: 11,
    color: '#94A3B8',
    marginLeft: 20,
    marginBottom: 6,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roleBadgeRenter: {
    backgroundColor: '#F1F5F9',
  },
  roleBadgeOwner: {
    backgroundColor: '#EFF6FF',
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  // Dispute styles
  disputeFiledText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  disputeReasonBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  disputeReasonTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7F1D1D',
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  disputeReasonDesc: {
    fontSize: 12,
    color: '#991B1B',
    lineHeight: 16,
  },
  disputeResolutionBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  disputeResolutionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#14532D',
    marginBottom: 4,
  },
  disputeResolutionDesc: {
    fontSize: 12,
    color: '#166534',
    lineHeight: 16,
  },
  // Wallet
  walletBalanceRow: {
    gap: 12,
    marginBottom: 16,
  },
  walletBalanceCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
  },
  walletBalanceInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  walletBalanceLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  walletBalanceBig: {
    fontSize: 28,
    fontWeight: '700',
  },
  walletBalanceSub: {
    fontSize: 12,
    marginTop: 4,
  },
  walletBalanceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletDetailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
  },
  walletDetailsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  walletTxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 10,
  },
  walletTxTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 2,
  },
  walletTxMeta: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 2,
  },
  walletTxDate: {
    fontSize: 11,
    color: '#94A3B8',
  },
  walletTxAmount: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  walletTxEmpty: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  walletTxEmptyText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  // Document Verification
  docVerificationCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: 16,
    marginBottom: 16,
  },
  docVerificationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  docVerificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docVerificationTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  docVerificationDesc: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  // Push Notifications
  pushNotifHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 0,
  },
  pushNotifCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  pushNotifCardEnabled: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  pushNotifCardDisabled: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  pushNotifInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pushNotifIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pushNotifTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 2,
  },
  pushNotifDesc: {
    fontSize: 12,
    color: '#64748B',
  },
  pushNotifBtn: {
    borderRadius: 8,
  },
  pushNotifBtnEnabled: {
    borderColor: '#BBF7D0',
  },
  pushNotifBtnDisabled: {
    borderColor: '#E2E8F0',
  },
  pushNotifBtnLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Documents
  uploadBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
  },
  docListCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
  },
  docListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  docListTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  docCountBadge: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  docCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  docItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  docItemBorder: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  docThumbnail: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  docThumbnailPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  docItemInfo: {
    flex: 1,
  },
  docItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 2,
  },
  docItemDate: {
    fontSize: 12,
    color: '#94A3B8',
  },
  docActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  // Settings
  settingsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
  },
  settingsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  settingsInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
  },
  settingsTextInput: {
    fontSize: 15,
    color: '#0F172A',
    paddingVertical: 10,
  },
  settingsInputDisabled: {
    backgroundColor: '#F8FAFC',
  },
  settingsHint: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
  },
  settingsSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 16,
  },
  languageRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  languageChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  languageChipActive: {
    backgroundColor: '#1E293B',
    borderColor: '#1E293B',
  },
  languageChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#334155',
  },
  languageChipTextActive: {
    color: '#FFFFFF',
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  notifLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
    marginBottom: 2,
  },
  notifDesc: {
    fontSize: 11,
    color: '#94A3B8',
  },
  notifSubSection: {
    borderLeftWidth: 2,
    borderLeftColor: '#E2E8F0',
    paddingLeft: 16,
    marginTop: 4,
  },
  saveBtn: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    marginTop: 24,
  },
  saveBtnLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  alertSuccess: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  alertError: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  alertSuccessText: {
    fontSize: 14,
    color: '#16A34A',
    fontWeight: '500',
  },
  alertErrorText: {
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '500',
  },
});
