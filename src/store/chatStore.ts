import { create } from 'zustand';
import { getMessages, sendMessage } from '../services/messageService';
import { Message } from '../types/models';

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
      const sorted = [...data].sort(
        (a, b) => new Date(a.created_date).getTime() - new Date(b.created_date).getTime(),
      );
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
          messagesByRequest: { ...state.messagesByRequest, [rentalRequestId]: [...existing, newMsg] },
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
