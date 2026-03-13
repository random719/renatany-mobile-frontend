import { create } from 'zustand';
import { createRentalRequest } from '../services/bookingService';
import { RentalRequest } from '../types/models';

interface PendingBooking {
  listingId: string;
  listingTitle: string;
  ownerEmail: string;
  pricePerDay: number;
  startDate: string;
  endDate: string;
  totalDays: number;
  dailyRate: number;
  platformFee: number;
  deposit: number;
  totalAmount: number;
  message: string;
}

interface BookingState {
  pendingBooking: Partial<PendingBooking>;
  isSubmitting: boolean;
  error: string | null;
  lastCreatedRequest: RentalRequest | null;
  setPendingBooking: (data: Partial<PendingBooking>) => void;
  clearBooking: () => void;
  submitBooking: (renterEmail: string) => Promise<RentalRequest>;
  clearError: () => void;
}

export const useBookingStore = create<BookingState>((set, get) => ({
  pendingBooking: {},
  isSubmitting: false,
  error: null,
  lastCreatedRequest: null,

  setPendingBooking: (data) =>
    set((state) => ({ pendingBooking: { ...state.pendingBooking, ...data } })),

  clearBooking: () =>
    set({ pendingBooking: {}, isSubmitting: false, error: null, lastCreatedRequest: null }),

  clearError: () => set({ error: null }),

  submitBooking: async (renterEmail) => {
    const { pendingBooking } = get();
    set({ isSubmitting: true, error: null });
    try {
      const result = await createRentalRequest({
        item_id: pendingBooking.listingId!,
        renter_email: renterEmail,
        owner_email: pendingBooking.ownerEmail!,
        start_date: pendingBooking.startDate!,
        end_date: pendingBooking.endDate!,
        total_amount: pendingBooking.totalAmount!,
        platform_fee: pendingBooking.platformFee ?? 0,
        security_deposit: pendingBooking.deposit ?? 0,
        message: pendingBooking.message || undefined,
      });
      set({ lastCreatedRequest: result, isSubmitting: false });
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to submit booking.';
      set({ error: msg, isSubmitting: false });
      throw err;
    }
  },
}));
