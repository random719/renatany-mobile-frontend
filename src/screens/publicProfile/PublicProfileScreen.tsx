import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
  FlatList,
  Dimensions,
} from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { ScreenLayout } from '../../components/common/ScreenLayout';
import { api } from '../../services/api';
import { colors } from '../../theme';
import { PublicUserProfile } from '../../types/models';
import { RootStackParamList } from '../../types/navigation';

type Nav = StackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'PublicProfile'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 60) / 2;

interface ListingItem {
  id: string;
  title: string;
  daily_rate: number;
  images?: string[];
  category?: string;
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  reviewer_email: string;
  review_type: string;
  created_date: string;
}

export const PublicProfileScreen = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { userEmail } = route.params;

  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'listings' | 'reviews'>('listings');
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      // Fetch user profile
      const userRes = await api.get('/users/by-email', { params: { email: userEmail } });
      const userData = userRes.data.data || userRes.data;
      setProfile(userData);

      // Fetch user's listings
      const itemsRes = await api.get('/items', { params: { owner_email: userEmail, status: 'active' } });
      const itemsData = itemsRes.data.data || itemsRes.data || [];
      setListings(Array.isArray(itemsData) ? itemsData : []);

      // Fetch reviews for user
      const reviewsRes = await api.get('/reviews', { params: { user_id: userEmail } });
      const reviewsData = reviewsRes.data.data || reviewsRes.data || [];
      setReviews(Array.isArray(reviewsData) ? reviewsData : []);
    } catch (error) {
      console.error('Error loading public profile:', error);
    }
  }, [userEmail]);

  useEffect(() => {
    setIsLoading(true);
    loadData().finally(() => setIsLoading(false));
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  const renderStars = (rating: number) => {
    return (
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <MaterialCommunityIcons
            key={star}
            name={star <= Math.round(rating) ? 'star' : 'star-outline'}
            size={16}
            color={star <= Math.round(rating) ? '#F59E0B' : '#D1D5DB'}
          />
        ))}
      </View>
    );
  };

  const renderListingItem = ({ item }: { item: ListingItem }) => (
    <TouchableOpacity
      style={styles.listingCard}
      onPress={() => (navigation as any).navigate('Main', { screen: 'HomeTab', params: { screen: 'ListingDetail', params: { listingId: item.id } } })}
    >
      {item.images && item.images.length > 0 ? (
        <Image source={{ uri: item.images[0] }} style={styles.listingImage} />
      ) : (
        <View style={[styles.listingImage, styles.noImage]}>
          <MaterialCommunityIcons name="image-off" size={24} color="#D1D5DB" />
        </View>
      )}
      <View style={styles.listingInfo}>
        <Text style={styles.listingTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.listingPrice}>${item.daily_rate}/day</Text>
      </View>
    </TouchableOpacity>
  );

  const renderReviewItem = ({ item }: { item: Review }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        {renderStars(item.rating)}
        <Text style={styles.reviewDate}>
          {new Date(item.created_date).toLocaleDateString()}
        </Text>
      </View>
      <Text style={styles.reviewComment}>{item.comment}</Text>
      <Text style={styles.reviewerEmail}>{item.reviewer_email}</Text>
    </View>
  );

  if (isLoading) {
    return (
      <View style={{ flex: 1 }}>
        <ScreenLayout showBottomNav bottomNavActiveKey="none">
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </ScreenLayout>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={{ flex: 1 }}>
        <ScreenLayout showBottomNav bottomNavActiveKey="none">
          <View style={styles.contentWrapper}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <MaterialCommunityIcons name="arrow-left" size={24} color="#0F172A" />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
            <View style={styles.emptyCard}>
              <MaterialCommunityIcons name="account-off" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>User not found</Text>
            </View>
          </View>
        </ScreenLayout>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScreenLayout onRefresh={onRefresh} refreshing={refreshing} showBottomNav bottomNavActiveKey="none">
        <View style={styles.contentWrapper}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#0F172A" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          {/* Profile Header */}
          <View style={styles.profileHeader}>
            {profile.profile_picture ? (
              <Image source={{ uri: profile.profile_picture }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <MaterialCommunityIcons name="account" size={40} color="#9CA3AF" />
              </View>
            )}
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{profile.full_name || profile.username || 'User'}</Text>
              {profile.username && (
                <Text style={styles.profileUsername}>@{profile.username}</Text>
              )}
              <View style={styles.profileMeta}>
                {averageRating > 0 && (
                  <View style={styles.ratingContainer}>
                    {renderStars(averageRating)}
                    <Text style={styles.ratingText}>
                      {averageRating.toFixed(1)} ({reviews.length})
                    </Text>
                  </View>
                )}
                {profile.verification_status === 'verified' && (
                  <View style={styles.verifiedBadge}>
                    <MaterialCommunityIcons name="check-decagram" size={16} color="#3B82F6" />
                    <Text style={styles.verifiedText}>Verified</Text>
                  </View>
                )}
              </View>
              {profile.created_at && (
                <Text style={styles.memberSince}>
                  Member since {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </Text>
              )}
            </View>
          </View>

          {profile.bio && (
            <Text style={styles.bio}>{profile.bio}</Text>
          )}

          {/* Tabs */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'listings' && styles.tabActive]}
              onPress={() => setActiveTab('listings')}
            >
              <Text style={[styles.tabText, activeTab === 'listings' && styles.tabTextActive]}>
                Items ({listings.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'reviews' && styles.tabActive]}
              onPress={() => setActiveTab('reviews')}
            >
              <Text style={[styles.tabText, activeTab === 'reviews' && styles.tabTextActive]}>
                Reviews ({reviews.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab Content */}
          {activeTab === 'listings' ? (
            listings.length === 0 ? (
              <View style={styles.emptyCard}>
                <MaterialCommunityIcons name="package-variant" size={48} color="#D1D5DB" />
                <Text style={styles.emptyText}>No listings yet</Text>
              </View>
            ) : (
              <View style={styles.listingsGrid}>
                {listings.map((item) => (
                  <View key={item.id} style={{ width: CARD_WIDTH }}>
                    {renderListingItem({ item })}
                  </View>
                ))}
              </View>
            )
          ) : reviews.length === 0 ? (
            <View style={styles.emptyCard}>
              <MaterialCommunityIcons name="star-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>No reviews yet</Text>
            </View>
          ) : (
            reviews.map((review) => (
              <View key={review.id}>{renderReviewItem({ item: review })}</View>
            ))
          )}
        </View>
      </ScreenLayout>
    </View>
  );
};

const styles = StyleSheet.create({
  contentWrapper: { flex: 1, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 48, maxWidth: 768, width: '100%', alignSelf: 'center' },
  loadingContainer: { marginTop: 40, alignItems: 'center', justifyContent: 'center' },
  backButton: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backText: { fontSize: 16, fontWeight: '500', color: '#0F172A', marginLeft: 6 },
  // Profile Header
  profileHeader: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  avatar: { width: 80, height: 80, borderRadius: 40 },
  avatarPlaceholder: { backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  profileInfo: { flex: 1, justifyContent: 'center' },
  profileName: { fontSize: 22, fontWeight: 'bold', color: '#0F172A' },
  profileUsername: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  profileMeta: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 },
  ratingContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  starsRow: { flexDirection: 'row', gap: 1 },
  ratingText: { fontSize: 13, color: '#6B7280' },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  verifiedText: { fontSize: 13, color: '#3B82F6', fontWeight: '500' },
  memberSince: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
  bio: { fontSize: 14, color: '#374151', lineHeight: 20, marginBottom: 20, backgroundColor: '#F9FAFB', padding: 14, borderRadius: 10 },
  // Tabs
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.primary },
  tabText: { fontSize: 15, fontWeight: '500', color: '#9CA3AF' },
  tabTextActive: { color: colors.primary, fontWeight: '600' },
  // Listings
  listingsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  listingCard: { backgroundColor: '#FFFFFF', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 3, elevation: 1 },
  listingImage: { width: '100%', height: 120, backgroundColor: '#F3F4F6' },
  noImage: { alignItems: 'center', justifyContent: 'center' },
  listingInfo: { padding: 10 },
  listingTitle: { fontSize: 14, fontWeight: '600', color: '#0F172A', marginBottom: 4 },
  listingPrice: { fontSize: 14, fontWeight: '700', color: colors.primary },
  // Reviews
  reviewCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 12 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  reviewDate: { fontSize: 12, color: '#9CA3AF' },
  reviewComment: { fontSize: 14, color: '#374151', lineHeight: 20, marginBottom: 6 },
  reviewerEmail: { fontSize: 12, color: '#9CA3AF' },
  // Empty
  emptyCard: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', paddingVertical: 48, paddingHorizontal: 24, alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 16, color: '#9CA3AF' },
});
