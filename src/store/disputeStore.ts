import { create } from 'zustand';
import { createDispute, getDisputes } from '../services/disputeService';
import { Dispute } from '../types/models';

interface DisputeState {
  disputes: Dispute[];
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  fetchDisputes: (userEmail: string) => Promise<void>;
  submitDispute: (data: {
    rental_request_id: string;
    filed_by_email: string;
    against_email: string;
    reason: string;
    description: string;
  }) => Promise<Dispute>;
  clearError: () => void;
}

export const useDisputeStore = create<DisputeState>((set, get) => ({
  disputes: [],
  isLoading: false,
  isSubmitting: false,
  error: null,

  fetchDisputes: async (userEmail) => {
    set({ isLoading: true, error: null });
    try {
      const [filed, against] = await Promise.allSettled([
        getDisputes({ filed_by_email: userEmail }),
        getDisputes({ against_email: userEmail }),
      ]);
      const filedData = filed.status === 'fulfilled' ? filed.value : [];
      const againstData = against.status === 'fulfilled' ? against.value : [];
      const all = [...filedData, ...againstData];
      const unique = Array.from(new Map(all.map((d) => [d.id, d])).values());
      unique.sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime());
      set({ disputes: unique, isLoading: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load disputes.';
      set({ error: msg, isLoading: false });
    }
  },

  submitDispute: async (data) => {
    set({ isSubmitting: true, error: null });
    try {
      const result = await createDispute(data);
      set((state) => ({ disputes: [result, ...state.disputes], isSubmitting: false }));
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to submit dispute.';
      set({ error: msg, isSubmitting: false });
      throw err;
    }
  },

  clearError: () => set({ error: null }),
}));
