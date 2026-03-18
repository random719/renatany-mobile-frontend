import { useUser } from '@clerk/expo';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as WebBrowser from 'expo-web-browser';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
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
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../store/toastStore';
import { colors, typography } from '../../theme';
import { ConditionReport, Message, RentalRequest } from '../../types/models';
import { RootStackParamList } from '../../types/navigation';
import { getConditionReportRules } from '../../utils/conditionReportRules';

type Nav = StackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'Chat'>;

const formatTimestamp = (iso: string) =>
  new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

const MessageBubble = ({ msg, isOwn }: { msg: Message; isOwn: boolean }) => {
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
          {formatTimestamp(msg.created_date)}
        </Text>
      </View>
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
  const { t } = useI18n();
  const { rentalRequestId, otherUserEmail } = route.params;

  const { user: clerkUser } = useUser();
  const { user: storeUser } = useAuthStore();
  const userEmail = clerkUser?.emailAddresses?.[0]?.emailAddress ?? storeUser?.email ?? '';
  const API_BASE = (process.env.EXPO_PUBLIC_API_URL || 'http://172.28.145.1:5000/api').replace(/\/api$/, '');
  const checkoutReturnUrl = `${API_BASE}/api/stripe/app-return/profile`;
  const nativeCheckoutCallback = 'rentany://payment-setup-complete';

  const [messages, setMessages] = useState<Message[]>([]);
  const [rental, setRental] = useState<RentalRequest | null>(null);
  const [conditionReports, setConditionReports] = useState<ConditionReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const flatListRef = useRef<FlatList<Message>>(null);

  const loadMessages = useCallback(async (quiet = false) => {
    if (!quiet) setIsLoading(true);
    try {
      const data = await getMessages(rentalRequestId);
      setMessages(data.sort((a, b) =>
        new Date(a.created_date).getTime() - new Date(b.created_date).getTime()
      ));
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

  const loadChatData = useCallback(async (quiet = false) => {
    if (!quiet) setIsLoading(true);
    try {
      await Promise.all([loadMessages(true), loadRental()]);
    } finally {
      setIsLoading(false);
    }
  }, [loadMessages, loadRental]);

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
      setMessages((prev) => [...prev, newMsg]);
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

  const handleStatusAction = useCallback(async (
    nextStatus: 'approved' | 'declined' | 'cancelled',
    options: { title: string; message: string; systemMessage: string },
  ) => {
    if (!rental) return;
    Alert.alert(options.title, options.message, [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes',
        onPress: async () => {
          setIsUpdatingStatus(true);
          try {
            await updateRentalRequestStatus(rental.id, nextStatus);
            await sendSystemNote(options.systemMessage);
            await loadChatData(true);
          } catch (error: any) {
            toast.error(error?.response?.data?.error || error?.message || t('chat.actionFailed'));
          } finally {
            setIsUpdatingStatus(false);
          }
        },
      },
    ]);
  }, [loadChatData, rental, sendSystemNote]);

  const handleCheckout = useCallback(async () => {
    if (!rental) return;
    setIsProcessingPayment(true);
    try {
      const response = await createCheckoutSession({
        rental_request_id: rental.id,
        return_url: checkoutReturnUrl,
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

  const handleRelease = useCallback(async () => {
    if (!rental) return;
    Alert.alert(
      t('chat.completeTitle'),
      t('chat.completePrompt'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('chat.complete'),
          onPress: async () => {
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
        },
      ],
    );
  }, [loadChatData, rental, sendSystemNote]);

  const isOwner = rental?.owner_email === userEmail;
  const isRenter = rental?.renter_email === userEmail;
  const reportRules = rental ? getConditionReportRules(rental, conditionReports, userEmail) : null;
  const canApproveDecline = isOwner && rental?.status === 'pending';
  const canPay = isRenter && rental?.status === 'approved';
  const canCancel = isRenter && (rental?.status === 'pending' || rental?.status === 'approved');
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

  const renderSummaryCard = useCallback(() => {
    if (!rental) return null;

    return (
      <View style={styles.summaryCard}>
        <View style={styles.summaryTopRow}>
          <View style={[styles.statusBadge, { backgroundColor: statusTone.bg }]}>
            <Text style={[styles.statusBadgeText, { color: statusTone.text }]}>
              {statusTone.label.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.summaryDates}>
            {new Date(rental.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            {' - '}
            {new Date(rental.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </Text>
        </View>
        <Text style={styles.summaryAmount}>${totalPaid.toFixed(2)}</Text>
        <Text style={styles.summaryBreakdown}>
          Rental ${rentalCost.toFixed(2)} · Fee ${platformFee.toFixed(2)} · Deposit ${securityDeposit.toFixed(2)}
        </Text>
        {canApproveDecline || canPay || canCancel || canCompleteRental ? (
          <View style={styles.actionRow}>
            {canApproveDecline ? (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, styles.primaryAction]}
                  onPress={() => handleStatusAction('approved', {
                    title: t('chat.approveTitle'),
                    message: t('chat.approvePrompt'),
                    systemMessage: t('chat.approveSystem'),
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
                <MessageBubble msg={item} isOwn={item.sender_email === userEmail} />
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
});
