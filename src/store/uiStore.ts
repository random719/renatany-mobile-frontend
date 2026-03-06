import { create } from 'zustand';

interface UIState {
    isSidebarVisible: boolean;
    openSidebar: () => void;
    closeSidebar: () => void;
    toggleSidebar: () => void;
}

export const useUIStore = create<UIState>((set) => ({
    isSidebarVisible: false,
    openSidebar: () => set({ isSidebarVisible: true }),
    closeSidebar: () => set({ isSidebarVisible: false }),
    toggleSidebar: () => set((state) => ({ isSidebarVisible: !state.isSidebarVisible })),
}));
