import { create } from "zustand";

interface ActivityState {
  isOpen: boolean;
  toggleActivity: () => void;
  openActivity: () => void;
  closeActivity: () => void;
}

export const useActivityStore = create<ActivityState>((set) => ({
  isOpen: false,
  toggleActivity: () => set((state) => ({ isOpen: !state.isOpen })),
  openActivity: () => set({ isOpen: true }),
  closeActivity: () => set({ isOpen: false }),
}));
