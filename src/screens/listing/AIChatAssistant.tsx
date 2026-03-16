import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import {
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
import { colors } from '../../theme';
import { Listing } from '../../types/listing';

interface AIChatAssistantProps {
  visible: boolean;
  onClose: () => void;
  itemId: string;
  itemTitle: string;
  item?: Listing | null;
  reviews?: { rating: number; comment?: string }[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Generate an answer based on item data on the client side.
 * No backend AI endpoint required.
 */
const generateAnswer = (
  question: string,
  item: Listing | null | undefined,
  reviews: { rating: number; comment?: string }[],
): string => {
  if (!item) return 'Sorry, item details are not available right now.';

  const q = question.toLowerCase().trim();
  const title = item.title || '';
  const description = item.description || '';
  const category = item.category || '';
  const condition = (item as any).condition || '';
  const dailyRate = item.daily_rate ?? (item as any).dailyRate ?? 0;
  const deposit = (item as any).deposit || 0;
  const minDays = (item as any).min_rental_days || 1;
  const maxDays = (item as any).max_rental_days || 30;
  const instantBooking = (item as any).instant_booking || false;
  const sameDayPickup = (item as any).same_day_pickup || false;
  const deliveryOptions: string[] = (item as any).delivery_options || [];
  const deliveryFee = (item as any).delivery_fee || 0;
  const noticePeriod = (item as any).notice_period_hours || 0;
  const pricingTiers: { days: number; price: number }[] = (item as any).pricing_tiers || [];
  const location = (item as any).location || (item as any).street_address || '';

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  // Price
  if (q.includes('price') || q.includes('cost') || q.includes('rate') || q.includes('how much') || q.includes('expensive') || q.includes('cheap') || q.includes('afford')) {
    let ans = `This item rents for $${dailyRate}/day.`;
    if (pricingTiers.length > 0) {
      const info = pricingTiers.map(t => `${t.days}+ days: $${t.price}/day`).join(', ');
      ans += ` Bulk pricing: ${info}.`;
    }
    if (deposit > 0) ans += ` Security deposit: $${deposit}.`;
    return ans;
  }

  // Condition
  if (q.includes('condition') || q.includes('quality') || q.includes('wear') || q.includes('damage') || q.includes('scratch')) {
    let ans = condition ? `The owner describes this item as in "${condition}" condition.` : 'The condition is not explicitly specified.';
    if (description) ans += ` Description: "${description.substring(0, 150)}${description.length > 150 ? '...' : ''}"`;
    ans += '\n\nFor more details, consider contacting the owner directly.';
    return ans;
  }

  // Availability / booking
  if (q.includes('available') || q.includes('book') || q.includes('reserve') || q.includes('when can')) {
    let ans = `Rental period: minimum ${minDays} day(s), maximum ${maxDays} days.`;
    if (instantBooking) ans += ' Instant booking is available — no owner approval needed.';
    if (sameDayPickup) ans += ' Same-day pickup is available.';
    if (noticePeriod > 0) ans += ` The owner requires ${noticePeriod} hours advance notice.`;
    return ans;
  }

  // Delivery / pickup
  if (q.includes('deliver') || q.includes('pickup') || q.includes('pick up') || q.includes('shipping') || q.includes('collect')) {
    if (deliveryOptions.length > 0) {
      let ans = `Delivery options: ${deliveryOptions.join(', ')}.`;
      if (deliveryFee > 0) ans += ` Delivery fee: $${deliveryFee}.`;
      return ans;
    }
    return 'Pickup is the default option. The owner has not listed specific delivery options. Contact them for arrangements.';
  }

  // Location
  if (q.includes('location') || q.includes('where') || q.includes('address') || q.includes('area') || q.includes('near')) {
    return location
      ? `This item is located at: ${typeof location === 'string' ? location : JSON.stringify(location)}.`
      : 'The exact location is not publicly listed. Contact the owner for pickup details.';
  }

  // Reviews / rating
  if (q.includes('review') || q.includes('rating') || q.includes('recommend') || q.includes('experience') || q.includes('worth')) {
    if (reviews.length > 0) {
      let ans = `This item has ${reviews.length} review(s) with an average rating of ${avgRating}/5.`;
      const withComment = reviews.find(r => r.comment);
      if (withComment?.comment) {
        ans += ` Recent review: "${withComment.comment.substring(0, 120)}${withComment.comment.length > 120 ? '...' : ''}"`;
      }
      return ans;
    }
    return 'This item has no reviews yet. It may be a new listing.';
  }

  // Beginner / suitable
  if (q.includes('beginner') || q.includes('suitable') || q.includes('easy') || q.includes('first time') || q.includes('new to')) {
    let ans = `This is a ${category} item: "${title}".`;
    if (description) ans += ` ${description.substring(0, 200)}${description.length > 200 ? '...' : ''}`;
    ans += '\n\nFor specific suitability questions, I recommend contacting the owner.';
    return ans;
  }

  // What's included
  if (q.includes('include') || q.includes('comes with') || q.includes('accessories') || q.includes('what do i get')) {
    return description
      ? `Based on the listing: "${description.substring(0, 250)}${description.length > 250 ? '...' : ''}"\n\nFor a full list of what's included, ask the owner.`
      : 'The listing does not specify what is included. Please contact the owner.';
  }

  // Deposit / insurance
  if (q.includes('deposit') || q.includes('insurance') || q.includes('protect') || q.includes('secure')) {
    return deposit > 0
      ? `A security deposit of $${deposit} is required. It is refunded after the item is returned in good condition.`
      : 'No security deposit is required for this item.';
  }

  // Category
  if (q.includes('category') || q.includes('type') || q.includes('kind')) {
    return `This item is in the "${category}" category: "${title}".`;
  }

  // Fallback — general info
  let ans = `Here's what I know about "${title}":`;
  if (description) ans += ` ${description.substring(0, 250)}${description.length > 250 ? '...' : ''}`;
  ans += `\n\nPrice: $${dailyRate}/day`;
  if (condition) ans += ` | Condition: ${condition}`;
  if (deposit > 0) ans += ` | Deposit: $${deposit}`;
  if (reviews.length > 0) ans += `\nRated ${avgRating}/5 from ${reviews.length} review(s).`;
  ans += '\n\nAsk me about pricing, availability, condition, delivery, or reviews!';
  return ans;
};

export const AIChatAssistant = ({ visible, onClose, itemId, itemTitle, item, reviews = [] }: AIChatAssistantProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const handleSend = () => {
    const question = input.trim();
    if (!question || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', content: question };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Simulate a brief "thinking" delay for natural UX
    setTimeout(() => {
      const answer = generateAnswer(question, item, reviews);
      setMessages((prev) => [...prev, { role: 'assistant', content: answer }]);
      setIsLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }, 600);
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
          <ScrollView ref={scrollRef} style={styles.messagesContainer} contentContainerStyle={styles.messagesContent}>
            {messages.length === 0 && (
              <View style={styles.welcomeContainer}>
                <MaterialCommunityIcons name="robot-happy" size={48} color="#D1D5DB" />
                <Text style={styles.welcomeTitle}>Ask me anything</Text>
                <Text style={styles.welcomeText}>
                  I can answer questions about this item based on its details, pricing, reviews, and more.
                </Text>
                <View style={styles.suggestions}>
                  {[
                    'How much does it cost?',
                    'What condition is it in?',
                    'What are the delivery options?',
                    'Does it have good reviews?',
                  ].map((suggestion, i) => (
                    <TouchableOpacity
                      key={i}
                      style={styles.suggestionChip}
                      onPress={() => setInput(suggestion)}
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  aiIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#8B5CF6', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  headerSubtitle: { fontSize: 12, color: '#6B7280', maxWidth: 200 },
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
  inputContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingBottom: Platform.OS === 'ios' ? 28 : 12 },
  input: { flex: 1, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: '#0F172A' },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#8B5CF6', alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
});
