import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Calendar } from 'react-native-calendars';
import {
  Alert,
  AppState,
  AppStateStatus,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  TextInput,
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
import { api } from '../../services/api';
import { getRentalRequests } from '../../services/bookingService';
import { sendMessage } from '../../services/messageService';
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
  const [showInquiryModal, setShowInquiryModal] = useState(false);
  const [inquiryMessage, setInquiryMessage] = useState('');
  const [isSendingInquiry, setIsSendingInquiry] = useState(false);
  const [backendUser, setBackendUser] = useState<any>(null);
  const [isConnectingCard, setIsConnectingCard] = useState(false);
  const [isConnectingBank, setIsConnectingBank] = useState(false);
  // Availability calendar + rental form
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rentalMessage, setRentalMessage] = useState('');
  const [isSubmittingRental, setIsSubmittingRental] = useState(false);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  // Calendar month navigation (offset from current month)
  const [monthOffset, setMonthOffset] = useState(0);
  const [requestSentSuccessfully, setRequestSentSuccessfully] = useState(false);
  const [isStartingKyc, setIsStartingKyc] = useState(false);
  // Image zoom
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);

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

  // Fetch backend user for payment setup status
  useEffect(() => {
    api.get('/users/me').then((res) => setBackendUser(res.data.data || res.data)).catch(() => {});
  }, []);

  // Fetch blocked dates from availability API
  useEffect(() => {
    if (!listing?.id) return;
    api.get(`/item-availability?item_id=${listing.id}`).then((res) => {
      const ranges = res.data?.data || [];
      const dates: string[] = [];
      ranges.forEach((range: any) => {
        const start = new Date(range.blocked_start_date);
        const end = new Date(range.blocked_end_date);
        const cur = new Date(start);
        while (cur <= end) {
          dates.push(cur.toISOString().split('T')[0]);
          cur.setDate(cur.getDate() + 1);
        }
      });
      setBlockedDates(dates);
    }).catch(() => {});
  }, [listing?.id]);

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

  // Derived notice period info from listing
  const noticePeriodHours: number = (listing as any)?.notice_period_hours || 0;
  const sameDayPickup: boolean = (listing as any)?.same_day_pickup ?? true;

  // Calculate earliest available pickup date
  const earliestAvailableDate = useMemo(() => {
    const now = new Date();
    if (noticePeriodHours > 0) {
      const pickupTime = new Date(now.getTime() + noticePeriodHours * 60 * 60 * 1000);
      const d = new Date(pickupTime);
      d.setHours(0, 0, 0, 0);
      // If pickup time is after midnight of its day, use that day; else next day
      if (pickupTime.getHours() > 0 || pickupTime.getMinutes() > 0) {
        // keep d as the day pickupTime lands on
      }
      return d;
    } else if (!sameDayPickup) {
      const d = new Date(now);
      d.setDate(d.getDate() + 1);
      d.setHours(0, 0, 0, 0);
      return d;
    } else {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      return d;
    }
  }, [noticePeriodHours, sameDayPickup]);

  // Calendar: handle day tap for range selection
  const handleDayPress = (day: { dateString: string }) => {
    const tapped = day.dateString;
    const tappedDate = new Date(tapped);
    // Block unavailable dates
    if (tappedDate < earliestAvailableDate) return;
    if (blockedDates.includes(tapped)) return;

    if (!rangeStart) {
      setRangeStart(tapped);
      setSelectedDates([tapped]);
    } else {
      if (tapped < rangeStart) {
        setRangeStart(tapped);
        setSelectedDates([tapped]);
        return;
      }
      if (tapped === rangeStart) {
        // Single day selection
        setSelectedDates([tapped]);
        setRangeStart(null);
        return;
      }
      // Build all dates in range
      const dates: string[] = [];
      const cur = new Date(rangeStart);
      const end = new Date(tapped);
      while (cur <= end) {
        dates.push(cur.toISOString().split('T')[0]);
        cur.setDate(cur.getDate() + 1);
      }
      // Check if any blocked dates are in the range
      if (dates.some(d => blockedDates.includes(d))) {
        Alert.alert('Unavailable', 'Some dates in this range are blocked by the owner. Please choose a different range.');
        return;
      }
      setSelectedDates(dates);
      setRangeStart(null);
    }
  };

  // Build marked dates for Calendar with proper color coding
  const markedDates = useMemo(() => {
    const marks: Record<string, any> = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const earliestStr = earliestAvailableDate.toISOString().split('T')[0];

    // Past dates (60 days back): red
    for (let i = 1; i <= 60; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      marks[d.toISOString().split('T')[0]] = {
        disabled: true, disableTouchEvent: true,
        customStyles: { container: { backgroundColor: '#DC2626', borderRadius: 6 }, text: { color: '#FFFFFF' } },
      };
    }

    // Today and notice period dates (today up to earliest - 1): amber or orange
    const todayStr = today.toISOString().split('T')[0];
    let cur = new Date(today);
    while (cur.toISOString().split('T')[0] < earliestStr) {
      const ds = cur.toISOString().split('T')[0];
      const isToday = ds === todayStr;
      if (!sameDayPickup && noticePeriodHours === 0 && isToday) {
        // Same-day unavailable: orange
        marks[ds] = {
          disabled: true, disableTouchEvent: true,
          customStyles: { container: { backgroundColor: '#F97316', borderRadius: 6 }, text: { color: '#FFFFFF' } },
        };
      } else {
        // Notice period: amber
        marks[ds] = {
          disabled: true, disableTouchEvent: true,
          customStyles: { container: { backgroundColor: '#F59E0B', borderRadius: 6 }, text: { color: '#FFFFFF' } },
        };
      }
      cur.setDate(cur.getDate() + 1);
    }

    // Blocked by owner: darker red
    blockedDates.forEach(ds => {
      if (!marks[ds]) {
        marks[ds] = {
          disabled: true, disableTouchEvent: true,
          customStyles: { container: { backgroundColor: '#EF4444', borderRadius: 6 }, text: { color: '#FFFFFF' } },
        };
      }
    });

    // Selected dates: blue period
    selectedDates.forEach((date, i) => {
      marks[date] = {
        color: '#2563EB',
        textColor: '#FFFFFF',
        startingDay: i === 0,
        endingDay: i === selectedDates.length - 1,
      };
    });

    return marks;
  }, [selectedDates, blockedDates, earliestAvailableDate, sameDayPickup, noticePeriodHours]);

  // Rental cost calculation (with pricing tiers)
  const rentalCosts = useMemo(() => {
    if (!listing || selectedDates.length === 0) return { rentalCost: 0, platformFee: 0, deposit: 0, totalCost: 0 };
    const days = selectedDates.length;
    let dailyRate = listing.pricePerDay;
    if ((listing as any).pricingTiers?.length) {
      const tier = [...(listing as any).pricingTiers]
        .sort((a: any, b: any) => b.minDays - a.minDays)
        .find((t: any) => days >= t.minDays);
      if (tier) dailyRate = tier.pricePerDay;
    }
    const rentalCost = dailyRate * days;
    const platformFee = rentalCost * 0.15;
    const deposit = (listing as any).deposit || 0;
    return { rentalCost, platformFee, deposit, totalCost: rentalCost + platformFee + deposit };
  }, [listing, selectedDates]);

  // Submit rental request inline
  const handleSubmitRental = async () => {
    if (!listing || !userEmail || selectedDates.length === 0) return;
    setIsSubmittingRental(true);
    try {
      const sorted = [...selectedDates].sort();
      const startDate = new Date(sorted[0]).toISOString();
      const endDate = new Date(sorted[sorted.length - 1]).toISOString();
      const ownerEmail = owner?.email ?? listing.ownerId;
      const res = await api.post('/rental-requests', {
        item_id: listing.id,
        renter_email: userEmail,
        owner_email: ownerEmail,
        start_date: startDate,
        end_date: endDate,
        message: rentalMessage || "Hi! I'm interested in renting your item.",
        status: (listing as any).instant_booking ? 'approved' : 'pending',
      });
      const requestId = res.data?.data?.id || res.data?.id || res.data?.data?._id || res.data?._id;
      if (requestId) {
        await api.post('/messages', {
          rental_request_id: requestId,
          sender_email: userEmail,
          content: rentalMessage || "Hi! I'm interested in renting your item.",
          message_type: 'text',
        }).catch(() => {});
      }
      setSelectedDates([]);
      setRangeStart(null);
      setRentalMessage('');
      setRequestSentSuccessfully(true);
    } catch (err: any) {
      const data = err?.response?.data;
      if (data?.kyc_required) {
        // KYC required — prompt user to verify identity
        const riskLabel = data.risk_trigger === 'amount' ? 'High rental value' : data.risk_trigger === 'category' ? 'High-risk category' : 'Item requires verification';
        Alert.alert(
          'ID Verification Required',
          `This rental requires identity verification.\n\nReason: ${riskLabel}.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Verify Identity', onPress: () => handleStartKyc() },
          ]
        );
      } else {
        Alert.alert('Error', data?.error || 'Failed to submit request. Please try again.');
      }
    } finally {
      setIsSubmittingRental(false);
    }
  };

  // Refresh payment/bank status when app comes back to foreground after Stripe
  const refreshBackendUser = useCallback(async () => {
    try {
      await api.post('/stripe/payment-method/retrieve').catch(() => {});
      await api.get('/stripe/connect/status').catch(() => {});
      const userRes = await api.get('/users/me');
      setBackendUser(userRes.data?.data || userRes.data);
    } catch (_) {}
  }, []);

  // API base URL (without /api) used for mobile return pages
  const API_BASE = (process.env.EXPO_PUBLIC_API_URL || 'http://172.28.145.1:5000/api').replace(/\/api$/, '');

  const openStripeAndWatchReturn = (url: string, onReturn: () => void) => {
    // Only trigger onReturn after app went to background (browser opened) then came back active
    let wentBackground = false;
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'background') wentBackground = true;
      if (state === 'active' && wentBackground) {
        sub.remove();
        onReturn();
      }
    });
    Linking.openURL(url);
  };

  const handleStartKyc = async () => {
    setIsStartingKyc(true);
    try {
      const res = await api.post('/stripe/identity/create-session', {
        from: 'rental-request',
        item_id: listing?.id,
      });
      const url = res.data?.data?.url || res.data?.url;
      if (!url) {
        Alert.alert('Error', 'Could not start identity verification. Please try again.');
        setIsStartingKyc(false);
        return;
      }
      openStripeAndWatchReturn(url, async () => {
        await refreshBackendUser();
        setIsStartingKyc(false);
        Alert.alert('Verification Submitted', 'Your ID verification has been submitted. Once approved, you can send your rental request.');
      });
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to start ID verification.');
      setIsStartingKyc(false);
    }
  };

  const handleConnectCard = async () => {
    setIsConnectingCard(true);
    try {
      const res = await api.post('/stripe/payment-method/setup', {
        mobile_success_url: `${API_BASE}/api/stripe/app-return/profile`,
      });
      const url = res.data?.data?.url || res.data?.url;
      if (!url) { setIsConnectingCard(false); return; }

      openStripeAndWatchReturn(url, async () => {
        await refreshBackendUser();
        setIsConnectingCard(false);
      });
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to start card setup. Please try again.');
      setIsConnectingCard(false);
    }
  };

  const handleConnectBank = async () => {
    setIsConnectingBank(true);
    try {
      const mobileReturnUrl = `${API_BASE}/api/stripe/app-return/stripe/confirm`;
      const res = await api.post('/stripe/connect/onboarding', {
        origin: API_BASE,
        return_path: '/profile',
        mobile_return_url: mobileReturnUrl,
      });
      const url = res.data?.data?.url || res.data?.url;
      if (!url) { setIsConnectingBank(false); return; }

      openStripeAndWatchReturn(url, async () => {
        await refreshBackendUser();
        setIsConnectingBank(false);
      });
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to start bank setup. Please try again.');
      setIsConnectingBank(false);
    }
  };

  const handleSubmitInquiry = async () => {
    if (!inquiryMessage.trim() || !listing || !userEmail) return;
    setIsSendingInquiry(true);
    try {
      const ownerEmail = owner?.email ?? listing.ownerId;
      // Check for existing inquiry thread for this item
      const existing = await getRentalRequests({ renter_email: userEmail, owner_email: ownerEmail });
      let inquiryRequestId: string;
      const existingForItem = existing.find((r) => r.item_id === listing.id && (r.status as string) === 'inquiry');
      if (existingForItem) {
        inquiryRequestId = existingForItem.id;
      } else {
        // Backend requires valid dates — use today as placeholder for inquiry
        const today = new Date().toISOString();
        const res = await api.post('/rental-requests', {
          item_id: listing.id,
          renter_email: userEmail,
          owner_email: ownerEmail,
          status: 'inquiry',
          start_date: today,
          end_date: today,
          total_amount: 0,
        });
        inquiryRequestId = (res.data.data || res.data).id;
      }
      await sendMessage({ rental_request_id: inquiryRequestId, sender_email: userEmail, content: inquiryMessage.trim() });
      setShowInquiryModal(false);
      setInquiryMessage('');
      (navigation as any).navigate('MyConversations');
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to send message. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setIsSendingInquiry(false);
    }
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
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => setZoomImageUrl(displayMedia[selectedMediaIndex])}
              >
                <Image
                  source={{ uri: displayMedia[selectedMediaIndex] }}
                  style={styles.heroImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
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
            <TouchableOpacity style={styles.askQuestionBtn} onPress={() => setShowInquiryModal(true)}>
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
              <Text variant="titleMedium" style={styles.ownerName}>Owner</Text>
              <Text style={styles.ownerHandle}>
                {owner?.username
                  ? `@${owner.username}`
                  : owner?.full_name || 'A user'}
              </Text>
            </View>
          </View>
        </View>

        {/* Owner Management Section */}
        {isOwner && (
          <View style={styles.ownerManageCard}>
            <View style={styles.ownerManageHeader}>
              <MaterialCommunityIcons name="cog" size={20} color="#FFFFFF" />
              <Text style={styles.ownerManageTitle}>Manage This Listing</Text>
            </View>
            <View style={styles.ownerManageBody}>
              {/* Edit Item Details */}
              <TouchableOpacity
                style={styles.manageBtn}
                onPress={() => (navigation as any).navigate('EditItem', { itemId: listing.id })}
              >
                <MaterialCommunityIcons name="pencil-outline" size={20} color="#475569" />
                <Text style={styles.manageBtnText}>Edit Item Details</Text>
                <MaterialCommunityIcons name="chevron-right" size={18} color="#CBD5E1" />
              </TouchableOpacity>

              {/* Manage Availability */}
              <TouchableOpacity
                style={styles.manageBtn}
                onPress={handleToggleAvailability}
              >
                <MaterialCommunityIcons name="calendar-month-outline" size={20} color="#475569" />
                <Text style={styles.manageBtnText}>Manage Availability</Text>
                <MaterialCommunityIcons name="chevron-right" size={18} color="#CBD5E1" />
              </TouchableOpacity>

              {/* View Analytics */}
              <TouchableOpacity
                style={styles.manageBtn}
                onPress={() => Alert.alert('Analytics', 'View analytics coming soon.')}
              >
                <MaterialCommunityIcons name="trending-up" size={20} color="#475569" />
                <Text style={styles.manageBtnText}>View Analytics</Text>
                <MaterialCommunityIcons name="chevron-right" size={18} color="#CBD5E1" />
              </TouchableOpacity>

              {/* Hide / Show Listing */}
              <TouchableOpacity
                style={styles.manageBtnDark}
                onPress={handleToggleAvailability}
              >
                <MaterialCommunityIcons
                  name={listing.isActive ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#F1F5F9"
                />
                <Text style={styles.manageBtnDarkText}>
                  {listing.isActive ? 'Hide Listing' : 'Make Available'}
                </Text>
              </TouchableOpacity>

              {/* Delete Item */}
              <TouchableOpacity
                style={styles.manageBtnDelete}
                onPress={handleDeleteItem}
              >
                <MaterialCommunityIcons name="trash-can-outline" size={20} color="#FFFFFF" />
                <Text style={styles.manageBtnDeleteText}>Delete Item</Text>
                {isSubmitting && <ActivityIndicator size="small" color="#FFFFFF" />}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Earliest pickup date — only shown when there's a notice period or same-day restriction */}
        {(noticePeriodHours > 0 || !sameDayPickup) && (
          <View style={styles.noticeBox}>
            <MaterialCommunityIcons name="information-outline" size={16} color="#1D4ED8" />
            <View style={{ flex: 1 }}>
              <Text style={styles.noticeText}>
                <Text style={styles.noticeBold}>Earliest pickup date: </Text>
                {earliestAvailableDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </Text>
              {noticePeriodHours > 0 && (
                <Text style={styles.noticeSubtext}>
                  The owner requires {noticePeriodHours} hour{noticePeriodHours !== 1 ? 's' : ''} notice before pickup.
                </Text>
              )}
              {!sameDayPickup && noticePeriodHours === 0 && (
                <Text style={styles.noticeSubtext}>
                  The owner does not allow same-day pickup.
                </Text>
              )}
            </View>
          </View>
        )}
        {!isOwner && listing.availability !== false && (
          backendUser && !backendUser.stripe_payment_method_id ? (
            // Connect card section — matches frontend-v1 VerificationPrompt layout
            <View style={styles.sectionCard}>
              {/* Icon + title + description */}
              <View style={styles.connectCardHeader}>
                <View style={styles.connectCardIconBg}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={24} color="#2563EB" />
                </View>
                <Text variant="titleMedium" style={styles.connectCardTitle}>Connect card to rent</Text>
                <Text style={styles.connectCardDesc}>
                  Connect your payment card to make rental payments and start renting items.
                </Text>

                {/* Single status badge — card only, same as frontend-v1 */}
                <View style={styles.connectStatusRow}>
                  <View style={styles.statusBadge}>
                    <MaterialCommunityIcons name="shield-outline" size={12} color="#475569" />
                    <Text style={styles.statusBadgeText}>Card not connected</Text>
                  </View>
                </View>
              </View>

              {/* Blue info box */}
              <View style={styles.connectInfoBox}>
                <MaterialCommunityIcons name="information-outline" size={16} color="#1D4ED8" />
                <Text style={styles.connectInfoText}>Connect your card to make rental payments.</Text>
              </View>

              {/* Connect Card button — solid blue */}
              <TouchableOpacity
                style={[styles.connectCardBtn2, isConnectingCard && styles.connectCardBtnDisabled]}
                onPress={handleConnectCard}
                disabled={isConnectingCard}
              >
                {isConnectingCard ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="shield-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.connectCardBtnText}>Connect Card (to Rent)</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Connect Bank button — outline */}
              <TouchableOpacity
                style={[styles.connectBankBtn2, isConnectingBank && styles.connectCardBtnDisabled]}
                onPress={handleConnectBank}
                disabled={isConnectingBank}
              >
                {isConnectingBank ? (
                  <ActivityIndicator size="small" color="#2563EB" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="shield-outline" size={18} color="#2563EB" />
                    <Text style={styles.connectBankBtnText}>Connect Bank Account (to Lend)</Text>
                  </>
                )}
              </TouchableOpacity>

              <Text style={styles.stripeDisclaimer}>
                Payments are securely processed by Stripe. Your information is encrypted and protected.
              </Text>
            </View>
          ) : (
            // Availability calendar + rental request
            <>
              {requestSentSuccessfully ? (
                /* Success card — shown after request is submitted */
                <View style={styles.sectionCard}>
                  <View style={styles.successCard}>
                    <View style={styles.successIconBg}>
                      <MaterialCommunityIcons name="check-circle" size={40} color="#16A34A" />
                    </View>
                    <Text variant="titleLarge" style={styles.successTitle}>
                      {(listing as any).instant_booking ? 'Booking Confirmed!' : 'Request Sent!'}
                    </Text>
                    <Text style={styles.successDesc}>
                      {(listing as any).instant_booking
                        ? 'Your booking has been confirmed. Check your conversations for details.'
                        : 'Your rental request has been sent. The owner will be notified and you can chat in Conversations.'}
                    </Text>
                    <TouchableOpacity
                      style={styles.successConvBtn}
                      onPress={() => (navigation as any).navigate('MyConversations')}
                    >
                      <MaterialCommunityIcons name="chat-outline" size={18} color="#FFFFFF" />
                      <Text style={styles.successConvBtnText}>View Conversations</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.successNewBtn}
                      onPress={() => setRequestSentSuccessfully(false)}
                    >
                      <Text style={styles.successNewBtnText}>Make another request</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
              <>
              {/* Calendar */}
              <View style={styles.sectionCard}>
                <Text variant="titleMedium" style={styles.calendarTitle}>Select Rental Dates</Text>

                {/* Legend */}
                <View style={styles.legendRow}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#DC2626', opacity: 0.7 }]} />
                    <Text style={styles.legendText}>Past dates</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#F59E0B', opacity: 0.8 }]} />
                    <Text style={styles.legendText}>Notice period</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#F97316', opacity: 0.8 }]} />
                    <Text style={styles.legendText}>Same-day unavailable</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#EF4444', opacity: 0.8 }]} />
                    <Text style={styles.legendText}>Blocked by owner</Text>
                  </View>
                </View>

                <Text style={styles.calendarHint}>
                  {selectedDates.length === 0
                    ? 'Tap a start date'
                    : selectedDates.length === 1
                    ? 'Tap an end date'
                    : `${selectedDates.length} days selected`}
                </Text>
                {/* Month navigation arrows */}
                <View style={styles.calNavRow}>
                  <TouchableOpacity
                    style={[styles.calNavBtn, monthOffset === 0 && styles.calNavBtnDisabled]}
                    onPress={() => setMonthOffset(o => Math.max(0, o - 1))}
                    disabled={monthOffset === 0}
                  >
                    <MaterialCommunityIcons name="chevron-left" size={22} color={monthOffset === 0 ? '#CBD5E1' : '#2563EB'} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.calNavBtn}
                    onPress={() => setMonthOffset(o => o + 1)}
                  >
                    <MaterialCommunityIcons name="chevron-right" size={22} color="#2563EB" />
                  </TouchableOpacity>
                </View>

                {/* Month 1 — key forces remount when monthOffset changes */}
                <Calendar
                  key={`m1-${monthOffset}`}
                  current={(() => { const d = new Date(); d.setMonth(d.getMonth() + monthOffset); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`; })()}
                  markingType="period"
                  markedDates={markedDates}
                  onDayPress={handleDayPress}
                  minDate={new Date().toISOString().split('T')[0]}
                  hideArrows={true}
                  theme={{
                    todayTextColor: '#2563EB',
                    selectedDayBackgroundColor: '#2563EB',
                    arrowColor: '#2563EB',
                    textDayFontSize: 14,
                    textMonthFontSize: 15,
                    textDayHeaderFontSize: 12,
                  }}
                />
                {/* Month 2 — key forces remount when monthOffset changes */}
                <Calendar
                  key={`m2-${monthOffset}`}
                  current={(() => { const d = new Date(); d.setMonth(d.getMonth() + monthOffset + 1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`; })()}
                  markingType="period"
                  markedDates={markedDates}
                  onDayPress={handleDayPress}
                  minDate={new Date().toISOString().split('T')[0]}
                  hideArrows={true}
                  theme={{
                    todayTextColor: '#2563EB',
                    selectedDayBackgroundColor: '#2563EB',
                    arrowColor: '#2563EB',
                    textDayFontSize: 14,
                    textMonthFontSize: 15,
                    textDayHeaderFontSize: 12,
                  }}
                />
                {selectedDates.length > 0 && (
                  <TouchableOpacity
                    onPress={() => { setSelectedDates([]); setRangeStart(null); }}
                    style={styles.clearDatesBtn}
                  >
                    <Text style={styles.clearDatesText}>Clear dates</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Rental request card — always visible, shows prompt or form */}
              <View style={styles.sectionCard}>
                <Text variant="titleMedium" style={styles.rentalCardTitle}>Request to Rent</Text>


                {selectedDates.length === 0 ? (
                  /* No dates selected yet — prompt */
                  <View style={styles.selectDatesPrompt}>
                    <Text style={styles.selectDatesText}>Select dates to see rental cost</Text>
                  </View>
                ) : (
                  <>
                    {/* Cost breakdown — matches frontend-v1 exactly */}
                    <View style={styles.costBox}>
                      {/* Rental period: "5 dates: Jan 15, Jan 16, ..." */}
                      <View style={styles.costRow}>
                        <Text style={styles.costLabel}>Rental period:</Text>
                        <Text style={[styles.costValue, { flex: 1, textAlign: 'right' }]}>
                          {selectedDates.length === 1
                            ? new Date(selectedDates[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                            : `${selectedDates.length} dates: ${selectedDates.map(d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })).join(', ')}`}
                        </Text>
                      </View>
                      {/* Rental cost */}
                      <View style={styles.costRow}>
                        <Text style={styles.costLabel}>Rental cost ({selectedDates.length} days):</Text>
                        <Text style={styles.costValue}>${rentalCosts.rentalCost.toFixed(2)}</Text>
                      </View>
                      {/* Platform fee */}
                      <View style={styles.costRow}>
                        <Text style={styles.costLabel}>Platform fee (15%):</Text>
                        <Text style={styles.costValue}>${rentalCosts.platformFee.toFixed(2)}</Text>
                      </View>
                      {/* Total — includes deposit silently, same as frontend-v1 */}
                      <View style={[styles.costRow, styles.costTotalRow]}>
                        <Text style={styles.costTotalLabel}>Total price:</Text>
                        <Text style={styles.costTotalValue}>${rentalCosts.totalCost.toFixed(2)}</Text>
                      </View>
                    </View>

                    {/* Message to owner */}
                    <Text style={styles.messageLabel}>Message to Owner (Optional)</Text>
                    <TextInput
                      style={styles.messageInput}
                      value={rentalMessage}
                      onChangeText={setRentalMessage}
                      placeholder="Tell the owner why you need this item..."
                      placeholderTextColor="#94A3B8"
                      multiline
                      numberOfLines={3}
                    />

                    {/* KYC status banner — shown if user's KYC is pending or failed */}
                    {backendUser?.kyc_status === 'pending' && (
                      <View style={styles.kycBanner}>
                        <MaterialCommunityIcons name="clock-outline" size={16} color="#92400E" />
                        <Text style={styles.kycBannerText}>ID verification pending — you can still send your request once approved.</Text>
                      </View>
                    )}
                    {backendUser?.kyc_status === 'failed' && (
                      <View style={[styles.kycBanner, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                        <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#991B1B" />
                        <Text style={[styles.kycBannerText, { color: '#991B1B' }]}>ID verification failed. Please retry.</Text>
                        <TouchableOpacity onPress={handleStartKyc} disabled={isStartingKyc}>
                          <Text style={styles.kycRetryText}>{isStartingKyc ? 'Starting...' : 'Retry'}</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Submit — green button matching frontend-v1 */}
                    <TouchableOpacity
                      style={[styles.submitRentalBtn, (isSubmittingRental || isStartingKyc) && { opacity: 0.6 }]}
                      onPress={handleSubmitRental}
                      disabled={isSubmittingRental || isStartingKyc}
                    >
                      {isSubmittingRental ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.submitRentalBtnText}>Confirm and Send Request</Text>
                      )}
                    </TouchableOpacity>
                  </>
                )}
              </View>
              </>
              )}
            </>
          )
        )}

        {/* Sign in prompt for unauthenticated users */}
        {!user && listing.availability !== false && !isOwner && (
          <View style={styles.sectionCard}>
            <Text style={styles.signInPrompt}>Sign in to rent this item</Text>
            <TouchableOpacity
              style={styles.signInBtn}
              onPress={() => (navigation as any).navigate('Auth')}
            >
              <Text style={styles.signInBtnText}>Sign In</Text>
            </TouchableOpacity>
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

      {/* Image Zoom Modal */}
      <Modal
        visible={!!zoomImageUrl}
        transparent
        animationType="fade"
        onRequestClose={() => setZoomImageUrl(null)}
      >
        <View style={styles.zoomOverlay}>
          <TouchableOpacity style={styles.zoomClose} onPress={() => setZoomImageUrl(null)}>
            <MaterialCommunityIcons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <ScrollView
            contentContainerStyle={styles.zoomScrollContent}
            maximumZoomScale={4}
            minimumZoomScale={1}
            centerContent
          >
            {zoomImageUrl && (
              <Image
                source={{ uri: zoomImageUrl }}
                style={styles.zoomImage}
                resizeMode="contain"
              />
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Ask a Question Modal */}
      <Modal
        visible={showInquiryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowInquiryModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowInquiryModal(false)} />
          <View style={styles.modalContainer}>
            <View style={styles.modalHandle} />
            <Text variant="titleLarge" style={styles.modalTitle}>Ask Owner a Question</Text>
            <Text style={styles.modalSubtitle}>
              Your message will start a conversation about "{listing?.title}".
            </Text>
            <TextInput
              style={styles.modalTextInput}
              placeholder="Type your question here..."
              placeholderTextColor="#9CA3AF"
              value={inquiryMessage}
              onChangeText={setInquiryMessage}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!isSendingInquiry}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => { setShowInquiryModal(false); setInquiryMessage(''); }}
                disabled={isSendingInquiry}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSendBtn, (!inquiryMessage.trim() || isSendingInquiry) && styles.modalSendBtnDisabled]}
                onPress={handleSubmitInquiry}
                disabled={!inquiryMessage.trim() || isSendingInquiry}
              >
                {isSendingInquiry ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="send" size={16} color="#FFFFFF" />
                    <Text style={styles.modalSendText}>Send Message</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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
  manageBtnDark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1E293B',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
  },
  manageBtnDarkText: {
    fontWeight: '600',
    color: '#FFFFFF',
    fontSize: typography.body,
    flex: 1,
  },
  manageBtnDelete: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#DC2626',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
  },
  manageBtnDeleteText: {
    fontWeight: '600',
    color: '#FFFFFF',
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
  connectCardHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  connectCardIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  connectCardTitle: {
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  connectCardDesc: {
    color: '#64748B',
    textAlign: 'center',
    fontSize: typography.body,
    lineHeight: 22,
    marginBottom: 16,
  },
  connectStatusRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  connectInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  connectInfoText: {
    flex: 1,
    color: '#1D4ED8',
    fontSize: typography.small,
    lineHeight: 18,
  },
  connectCardBtn2: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 12,
    height: 48,
    gap: 8,
    marginBottom: 12,
  },
  connectBankBtn2: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    height: 48,
    gap: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2563EB',
    backgroundColor: '#FFFFFF',
  },
  connectCardBtnDisabled: {
    opacity: 0.6,
  },
  connectCardBtnText: {
    fontWeight: '700',
    color: '#FFFFFF',
    fontSize: typography.body,
  },
  connectBankBtnText: {
    fontWeight: '700',
    color: '#2563EB',
    fontSize: typography.body,
  },
  stripeDisclaimer: {
    color: '#94A3B8',
    fontSize: typography.tiny,
    textAlign: 'center',
    lineHeight: 16,
  },
  // Calendar
  calendarTitle: {
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  noticeText: {
    fontSize: typography.small,
    color: '#1E40AF',
    lineHeight: 18,
  },
  noticeBold: {
    fontWeight: '700',
    color: '#1E40AF',
  },
  noticeSubtext: {
    fontSize: 11,
    color: '#3B82F6',
    marginTop: 2,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 14,
    height: 14,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 11,
    color: '#64748B',
  },
  calendarHint: {
    color: '#64748B',
    fontSize: typography.small,
    marginBottom: 12,
  },
  calNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  calNavBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  calNavBtnDisabled: {
    backgroundColor: '#F8FAFC',
  },
  clearDatesBtn: {
    alignSelf: 'center',
    marginTop: 10,
  },
  clearDatesText: {
    color: '#2563EB',
    fontSize: typography.small,
    fontWeight: '600',
  },
  selectDatesPrompt: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  selectDatesText: {
    color: '#64748B',
    fontWeight: '500',
    fontSize: typography.body,
    textAlign: 'center',
  },
  // Rental request card
  rentalCardTitle: {
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 16,
  },
  costBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    gap: 8,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  costLabel: {
    color: '#64748B',
    fontSize: typography.small,
    flex: 1,
  },
  costValue: {
    color: '#1E293B',
    fontSize: typography.small,
    fontWeight: '600',
  },
  costTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 8,
    marginTop: 4,
  },
  costTotalLabel: {
    color: '#0F172A',
    fontWeight: '700',
    fontSize: typography.body,
    flex: 1,
  },
  costTotalValue: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 18,
  },
  messageLabel: {
    color: '#374151',
    fontWeight: '600',
    fontSize: typography.small,
    marginBottom: 6,
  },
  messageInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: typography.body,
    color: '#1E293B',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  submitRentalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16A34A',
    borderRadius: 12,
    height: 50,
    gap: 8,
  },
  submitRentalBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: typography.body,
  },
  // Sign in prompt
  signInPrompt: {
    color: '#64748B',
    textAlign: 'center',
    fontSize: typography.body,
    marginBottom: 16,
  },
  signInBtn: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: typography.body,
  },
  // Image zoom modal
  zoomOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  zoomClose: {
    position: 'absolute',
    top: 48,
    right: 16,
    zIndex: 10,
    padding: 8,
  },
  zoomScrollContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 1.2,
  },
  // Similar items
  similarSection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  modalSubtitle: {
    color: '#64748B',
    fontSize: typography.body,
    marginBottom: 20,
    lineHeight: 22,
  },
  modalTextInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    fontSize: typography.label,
    color: '#111827',
    minHeight: 120,
    backgroundColor: '#F8FAFC',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  modalCancelText: {
    fontWeight: '600',
    color: '#475569',
    fontSize: typography.body,
  },
  modalSendBtn: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  modalSendBtnDisabled: {
    backgroundColor: '#CBD5E1',
  },
  modalSendText: {
    fontWeight: '700',
    color: '#FFFFFF',
    fontSize: typography.body,
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
  // Success card (post-submission)
  successCard: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 12,
  },
  successIconBg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  successTitle: {
    fontWeight: '700',
    color: '#15803D',
    textAlign: 'center',
  },
  successDesc: {
    color: '#475569',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  successConvBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 4,
  },
  successConvBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  successNewBtn: {
    paddingVertical: 8,
  },
  successNewBtnText: {
    color: '#64748B',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  kycBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  kycBannerText: {
    flex: 1,
    color: '#92400E',
    fontSize: 12,
    lineHeight: 16,
  },
  kycRetryText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 12,
  },
});
