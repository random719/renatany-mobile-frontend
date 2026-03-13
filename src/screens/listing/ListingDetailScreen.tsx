import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  Image,
  ScrollView,
  Share,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { ActivityIndicator, Avatar, Button, Text } from 'react-native-paper';
import { useUser } from '@clerk/expo';
import { GlobalHeader } from '../../components/common/GlobalHeader';
import { Footer } from '../../components/home/Footer';
import { ListingCard } from '../../components/listing/ListingCard';
import { useListingStore } from '../../store/listingStore';
import * as listingService from '../../services/listingService';
import { colors, typography } from '../../theme';
import { Listing } from '../../types/listing';
import { HomeStackParamList } from '../../types/navigation';

type Route = RouteProp<HomeStackParamList, 'ListingDetail'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_HEIGHT = 300;
const THUMB_SIZE = 64;

const isVideoUrl = (url: string): boolean => /\.(mp4|mov|webm)$/i.test(url);

export const ListingDetailScreen = () => {
  const route = useRoute<Route>();
  const navigation = useNavigation();
  const { listingId } = route.params;
  const { user } = useUser();
  const {
    selectedListing: listing,
    selectedListingOwner: owner,
    isLoading,
    fetchListingById,
    addToRecentlyViewed,
    toggleLike,
    deleteItem,
    isSubmitting,
  } = useListingStore();

  const userEmail = user?.emailAddresses?.[0]?.emailAddress;
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [similarItems, setSimilarItems] = useState<Listing[]>([]);
  const mediaListRef = useRef<FlatList>(null);

  // Fetch item details
  useEffect(() => {
    fetchListingById(listingId);
  }, [listingId, fetchListingById]);

  // Track view + add to recently viewed
  useEffect(() => {
    if (listing) {
      addToRecentlyViewed(listing);
      // Track view on backend
      if (userEmail) {
        listingService.trackViewedItem(userEmail, listingId);
      }
    }
  }, [listing?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load similar items
  useEffect(() => {
    if (listing?.category) {
      listingService
        .getListingsByCategory(listing.category)
        .then((items) => setSimilarItems(items.filter((i) => i.id !== listing.id).slice(0, 6)))
        .catch(() => {});
    }
  }, [listing?.category, listing?.id]);

  const handleShare = async () => {
    if (!listing) return;
    try {
      await Share.share({
        message: `Check out "${listing.title}" on Rentany - $${listing.pricePerDay}/day`,
        title: listing.title,
      });
    } catch {
      // user cancelled
    }
  };

  const handleReport = () => {
    Alert.alert('Report Listing', 'Are you sure you want to report this listing?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Report',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Reported', 'Thank you for your report. Our team will review this listing.'),
      },
    ]);
  };

  const handleRentNow = () => {
    if (!listing) return;
    (navigation as any).navigate('Booking', {
      listingId: listing.id,
      listingTitle: listing.title,
      pricePerDay: listing.pricePerDay,
      ownerEmail: owner?.email ?? listing.ownerId,
    });
  };

  const handleChatOwner = () => {
    (navigation as any).navigate('MyConversations');
  };

  const handleToggleAvailability = () => {
    if (!listing) return;
    Alert.alert(
      listing.isActive ? 'Hide Listing' : 'Make Available',
      `Are you sure you want to ${listing.isActive ? 'hide' : 'make available'} this listing?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await listingService.updateItem(listing.id, {
                availability: !listing.isActive,
              });
              fetchListingById(listingId);
            } catch {
              Alert.alert('Error', 'Failed to update availability.');
            }
          },
        },
      ],
    );
  };

  const handleDeleteItem = () => {
    if (!listing) return;
    Alert.alert(
      'Delete Item',
      'This action cannot be undone. Are you sure you want to delete this item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteItem(listing.id);
              navigation.goBack();
            } catch {
              Alert.alert('Error', 'Failed to delete item.');
            }
          },
        },
      ],
    );
  };


  if (isLoading || !listing) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const allMedia = [
    ...(listing.videos || []).filter(Boolean),
    ...(listing.images || []).filter(Boolean),
  ];
  const displayMedia =
    allMedia.length > 0
      ? allMedia
      : ['https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&h=600&fit=crop'];

  const isOwner = user?.id === listing.ownerId;
  const locationText =
    typeof listing.location === 'object' && listing.location !== null
      ? listing.location.address || listing.location.city || ''
      : String(listing.location || '');

  return (
    <View style={styles.mainContainer}>
      <GlobalHeader />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Secondary Header */}
        <View style={styles.secondaryHeader}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.titleContainer}>
            <Text variant="headlineSmall" style={styles.listingTitle}>
              {listing.title}
            </Text>
            {locationText ? (
              <View style={styles.locationContainer}>
                <MaterialCommunityIcons
                  name="map-marker-outline"
                  size={16}
                  color={colors.textSecondary}
                />
                <Text style={styles.locationText}>{locationText}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.actionIcons}>
            <TouchableOpacity style={styles.headerIconButton} onPress={handleShare}>
              <MaterialCommunityIcons
                name="share-variant-outline"
                size={20}
                color={colors.textPrimary}
              />
              <Text style={styles.headerIconText}>Share</Text>
            </TouchableOpacity>
            {!isOwner && (
              <TouchableOpacity style={styles.reportButton} onPress={handleReport}>
                <MaterialCommunityIcons name="alert-outline" size={20} color="#EF4444" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Media Gallery */}
        <View style={styles.imageContainer}>
          <View style={styles.mainMediaWrapper}>
            {isVideoUrl(displayMedia[selectedMediaIndex]) ? (
              <View style={styles.videoPlaceholder}>
                <MaterialCommunityIcons name="play-circle-outline" size={64} color="#FFFFFF" />
                <Text style={styles.videoText}>Video</Text>
              </View>
            ) : (
              <Image
                source={{ uri: displayMedia[selectedMediaIndex] }}
                style={styles.heroImage}
                resizeMode="cover"
              />
            )}
            {/* Not Available overlay */}
            {listing.availability === false && (
              <View style={styles.unavailableOverlay}>
                <View style={styles.unavailableBadge}>
                  <Text style={styles.unavailableText}>Not Available</Text>
                </View>
              </View>
            )}
            {/* Instant booking badge */}
            {listing.instant_booking && (
              <View style={styles.instantBadge}>
                <MaterialCommunityIcons name="lightning-bolt" size={14} color="#FFFFFF" />
                <Text style={styles.instantBadgeText}>Instant Booking</Text>
              </View>
            )}
          </View>

          {/* Thumbnails */}
          {displayMedia.length > 1 && (
            <FlatList
              ref={mediaListRef}
              data={displayMedia}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.thumbnailList}
              keyExtractor={(_, index) => `thumb-${index}`}
              renderItem={({ item: media, index }) => (
                <TouchableOpacity
                  style={[
                    styles.thumbnail,
                    selectedMediaIndex === index && styles.thumbnailActive,
                  ]}
                  onPress={() => setSelectedMediaIndex(index)}
                >
                  {isVideoUrl(media) ? (
                    <View style={styles.videoThumb}>
                      <MaterialCommunityIcons name="play" size={20} color="#FFFFFF" />
                    </View>
                  ) : (
                    <Image source={{ uri: media }} style={styles.thumbImage} resizeMode="cover" />
                  )}
                </TouchableOpacity>
              )}
            />
          )}
        </View>

        {/* Pricing & Quick Info Card */}
        <View style={styles.pricingCard}>
          <View style={styles.priceRow}>
            <View style={styles.priceContainer}>
              <Text variant="displaySmall" style={styles.priceAmount}>
                ${listing.pricePerDay}
              </Text>
              <Text style={styles.priceUnit}>/day</Text>
            </View>
            <View style={styles.tagsContainer}>
              <View style={[styles.tag, { backgroundColor: '#FDF2F8' }]}>
                <Text style={[styles.tagText, { color: '#DB2777' }]}>{listing.category}</Text>
              </View>
              {listing.condition && (
                <View style={[styles.tag, { backgroundColor: '#EFF6FF' }]}>
                  <Text style={[styles.tagText, { color: '#2563EB' }]}>{listing.condition}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Ask Question - only for non-owners */}
          {!isOwner && (
            <TouchableOpacity style={styles.askQuestionBtn} onPress={handleChatOwner}>
              <MaterialCommunityIcons name="chat-outline" size={20} color={colors.textPrimary} />
              <Text style={styles.askQuestionText}>Ask a Question</Text>
            </TouchableOpacity>
          )}

          {/* Info Grid */}
          <View style={styles.infoGrid}>
            <View style={styles.infoRow}>
              <View style={styles.infoLabelContainer}>
                <MaterialCommunityIcons name="shield-outline" size={18} color={colors.textSecondary} />
                <Text style={styles.infoLabel}>Security Deposit</Text>
              </View>
              <Text style={styles.infoValue}>${listing.deposit ?? 0}</Text>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.infoLabelContainer}>
                <MaterialCommunityIcons name="clock-outline" size={18} color={colors.textSecondary} />
                <Text style={styles.infoLabel}>Min/Max Days</Text>
              </View>
              <Text style={styles.infoValue}>
                {listing.min_rental_days ?? 1} - {listing.max_rental_days ?? 30} days
              </Text>
            </View>
            {listing.rating > 0 && (
              <View style={styles.infoRow}>
                <View style={styles.infoLabelContainer}>
                  <MaterialCommunityIcons name="star" size={18} color="#F59E0B" />
                  <Text style={styles.infoLabel}>Rating</Text>
                </View>
                <Text style={styles.infoValue}>
                  {listing.rating.toFixed(1)} ({listing.totalReviews} reviews)
                </Text>
              </View>
            )}
          </View>

          {/* Pricing Tiers */}
          {listing.pricing_tiers && listing.pricing_tiers.length > 0 && (
            <View style={styles.pricingTiersBox}>
              <Text style={styles.pricingTiersTitle}>Special Pricing:</Text>
              {listing.pricing_tiers
                .sort((a, b) => a.days - b.days)
                .map((tier, idx) => (
                  <View key={idx} style={styles.tierRow}>
                    <Text style={styles.tierLabel}>Rent for {tier.days} {tier.days === 1 ? 'day' : 'days'}:</Text>
                    <Text style={styles.tierValue}>
                      ${(tier.price || 0).toFixed(2)}{' '}
                      <Text style={styles.tierPerDay}>(${(tier.price / tier.days || 0).toFixed(2)}/day)</Text>
                    </Text>
                  </View>
                ))}
            </View>
          )}

          {/* Delivery Options */}
          <View style={styles.deliverySection}>
            <Text style={styles.deliveryTitle}>Delivery Options:</Text>
            {(listing.delivery_options && listing.delivery_options.length > 0) ? (
              listing.delivery_options.map((opt, idx) => (
                <View key={idx} style={[styles.deliveryBadge, { marginBottom: 6 }]}>
                  <MaterialCommunityIcons
                    name={opt === 'pickup' ? 'map-marker' : 'truck-delivery'}
                    size={14}
                    color="#EF4444"
                  />
                  <Text style={styles.deliveryText}>
                    {opt === 'pickup'
                      ? 'Pickup at location'
                      : `Delivery ($${listing.delivery_fee ?? 0})`}
                  </Text>
                </View>
              ))
            ) : (
              <View style={styles.deliveryBadge}>
                <MaterialCommunityIcons name="map-marker" size={14} color="#EF4444" />
                <Text style={styles.deliveryText}>Pickup at location</Text>
              </View>
            )}
            {listing.delivery_options?.includes('delivery') &&
              listing.delivery_fee != null &&
              listing.delivery_fee > 0 && (
                <Text style={styles.deliveryFeeNote}>
                  Delivery fee: ${listing.delivery_fee}
                  {listing.delivery_radius ? ` (within ${listing.delivery_radius} miles)` : ''}
                </Text>
              )}
          </View>
        </View>

        {/* About Section */}
        <View style={styles.sectionCard}>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            About this item
          </Text>
          <Text style={styles.descriptionText}>{listing.description}</Text>
        </View>

        {/* Owner Section */}
        <View style={styles.sectionCard}>
          <View style={styles.ownerRow}>
            {owner?.profile_picture ? (
              <Avatar.Image size={48} source={{ uri: owner.profile_picture }} />
            ) : (
              <Avatar.Icon size={48} icon="account" style={{ backgroundColor: '#E2E8F0' }} />
            )}
            <View style={styles.ownerInfo}>
              <Text variant="titleMedium" style={styles.ownerName}>
                {owner?.full_name || 'Owner'}
              </Text>
              <Text style={styles.ownerHandle}>
                {owner?.username ? `@${owner.username}` : ''}
              </Text>
            </View>
          </View>
        </View>

        {/* Owner Management Section */}
        {isOwner && (
          <View style={styles.ownerManageCard}>
            <View style={styles.ownerManageHeader}>
              <MaterialCommunityIcons name="cog" size={20} color="#FFFFFF" />
              <Text style={styles.ownerManageTitle}>Manage this listing</Text>
            </View>
            <View style={styles.ownerManageBody}>
              <TouchableOpacity
                style={styles.manageBtn}
                onPress={() =>
                  (navigation as any).navigate('EditItem', { itemId: listing.id })
                }
              >
                <MaterialCommunityIcons name="pencil" size={20} color="#475569" />
                <Text style={styles.manageBtnText}>Edit Item Details</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.manageBtn}
                onPress={handleToggleAvailability}
              >
                <MaterialCommunityIcons
                  name={listing.isActive ? 'eye-off' : 'eye'}
                  size={20}
                  color="#475569"
                />
                <Text style={styles.manageBtnText}>
                  {listing.isActive ? 'Hide Listing' : 'Make Available'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.manageBtn, styles.deleteBtnRow]}
                onPress={handleDeleteItem}
              >
                <MaterialCommunityIcons name="delete" size={20} color="#EF4444" />
                <Text style={[styles.manageBtnText, { color: '#EF4444' }]}>Delete Item</Text>
                {isSubmitting && <ActivityIndicator size="small" color="#EF4444" />}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* CTA Section - for non-owners when item is available */}
        {!isOwner && listing.availability !== false && (
          <View style={styles.sectionCard}>
            <Button
              mode="contained"
              style={styles.connectCardBtn}
              icon="calendar-check"
              onPress={handleRentNow}
            >
              Request to Rent
            </Button>
            <Button
              mode="outlined"
              style={styles.connectBankBtn}
              icon="message-outline"
              onPress={handleChatOwner}
            >
              My Conversations
            </Button>
          </View>
        )}

        {/* Similar Items */}
        {similarItems.length > 0 && (
          <View style={styles.similarSection}>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              Similar Items
            </Text>
            <FlatList
              data={similarItems}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12 }}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={{ width: SCREEN_WIDTH * 0.42 }}>
                  <ListingCard
                    listing={item}
                    onPress={() =>
                      (navigation as any).navigate('ListingDetail', { listingId: item.id })
                    }
                    onToggleLike={() => toggleLike(item.id, userEmail)}
                  />
                </View>
              )}
            />
          </View>
        )}

        <Footer />
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab}>
        <View style={styles.fabGradient}>
          <MaterialCommunityIcons name="robot" size={24} color="#FFFFFF" />
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  secondaryHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#F8FAFC',
  },
  backButton: {
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  titleContainer: {
    flex: 1,
    marginLeft: 16,
  },
  listingTitle: {
    fontWeight: '800',
    color: '#0F172A',
    fontSize: typography.display,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  locationText: {
    color: '#64748B',
    fontSize: typography.label,
  },
  actionIcons: {
    flexDirection: 'row',
    gap: 8,
  },
  headerIconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  headerIconText: {
    fontWeight: '600',
    fontSize: typography.body,
  },
  reportButton: {
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    justifyContent: 'center',
  },
  imageContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  mainMediaWrapper: {
    position: 'relative',
    borderRadius: 24,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: IMAGE_HEIGHT,
  },
  videoPlaceholder: {
    width: '100%',
    height: IMAGE_HEIGHT,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoText: {
    color: '#FFFFFF',
    marginTop: 8,
    fontWeight: '600',
  },
  unavailableOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unavailableBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  unavailableText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: typography.body,
  },
  instantBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  instantBadgeText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 11,
  },
  thumbnailList: {
    paddingTop: 12,
    gap: 8,
  },
  thumbnail: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  thumbnailActive: {
    borderColor: '#475569',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  videoThumb: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pricingCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceAmount: {
    fontWeight: '800',
    color: '#0F172A',
  },
  priceUnit: {
    fontSize: typography.sectionTitle,
    color: '#64748B',
    marginLeft: 4,
  },
  tagsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tagText: {
    fontWeight: '700',
    fontSize: typography.small,
  },
  askQuestionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
    marginBottom: 20,
  },
  askQuestionText: {
    fontWeight: '600',
    fontSize: typography.tabLabel,
    color: '#0F172A',
  },
  infoGrid: {
    gap: 12,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    color: '#64748B',
    fontSize: typography.label,
  },
  infoValue: {
    fontWeight: '700',
    color: '#0F172A',
    fontSize: typography.label,
  },
  pricingTiersBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: 16,
    marginBottom: 20,
  },
  pricingTiersTitle: {
    fontWeight: '700',
    color: '#1E3A5F',
    fontSize: typography.body,
    marginBottom: 8,
  },
  tierRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  tierLabel: {
    color: '#1E40AF',
    fontSize: typography.body,
  },
  tierValue: {
    fontWeight: '700',
    color: '#1E3A5F',
    fontSize: typography.body,
  },
  tierPerDay: {
    fontSize: typography.caption,
    color: '#3B82F6',
    fontWeight: '500',
  },
  deliverySection: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 16,
  },
  deliveryTitle: {
    color: '#64748B',
    fontSize: typography.body,
    marginBottom: 12,
  },
  deliveryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  deliveryText: {
    fontWeight: '600',
    fontSize: typography.caption,
    color: '#0F172A',
  },
  deliveryFeeNote: {
    color: '#64748B',
    fontSize: typography.caption,
    marginTop: 8,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
  },
  sectionTitle: {
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  descriptionText: {
    color: '#4B5563',
    lineHeight: 24,
    fontSize: typography.label,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  ownerInfo: {
    flex: 1,
  },
  ownerName: {
    fontWeight: '700',
    color: '#111827',
  },
  ownerHandle: {
    color: '#6B7280',
    fontSize: typography.body,
  },
  // Owner management
  ownerManageCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
  },
  ownerManageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0F172A',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  ownerManageTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: typography.sectionTitle,
  },
  ownerManageBody: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    gap: 8,
  },
  manageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  manageBtnText: {
    fontWeight: '600',
    color: '#475569',
    fontSize: typography.body,
    flex: 1,
  },
  deleteBtnRow: {
    borderColor: '#FEE2E2',
  },
  // Connect section
  connectHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  infoIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  connectTitle: {
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  connectDescription: {
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    fontSize: typography.body,
  },
  statusBadges: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusBadgeText: {
    fontSize: typography.small,
    fontWeight: '600',
    color: '#475569',
  },
  connectPrompt: {
    textAlign: 'center',
    color: '#64748B',
    marginBottom: 16,
    fontSize: typography.body,
  },
  blueInfoBox: {
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  blueInfoText: {
    color: '#1E40AF',
    textAlign: 'center',
    fontSize: typography.body,
  },
  connectCardBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 4,
    marginBottom: 12,
  },
  connectBankBtn: {
    borderColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 4,
    marginBottom: 20,
  },
  stripeDisclaimer: {
    color: '#94A3B8',
    fontSize: typography.tiny,
    textAlign: 'center',
    lineHeight: 16,
  },
  // Similar items
  similarSection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 30,
    shadowColor: '#5856D6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
