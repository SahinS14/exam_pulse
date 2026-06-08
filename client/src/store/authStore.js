import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

import { validateSessionRequest } from "../api/session";
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
  sessionCheckStatus: "idle",
  sessionCheckMessage: "",
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
          sessionCheckStatus: "idle",
          sessionCheckMessage: "",
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
        sessionCheckStatus: "idle",
        sessionCheckMessage: "",
      });
    } catch (error) {
      await clearSession();
      set({
        user: null,
        token: null,
        isPaid: false,
        accessExpiry: null,
        hydrated: true,
        sessionCheckStatus: "idle",
        sessionCheckMessage: "",
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
    set({
      ...nextState,
      sessionCheckStatus: "healthy",
      sessionCheckMessage: "",
    });
  },
  logout: async () => {
    const userId = useAuthStore.getState().user?._id || null;
    try {
      await clearUserScopedClientState(userId);
    } catch (error) {}

    try {
      await useAppStore.getState().clearContext();
    } catch (error) {}

    try {
      await clearSession();
    } finally {
      set({
        user: null,
        token: null,
        isPaid: false,
        accessExpiry: null,
        sessionCheckStatus: "idle",
        sessionCheckMessage: "",
      });
    }
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
  revalidateSession: async () => {
    const token = useAuthStore.getState().token;

    if (!token) {
      return { status: "missing" };
    }

    set({
      sessionCheckStatus: "checking",
      sessionCheckMessage: "",
    });

    try {
      const data = await validateSessionRequest();
      const user = data?.user || null;
      const nextState = {
        token,
        user,
        isPaid: Boolean(user?.isPaid),
        accessExpiry: user?.accessExpiry || null,
      };

      await saveSession(nextState);
      set({
        ...nextState,
        sessionCheckStatus: "healthy",
        sessionCheckMessage: "",
      });

      return {
        status: "valid",
        user,
      };
    } catch (error) {
      if (error?.response?.status === 401) {
        await useAuthStore.getState().logout();
        return { status: "invalid" };
      }

      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Unable to reach the server right now.";

      set({
        sessionCheckStatus: "unavailable",
        sessionCheckMessage: message,
      });

      return {
        status: "unavailable",
        message,
      };
    }
  },
}));
