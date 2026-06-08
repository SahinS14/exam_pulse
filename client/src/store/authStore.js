import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

import { useAppStore } from "./appStore";
import { clearUserScopedClientState } from "../utils/userScopedState";

const AUTH_TOKEN_KEY = "authToken";
const AUTH_SESSION_KEY = "authSession";

const saveSession = async ({ token, user, isPaid, accessExpiry }) => {
  await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token || "");
  await SecureStore.setItemAsync(
    AUTH_SESSION_KEY,
    JSON.stringify({
      token,
      user,
      isPaid,
      accessExpiry,
    })
  );
};

const clearSession = async () => {
  await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
  await SecureStore.deleteItemAsync(AUTH_SESSION_KEY);
};

export const useAuthStore = create((set) => ({
  user: null,
  token: null,
  isPaid: false,
  accessExpiry: null,
  hydrated: false,
  hydrateSession: async () => {
    try {
      const session = await SecureStore.getItemAsync(AUTH_SESSION_KEY);

      if (!session) {
        set({
          user: null,
          token: null,
          isPaid: false,
          accessExpiry: null,
          hydrated: true,
        });
        return;
      }

      const parsedSession = JSON.parse(session);

      set({
        user: parsedSession.user,
        token: parsedSession.token,
        isPaid: parsedSession.isPaid,
        accessExpiry: parsedSession.accessExpiry,
        hydrated: true,
      });
    } catch (error) {
      await clearSession();
      set({
        user: null,
        token: null,
        isPaid: false,
        accessExpiry: null,
        hydrated: true,
      });
    }
  },
  login: async ({ token, user }) => {
    const nextState = {
      token,
      user,
      isPaid: Boolean(user?.isPaid),
      accessExpiry: user?.accessExpiry || null,
    };

    await saveSession(nextState);
    set(nextState);
  },
  logout: async () => {
    const userId = useAuthStore.getState().user?._id || null;
    await clearUserScopedClientState(userId);
    await useAppStore.getState().clearContext();
    await clearSession();
    set({
      user: null,
      token: null,
      isPaid: false,
      accessExpiry: null,
    });
  },
  updatePaymentStatus: async ({ isPaid, accessExpiry }) => {
    let snapshot;

    set((state) => {
      snapshot = {
        ...state,
        isPaid,
        accessExpiry,
      };

      return {
        isPaid,
        accessExpiry,
      };
    });

    await saveSession(snapshot);
  },
  handleAccessExpired: async () => {
    let snapshot;

    set((state) => {
      snapshot = {
        ...state,
        isPaid: false,
        accessExpiry: null,
      };

      return {
        isPaid: false,
        accessExpiry: null,
      };
    });

    await saveSession(snapshot);
  },
}));
