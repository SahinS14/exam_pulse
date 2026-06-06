import { create } from "zustand";

export const useNotificationStore = create((set) => ({
  unreadCount: 0,
  setUnreadCount: (count) =>
    set({
      unreadCount: Math.max(0, Number(count) || 0),
    }),
  incrementUnreadCount: () =>
    set((state) => ({
      unreadCount: state.unreadCount + 1,
    })),
  clearUnreadCount: () =>
    set({
      unreadCount: 0,
    }),
}));
