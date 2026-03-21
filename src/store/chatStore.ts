import { create } from 'zustand';
import { getMessages, sendMessage } from '../services/messageService';
import { Message } from '../types/models';
import { sortMessagesChronologically } from '../utils/messageOrdering';

interface ChatState {
  messagesByRequest: Record<string, Message[]>;
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  fetchMessages: (rentalRequestId: string) => Promise<void>;
  send: (rentalRequestId: string, senderEmail: string, content: string) => Promise<void>;
  clearError: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messagesByRequest: {},
  isLoading: false,
  isSending: false,
  error: null,

  fetchMessages: async (rentalRequestId) => {
    set({ isLoading: true, error: null });
    try {
      const data = await getMessages(rentalRequestId);
      const sorted = sortMessagesChronologically(data);
      set((state) => ({
        messagesByRequest: { ...state.messagesByRequest, [rentalRequestId]: sorted },
        isLoading: false,
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load messages.';
      set({ error: msg, isLoading: false });
    }
  },

  send: async (rentalRequestId, senderEmail, content) => {
    set({ isSending: true, error: null });
    try {
      const newMsg = await sendMessage({ rental_request_id: rentalRequestId, sender_email: senderEmail, content });
      set((state) => {
        const existing = state.messagesByRequest[rentalRequestId] ?? [];
        return {
          messagesByRequest: {
            ...state.messagesByRequest,
            [rentalRequestId]: sortMessagesChronologically([...existing, newMsg]),
          },
          isSending: false,
        };
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to send message.';
      set({ error: msg, isSending: false });
      throw err;
    }
  },

  clearError: () => set({ error: null }),
}));
