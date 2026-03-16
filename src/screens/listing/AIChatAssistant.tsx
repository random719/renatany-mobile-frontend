import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { api } from '../../services/api';
import { colors } from '../../theme';

interface AIChatAssistantProps {
  visible: boolean;
  onClose: () => void;
  itemId: string;
  itemTitle: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const AIChatAssistant = ({ visible, onClose, itemId, itemTitle }: AIChatAssistantProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    const question = input.trim();
    if (!question || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', content: question };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await api.post('/ai/ask-item-question', {
        item_id: itemId,
        question,
      });

      const answer = res.data?.data?.answer || res.data?.answer || 'Sorry, I couldn\'t generate an answer.';
      setMessages((prev) => [...prev, { role: 'assistant', content: answer }]);
    } catch (error: any) {
      const errMsg = error?.response?.data?.error || 'Failed to get a response. Please try again.';
      setMessages((prev) => [...prev, { role: 'assistant', content: errMsg }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />
        <View style={styles.container}>
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.aiIcon}>
                <MaterialCommunityIcons name="robot" size={20} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.headerTitle}>AI Assistant</Text>
                <Text style={styles.headerSubtitle} numberOfLines={1}>
                  Ask about "{itemTitle}"
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleClose}>
              <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Messages */}
          <ScrollView style={styles.messagesContainer} contentContainerStyle={styles.messagesContent}>
            {messages.length === 0 && (
              <View style={styles.welcomeContainer}>
                <MaterialCommunityIcons name="robot-happy" size={48} color="#D1D5DB" />
                <Text style={styles.welcomeTitle}>Ask me anything</Text>
                <Text style={styles.welcomeText}>
                  I can answer questions about this item based on its details, specifications, and more.
                </Text>
                <View style={styles.suggestions}>
                  {[
                    'Is this item good for beginners?',
                    'What condition is it in?',
                    'What\'s included in the rental?',
                  ].map((suggestion, i) => (
                    <TouchableOpacity
                      key={i}
                      style={styles.suggestionChip}
                      onPress={() => {
                        setInput(suggestion);
                      }}
                    >
                      <Text style={styles.suggestionText}>{suggestion}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {messages.map((msg, i) => (
              <View
                key={i}
                style={[
                  styles.messageBubble,
                  msg.role === 'user' ? styles.userBubble : styles.assistantBubble,
                ]}
              >
                {msg.role === 'assistant' && (
                  <MaterialCommunityIcons name="robot" size={14} color="#6B7280" style={{ marginBottom: 4 }} />
                )}
                <Text style={[styles.messageText, msg.role === 'user' && styles.userMessageText]}>
                  {msg.content}
                </Text>
              </View>
            ))}

            {isLoading && (
              <View style={[styles.messageBubble, styles.assistantBubble]}>
                <View style={styles.typingIndicator}>
                  <ActivityIndicator size="small" color="#6B7280" />
                  <Text style={styles.typingText}>Thinking...</Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Input */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Ask a question..."
              placeholderTextColor="#9CA3AF"
              value={input}
              onChangeText={setInput}
              onSubmitEditing={handleSend}
              returnKeyType="send"
              editable={!isLoading}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!input.trim() || isLoading) && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!input.trim() || isLoading}
            >
              <MaterialCommunityIcons name="send" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  backdrop: { flex: 1 },
  container: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%', minHeight: '50%' },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#D1D5DB', alignSelf: 'center', marginTop: 10, marginBottom: 8 },
  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  aiIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#8B5CF6', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  headerSubtitle: { fontSize: 12, color: '#6B7280', maxWidth: 200 },
  // Messages
  messagesContainer: { flex: 1, paddingHorizontal: 20 },
  messagesContent: { paddingVertical: 16, gap: 10 },
  welcomeContainer: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  welcomeTitle: { fontSize: 18, fontWeight: '600', color: '#0F172A' },
  welcomeText: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 },
  suggestions: { marginTop: 12, gap: 8, width: '100%' },
  suggestionChip: { backgroundColor: '#F3F4F6', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, alignSelf: 'center' },
  suggestionText: { fontSize: 13, color: '#374151' },
  messageBubble: { maxWidth: '85%', padding: 12, borderRadius: 14 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  assistantBubble: { alignSelf: 'flex-start', backgroundColor: '#F3F4F6', borderBottomLeftRadius: 4 },
  messageText: { fontSize: 14, color: '#374151', lineHeight: 20 },
  userMessageText: { color: '#FFFFFF' },
  typingIndicator: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typingText: { fontSize: 13, color: '#6B7280' },
  // Input
  inputContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingBottom: Platform.OS === 'ios' ? 28 : 12 },
  input: { flex: 1, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: '#0F172A' },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#8B5CF6', alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
});
