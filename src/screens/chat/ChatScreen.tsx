import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useUser } from '@clerk/expo';
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
import { getMessages, sendMessage } from '../../services/messageService';
import { createCheckoutSession, releaseRentalPayment } from '../../services/paymentService';
import { getRentalRequestById, updateRentalRequestStatus } from '../../services/rentalService';
import { useAuthStore } from '../../store/authStore';
import { colors, typography } from '../../theme';
import { Message, RentalRequest } from '../../types/models';
import { RootStackParamList } from '../../types/navigation';

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
  const { rentalRequestId, otherUserEmail } = route.params;

  const { user: clerkUser } = useUser();
  const { user: storeUser } = useAuthStore();
  const userEmail = clerkUser?.emailAddresses?.[0]?.emailAddress ?? storeUser?.email ?? '';
  const API_BASE = (process.env.EXPO_PUBLIC_API_URL || 'http://172.28.145.1:5000/api').replace(/\/api$/, '');
  const checkoutReturnUrl = `${API_BASE}/api/stripe/app-return/profile`;
  const nativeCheckoutCallback = 'rentany://payment-setup-complete';

  const [messages, setMessages] = useState<Message[]>([]);
  const [rental, setRental] = useState<RentalRequest | null>(null);
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
        new Date(b.created_date).getTime() - new Date(a.created_date).getTime()
      ));
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }, [rentalRequestId]);

  const loadRental = useCallback(async () => {
    const data = await getRentalRequestById(rentalRequestId);
    setRental(data);
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
      setMessages((prev) => [newMsg, ...prev]);
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
            Alert.alert('Action failed', error?.response?.data?.error || error?.message || 'Please try again.');
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
      if (!checkoutUrl) {
        throw new Error('No checkout URL received.');
      }

      const authResult = await WebBrowser.openAuthSessionAsync(checkoutUrl, nativeCheckoutCallback);
      if (authResult.type === 'cancel') {
        Alert.alert('Payment cancelled', 'Checkout was cancelled before payment completed.');
        return;
      }

      const updatedRental = await refreshRentalUntilSettled();
      if (updatedRental?.status === 'paid' || updatedRental?.status === 'completed') {
        await sendSystemNote('Payment received. This rental is now confirmed and active.');
        Alert.alert('Payment received', 'Your rental payment was submitted successfully.');
      } else {
        Alert.alert(
          'Payment submitted',
          'We are still waiting for payment confirmation. Pull to refresh or reopen this chat in a moment.',
        );
      }
    } catch (error: any) {
      Alert.alert('Payment failed', error?.response?.data?.error || error?.message || 'Please try again.');
    } finally {
      setIsProcessingPayment(false);
      await loadChatData(true);
    }
  }, [checkoutReturnUrl, loadChatData, nativeCheckoutCallback, refreshRentalUntilSettled, rental, sendSystemNote]);

  const handleRelease = useCallback(async () => {
    if (!rental) return;
    Alert.alert(
      'Complete rental',
      'This will release payment to the owner and mark the rental as completed once backend checks pass.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            setIsUpdatingStatus(true);
            try {
              await releaseRentalPayment(rental.id);
              await sendSystemNote('Payment released. This rental is now completed.');
              await loadChatData(true);
              Alert.alert('Rental completed', 'Payment was released successfully.');
            } catch (error: any) {
              Alert.alert(
                'Unable to complete rental',
                error?.response?.data?.error || error?.message || 'Please try again later.',
              );
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
  const canApproveDecline = isOwner && rental?.status === 'pending';
  const canPay = isRenter && rental?.status === 'approved';
  const canCancel = isRenter && (rental?.status === 'pending' || rental?.status === 'approved');
  const canCompleteRental = isOwner && rental?.status === 'paid';
  const rentalCost = rental?.total_amount ?? 0;
  const platformFee = typeof rental?.platform_fee === 'number' ? rental.platform_fee : rentalCost * 0.15;
  const securityDeposit = typeof rental?.security_deposit === 'number' ? rental.security_deposit : 0;
  const totalPaid = typeof rental?.total_paid === 'number'
    ? rental.total_paid
    : rentalCost + platformFee + securityDeposit;
  const statusTone = useMemo(() => {
    switch (rental?.status) {
      case 'approved':
        return { bg: '#DBEAFE', text: '#1D4ED8', label: 'Approved' };
      case 'paid':
        return { bg: '#F3E8FF', text: '#7C3AED', label: 'Paid' };
      case 'completed':
        return { bg: '#DCFCE7', text: '#15803D', label: 'Completed' };
      case 'declined':
      case 'rejected':
        return { bg: '#FEE2E2', text: '#B91C1C', label: rental.status };
      case 'cancelled':
        return { bg: '#F1F5F9', text: '#64748B', label: 'Cancelled' };
      default:
        return { bg: '#FEF3C7', text: '#B45309', label: rental?.status || 'Loading' };
    }
  }, [rental?.status]);

  return (
    <View style={styles.container}>
      <GlobalHeader />

      <View style={styles.chatHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.chatHeaderInfo}>
          <Text style={styles.chatTitle} numberOfLines={1}>{otherUserEmail}</Text>
          <Text style={styles.chatSub}>Rental Request Chat</Text>
        </View>
        <TouchableOpacity onPress={() => loadMessages(true)} style={styles.refreshBtn}>
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
            {rental ? (
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
                            title: 'Approve request',
                            message: 'Approving will let the renter proceed to payment.',
                            systemMessage: 'Request approved. The renter can now proceed with payment.',
                          })}
                          disabled={isUpdatingStatus}
                        >
                          <MaterialCommunityIcons name="check" size={18} color="#FFFFFF" />
                          <Text style={styles.primaryActionText}>Approve</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.secondaryDangerAction]}
                          onPress={() => handleStatusAction('declined', {
                            title: 'Decline request',
                            message: 'This request will be declined for the renter.',
                            systemMessage: 'Request declined.',
                          })}
                          disabled={isUpdatingStatus}
                        >
                          <MaterialCommunityIcons name="close" size={18} color="#B91C1C" />
                          <Text style={styles.secondaryDangerText}>Decline</Text>
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
                          {isProcessingPayment ? 'Opening checkout...' : 'Pay now'}
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                    {canCancel ? (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.secondaryAction]}
                        onPress={() => handleStatusAction('cancelled', {
                          title: 'Cancel request',
                          message: 'This rental request will be cancelled.',
                          systemMessage: 'Rental request cancelled by renter.',
                        })}
                        disabled={isUpdatingStatus}
                      >
                        <MaterialCommunityIcons name="close-circle-outline" size={18} color="#475569" />
                        <Text style={styles.secondaryActionText}>Cancel</Text>
                      </TouchableOpacity>
                    ) : null}
                    {canCompleteRental ? (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.primaryAction]}
                        onPress={handleRelease}
                        disabled={isUpdatingStatus}
                      >
                        <MaterialCommunityIcons name="cash-check" size={18} color="#FFFFFF" />
                        <Text style={styles.primaryActionText}>Complete rental</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ) : null}
                {rental.status === 'approved' && isRenter ? (
                  <Text style={styles.statusHint}>Owner approved this request. Complete payment to activate the rental.</Text>
                ) : null}
                {rental.status === 'paid' ? (
                  <Text style={styles.statusHint}>Payment is confirmed. The owner can complete the rental after the end date and backend checks.</Text>
                ) : null}
              </View>
            ) : null}
            <FlatList
              ref={flatListRef}
              data={messages}
              inverted
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <MessageBubble msg={item} isOwn={item.sender_email === userEmail} />
              )}
              contentContainerStyle={styles.messageList}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons name="chat-outline" size={56} color="#CBD5E1" />
                  <Text style={styles.emptyText}>No messages yet. Start the conversation!</Text>
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
            placeholder="Type a message..."
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
    margin: 16,
    marginBottom: 0,
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
  messageList: { paddingVertical: 12, flexGrow: 1 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
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
