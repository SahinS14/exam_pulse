import { useEffect } from "react";
import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

import { registerPushToken } from "../api/notifications";
import { useAuthStore } from "../store/authStore";
import { useNotificationStore } from "../store/notificationStore";

const ACCESS_REMINDER_KEY = "accessReminderExpiry";
const ACCESS_REMINDER_ID_KEY = "accessReminderId";

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

async function scheduleAccessExpiryReminder(accessExpiry) {
  if (!accessExpiry) {
    return;
  }

  const savedExpiry = await SecureStore.getItemAsync(ACCESS_REMINDER_KEY);

  if (savedExpiry === accessExpiry) {
    return;
  }

  const existingReminderId = await SecureStore.getItemAsync(ACCESS_REMINDER_ID_KEY);

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

  await SecureStore.setItemAsync(ACCESS_REMINDER_KEY, accessExpiry);
  await SecureStore.setItemAsync(ACCESS_REMINDER_ID_KEY, identifier);
}

export default function NotificationBootstrap() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const accessExpiry = useAuthStore((state) => state.accessExpiry);
  const incrementUnreadCount = useNotificationStore((state) => state.incrementUnreadCount);
  const clearUnreadCount = useNotificationStore((state) => state.clearUnreadCount);

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
        await scheduleAccessExpiryReminder(accessExpiry);
      }
    };

    setupNotifications();

    return () => {
      active = false;
    };
  }, [accessExpiry, token, user?._id, user?.role]);

  return null;
}
