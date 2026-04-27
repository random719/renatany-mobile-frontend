import { useUser } from '@clerk/expo';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as WebBrowser from 'expo-web-browser';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Text } from 'react-native-paper';
import { GlobalHeader } from '../../components/common/GlobalHeader';
import { useI18n } from '../../i18n';
import { getConditionReports } from '../../services/conditionReportService';
import { getMessages, sendMessage } from '../../services/messageService';
import { createCheckoutSession, releaseRentalPayment, syncPaymentStatus } from '../../services/paymentService';
import { getRentalRequestById, updateRentalRequestStatus } from '../../services/rentalService';
import { idenfyService } from '../../services/idenfyService';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../store/toastStore';
import { colors, typography } from '../../theme';
import { ConditionReport, Message, RentalRequest } from '../../types/models';
import { RootStackParamList } from '../../types/navigation';
import { getConditionReportRules } from '../../utils/conditionReportRules';
import { sortMessagesChronologically } from '../../utils/messageOrdering';
import { parseRentalBoundaryDate } from '../../utils/rentalDates';

type Nav = StackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'Chat'>;

const getLocale = (language: string) =>
  language === 'fr' ? 'fr-FR' : language === 'es' ? 'es-ES' : language === 'de' ? 'de-DE' : 'en-US';

const formatTimestamp = (iso: string, locale: string) =>
  new Date(iso).toLocaleString(locale, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

const CONDITION_REPORT_THEME = {
  pickup: {
    cardBg: '#EFF6FF',
    cardBorder: '#BFDBFE',
    icon: '#2563EB',
    badgeBg: '#DBEAFE',
    badgeText: '#1D4ED8',
    title: 'Pre-Rental Report',
  },
  return: {
    cardBg: '#F5F3FF',
    cardBorder: '#DDD6FE',
    icon: '#7C3AED',
    badgeBg: '#EDE9FE',
    badgeText: '#6D28D9',
    title: 'Return Report',
  },
} as const;

const MessageBubble = ({ msg, isOwn, locale }: { msg: Message; isOwn: boolean; locale: string }) => {
  if (msg.message_type === 'system') {
    return (
      <View style={bubbleStyles.systemRow}>
        <View style={bubbleStyles.systemPill}>
          <Text style={bubbleStyles.systemText}>{msg.content}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[bubbleStyles.row, isOwn ? bubbleStyles.rowRight : bubbleStyles.rowLeft]}>
      <View style={[bubbleStyles.bubble, isOwn ? bubbleStyles.ownBubble : bubbleStyles.otherBubble]}>
        <Text style={isOwn ? bubbleStyles.ownText : bubbleStyles.otherText}>{msg.content}</Text>
        <Text style={[bubbleStyles.time, isOwn ? bubbleStyles.ownTime : bubbleStyles.otherTime]}>
          {formatTimestamp(msg.created_date, locale)}
        </Text>
      </View>
    </View>
  );
};

const ConditionReportCard = ({
  report,
  locale,
  t,
}: {
  report: ConditionReport;
  locale: string;
  t: (key: string, params?: Record<string, any>) => string;
}) => {
  const theme = CONDITION_REPORT_THEME[report.report_type];

  return (
    <View style={[styles.conditionReportCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
      <View style={styles.conditionReportHeader}>
        <View style={styles.conditionReportHeaderMeta}>
          <MaterialCommunityIcons name="camera-outline" size={18} color={theme.icon} />
          <View style={styles.conditionReportHeaderText}>
            <Text style={styles.conditionReportTitle}>{theme.title}</Text>
            <Text style={styles.conditionReportMeta}>Submitted by {report.reported_by_email}</Text>
          </View>
        </View>
        <View style={[styles.conditionReportDateBadge, { backgroundColor: theme.badgeBg }]}>
          <Text style={[styles.conditionReportDateText, { color: theme.badgeText }]}>
            {formatTimestamp(report.created_date, locale)}
          </Text>
        </View>
      </View>

      {report.notes ? <Text style={styles.conditionReportNotes}>{report.notes}</Text> : null}

      {report.damages_reported?.length ? (
        <View style={styles.conditionReportDamageBox}>
          <View style={styles.conditionReportDamageHeader}>
            <MaterialCommunityIcons name="alert-outline" size={16} color="#EA580C" />
            <Text style={styles.conditionReportDamageTitle}>Damages Reported</Text>
          </View>
          {report.damages_reported.map((damage, index) => (
            <Text key={`${report.id}-damage-${index}`} style={styles.conditionReportDamageText}>
              <Text style={styles.conditionReportDamageSeverity}>
                {t(`conditionReport.severity.${damage.severity}`)}:
              </Text>{' '}
              {damage.description}
            </Text>
          ))}
        </View>
      ) : null}

      {report.condition_photos?.length ? (
        <View style={styles.conditionReportPhotosBlock}>
          <Text style={styles.conditionReportBlockLabel}>{t('conditionReport.photos')}</Text>
          <View style={styles.conditionReportPhotoGrid}>
            {report.condition_photos.map((photo, index) => (
              <Image
                key={`${report.id}-photo-${index}`}
                source={{ uri: photo }}
                style={styles.conditionReportPhoto}
              />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
};

const bubbleStyles = StyleSheet.create({
  row: { marginVertical: 4, paddingHorizontal: 16 },
  rowRight: { alignItems: 'flex-end' },
  rowLeft: { alignItems: 'flex-start' },
  bubble: {
    maxWidth: '78%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  ownBubble: {
    backgroundColor: '#1F2937',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  ownText: { color: '#FFFFFF', fontSize: typography.body, lineHeight: 20 },
  otherText: { color: '#0F172A', fontSize: typography.body, lineHeight: 20 },
  time: { fontSize: 10, marginTop: 4 },
  ownTime: { color: '#9CA3AF', textAlign: 'right' },
  otherTime: { color: '#94A3B8' },
  systemRow: { alignItems: 'center', marginVertical: 8 },
  systemPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  systemText: { color: '#64748B', fontSize: typography.small, fontStyle: 'italic' },
});

export const ChatScreen = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { language, t } = useI18n();
  const { rentalRequestId, otherUserEmail } = route.params;
  const locale = getLocale(language);

  const { user: clerkUser } = useUser();
  const { user: storeUser } = useAuthStore();
  const userEmail = clerkUser?.emailAddresses?.[0]?.emailAddress ?? storeUser?.email ?? '';
  const API_BASE = (process.env.EXPO_PUBLIC_API_URL || 'http://172.28.145.1:5000/api').replace(/\/api$/, '');
  const checkoutReturnUrl = `${API_BASE}/api/stripe/app-return/profile`;
  const nativeCheckoutCallback = 'rentany://payment-setup-complete';

  const [messages, setMessages] = useState<Message[]>([]);
  const [rental, setRental] = useState<RentalRequest | null>(null);
  const [conditionReports, setConditionReports] = useState<ConditionReport[]>([]);
  const [backendUser, setBackendUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const [isStartingKyc, setIsStartingKyc] = useState(false);
  const flatListRef = useRef<FlatList<Message>>(null);

  const loadMessages = useCallback(async (quiet = false) => {
    if (!quiet) setIsLoading(true);
    try {
      const data = await getMessages(rentalRequestId);
      setMessages(sortMessagesChronologically(data));
    } catch {
      // silently fail
    } finally {
      if (!quiet) setIsLoading(false);
    }
  }, [rentalRequestId]);

  const loadRental = useCallback(async () => {
    const [data, reports] = await Promise.all([
      getRentalRequestById(rentalRequestId),
      getConditionReports({ rental_request_id: rentalRequestId }),
    ]);
    setRental(data);
    setConditionReports(reports);
    return data;
  }, [rentalRequestId]);

  const loadUserData = useCallback(async () => {
    try {
      const res = await api.get('/users/me');
      setBackendUser(res.data?.data || res.data);
    } catch {}
  }, []);

  const loadChatData = useCallback(async (quiet = false) => {
    if (!quiet) setIsLoading(true);
    try {
      await Promise.all([loadMessages(true), loadRental(), loadUserData()]);
    } finally {
      setIsLoading(false);
    }
  }, [loadMessages, loadRental, loadUserData]);

  useEffect(() => {
    loadChatData();
  }, [loadChatData]);

  useFocusEffect(
    useCallback(() => {
      loadChatData(true);
    }, [loadChatData])
  );

  const sendSystemNote = useCallback(async (content: string) => {
    try {
      await sendMessage({
        rental_request_id: rentalRequestId,
        sender_email: 'system',
        content,
        message_type: 'system',
      });
    } catch {
      // Keep the primary action successful even if the system note fails.
    }
  }, [rentalRequestId]);

  const handleSend = async () => {
    const content = inputText.trim();
    if (!content || isSending || !userEmail) return;
    setIsSending(true);
    setInputText('');
    try {
      const newMsg = await sendMessage({
        rental_request_id: rentalRequestId,
        sender_email: userEmail,
        content,
      });
      setMessages((prev) => sortMessagesChronologically([...prev, newMsg]));
    } catch {
      setInputText(content);
    } finally {
      setIsSending(false);
    }
  };

  const refreshRentalUntilSettled = useCallback(async (attempts = 4) => {
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const nextRental = await loadRental();
      if (nextRental.status === 'paid' || nextRental.status === 'completed') {
        await loadMessages(true);
        return nextRental;
      }
      if (attempt < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }
    return rental;
  }, [loadMessages, loadRental, rental]);

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

  const handleStatusAction = useCallback((
    nextStatus: 'approved' | 'declined' | 'cancelled' | 'pending_verification',
    options: { title: string; message: string; systemMessage: string },
  ) => {
    if (!rental) return;
    setConfirmModal({
      title: options.title,
      message: options.message,
      onConfirm: async () => {
        setConfirmModal(null);
        setIsUpdatingStatus(true);
        try {
          const updated = await updateRentalRequestStatus(rental.id, nextStatus);
          
          let actualSystemMessage = options.systemMessage;
          // If the backend auto-promoted the status or if we transition to pending_verification,
          // adjust the system message for clarity.
          if (nextStatus === 'pending_verification') {
            if (updated.status === 'pending_verification') {
              actualSystemMessage = t('chat.approvePendingVerificationSystem');
            } else {
              actualSystemMessage = t('chat.approveSystem');
            }
          }

          await sendSystemNote(actualSystemMessage);
          await loadChatData(true);
        } catch (error: any) {
          toast.error(error?.response?.data?.error || error?.message || t('chat.actionFailed'));
        } finally {
          setIsUpdatingStatus(false);
        }
      },
    });
  }, [loadChatData, rental, sendSystemNote, t]);

  const handleCheckout = useCallback(async () => {
    if (!rental) return;
    setIsProcessingPayment(true);
    try {
      const response = await createCheckoutSession({
        rental_request_id: rental.id,
        mobile_return_url: checkoutReturnUrl,
      });
      const checkoutUrl = response.url || response.checkout_url;
      const checkoutSessionId = response.session_id;
      if (!checkoutUrl) {
        throw new Error(t('chat.paymentFailed'));
      }

      const authResult = await WebBrowser.openAuthSessionAsync(checkoutUrl, nativeCheckoutCallback);

      if (authResult.type === 'cancel') {
        toast.warning(t('chat.checkoutCancelled'));
        return;
      }

      // Try to extract session_id from the redirect URL first
      let resolvedSessionId = checkoutSessionId;
      if (authResult.type === 'success' && authResult.url) {
        try {
          const urlObj = new URL(authResult.url);
          const searchParams = new URLSearchParams(urlObj.search);
          const urlSessionId = searchParams.get('session_id');
          if (urlSessionId && !urlSessionId.includes('CHECKOUT_SESSION_ID')) {
            resolvedSessionId = urlSessionId;
          }
        } catch (e) {
          console.warn('Failed to parse redirect URL', e);
        }
      }

      // Sync payment status using the session ID from the checkout response
      if (resolvedSessionId) {
        try {
          await syncPaymentStatus(resolvedSessionId, rental.id);
        } catch (e) {
          console.warn('Failed to sync payment status', e);
        }
      }

      const updatedRental = await refreshRentalUntilSettled();
      if (updatedRental?.status === 'paid' || updatedRental?.status === 'completed') {
        await sendSystemNote(t('chat.paymentReceivedNote'));
        toast.success(t('chat.paymentSubmitted'));
      } else {
        toast.info(t('chat.paymentPending'));
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error || error?.message || t('chat.paymentFailed'));
    } finally {
      setIsProcessingPayment(false);
      await loadChatData(true);
    }
  }, [checkoutReturnUrl, loadChatData, nativeCheckoutCallback, refreshRentalUntilSettled, rental, sendSystemNote]);

  const handleRelease = useCallback(() => {
    if (!rental) return;
    setConfirmModal({
      title: t('chat.completeTitle'),
      message: t('chat.completePrompt'),
      onConfirm: async () => {
        setConfirmModal(null);
        setIsUpdatingStatus(true);
        try {
          await releaseRentalPayment(rental.id);
          await sendSystemNote(t('chat.paymentReleasedNote'));
          await loadChatData(true);
          toast.success(t('chat.rentalCompleted'));
        } catch (error: any) {
          toast.error(error?.response?.data?.error || error?.message || t('chat.rentalCompleteFailed'));
        } finally {
          setIsUpdatingStatus(false);
        }
      },
    });
  }, [loadChatData, rental, sendSystemNote, t]);

  const isOwner = rental?.owner_email?.toLowerCase() === userEmail?.toLowerCase();
  const isRenter = rental?.renter_email?.toLowerCase() === userEmail?.toLowerCase();
  const reportRules = rental ? getConditionReportRules(rental, conditionReports, userEmail) : null;
  const canApproveDecline = isOwner && rental?.status === 'pending';
  // Renter can pay if it's approved or pending_verification, and they haven't secured payment yet
  const userUnverified = backendUser?.kyc_status !== 'verified';

  // For 'approved' status: renter can pay immediately (no KYC needed for already-verified users or normal approved flow)
  // For 'pending_verification': renter must verify identity FIRST, then pay
  const canPay = isRenter && !(rental as any)?.payment_intent_id && (
    rental?.status === 'approved' ||
    (rental?.status === 'pending_verification' && !userUnverified)
  );

  const canCancel = isRenter && (rental?.status === 'pending' || rental?.status === 'approved' || rental?.status === 'pending_verification');

  // Show "Verify Identity" when pending_verification and renter hasn't verified yet (regardless of payment)
  const canVerify =
    rental?.status === 'pending_verification' &&
    userUnverified &&
    isRenter;

  const canCompleteRental = isOwner && !!reportRules?.canReleasePayment;
  const rentalCost = rental?.total_amount ?? 0;
  const platformFee = typeof rental?.platform_fee === 'number' ? rental.platform_fee : rentalCost * 0.15;
  const securityDeposit = typeof rental?.security_deposit === 'number' ? rental.security_deposit : 0;
  const totalPaid = typeof rental?.total_paid === 'number'
    ? rental.total_paid
    : rentalCost + platformFee + securityDeposit;
  const statusTone = useMemo(() => {
    switch (rental?.status) {
      case 'approved':
        return { bg: '#DBEAFE', text: '#1D4ED8', label: t('conversations.status.approved') };
      case 'paid':
        return { bg: '#F3E8FF', text: '#7C3AED', label: t('conversations.status.paid') };
      case 'completed':
        return { bg: '#DCFCE7', text: '#15803D', label: t('conversations.status.completed') };
      case 'declined':
      case 'rejected':
        return { bg: '#FEE2E2', text: '#B91C1C', label: rental.status };
      case 'pending_verification':
        return { bg: '#FEF3C7', text: '#D97706', label: t('chat.pendingVerification') };
      case 'cancelled':
        return { bg: '#F1F5F9', text: '#64748B', label: t('conversations.status.cancelled') };
      default:
        return { bg: '#FEF3C7', text: '#B45309', label: rental?.status || t('common.loading') };
    }
  }, [rental?.status]);

  const scrollToLatestMessage = useCallback((animated = true) => {
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToEnd({ animated });
    });
  }, []);

  const handleStartKyc = useCallback(async () => {
    if (!rental) return;
    setIsStartingKyc(true);
    try {
      const idenfyReturnUrl = 'rentany://idenfy-complete';
      const result = await idenfyService.startVerification({
        successUrl: idenfyReturnUrl,
        errorUrl: idenfyReturnUrl,
        callbackUrl: `${API_BASE}/idenfy/webhook`,
      });
      if (!result) return;

      if (result.method === 'web') {
        const idenfyReturnUrl = 'rentany://idenfy-complete';
        await WebBrowser.openAuthSessionAsync(result.url, idenfyReturnUrl);
        setIsStartingKyc(false);
        // After browser closes, we poll the backend to check the final status
        const latestUser = await waitForVerifiedKyc();
        if (latestUser?.kyc_status === 'verified') {
          await sendSystemNote(t('chat.identityVerifiedNote') || 'Identity verified securely');
          toast.success(t('chat.identityVerified') || 'Identity Verified!');
          // Trigger backend to re-evaluate the promotion to 'approved'
          await updateRentalRequestStatus(rental.id, 'pending_verification').catch(() => {});
        }
        await loadChatData(true);
        return;
      }

      const sdkResult = result.result;
      if (sdkResult) {
        // Poll for backend synchronization
        const latestUser = await waitForVerifiedKyc();
        const finalStatus = latestUser?.kyc_status;

        if (finalStatus === 'verified') {
            await sendSystemNote(t('chat.identityVerifiedNote') || 'Identity verified securely');
            toast.success(t('chat.identityVerified') || 'Identity Verified!');
            await updateRentalRequestStatus(rental.id, 'pending_verification').catch(() => {});
        } else if (finalStatus === 'failed') {
            toast.error(t('chat.identityFailed') || 'Identity verification failed');
        } else {
            // Webhook delayed: rely on SDK optimistic result
            const autoStatus = sdkResult.autoIdentificationStatus;
            const manualStatus = sdkResult.manualIdentificationStatus;
            const isApproved = autoStatus === 'APPROVED' || manualStatus === 'APPROVED';
            
            setBackendUser((prev: any) => ({ ...prev, kyc_status: isApproved ? 'verified' : 'failed' }));
            
            if (isApproved) {
                await sendSystemNote(t('chat.identityVerifiedNote') || 'Identity verified securely');
                toast.success(t('chat.identityVerified') || 'Identity Verified!');
                await updateRentalRequestStatus(rental.id, 'pending_verification').catch(() => {});
            } else {
                toast.error(t('chat.identityFailed') || 'Identity verification failed');
            }
        }
      }
      
      // Load chat data without overwriting the user data
      setIsLoading(true);
      await Promise.all([loadMessages(true), loadRental()]);
      setIsLoading(false);
    } catch (e: any) {
      const errorMsg = e.response?.data?.error || e.message || t('chat.kycError');
      toast.error(errorMsg);
    } finally {
      setIsStartingKyc(false);
    }
  }, [rental, loadChatData, sendSystemNote, t]);

  const renderSummaryCard = useCallback(() => {
    if (!rental) return null;
    const rentalStartDate = parseRentalBoundaryDate(rental.start_date);
    const rentalEndDate = parseRentalBoundaryDate(rental.end_date);

    return (
      <View style={styles.summaryCard}>
        <View style={styles.summaryTopRow}>
          <View style={[styles.statusBadge, { backgroundColor: statusTone.bg }]}>
            <Text style={[styles.statusBadgeText, { color: statusTone.text }]}>
              {statusTone.label.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.summaryDates}>
            {rentalStartDate.toLocaleDateString(locale, { month: 'short', day: 'numeric' })}
            {' - '}
            {rentalEndDate.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' })}
          </Text>
        </View>
        <Text style={styles.summaryAmount}>${totalPaid.toFixed(2)}</Text>
        <Text style={styles.summaryBreakdown}>
          {t('chat.paymentBreakdown', {
            rental: rentalCost.toFixed(2),
            fee: platformFee.toFixed(2),
            deposit: securityDeposit.toFixed(2),
          })}
        </Text>
        {canApproveDecline || canPay || canVerify || canCancel || canCompleteRental ? (
          <View style={styles.actionRow}>
            {canApproveDecline ? (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, styles.primaryAction]}
                  onPress={() => handleStatusAction('pending_verification', {
                    title: t('chat.approveTitle'),
                    message: t('chat.approvePrompt'),
                    systemMessage: t('chat.approveSystem'), // Default; handled conditionally in handleStatusAction
                  })}
                  disabled={isUpdatingStatus}
                >
                  <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />
                  <Text style={styles.primaryActionText}>{t('chat.approve')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.secondaryDangerAction]}
                  onPress={() => handleStatusAction('declined', {
                    title: t('chat.declineTitle'),
                    message: t('chat.declinePrompt'),
                    systemMessage: t('chat.declineSystem'),
                  })}
                  disabled={isUpdatingStatus}
                >
                  <MaterialCommunityIcons name="close" size={18} color="#B91C1C" />
                  <Text style={styles.secondaryDangerText}>{t('chat.decline')}</Text>
                </TouchableOpacity>
              </>
            ) : null}
            {canPay ? (
              <TouchableOpacity
                style={[styles.actionButton, styles.primaryAction]}
                onPress={handleCheckout}
                disabled={isProcessingPayment}
              >
                {isProcessingPayment ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <MaterialCommunityIcons name="credit-card-outline" size={18} color="#FFFFFF" />
                )}
                <Text style={styles.primaryActionText}>
                  {isProcessingPayment ? t('chat.openingCheckout') : t('chat.payNow')}
                </Text>
              </TouchableOpacity>
            ) : null}
            {canVerify ? (
              <View style={{ gap: 8, flex: 1, flexDirection: 'row' }}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.primaryAction, { flex: 1, backgroundColor: '#F59E0B', borderColor: '#F59E0B' }]}
                  onPress={handleStartKyc}
                  disabled={isStartingKyc || isUpdatingStatus}
                >
                  {isStartingKyc ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="shield-account-outline" size={18} color="#FFFFFF" />
                      <Text style={styles.primaryActionText}>{t('chat.verifyIdentity') || 'Verify Identity'}</Text>
                    </>
                  )}
                </TouchableOpacity>
                {__DEV__ && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.secondaryAction, { flex: 0.4, borderColor: '#DC2626' }]}
                    onPress={async () => {
                      try {
                        setIsStartingKyc(true);
                        await idenfyService.testForceVerify();
                        toast.success('Force Verified!');
                        await loadChatData(true);
                      } catch (e: any) {
                        toast.error('Force Verify Failed');
                      } finally {
                        setIsStartingKyc(false);
                      }
                    }}
                    disabled={isStartingKyc || isUpdatingStatus}
                  >
                    <MaterialCommunityIcons name="test-tube" size={18} color="#DC2626" />
                    <Text style={[styles.secondaryActionText, { color: '#DC2626' }]}>Force</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : null}
            {canCancel ? (
              <TouchableOpacity
                style={[styles.actionButton, styles.secondaryAction]}
                onPress={() => handleStatusAction('cancelled', {
                  title: t('chat.cancelTitle'),
                  message: t('chat.cancelPrompt'),
                  systemMessage: t('chat.cancelSystem'),
                })}
                disabled={isUpdatingStatus}
              >
                <MaterialCommunityIcons name="close-circle-outline" size={18} color="#475569" />
                <Text style={styles.secondaryActionText}>{t('chat.cancel')}</Text>
              </TouchableOpacity>
            ) : null}
            {canCompleteRental ? (
              <TouchableOpacity
                style={[styles.actionButton, styles.primaryAction]}
                onPress={handleRelease}
                disabled={isUpdatingStatus}
              >
                <MaterialCommunityIcons name="cash-check" size={18} color="#FFFFFF" />
                <Text style={styles.primaryActionText}>{t('chat.complete')}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
        {rental.status === 'approved' && isRenter ? (
          <Text style={styles.statusHint}>{t('chat.approvedHint')}</Text>
        ) : null}
        {rental.status === 'paid' ? (
          <>
            <View style={styles.reportMeta}>
              <Text style={styles.reportMetaText}>
                {t('chat.pickupReports', { count: reportRules?.pickupReports.length || 0 })}
              </Text>
              <Text style={styles.reportMetaText}>
                {t('chat.returnReports', { count: reportRules?.returnReports.length || 0 })}
              </Text>
            </View>
            <View style={styles.reportActionRow}>
              <TouchableOpacity
                style={[
                  styles.reportActionButton,
                  !reportRules?.canCreatePickupReport && !reportRules?.userPickupReport && styles.reportActionDisabled,
                ]}
                onPress={() =>
                  navigation.navigate('ConditionReport', {
                    rentalRequestId: rental.id,
                    reportType: 'pickup',
                  })
                }
                disabled={!reportRules?.canCreatePickupReport && !reportRules?.userPickupReport}
              >
                <MaterialCommunityIcons name="clipboard-check-outline" size={18} color="#1F2937" />
                <Text style={styles.reportActionText}>
                  {reportRules?.userPickupReport ? t('chat.viewPickupReport') : t('chat.pickupReport')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.reportActionButton,
                  !reportRules?.canCreateReturnReport && !reportRules?.userReturnReport && styles.reportActionDisabled,
                ]}
                onPress={() =>
                  navigation.navigate('ConditionReport', {
                    rentalRequestId: rental.id,
                    reportType: 'return',
                  })
                }
                disabled={!reportRules?.canCreateReturnReport && !reportRules?.userReturnReport}
              >
                <MaterialCommunityIcons name="clipboard-arrow-left-outline" size={18} color="#1F2937" />
                <Text style={styles.reportActionText}>
                  {reportRules?.userReturnReport ? t('chat.viewReturnReport') : t('chat.returnReport')}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.statusHint}>
              {canCompleteRental
                ? t('chat.completionReady')
                : t('chat.completionWaiting')}
            </Text>
            {!reportRules?.canCreatePickupReport && !reportRules?.userPickupReport && reportRules?.pickupStatusMessage ? (
              <Text style={styles.statusHint}>{reportRules.pickupStatusMessage}</Text>
            ) : null}
            {!reportRules?.canCreateReturnReport && !reportRules?.userReturnReport && reportRules?.returnStatusMessage ? (
              <Text style={styles.statusHint}>{reportRules.returnStatusMessage}</Text>
            ) : null}
            {reportRules?.pickupReports.length ? (
              <View style={styles.reportSection}>
                <View style={[styles.reportSectionBadge, styles.pickupReportSectionBadge]}>
                  <MaterialCommunityIcons name="check-circle-outline" size={16} color="#1D4ED8" />
                  <Text style={[styles.reportSectionBadgeText, styles.pickupReportSectionBadgeText]}>
                    {`Pre-Rental Reports (${reportRules.pickupReports.length}/2)`}
                  </Text>
                </View>
                {reportRules.pickupReports.map((report) => (
                  <ConditionReportCard key={report.id} report={report} locale={locale} t={t} />
                ))}
              </View>
            ) : null}
            {reportRules?.returnReports.length ? (
              <View style={styles.reportSection}>
                <View style={[styles.reportSectionBadge, styles.returnReportSectionBadge]}>
                  <MaterialCommunityIcons name="check-circle-outline" size={16} color="#6D28D9" />
                  <Text style={[styles.reportSectionBadgeText, styles.returnReportSectionBadgeText]}>
                    {`Return Reports (${reportRules.returnReports.length}/2)`}
                  </Text>
                </View>
                {reportRules.returnReports.map((report) => (
                  <ConditionReportCard key={report.id} report={report} locale={locale} t={t} />
                ))}
              </View>
            ) : null}
          </>
        ) : null}
      </View>
    );
  }, [
    canApproveDecline,
    canCancel,
    canCompleteRental,
    canPay,
    handleCheckout,
    handleRelease,
    handleStatusAction,
    isProcessingPayment,
    isRenter,
    isUpdatingStatus,
    locale,
    navigation,
    platformFee,
    rental,
    rentalCost,
    reportRules,
    securityDeposit,
    statusTone.bg,
    statusTone.label,
    statusTone.text,
    totalPaid,
  ]);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToLatestMessage(false);
    }
  }, [messages.length, scrollToLatestMessage]);

  return (
    <View style={styles.container}>
      <GlobalHeader />

      {/* Confirmation Modal */}
      <Modal
        visible={!!confirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmModal(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setConfirmModal(null)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>{confirmModal?.title}</Text>
            <Text style={styles.modalMessage}>{confirmModal?.message}</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setConfirmModal(null)}
              >
                <Text style={styles.modalBtnCancelText}>{t('chat.no')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnConfirm]}
                onPress={confirmModal?.onConfirm}
                disabled={isUpdatingStatus}
              >
                {isUpdatingStatus ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalBtnConfirmText}>{t('chat.yes')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <View style={styles.chatHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.chatHeaderInfo}>
          <Text style={styles.chatTitle} numberOfLines={1}>{otherUserEmail}</Text>
          <Text style={styles.chatSub}>{t('chat.title')}</Text>
        </View>
        <TouchableOpacity onPress={() => loadChatData(false)} style={styles.refreshBtn}>
          <MaterialCommunityIcons name="refresh" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <MessageBubble msg={item} isOwn={item.sender_email?.toLowerCase() === userEmail?.toLowerCase()} locale={locale} />
              )}
              style={styles.messageListView}
              contentContainerStyle={styles.messageList}
              keyboardShouldPersistTaps="handled"
              onLayout={() => scrollToLatestMessage(false)}
              onContentSizeChange={() => scrollToLatestMessage(false)}
              ListHeaderComponent={renderSummaryCard}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons name="chat-outline" size={56} color="#CBD5E1" />
                  <Text style={styles.emptyText}>{t('chat.empty')}</Text>
                </View>
              }
            />
          </>
        )}

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder={t('chat.inputPlaceholder')}
            placeholderTextColor="#94A3B8"
            multiline
            returnKeyType="default"
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!inputText.trim() || isSending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <MaterialCommunityIcons name="send" size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  flex: { flex: 1 },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 12,
  },
  backBtn: {
    padding: 6,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chatHeaderInfo: { flex: 1 },
  chatTitle: { fontWeight: '700', color: '#0F172A', fontSize: typography.tabLabel },
  chatSub: { color: '#64748B', fontSize: typography.small },
  refreshBtn: { padding: 6 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  summaryCard: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    gap: 10,
  },
  summaryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  summaryDates: {
    color: '#64748B',
    fontSize: typography.small,
    flex: 1,
    textAlign: 'right',
  },
  summaryAmount: {
    color: '#0F172A',
    fontSize: 24,
    fontWeight: '800',
  },
  summaryBreakdown: {
    color: '#64748B',
    fontSize: typography.small,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  actionButton: {
    minHeight: 42,
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryAction: {
    backgroundColor: '#111827',
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: typography.body,
  },
  secondaryAction: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  secondaryActionText: {
    color: '#334155',
    fontWeight: '700',
    fontSize: typography.body,
  },
  secondaryDangerAction: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  secondaryDangerText: {
    color: '#B91C1C',
    fontWeight: '700',
    fontSize: typography.body,
  },
  statusHint: {
    color: '#475569',
    fontSize: typography.small,
    lineHeight: 18,
  },
  reportMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  reportMetaText: {
    color: '#334155',
    fontSize: typography.small,
    fontWeight: '600',
  },
  reportActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  reportActionButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  reportActionDisabled: { opacity: 0.45 },
  reportActionText: {
    color: '#1F2937',
    fontWeight: '700',
    fontSize: typography.small,
  },
  reportSection: {
    marginTop: 8,
    gap: 12,
  },
  reportSectionBadge: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  pickupReportSectionBadge: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  returnReportSectionBadge: {
    backgroundColor: '#F5F3FF',
    borderColor: '#DDD6FE',
  },
  reportSectionBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  pickupReportSectionBadgeText: {
    color: '#1D4ED8',
  },
  returnReportSectionBadgeText: {
    color: '#6D28D9',
  },
  conditionReportCard: {
    borderWidth: 2,
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  conditionReportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  conditionReportHeaderMeta: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  conditionReportHeaderText: {
    flex: 1,
    gap: 2,
  },
  conditionReportTitle: {
    color: '#0F172A',
    fontSize: typography.body,
    fontWeight: '700',
  },
  conditionReportMeta: {
    color: '#64748B',
    fontSize: typography.small,
  },
  conditionReportDateBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  conditionReportDateText: {
    fontSize: 11,
    fontWeight: '700',
  },
  conditionReportNotes: {
    color: '#334155',
    fontSize: typography.small,
    lineHeight: 20,
  },
  conditionReportDamageBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FDBA74',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  conditionReportDamageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  conditionReportDamageTitle: {
    color: '#9A3412',
    fontSize: typography.small,
    fontWeight: '700',
  },
  conditionReportDamageText: {
    color: '#334155',
    fontSize: typography.small,
    lineHeight: 18,
  },
  conditionReportDamageSeverity: {
    color: '#C2410C',
    fontWeight: '700',
  },
  conditionReportPhotosBlock: {
    gap: 8,
  },
  conditionReportBlockLabel: {
    color: '#334155',
    fontSize: typography.small,
    fontWeight: '700',
  },
  conditionReportPhotoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  conditionReportPhoto: {
    width: 88,
    height: 88,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
  },
  messageListView: { flex: 1 },
  messageList: { paddingBottom: 16, flexGrow: 1 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingTop: 80, gap: 12 },
  emptyText: { color: '#94A3B8', fontSize: typography.body, textAlign: 'center' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: typography.body,
    color: '#0F172A',
    maxHeight: 100,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#E2E8F0' },
  // Confirmation Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalMessage: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnCancel: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalBtnCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  modalBtnConfirm: {
    backgroundColor: '#1F2937',
  },
  modalBtnConfirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
