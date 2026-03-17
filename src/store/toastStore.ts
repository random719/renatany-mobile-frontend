import { create } from 'zustand';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

interface ToastState {
  visible: boolean;
  title: string;
  message: string;
  variant: ToastVariant;
  onDismiss?: () => void;
  show: (message: string, variant?: ToastVariant, onDismiss?: () => void) => void;
  hide: () => void;
}

const VARIANT_TITLES: Record<ToastVariant, string> = {
  success: 'Success',
  error: 'Error',
  warning: 'Warning',
  info: 'Info',
};

export const useToastStore = create<ToastState>((set) => ({
  visible: false,
  title: '',
  message: '',
  variant: 'info',
  onDismiss: undefined,
  show: (message, variant = 'info', onDismiss?) =>
    set({ visible: true, title: VARIANT_TITLES[variant], message, variant, onDismiss }),
  hide: () => {
    const { onDismiss } = useToastStore.getState();
    set({ visible: false, onDismiss: undefined });
    onDismiss?.();
  },
}));

/** Convenience helpers — importable without hooks (e.g. inside catch blocks). */
export const toast = {
  success: (msg: string, onDismiss?: () => void) => useToastStore.getState().show(msg, 'success', onDismiss),
  error: (msg: string, onDismiss?: () => void) => useToastStore.getState().show(msg, 'error', onDismiss),
  info: (msg: string, onDismiss?: () => void) => useToastStore.getState().show(msg, 'info', onDismiss),
  warning: (msg: string, onDismiss?: () => void) => useToastStore.getState().show(msg, 'warning', onDismiss),
};
