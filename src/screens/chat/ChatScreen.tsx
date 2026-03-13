import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useUser } from '@clerk/expo';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Text } from 'react-native-paper';
import { GlobalHeader } from '../../components/common/GlobalHeader';
import { getMessages, sendMessage } from '../../services/messageService';
import { useAuthStore } from '../../store/authStore';
import { colors, typography } from '../../theme';
import { Message } from '../../types/models';
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

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
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
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [rentalRequestId]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

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
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <MessageBubble msg={item} isOwn={item.sender_email === userEmail} />
            )}
            contentContainerStyle={styles.messageList}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => { setIsRefreshing(true); loadMessages(true); }}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="chat-outline" size={56} color="#CBD5E1" />
                <Text style={styles.emptyText}>No messages yet. Start the conversation!</Text>
              </View>
            }
          />
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
  messageList: { paddingVertical: 12, flexGrow: 1, justifyContent: 'flex-end' },
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
