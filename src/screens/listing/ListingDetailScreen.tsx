import { useUser } from '@clerk/expo';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import * as WebBrowser from 'expo-web-browser';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { ActivityIndicator, Avatar, Text } from 'react-native-paper';
import { GlobalHeader } from '../../components/common/GlobalHeader';
import { Footer } from '../../components/home/Footer';
import { ListingCard } from '../../components/listing/ListingCard';
import { api } from '../../services/api';
import { getRentalRequests } from '../../services/bookingService';
import * as listingService from '../../services/listingService';
import { sendMessage } from '../../services/messageService';
import { useListingStore } from '../../store/listingStore';
import { toast } from '../../store/toastStore';
import { colors, typography } from '../../theme';
import { Listing } from '../../types/listing';
import { HomeStackParamList } from '../../types/navigation';
import { AIChatAssistant } from './AIChatAssistant';
import { useI18n } from '../../i18n';

type Route = RouteProp<HomeStackParamList, 'ListingDetail'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_HEIGHT = 300;
const THUMB_SIZE = 64;
const REPORT_REASON_VALUES = [
  'fraud',
  'stolen_item',
  'prohibited_item',
  'misleading',
  'price_gouging',
  'spam',
  'other',
] as const;

const isVideoUrl = (url: string): boolean => /\.(mp4|mov|webm)$/i.test(url);

export const ListingDetailScreen = () => {
  const { language, t } = useI18n();
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
  const [showReportModal, setShowReportModal] = useState(false);
  const [showReportReasons, setShowReportReasons] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [reportEvidence, setReportEvidence] = useState<Array<{ name: string; uri: string; uploadedUrl?: string }>>([]);
  const [isUploadingReportEvidence, setIsUploadingReportEvidence] = useState(false);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [hasOpenListingReport, setHasOpenListingReport] = useState(false);
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
  const [submittedRequestSummary, setSubmittedRequestSummary] = useState<{
    listingTitle: string;
    datesLabel: string;
    totalCost: number;
    instantBooking: boolean;
  } | null>(null);
  const [showIdentityVerificationCard, setShowIdentityVerificationCard] = useState(false);
  const [identityVerificationReason, setIdentityVerificationReason] = useState<string | null>(null);
  const [isStartingKyc, setIsStartingKyc] = useState(false);
  // Image zoom
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const reportReasons = REPORT_REASON_VALUES.map((value) => ({
    value,
    label: t(`listingDetail.reportReasons.${value}`),
  }));
  const locale = language === 'fr' ? 'fr-FR' : language === 'es' ? 'es-ES' : language === 'de' ? 'de-DE' : 'en-US';

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchListingById(listingId);
    } finally {
      setRefreshing(false);
    }
  }, [listingId, fetchListingById]);

  useFocusEffect(
    useCallback(() => {
      fetchListingById(listingId);
    }, [listingId, fetchListingById])
  );

  useEffect(() => {
    setHasOpenListingReport(false);
  }, [listingId]);

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
        message: t('listingDetail.shareMessage', { title: listing.title, price: listing.pricePerDay }),
        title: listing.title,
      });
    } catch {
      // user cancelled
    }
  };

  const handleReport = () => {
    if (hasOpenListingReport) {
      toast.info(t('listingDetail.alreadyReported'));
      return;
    }
    setShowReportReasons(false);
    setShowReportModal(true);
  };

  const handlePickReportEvidence = async () => {
    try {
      setIsUploadingReportEvidence(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*'],
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const uploaded = await Promise.all(
        result.assets.map(async (asset) => {
          const uploadedUrl = await listingService.uploadFile(asset.uri, 'image');
          return { name: asset.name, uri: asset.uri, uploadedUrl };
        })
      );
      setReportEvidence((prev) => [...prev, ...uploaded]);
    } catch (error: any) {
      toast.error(t('listingDetail.addEvidenceFailed'));
    } finally {
      setIsUploadingReportEvidence(false);
    }
  };

  const resetReportForm = () => {
    setShowReportModal(false);
    setShowReportReasons(false);
    setReportReason('');
    setReportDetails('');
    setReportEvidence([]);
    setIsUploadingReportEvidence(false);
    setIsSubmittingReport(false);
  };

  const handleSubmitReport = async () => {
    if (!listing || !userEmail) {
      toast.warning(t('listingDetail.signInToReport'));
      return;
    }
    if (!reportReason) {
      toast.warning(t('listingDetail.selectReportReason'));
      return;
    }
    if (!reportDetails.trim()) {
      toast.warning(t('listingDetail.reportDetailsRequired'));
      return;
    }

    setIsSubmittingReport(true);
    try {
      await api.post('/reports/listing', {
        item_id: listing.id,
        reporter_email: userEmail,
        reason: reportReason,
        description: reportDetails.trim(),
        evidence_urls: reportEvidence.map((file) => file.uploadedUrl).filter(Boolean),
        status: 'pending',
      });
      setHasOpenListingReport(true);
      toast.success(t('listingDetail.reportSubmitted'));
      resetReportForm();
    } catch (error: any) {
      const statusCode = error?.response?.status;
      const errorMessage = error?.response?.data?.error || t('listingDetail.reportFailed');
      if (statusCode === 409) {
        setHasOpenListingReport(true);
        toast.info(errorMessage);
        resetReportForm();
        return;
      }
      toast.error(errorMessage);
    } finally {
      setIsSubmittingReport(false);
    }
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

  const currentCalendarDate = useMemo(() => {
    const date = new Date();
    date.setMonth(date.getMonth() + monthOffset);
    return date;
  }, [monthOffset]);

  const nextCalendarDate = useMemo(() => {
    const date = new Date();
    date.setMonth(date.getMonth() + monthOffset + 1);
    return date;
  }, [monthOffset]);

  const currentCalendarLabel = useMemo(
    () => currentCalendarDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' }),
    [currentCalendarDate, locale]
  );

  const nextCalendarLabel = useMemo(
    () => nextCalendarDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' }),
    [nextCalendarDate, locale]
  );

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
        toast.warning(t('listingDetail.blockedRangeWarning'));
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

    // Past dates (60 days back): soft red
    for (let i = 1; i <= 60; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      marks[d.toISOString().split('T')[0]] = {
        disabled: true, disableTouchEvent: true,
        customStyles: { container: { backgroundColor: '#F7B7BC', borderRadius: 14 }, text: { color: '#FFFFFF' } },
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
          customStyles: { container: { backgroundColor: '#FFD27E', borderRadius: 14 }, text: { color: '#FFFFFF' } },
        };
      } else {
        // Notice period: amber
        marks[ds] = {
          disabled: true, disableTouchEvent: true,
          customStyles: { container: { backgroundColor: '#FFD98F', borderRadius: 14 }, text: { color: '#FFFFFF' } },
        };
      }
      cur.setDate(cur.getDate() + 1);
    }

    // Blocked by owner: darker red
    blockedDates.forEach(ds => {
      if (!marks[ds]) {
        marks[ds] = {
          disabled: true, disableTouchEvent: true,
          customStyles: { container: { backgroundColor: '#FB7185', borderRadius: 14 }, text: { color: '#FFFFFF' } },
        };
      }
    });

    // Selected dates: blue cells
    selectedDates.forEach((date, i) => {
      marks[date] = {
        customStyles: {
          container: {
            backgroundColor: '#2563EB',
            borderRadius: 14,
            borderWidth: 0,
          },
          text: {
            color: '#FFFFFF',
            fontWeight: '700',
          },
        },
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

  const selectedDatesLabel = useMemo(() => {
    if (selectedDates.length === 0) return '';
    const sorted = [...selectedDates].sort();
    return sorted.length === 1
      ? new Date(sorted[0]).toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })
      : t('listingDetail.selectedDatesSummary', {
          count: sorted.length,
          dates: sorted
            .map((date) => new Date(date).toLocaleDateString(locale, { month: 'short', day: 'numeric' }))
            .join(', '),
        });
  }, [locale, selectedDates, t]);

  // Submit rental request inline
  const handleSubmitRental = async () => {
    if (!listing || !userEmail || selectedDates.length === 0) return;
    setIsSubmittingRental(true);
    try {
      const sorted = [...selectedDates].sort();
      const startDate = new Date(sorted[0]).toISOString();
      const endDate = new Date(sorted[sorted.length - 1]).toISOString();

      const kycCheckRes = await api.get('/rental-requests/kyc-check', {
        params: {
          item_id: listing.id,
          start_date: startDate,
          end_date: endDate,
        },
      }).catch(() => null);
      const kycCheck = kycCheckRes?.data?.data;

      if (kycCheck?.user_kyc_status) {
        setBackendUser((prev: any) => ({
          ...(prev || {}),
          kyc_status: kycCheck.user_kyc_status,
        }));
      }

      if (kycCheck?.kyc_required) {
        if (kycCheck.user_kyc_status === 'pending') {
          toast.info(t('listingDetail.kycProcessing'));
          return;
        }
        const riskLabel = kycCheck.risk_trigger === 'amount'
          ? t('listingDetail.riskHighValue')
          : kycCheck.risk_trigger === 'category'
            ? t('listingDetail.riskHighCategory')
            : t('listingDetail.riskVerificationRequired');
        setIdentityVerificationReason(riskLabel);
        setShowIdentityVerificationCard(true);
        return;
      }

      const ownerEmail = owner?.email ?? listing.ownerId;
      const res = await api.post('/rental-requests', {
        item_id: listing.id,
        renter_email: userEmail,
        owner_email: ownerEmail,
        start_date: startDate,
        end_date: endDate,
        message: rentalMessage || t('listingDetail.inquiryDefault'),
        status: (listing as any).instant_booking ? 'approved' : 'pending',
      });
      const requestId = res.data?.data?.id || res.data?.id || res.data?.data?._id || res.data?._id;
      if (requestId) {
        await api.post('/messages', {
          rental_request_id: requestId,
          sender_email: userEmail,
          content: rentalMessage || t('listingDetail.inquiryDefault'),
          message_type: 'text',
        }).catch(() => {});
      }
      setSubmittedRequestSummary({
        listingTitle: listing.title,
        datesLabel: selectedDatesLabel,
        totalCost: rentalCosts.totalCost,
        instantBooking: Boolean((listing as any).instant_booking),
      });
      setSelectedDates([]);
      setRangeStart(null);
      setRentalMessage('');
      setRequestSentSuccessfully(true);
    } catch (err: any) {
      const data = err?.response?.data;
      if (data?.kyc_required) {
        if (backendUser?.kyc_status === 'pending') {
          toast.info(t('listingDetail.kycProcessing'));
        } else {
          const riskLabel = data.risk_trigger === 'amount' ? t('listingDetail.riskHighValue') : data.risk_trigger === 'category' ? t('listingDetail.riskHighCategory') : t('listingDetail.riskVerificationRequired');
          setIdentityVerificationReason(riskLabel);
          setShowIdentityVerificationCard(true);
        }
      } else {
        toast.error(data?.error || t('listingDetail.submitRequestFailed'));
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
      const nextUser = userRes.data?.data || userRes.data;
      setBackendUser(nextUser);
      return nextUser;
    } catch (_) {
      return null;
    }
  }, []);

  const waitForVerifiedKyc = useCallback(async (attempts = 8, delayMs = 2000) => {
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const latestUser = await refreshBackendUser();
      const kycStatus = latestUser?.kyc_status;
      if (kycStatus === 'verified' || kycStatus === 'failed') {
        return latestUser;
      }
      if (attempt < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
    return backendUser;
  }, [backendUser, refreshBackendUser]);

  const API_BASE = (process.env.EXPO_PUBLIC_API_URL || 'http://172.28.145.1:5000/api').replace(/\/api$/, '');
  const identityReturnUrl = `${API_BASE}/api/stripe/app-return/identity`;
  const cardReturnUrl = `${API_BASE}/api/stripe/app-return/profile`;
  const bankReturnUrl = `${API_BASE}/api/stripe/app-return/stripe/confirm`;
  const nativeIdentityCallback = 'rentany://identity-verified';
  const nativeCardCallback = 'rentany://payment-setup-complete';
  const nativeBankCallback = 'rentany://bank-connect-complete';

  const openStripeAndWatchReturn = (url: string, returnUrl: string, onReturn: () => void) => {
    WebBrowser.openAuthSessionAsync(url, returnUrl).then(() => {
      onReturn();
    });
  };

  const handleStartKyc = async () => {
    setIsStartingKyc(true);
    try {
      const res = await api.post('/stripe/identity/create-session', {
        from: 'rental-request',
        item_id: listing?.id,
        mobile_return_url: identityReturnUrl,
      });
      const url = res.data?.data?.url || res.data?.url;
      if (!url) {
        toast.error(t('listingDetail.verificationStartFailed'));
        setIsStartingKyc(false);
        return;
      }
      openStripeAndWatchReturn(url, nativeIdentityCallback, async () => {
        const latestUser = await waitForVerifiedKyc();
        const latestKycStatus = latestUser?.kyc_status;

        if (latestKycStatus === 'verified') {
          setShowIdentityVerificationCard(false);
          setIdentityVerificationReason(null);
          toast.success(t('listingDetail.verificationComplete'));
        } else if (latestKycStatus === 'failed') {
          setShowIdentityVerificationCard(true);
          toast.error(t('listingDetail.verificationRetry'));
        } else {
          setShowIdentityVerificationCard(false);
          setIdentityVerificationReason(null);
          toast.info(t('listingDetail.verificationSubmitted'));
        }

        setIsStartingKyc(false);
      });
    } catch (err: any) {
      toast.error(err?.response?.data?.error || t('listingDetail.startVerificationFailed'));
      setIsStartingKyc(false);
    }
  };

  const handleConnectCard = async () => {
    setIsConnectingCard(true);
    try {
      const res = await api.post('/stripe/payment-method/setup', {
        mobile_success_url: cardReturnUrl,
      });
      const url = res.data?.data?.url || res.data?.url;
      if (!url) { setIsConnectingCard(false); return; }

      openStripeAndWatchReturn(url, nativeCardCallback, async () => {
        await refreshBackendUser();
        setIsConnectingCard(false);
      });
    } catch (err: any) {
      toast.error(err?.response?.data?.error || t('listingDetail.cardSetupFailed'));
      setIsConnectingCard(false);
    }
  };

  const handleConnectBank = async () => {
    setIsConnectingBank(true);
    try {
      const res = await api.post('/stripe/connect/onboarding', {
        origin: API_BASE,
        return_path: '/profile',
        mobile_return_url: bankReturnUrl,
      });
      const url = res.data?.data?.url || res.data?.url;
      if (!url) { setIsConnectingBank(false); return; }

      openStripeAndWatchReturn(url, nativeBankCallback, async () => {
        await refreshBackendUser();
        setIsConnectingBank(false);
        // After bank connect, prompt to add card if not yet connected
        const userRes = await api.get('/users/me').catch(() => null);
        const updatedUser = userRes?.data?.data || userRes?.data;
        if (updatedUser && !updatedUser.stripe_payment_method_id) {
          Alert.alert(
            t('listingDetail.bankConnectedTitle'),
            t('listingDetail.bankConnectedPrompt'),
            [
              { text: t('listingDetail.later'), style: 'cancel' },
              { text: t('listingDetail.connectCard'), onPress: () => handleConnectCard() },
            ],
          );
        }
      });
    } catch (err: any) {
      toast.error(err?.response?.data?.error || t('listingDetail.bankSetupFailed'));
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
      const msg = err?.response?.data?.error || t('listingDetail.sendMessageFailed');
      toast.error(msg);
    } finally {
      setIsSendingInquiry(false);
    }
  };

  const handleToggleAvailability = () => {
    if (!listing) return;
    Alert.alert(
      listing.isActive ? t('listingDetail.hideConfirmTitle') : t('listingDetail.availableConfirmTitle'),
      listing.isActive ? t('listingDetail.hideConfirmBody') : t('listingDetail.availableConfirmBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.apply'),
          onPress: async () => {
            try {
              await listingService.updateItem(listing.id, {
                availability: !listing.isActive,
              });
              fetchListingById(listingId);
            } catch {
              toast.error(t('listingDetail.availabilityUpdateFailed'));
            }
          },
        },
      ],
    );
  };

  const handleDeleteItem = () => {
    if (!listing) return;
    Alert.alert(
      t('listingDetail.deleteConfirmTitle'),
      t('listingDetail.deleteConfirmBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteItem(listing.id);
              navigation.goBack();
            } catch {
              toast.error(t('listingDetail.deleteFailed'));
            }
          },
        },
      ],
    );
  };


  if (isLoading || !listing || listing.id !== listingId) {
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
  const isAdmin = backendUser?.role === 'admin';
  const locationText =
    typeof listing.location === 'object' && listing.location !== null
      ? listing.location.address || listing.location.city || ''
      : String(listing.location || '');

  return (
    <View style={styles.mainContainer}>
      <GlobalHeader />
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
        }
      >
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
              <Text style={styles.headerIconText}>{t('listingDetail.share')}</Text>
            </TouchableOpacity>
            {!isOwner && (
              <TouchableOpacity
                style={[styles.reportButton, hasOpenListingReport && styles.reportButtonDisabled]}
                onPress={handleReport}
                disabled={hasOpenListingReport}
              >
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
                <Text style={styles.videoText}>{t('listingDetail.video')}</Text>
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
                  <Text style={styles.unavailableText}>{t('listingDetail.notAvailable')}</Text>
                </View>
              </View>
            )}
            {/* Instant booking badge */}
            {listing.instant_booking && (
              <View style={styles.instantBadge}>
                <MaterialCommunityIcons name="lightning-bolt" size={14} color="#FFFFFF" />
                <Text style={styles.instantBadgeText}>{t('listingDetail.instantBooking')}</Text>
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
              <Text style={styles.priceUnit}>{t('listingDetail.perDay')}</Text>
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

          {/* Ask Question & AI Assistant - only for non-owners, non-admins */}
          {!isOwner && !isAdmin && (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={[styles.askQuestionBtn, { flex: 1 }]} onPress={() => setShowInquiryModal(true)}>
                <MaterialCommunityIcons name="chat-outline" size={20} color={colors.textPrimary} />
                <Text style={styles.askQuestionText}>{t('listingDetail.askOwner')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.askQuestionBtn, { flex: 1, borderColor: '#8B5CF6' }]}
                onPress={() => setShowAIChat(true)}
              >
                <MaterialCommunityIcons name="robot" size={20} color="#8B5CF6" />
                <Text style={[styles.askQuestionText, { color: '#8B5CF6' }]}>{t('listingDetail.aiAssistant')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Info Grid */}
          <View style={styles.infoGrid}>
            <View style={styles.infoRow}>
              <View style={styles.infoLabelContainer}>
                <MaterialCommunityIcons name="shield-outline" size={18} color={colors.textSecondary} />
                <Text style={styles.infoLabel}>{t('listingDetail.securityDeposit')}</Text>
              </View>
              <Text style={styles.infoValue}>${listing.deposit ?? 0}</Text>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.infoLabelContainer}>
                <MaterialCommunityIcons name="clock-outline" size={18} color={colors.textSecondary} />
                <Text style={styles.infoLabel}>{t('listingDetail.minMaxDays')}</Text>
              </View>
              <Text style={styles.infoValue}>
                {listing.min_rental_days ?? 1} - {listing.max_rental_days ?? 30} {t('listingDetail.days')}
              </Text>
            </View>
            {listing.rating > 0 && (
              <View style={styles.infoRow}>
                <View style={styles.infoLabelContainer}>
                  <MaterialCommunityIcons name="star" size={18} color="#F59E0B" />
                  <Text style={styles.infoLabel}>{t('listingDetail.rating')}</Text>
                </View>
                <Text style={styles.infoValue}>
                  {listing.rating.toFixed(1)} ({t('listingDetail.reviews', { count: listing.totalReviews })})
                </Text>
              </View>
            )}
          </View>

          {/* Pricing Tiers */}
          {listing.pricing_tiers && listing.pricing_tiers.length > 0 && (
            <View style={styles.pricingTiersBox}>
              <Text style={styles.pricingTiersTitle}>{t('listingDetail.specialPricing')}</Text>
              {listing.pricing_tiers
                .sort((a, b) => a.days - b.days)
                .map((tier, idx) => (
                  <View key={idx} style={styles.tierRow}>
                    <Text style={styles.tierLabel}>{t('listingDetail.rentFor', { days: tier.days, unit: tier.days === 1 ? t('listingDetail.day') : t('listingDetail.days') })}</Text>
                    <Text style={styles.tierValue}>
                      ${(tier.price || 0).toFixed(2)}{' '}
                      <Text style={styles.tierPerDay}>{t('listingDetail.perDayPrice', { price: (tier.price / tier.days || 0).toFixed(2) })}</Text>
                    </Text>
                  </View>
                ))}
            </View>
          )}

          {/* Delivery Options */}
          <View style={styles.deliverySection}>
            <Text style={styles.deliveryTitle}>{t('listingDetail.deliveryOptions')}</Text>
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
                      ? t('listingDetail.pickupAtLocation')
                      : t('listingDetail.deliveryWithFee', { fee: listing.delivery_fee ?? 0 })}
                  </Text>
                </View>
              ))
            ) : (
              <View style={styles.deliveryBadge}>
                <MaterialCommunityIcons name="map-marker" size={14} color="#EF4444" />
                <Text style={styles.deliveryText}>{t('listingDetail.pickupAtLocation')}</Text>
              </View>
            )}
            {listing.delivery_options?.includes('delivery') &&
              listing.delivery_fee != null &&
              listing.delivery_fee > 0 && (
                <Text style={styles.deliveryFeeNote}>
                  {t('listingDetail.deliveryFeeNote', {
                    fee: listing.delivery_fee,
                    radius: listing.delivery_radius ? t('listingDetail.deliveryRadius', { value: listing.delivery_radius }) : '',
                  })}
                </Text>
              )}
          </View>
        </View>

        {/* About Section */}
        <View style={styles.sectionCard}>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            {t('listingDetail.aboutItem')}
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
              <Text variant="titleMedium" style={styles.ownerName}>{t('listingDetail.owner')}</Text>
              <Text style={styles.ownerHandle}>
                {owner?.username
                  ? `@${owner.username}`
                  : owner?.full_name || t('listingDetail.fallbackUser')}
              </Text>
            </View>
            {!isOwner && owner?.email && (
              <TouchableOpacity
                style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#F3F4F6', borderRadius: 8 }}
                onPress={() => (navigation as any).navigate('PublicProfile', { userEmail: owner.email })}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151' }}>{t('listingDetail.viewProfile')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Owner Management Section */}
        {isOwner && (
          <View style={styles.ownerManageCard}>
            <View style={styles.ownerManageHeader}>
              <MaterialCommunityIcons name="cog" size={20} color="#FFFFFF" />
              <Text style={styles.ownerManageTitle}>{t('listingDetail.manageListing')}</Text>
            </View>
            <View style={styles.ownerManageBody}>
              {backendUser && !backendUser.payouts_enabled && (
                <View style={styles.connectBankPromptCard}>
                  <View style={styles.connectBankPromptHeader}>
                    <View style={styles.connectBankPromptIcon}>
                      <MaterialCommunityIcons name="bank-outline" size={18} color="#15803D" />
                    </View>
                    <View style={styles.connectBankPromptCopy}>
                      <Text style={styles.connectBankPromptTitle}>{t('listingDetail.connectBankTitle')}</Text>
                      <Text style={styles.connectBankPromptDesc}>
                        {t('listingDetail.connectBankDescription')}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.connectBankPromptBtn, isConnectingBank && styles.connectCardBtnDisabled]}
                    onPress={handleConnectBank}
                    disabled={isConnectingBank}
                  >
                    {isConnectingBank ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <MaterialCommunityIcons name="bank-outline" size={18} color="#FFFFFF" />
                        <Text style={styles.connectBankPromptBtnText}>{t('listingDetail.connectBankAction')}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* Edit Item Details */}
              <TouchableOpacity
                style={styles.manageBtn}
                onPress={() => (navigation as any).navigate('EditItem', { itemId: listing.id })}
              >
                <MaterialCommunityIcons name="pencil-outline" size={20} color="#475569" />
                <Text style={styles.manageBtnText}>{t('listingDetail.editItemDetails')}</Text>
                <MaterialCommunityIcons name="chevron-right" size={18} color="#CBD5E1" />
              </TouchableOpacity>

              {/* Manage Availability */}
              <TouchableOpacity
                style={styles.manageBtn}
                onPress={() => (navigation as any).navigate('ManageAvailability', { itemId: listing.id, itemTitle: listing.title })}
              >
                <MaterialCommunityIcons name="calendar-month-outline" size={20} color="#475569" />
                <Text style={styles.manageBtnText}>{t('listingDetail.manageAvailability')}</Text>
                <MaterialCommunityIcons name="chevron-right" size={18} color="#CBD5E1" />
              </TouchableOpacity>

              {/* View Analytics */}
              <TouchableOpacity
                style={styles.manageBtn}
                onPress={() => toast.info(t('listingDetail.analyticsSoon'))}
              >
                <MaterialCommunityIcons name="trending-up" size={20} color="#475569" />
                <Text style={styles.manageBtnText}>{t('listingDetail.viewAnalytics')}</Text>
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
                  {listing.isActive ? t('listingDetail.hideListing') : t('listingDetail.makeAvailable')}
                </Text>
              </TouchableOpacity>

              {/* Delete Item */}
              <TouchableOpacity
                style={styles.manageBtnDelete}
                onPress={handleDeleteItem}
              >
                <MaterialCommunityIcons name="trash-can-outline" size={20} color="#FFFFFF" />
                <Text style={styles.manageBtnDeleteText}>{t('listingDetail.deleteItem')}</Text>
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
                <Text style={styles.noticeBold}>{t('listingDetail.earliestPickup')}</Text>
                {earliestAvailableDate.toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </Text>
              {noticePeriodHours > 0 && (
                <Text style={styles.noticeSubtext}>
                  {noticePeriodHours === 1
                    ? t('listingDetail.ownerNoticeHours', { count: noticePeriodHours })
                    : t('listingDetail.ownerNoticeHours_plural', { count: noticePeriodHours })}
                </Text>
              )}
              {!sameDayPickup && noticePeriodHours === 0 && (
                <Text style={styles.noticeSubtext}>
                  {t('listingDetail.noSameDayPickup')}
                </Text>
              )}
            </View>
          </View>
        )}
        {/* Admin cannot rent notice */}
        {isAdmin && !isOwner && (
          <View style={[styles.sectionCard, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A', borderWidth: 1 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <MaterialCommunityIcons name="shield-account" size={24} color="#D97706" />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#92400E' }}>{t('listingDetail.adminAccount')}</Text>
                <Text style={{ fontSize: 13, color: '#A16207', marginTop: 2 }}>{t('listingDetail.adminAccountNote')}</Text>
              </View>
            </View>
          </View>
        )}

        {!isOwner && !isAdmin && listing.availability !== false && (
          backendUser && !backendUser.stripe_payment_method_id ? (
            // Connect card section — aligned with frontend-v1 VerificationPrompt layout
            <View style={[styles.sectionCard, styles.connectRentCard]}>
              <View style={styles.connectCardHeader}>
                <View style={styles.connectCardIconBg}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={26} color="#2563EB" />
                </View>
                <Text variant="titleMedium" style={styles.connectCardTitle}>{t('listingDetail.connectCardTitle')}</Text>
                <Text style={styles.connectCardDesc}>
                  {t('listingDetail.connectCardDescription')}
                </Text>

                <View style={styles.connectStatusRow}>
                  <View style={styles.statusBadge}>
                    <MaterialCommunityIcons name="shield-outline" size={12} color="#475569" />
                    <Text style={styles.statusBadgeText}>{t('listingDetail.cardNotConnected')}</Text>
                  </View>
                </View>

                <View style={styles.connectInfoBox}>
                  <MaterialCommunityIcons name="information-outline" size={18} color="#2563EB" />
                  <Text style={styles.connectInfoText}>
                    {t('listingDetail.connectCardInfo')}
                  </Text>
                </View>
              </View>

              <View style={styles.connectActions}>
                <TouchableOpacity
                  style={[styles.connectCardBtnRent, isConnectingCard && styles.connectCardBtnDisabled]}
                  onPress={handleConnectCard}
                  disabled={isConnectingCard}
                >
                  {isConnectingCard ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="shield-outline" size={18} color="#2563EB" />
                      <Text style={styles.connectCardBtnText}>{t('listingDetail.connectCardAction')}</Text>
                    </>
                  )}
                </TouchableOpacity>

                {(backendUser?.verification_status === 'unverified' || !backendUser?.verification_status) && (
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
                        <Text style={styles.connectBankBtnText}>{t('listingDetail.connectBankLendAction')}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>

              <Text style={styles.stripeDisclaimer}>
                {t('listingDetail.stripeDisclaimer')}
              </Text>
            </View>
          ) : (
            // Availability calendar + rental request
            <>
              {requestSentSuccessfully ? (
                /* Success card — shown after request is submitted */
                <View style={styles.sectionCard}>
                  <View style={styles.successCard}>
                    <TouchableOpacity
                      style={styles.successCloseBtn}
                      onPress={() => setRequestSentSuccessfully(false)}
                    >
                      <MaterialCommunityIcons name="close" size={24} color="#64748B" />
                    </TouchableOpacity>

                    <View style={styles.successIconBg}>
                      <MaterialCommunityIcons name="check" size={44} color="#FFFFFF" />
                    </View>

                    <Text variant="titleLarge" style={styles.successTitle}>
                      {(submittedRequestSummary?.instantBooking ?? (listing as any).instant_booking)
                        ? t('listingDetail.bookingConfirmed')
                        : t('listingDetail.requestSent')}
                    </Text>

                    <Text style={styles.successDesc}>
                      {(submittedRequestSummary?.instantBooking ?? (listing as any).instant_booking)
                        ? t('listingDetail.bookingConfirmedBody', { title: submittedRequestSummary?.listingTitle || listing?.title || '' })
                        : t('listingDetail.requestSentBody', { title: submittedRequestSummary?.listingTitle || listing?.title || '' })}
                    </Text>

                    <View style={styles.successSummaryCard}>
                      <View style={styles.successSummaryRow}>
                        <MaterialCommunityIcons name="clock-outline" size={20} color="#64748B" />
                        <Text style={styles.successSummaryText}>
                          {submittedRequestSummary?.datesLabel || selectedDatesLabel}
                        </Text>
                      </View>
                      <View style={styles.successSummaryRow}>
                        <MaterialCommunityIcons name="credit-card-outline" size={20} color="#64748B" />
                        <Text style={styles.successSummaryTotal}>
                          {t('listingDetail.total', { value: Number(submittedRequestSummary?.totalCost ?? rentalCosts.totalCost).toFixed(2) })}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.successInfoCard}>
                      <Text style={styles.successInfoTitle}>{t('listingDetail.whatNext')}</Text>
                      {(submittedRequestSummary?.instantBooking ?? (listing as any).instant_booking) ? (
                        <>
                          <Text style={styles.successInfoItem}>{t('listingDetail.nextConfirmed1')}</Text>
                          <Text style={styles.successInfoItem}>{t('listingDetail.nextConfirmed2')}</Text>
                          <Text style={styles.successInfoItem}>{t('listingDetail.nextConfirmed3')}</Text>
                        </>
                      ) : (
                        <>
                          <Text style={styles.successInfoItem}>{t('listingDetail.nextPending1')}</Text>
                          <Text style={styles.successInfoItem}>{t('listingDetail.nextPending2')}</Text>
                          <Text style={styles.successInfoItem}>{t('listingDetail.nextPending3')}</Text>
                        </>
                      )}
                    </View>

                    <TouchableOpacity
                      style={styles.successConvBtn}
                      onPress={() => (navigation as any).navigate('MyConversations')}
                    >
                      <MaterialCommunityIcons name="chat-outline" size={20} color="#FFFFFF" />
                      <Text style={styles.successConvBtnText}>{t('listingDetail.viewConversation')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.successSecondaryBtn}
                      onPress={() => setRequestSentSuccessfully(false)}
                    >
                      <Text style={styles.successSecondaryBtnText}>{t('listingDetail.continueBrowsing')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
              <>
              {/* Calendar */}
              <View style={[styles.sectionCard, styles.calendarCard]}>
                <Text variant="titleMedium" style={styles.calendarTitle}>{t('listingDetail.selectRentalDates')}</Text>

                {/* Legend */}
                <View style={styles.legendRow}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#F67B86' }]} />
                    <Text style={styles.legendText}>{t('listingDetail.pastDates')}</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#FFBE55' }]} />
                    <Text style={styles.legendText}>{t('listingDetail.noticePeriodLegend')}</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#FFB347' }]} />
                    <Text style={styles.legendText}>{t('listingDetail.sameDayUnavailable')}</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#FB7185' }]} />
                    <Text style={styles.legendText}>{t('listingDetail.blockedByOwner')}</Text>
                  </View>
                </View>

                <Text style={styles.calendarHint}>
                  {selectedDates.length === 0
                    ? t('listingDetail.tapStartDate')
                    : selectedDates.length === 1
                    ? t('listingDetail.tapEndDate')
                    : t('listingDetail.daysSelected', { count: selectedDates.length })}
                </Text>
                <View style={styles.calNavRow}>
                  <TouchableOpacity
                    style={styles.calNavIconBtn}
                    onPress={() => setMonthOffset(o => Math.max(0, o - 1))}
                    disabled={monthOffset === 0}
                  >
                    <MaterialCommunityIcons name="chevron-left" size={28} color={monthOffset === 0 ? '#CBD5E1' : '#111827'} />
                  </TouchableOpacity>
                  <Text style={styles.calNavTitle}>{currentCalendarLabel}</Text>
                  <TouchableOpacity
                    style={styles.calNavIconBtn}
                    onPress={() => setMonthOffset(o => o + 1)}
                  >
                    <MaterialCommunityIcons name="chevron-right" size={28} color="#111827" />
                  </TouchableOpacity>
                </View>

                {/* Month 1 — key forces remount when monthOffset changes */}
                <Calendar
                  key={`m1-${monthOffset}`}
                  current={`${currentCalendarDate.getFullYear()}-${String(currentCalendarDate.getMonth()+1).padStart(2,'0')}-01`}
                  markingType="custom"
                  markedDates={markedDates}
                  onDayPress={handleDayPress}
                  minDate={new Date().toISOString().split('T')[0]}
                  hideArrows={true}
                  disableMonthChange={true}
                  hideExtraDays={false}
                  renderHeader={() => <View />}
                  style={styles.calendarMonth}
                  theme={{
                    calendarBackground: '#FFFFFF',
                    textSectionTitleColor: '#6B7280',
                    dayTextColor: '#111827',
                    monthTextColor: '#111827',
                    textDisabledColor: '#9CA3AF',
                    textDayFontSize: 15,
                    textDayHeaderFontSize: 13,
                    textDayFontWeight: '500',
                    textMonthFontSize: 22,
                    textMonthFontWeight: '800',
                  }}
                />
                <Text style={styles.secondaryCalendarTitle}>{nextCalendarLabel}</Text>
                {/* Month 2 — key forces remount when monthOffset changes */}
                <Calendar
                  key={`m2-${monthOffset}`}
                  current={`${nextCalendarDate.getFullYear()}-${String(nextCalendarDate.getMonth()+1).padStart(2,'0')}-01`}
                  markingType="custom"
                  markedDates={markedDates}
                  onDayPress={handleDayPress}
                  minDate={new Date().toISOString().split('T')[0]}
                  hideArrows={true}
                  disableMonthChange={true}
                  hideExtraDays={false}
                  renderHeader={() => <View />}
                  style={styles.calendarMonth}
                  theme={{
                    calendarBackground: '#FFFFFF',
                    textSectionTitleColor: '#6B7280',
                    dayTextColor: '#111827',
                    monthTextColor: '#111827',
                    textDisabledColor: '#9CA3AF',
                    textDayFontSize: 15,
                    textDayHeaderFontSize: 13,
                    textDayFontWeight: '500',
                    textMonthFontSize: 22,
                    textMonthFontWeight: '800',
                  }}
                />
                {selectedDates.length > 0 && (
                  <TouchableOpacity
                    onPress={() => { setSelectedDates([]); setRangeStart(null); }}
                    style={styles.clearDatesBtn}
                  >
                    <Text style={styles.clearDatesText}>{t('listingDetail.clearDates')}</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Rental request card — always visible, shows prompt or form */}
              <View style={[styles.sectionCard, styles.rentalRequestCard]}>
                <Text variant="titleMedium" style={styles.rentalCardTitle}>{t('listingDetail.requestToRent')}</Text>


                {selectedDates.length === 0 ? (
                  /* No dates selected yet — prompt */
                  <View style={styles.selectDatesPrompt}>
                    <Text style={styles.selectDatesText}>
                      {t('listingDetail.selectDatesPrompt')}
                    </Text>
                  </View>
                ) : (
                  <>
                    {/* Cost breakdown — matches frontend-v1 exactly */}
                    <View style={styles.costBox}>
                      {/* Rental period: "5 dates: Jan 15, Jan 16, ..." */}
                      <View style={styles.costRow}>
                        <Text style={styles.costLabel}>{t('listingDetail.rentalPeriod')}</Text>
                        <Text style={[styles.costValue, { flex: 1, textAlign: 'right' }]}>
                          {selectedDatesLabel}
                        </Text>
                      </View>
                      {/* Rental cost */}
                      <View style={styles.costRow}>
                        <Text style={styles.costLabel}>{t('listingDetail.rentalCost', { count: selectedDates.length })}</Text>
                        <Text style={styles.costValue}>${rentalCosts.rentalCost.toFixed(2)}</Text>
                      </View>
                      {/* Platform fee */}
                      <View style={styles.costRow}>
                        <Text style={styles.costLabel}>{t('listingDetail.platformFee')}</Text>
                        <Text style={styles.costValue}>${rentalCosts.platformFee.toFixed(2)}</Text>
                      </View>
                      {/* Total — includes deposit silently, same as frontend-v1 */}
                      <View style={[styles.costRow, styles.costTotalRow]}>
                        <Text style={styles.costTotalLabel}>{t('listingDetail.totalPrice')}</Text>
                        <Text style={styles.costTotalValue}>${rentalCosts.totalCost.toFixed(2)}</Text>
                      </View>
                    </View>

                    {/* Message to owner */}
                    <Text style={styles.messageLabel}>{t('listingDetail.messageToOwner')}</Text>
                    <TextInput
                      style={styles.messageInput}
                      value={rentalMessage}
                      onChangeText={setRentalMessage}
                      placeholder={t('listingDetail.messagePlaceholder')}
                      placeholderTextColor="#94A3B8"
                      multiline
                      numberOfLines={3}
                    />

                    {/* KYC status banner — shown if user's KYC is pending or failed */}
                    {backendUser?.kyc_status === 'pending' && (
                      <View style={styles.kycBanner}>
                        <MaterialCommunityIcons name="clock-outline" size={16} color="#92400E" />
                        <Text style={styles.kycBannerText}>{t('listingDetail.kycPending')}</Text>
                      </View>
                    )}
                    {backendUser?.kyc_status === 'failed' && (
                      <View style={[styles.kycBanner, styles.kycBannerError]}>
                        <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#B91C1C" />
                        <Text style={[styles.kycBannerText, styles.kycBannerErrorText]}>
                          {t('listingDetail.kycFailed')}
                        </Text>
                        <TouchableOpacity
                          onPress={() => setShowIdentityVerificationCard(true)}
                          disabled={isStartingKyc}
                        >
                          <Text style={styles.kycRetryText}>{isStartingKyc ? t('listingDetail.starting') : t('listingDetail.verify')}</Text>
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
                        <Text style={styles.submitRentalBtnText}>{t('listingDetail.confirmAndSend')}</Text>
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
            <Text style={styles.signInPrompt}>{t('listingDetail.signInPrompt')}</Text>
            <TouchableOpacity
              style={styles.signInBtn}
              onPress={() => (navigation as any).navigate('Auth')}
            >
              <Text style={styles.signInBtnText}>{t('listingDetail.signIn')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Similar Items */}
        {similarItems.length > 0 && (
          <View style={styles.similarSection}>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              {t('listingDetail.similarItems')}
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

      <Modal
        visible={showIdentityVerificationCard}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowIdentityVerificationCard(false);
          setIdentityVerificationReason(null);
        }}
      >
        <View style={styles.identityModalOverlay}>
          <TouchableOpacity
            style={styles.identityModalBackdrop}
            activeOpacity={1}
            onPress={() => {
              setShowIdentityVerificationCard(false);
              setIdentityVerificationReason(null);
            }}
          />
          <View style={styles.identityModalCard}>
            <View style={styles.identityHeader}>
              <MaterialCommunityIcons name="shield-outline" size={38} color="#111827" />
              <Text style={styles.identityTitle}>{t('listingDetail.idVerification')}</Text>
            </View>
            <Text style={styles.identityDescription}>
              {t('listingDetail.idVerificationRequired')}
            </Text>
            <Text style={styles.identityDescription}>
              {t('listingDetail.idVerificationStripe')}
            </Text>
            {identityVerificationReason ? (
              <Text style={styles.identityReason}>{t('listingDetail.reason', { value: identityVerificationReason })}</Text>
            ) : null}
            <TouchableOpacity
              style={[styles.identityPrimaryBtn, isStartingKyc && styles.identityPrimaryBtnDisabled]}
              onPress={handleStartKyc}
              disabled={isStartingKyc}
            >
              {isStartingKyc ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.identityPrimaryBtnText}>{t('listingDetail.startVerification')}</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.identitySecondaryBtn}
              onPress={() => {
                setShowIdentityVerificationCard(false);
                setIdentityVerificationReason(null);
              }}
            >
              <MaterialCommunityIcons name="arrow-left" size={20} color="#111827" />
              <Text style={styles.identitySecondaryBtnText}>{t('common.back')}</Text>
            </TouchableOpacity>
            <Text style={styles.identityFooterText}>{t('listingDetail.profile')}</Text>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showReportModal}
        transparent
        animationType="fade"
        onRequestClose={resetReportForm}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.reportModalOverlay}
        >
          <TouchableOpacity
            style={styles.reportModalBackdrop}
            activeOpacity={1}
            onPress={resetReportForm}
          />
          <View style={styles.reportModalCard}>
            <View style={styles.reportModalHandle} />
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.reportModalScrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.reportModalHeader}>
                <View style={styles.reportModalTitleWrap}>
                  <MaterialCommunityIcons name="alert-outline" size={28} color="#8B1E1E" />
                  <Text style={styles.reportModalTitle}>{t('listingDetail.reportListing')}</Text>
                </View>
                <TouchableOpacity onPress={resetReportForm} style={styles.reportModalCloseBtn}>
                  <MaterialCommunityIcons name="close" size={24} color="#4B5563" />
                </TouchableOpacity>
              </View>

              <View style={styles.reportingBox}>
                <Text style={styles.reportingLabel}>
                  <Text style={styles.reportingLabelStrong}>{t('listingDetail.reporting')}</Text> {listing?.title}
                </Text>
              </View>

              <Text style={styles.reportFieldTitle}>{t('listingDetail.reasonForReport')}</Text>
              <TouchableOpacity
                style={styles.reportSelect}
                onPress={() => setShowReportReasons((prev) => !prev)}
              >
                <Text style={[styles.reportSelectText, !reportReason && styles.reportPlaceholderText]}>
                  {reportReasons.find((reason) => reason.value === reportReason)?.label || t('listingDetail.selectReason')}
                </Text>
                <MaterialCommunityIcons
                  name={showReportReasons ? 'chevron-up' : 'chevron-down'}
                  size={22}
                  color="#6B7280"
                />
              </TouchableOpacity>

              {showReportReasons && (
                <View style={styles.reportReasonList}>
                  {reportReasons.map((reason) => (
                    <TouchableOpacity
                      key={reason.value}
                      style={[
                        styles.reportReasonItem,
                        reportReason === reason.value && styles.reportReasonItemActive,
                      ]}
                      onPress={() => {
                        setReportReason(reason.value);
                        setShowReportReasons(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.reportReasonText,
                          reportReason === reason.value && styles.reportReasonTextActive,
                        ]}
                      >
                        {reason.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={styles.reportFieldTitle}>{t('listingDetail.detailedDescription')}</Text>
              <TextInput
                style={styles.reportDetailsInput}
                value={reportDetails}
                onChangeText={setReportDetails}
                placeholder={t('listingDetail.reportDescriptionPlaceholder')}
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />
              <Text style={styles.reportHelperText}>
                {t('listingDetail.reportDescriptionHint')}
              </Text>

              <Text style={styles.reportFieldTitle}>{t('listingDetail.evidence')}</Text>
              <Text style={styles.reportSubtext}>
                {t('listingDetail.evidenceHint')}
              </Text>
              <TouchableOpacity
                style={styles.reportEvidenceBtn}
                onPress={handlePickReportEvidence}
                disabled={isUploadingReportEvidence}
              >
                {isUploadingReportEvidence ? (
                  <ActivityIndicator size="small" color="#111827" />
                ) : (
                  <MaterialCommunityIcons name="upload-outline" size={20} color="#111827" />
                )}
                <Text style={styles.reportEvidenceBtnText}>
                  {isUploadingReportEvidence ? t('listingDetail.uploading') : t('listingDetail.addEvidence')}
                </Text>
              </TouchableOpacity>
              {reportEvidence.length > 0 && (
                <View style={styles.reportEvidenceList}>
                  {reportEvidence.map((file, index) => (
                    <View key={`${file.uri}-${index}`} style={styles.reportEvidenceChip}>
                      <Text style={styles.reportEvidenceChipText} numberOfLines={1}>
                        {file.name}
                      </Text>
                      <TouchableOpacity
                        onPress={() => setReportEvidence((prev) => prev.filter((_, itemIndex) => itemIndex !== index))}
                      >
                        <MaterialCommunityIcons name="close" size={16} color="#64748B" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.reportWarningBox}>
                <Text style={styles.reportWarningText}>
                  {t('listingDetail.reportWarning')}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.reportSubmitBtn, isSubmittingReport && styles.reportSubmitBtnDisabled]}
                onPress={handleSubmitReport}
                disabled={isSubmittingReport || isUploadingReportEvidence}
              >
                {isSubmittingReport ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.reportSubmitBtnText}>{t('listingDetail.submitReport')}</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.reportCancelBtn} onPress={resetReportForm}>
                <Text style={styles.reportCancelBtnText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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
            <Text variant="titleLarge" style={styles.modalTitle}>{t('listingDetail.askQuestion')}</Text>
            <Text style={styles.modalSubtitle}>
              {t('listingDetail.askQuestionBody', { title: listing?.title || '' })}
            </Text>
            <TextInput
              style={styles.modalTextInput}
              placeholder={t('listingDetail.askQuestionPlaceholder')}
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
                <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
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
                    <Text style={styles.modalSendText}>{t('listingDetail.sendMessage')}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowAIChat(true)}>
        <View style={styles.fabGradient}>
          <MaterialCommunityIcons name="robot" size={24} color="#FFFFFF" />
        </View>
      </TouchableOpacity>

      {/* AI Chat Assistant */}
      {listing && (
        <AIChatAssistant
          visible={showAIChat}
          onClose={() => setShowAIChat(false)}
          itemId={listing.id}
          itemTitle={listing.title}
          item={listing}
        />
      )}
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
  reportButtonDisabled: {
    opacity: 0.45,
  },
  reportModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
    justifyContent: 'flex-end',
  },
  reportModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  reportModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 26,
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8,
    maxHeight: '86%',
  },
  reportModalHandle: {
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 18,
  },
  reportModalScrollContent: {
    paddingBottom: 8,
  },
  reportModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  reportModalTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reportModalTitle: {
    color: '#8B1E1E',
    fontSize: 20,
    fontWeight: '800',
  },
  reportModalCloseBtn: {
    padding: 4,
  },
  reportingBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 22,
  },
  reportingLabel: {
    color: '#475569',
    fontSize: 16,
    fontWeight: '500',
  },
  reportingLabelStrong: {
    color: '#334155',
    fontWeight: '800',
  },
  reportFieldTitle: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
  },
  reportSelect: {
    height: 60,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    marginBottom: 14,
  },
  reportSelectText: {
    color: '#111827',
    fontSize: 16,
  },
  reportPlaceholderText: {
    color: '#6B7280',
  },
  reportReasonList: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    marginBottom: 14,
    paddingVertical: 10,
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  reportReasonItem: {
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  reportReasonItemActive: {
    backgroundColor: '#F8FAFC',
    marginHorizontal: 8,
    borderRadius: 10,
  },
  reportReasonText: {
    color: '#111827',
    fontSize: 15,
  },
  reportReasonTextActive: {
    fontWeight: '700',
  },
  reportDetailsInput: {
    minHeight: 170,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 18,
    padding: 18,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FCFCFD',
    marginBottom: 8,
  },
  reportHelperText: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 18,
  },
  reportSubtext: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
  reportEvidenceBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  reportEvidenceBtnText: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '600',
  },
  reportEvidenceList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  reportEvidenceChip: {
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 999,
    paddingLeft: 12,
    paddingRight: 10,
    paddingVertical: 8,
  },
  reportEvidenceChipText: {
    maxWidth: 180,
    color: '#475569',
    fontSize: 12,
  },
  reportWarningBox: {
    backgroundColor: '#FFFBEA',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 20,
  },
  reportWarningText: {
    color: '#92400E',
    fontSize: 14,
    lineHeight: 24,
  },
  reportWarningStrong: {
    fontWeight: '800',
  },
  reportSubmitBtn: {
    backgroundColor: '#F4757F',
    borderRadius: 16,
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  reportSubmitBtnDisabled: {
    opacity: 0.7,
  },
  reportSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  reportCancelBtn: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  reportCancelBtnText: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
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
  connectBankPromptCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 14,
    padding: 14,
    gap: 14,
    marginBottom: 4,
  },
  connectBankPromptHeader: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  connectBankPromptIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectBankPromptCopy: {
    flex: 1,
  },
  connectBankPromptTitle: {
    color: '#14532D',
    fontWeight: '800',
    fontSize: typography.body,
    marginBottom: 4,
  },
  connectBankPromptDesc: {
    color: '#166534',
    fontSize: typography.small,
    lineHeight: 18,
  },
  connectBankPromptBtn: {
    height: 46,
    borderRadius: 12,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  connectBankPromptBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: typography.body,
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
    marginBottom: 18,
  },
  connectCardIconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  connectCardTitle: {
    fontWeight: '800',
    color: '#111827',
    fontSize: 18,
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
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  connectInfoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  connectInfoText: {
    flex: 1,
    color: '#1D4ED8',
    fontSize: typography.body,
    lineHeight: 18,
  },
  connectRentCard: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 6,
    paddingTop: 24,
    paddingBottom: 24,
  },
  connectActions: {
    gap: 12,
    marginBottom: 16,
  },
  statusBadgeVerified: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    gap: 6,
  },
  statusBadgeVerifiedText: {
    fontSize: typography.small,
    fontWeight: '700',
    color: '#15803D',
  },
  statusBadgePending: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    gap: 6,
  },
  statusBadgePendingText: {
    fontSize: typography.small,
    fontWeight: '700',
    color: '#92400E',
  },
  connectCardPrompt: {
    color: '#475569',
    textAlign: 'center',
    fontSize: typography.body,
    marginBottom: 18,
  },
  connectCardBtnRent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 14,
    height: 52,
    gap: 8,
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
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  // Calendar
  calendarCard: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 6,
  },
  calendarTitle: {
    fontWeight: '800',
    color: '#111827',
    fontSize: 16,
    marginBottom: 16,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EAF3FF',
    borderColor: '#C6DCF9',
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 18,
    marginHorizontal: 16,
    marginBottom: 18,
    gap: 12,
  },
  noticeText: {
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 21,
  },
  noticeBold: {
    fontWeight: '800',
    color: '#1E40AF',
  },
  noticeSubtext: {
    fontSize: 12,
    color: '#3B82F6',
    marginTop: 6,
    lineHeight: 18,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 14,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 28,
    height: 28,
    borderRadius: 8,
  },
  legendText: {
    fontSize: 13,
    color: '#64748B',
  },
  calendarHint: {
    color: '#64748B',
    fontSize: 12,
    marginBottom: 16,
  },
  calNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  calNavIconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calNavTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  secondaryCalendarTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 14,
  },
  calendarMonth: {
    paddingBottom: 8,
  },
  clearDatesBtn: {
    alignSelf: 'center',
    marginTop: 14,
  },
  clearDatesText: {
    color: '#2563EB',
    fontSize: 13,
    fontWeight: '700',
  },
  selectDatesPrompt: {
    minHeight: 190,
    paddingHorizontal: 20,
    paddingTop: 44,
    paddingBottom: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectDatesText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 27,
  },
  // Rental request card
  rentalRequestCard: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 6,
  },
  rentalCardTitle: {
    fontWeight: '800',
    color: '#111827',
    fontSize: 16,
    marginBottom: 12,
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
    fontSize: 16,
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
    position: 'relative',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 8,
    gap: 16,
  },
  successCloseBtn: {
    position: 'absolute',
    top: 0,
    right: 0,
    padding: 4,
    zIndex: 1,
  },
  successIconBg: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: '#16D47B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  successTitle: {
    fontWeight: '800',
    fontSize: 24,
    color: '#111827',
    textAlign: 'center',
  },
  successDesc: {
    color: '#6B7280',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: 18,
  },
  successSummaryCard: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 18,
    gap: 14,
  },
  successSummaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  successSummaryText: {
    flex: 1,
    color: '#475569',
    fontSize: 15,
    lineHeight: 28,
  },
  successSummaryTotal: {
    flex: 1,
    color: '#111827',
    fontSize: 16,
    fontWeight: '800',
  },
  successInfoCard: {
    width: '100%',
    backgroundColor: '#EAF3FF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#C6DCF9',
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 10,
  },
  successInfoTitle: {
    color: '#1D4ED8',
    fontSize: 16,
    fontWeight: '800',
  },
  successInfoItem: {
    color: '#1D4ED8',
    fontSize: 15,
    lineHeight: 24,
  },
  successConvBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    backgroundColor: '#0F172A',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
    marginTop: 4,
  },
  successConvBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
  successSecondaryBtn: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 16,
  },
  successSecondaryBtnText: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
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
  kycBannerError: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  kycBannerErrorText: {
    color: '#991B1B',
  },
  kycRetryText: {
    color: '#B91C1C',
    fontWeight: '700',
    fontSize: 12,
  },
  identityModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  identityModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  identityModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 20,
    paddingVertical: 24,
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8,
  },
  identityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  identityTitle: {
    flex: 1,
    color: '#111827',
    fontSize: 20,
    fontWeight: '800',
  },
  identityDescription: {
    color: '#6B7280',
    fontSize: 14,
    lineHeight: 24,
    marginBottom: 14,
  },
  identityReason: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 16,
  },
  identityPrimaryBtn: {
    backgroundColor: '#171717',
    borderRadius: 14,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 14,
    paddingHorizontal: 16,
  },
  identityPrimaryBtnDisabled: {
    opacity: 0.7,
  },
  identityPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  identitySecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    minHeight: 54,
    backgroundColor: '#FFFFFF',
  },
  identitySecondaryBtnText: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '700',
  },
  identityFooterText: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 18,
  },
});
