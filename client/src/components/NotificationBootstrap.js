import { useCallback, useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";

import { registerPushToken } from "../api/notifications";
import { navigateToRoute, resetToRoute } from "../navigation/navigationRef";
import { resolveNotificationRoute } from "../navigation/linking";
import { useAuthStore } from "../store/authStore";
import { useNotificationStore } from "../store/notificationStore";
import {
  USER_SCOPED_KEYS,
  getScopedSecureItem,
  setScopedSecureItem,
} from "../utils/userScopedState";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerForPushNotificationsAsync() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("content-updates", {
      name: "Content Updates",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#1f6feb",
    });
  }

  if (!Device.isDevice) {
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return null;
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return token.data;
}

async function scheduleAccessExpiryReminder(accessExpiry, userId) {
  if (!accessExpiry) {
    return;
  }

  const savedExpiry = await getScopedSecureItem(
    USER_SCOPED_KEYS.accessReminderExpiry,
    userId
  );

  if (savedExpiry === accessExpiry) {
    return;
  }

  const existingReminderId = await getScopedSecureItem(
    USER_SCOPED_KEYS.accessReminderId,
    userId
  );

  if (existingReminderId) {
    await Notifications.cancelScheduledNotificationAsync(existingReminderId).catch(() => {});
  }

  const expiryDate = new Date(accessExpiry);

  if (Number.isNaN(expiryDate.getTime())) {
    return;
  }

  const reminderDate = new Date(expiryDate.getTime() - 7 * 24 * 60 * 60 * 1000);
  const now = new Date();

  if (expiryDate <= now) {
    return;
  }

  const triggerDate = reminderDate > now ? reminderDate : new Date(now.getTime() + 5000);

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: "ExamPulse access expiring soon",
      body: "Your premium access expires in 7 days. Renew to keep your study library unlocked.",
      data: { type: "access-expiry" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });

  await setScopedSecureItem(USER_SCOPED_KEYS.accessReminderExpiry, accessExpiry, userId);
  await setScopedSecureItem(USER_SCOPED_KEYS.accessReminderId, identifier, userId);
}

export default function NotificationBootstrap() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const accessExpiry = useAuthStore((state) => state.accessExpiry);
  const handleAccessExpired = useAuthStore((state) => state.handleAccessExpired);
  const incrementUnreadCount = useNotificationStore((state) => state.incrementUnreadCount);
  const clearUnreadCount = useNotificationStore((state) => state.clearUnreadCount);
  const handledResponseIds = useRef(new Set());

  const hasActiveAccess = useCallback(() => {
    if (!user || user.role === "admin") {
      return true;
    }

    if (!accessExpiry) {
      return false;
    }

    return new Date(accessExpiry).getTime() > Date.now();
  }, [accessExpiry, user]);

  const handleNotificationResponse = useCallback(
    async (response) => {
      const identifier = response?.notification?.request?.identifier;

      if (identifier && handledResponseIds.current.has(identifier)) {
        return;
      }

      if (identifier) {
        handledResponseIds.current.add(identifier);
      }

      if (!token || !user?._id) {
        resetToRoute("Login");
        return;
      }

      const target = resolveNotificationRoute(
        response?.notification?.request?.content?.data || {}
      );

      if (target.requiresPremium && !hasActiveAccess()) {
        await handleAccessExpired();
        resetToRoute("Paywall");
        return;
      }

      navigateToRoute(target.name, target.params);
    },
    [handleAccessExpired, hasActiveAccess, token, user?._id]
  );

  useEffect(() => {
    if (!token || !user?._id) {
      clearUnreadCount();
      return undefined;
    }

    const receivedSubscription = Notifications.addNotificationReceivedListener(() => {
      incrementUnreadCount();
    });

    return () => {
      receivedSubscription.remove();
    };
  }, [clearUnreadCount, incrementUnreadCount, token, user?._id]);

  useEffect(() => {
    let active = true;

    const hydrateLastResponse = async () => {
      if (!token || !user?._id) {
        return;
      }

      const response = await Notifications.getLastNotificationResponseAsync();

      if (!active || !response) {
        return;
      }

      await handleNotificationResponse(response);

      if (typeof Notifications.clearLastNotificationResponseAsync === "function") {
        await Notifications.clearLastNotificationResponseAsync().catch(() => {});
      }
    };

    hydrateLastResponse();

    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        handleNotificationResponse(response).catch(() => {});
      });

    return () => {
      active = false;
      responseSubscription.remove();
    };
  }, [handleNotificationResponse, token, user?._id]);

  useEffect(() => {
    if (!token || !user?._id) {
      return;
    }

    let active = true;

    const setupNotifications = async () => {
      const pushToken = await registerForPushNotificationsAsync();

      if (active && pushToken) {
        await registerPushToken({
          token: pushToken,
          platform: Platform.OS,
        }).catch(() => {});
      }

      if (active && user.role !== "admin") {
        await scheduleAccessExpiryReminder(accessExpiry, user._id);
      }
    };

    setupNotifications();

    return () => {
      active = false;
    };
  }, [accessExpiry, token, user?._id, user?.role]);

  return null;
}
