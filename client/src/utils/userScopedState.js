import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";

const AUTH_SESSION_KEY = "authSession";

export const USER_SCOPED_KEYS = {
  browseContext: "appBrowseContext",
  lastStudyActivity: "lastStudyActivity",
  studyStreak: "homeStudyStreak",
  exploredSubjects: "exploredSubjectIds",
  recentSearches: "recentSearches",
  accessReminderExpiry: "accessReminderExpiry",
  accessReminderId: "accessReminderId",
};

const toScopedKey = (baseKey, userId) => `${baseKey}:${userId}`;

async function getStoredSessionUserId() {
  try {
    const session = await SecureStore.getItemAsync(AUTH_SESSION_KEY);

    if (!session) {
      return null;
    }

    const parsed = JSON.parse(session);
    return parsed?.user?._id || null;
  } catch (error) {
    return null;
  }
}

export async function resolveScopedUserId(explicitUserId) {
  if (explicitUserId) {
    return explicitUserId;
  }

  return getStoredSessionUserId();
}

export async function getScopedAsyncItem(baseKey, explicitUserId) {
  const userId = await resolveScopedUserId(explicitUserId);

  if (!userId) {
    return null;
  }

  const scopedKey = toScopedKey(baseKey, userId);
  const scopedValue = await AsyncStorage.getItem(scopedKey);
  return scopedValue != null ? scopedValue : null;
}

export async function setScopedAsyncItem(baseKey, value, explicitUserId) {
  const userId = await resolveScopedUserId(explicitUserId);

  if (!userId) {
    return;
  }

  await AsyncStorage.setItem(toScopedKey(baseKey, userId), value);
}

export async function removeScopedAsyncItem(baseKey, explicitUserId) {
  const userId = await resolveScopedUserId(explicitUserId);

  if (!userId) {
    return;
  }

  await AsyncStorage.removeItem(toScopedKey(baseKey, userId));
}

export async function getScopedSecureItem(baseKey, explicitUserId) {
  const userId = await resolveScopedUserId(explicitUserId);

  if (!userId) {
    return null;
  }

  const scopedKey = toScopedKey(baseKey, userId);
  const scopedValue = await SecureStore.getItemAsync(scopedKey);
  return scopedValue != null ? scopedValue : null;
}

export async function setScopedSecureItem(baseKey, value, explicitUserId) {
  const userId = await resolveScopedUserId(explicitUserId);

  if (!userId) {
    return;
  }

  await SecureStore.setItemAsync(toScopedKey(baseKey, userId), value);
}

export async function removeScopedSecureItem(baseKey, explicitUserId) {
  const userId = await resolveScopedUserId(explicitUserId);

  if (!userId) {
    return;
  }

  await SecureStore.deleteItemAsync(toScopedKey(baseKey, userId));
}

export async function clearUserScopedClientState(explicitUserId) {
  const userId = await resolveScopedUserId(explicitUserId);
  const scopedAsyncKeys = [
    USER_SCOPED_KEYS.lastStudyActivity,
    USER_SCOPED_KEYS.studyStreak,
    USER_SCOPED_KEYS.exploredSubjects,
    USER_SCOPED_KEYS.recentSearches,
  ];
  const scopedSecureKeys = [
    USER_SCOPED_KEYS.browseContext,
    USER_SCOPED_KEYS.accessReminderExpiry,
    USER_SCOPED_KEYS.accessReminderId,
  ];

  const reminderIds = [];

  if (userId) {
    const scopedReminderId = await SecureStore.getItemAsync(
      toScopedKey(USER_SCOPED_KEYS.accessReminderId, userId)
    );

    if (scopedReminderId) {
      reminderIds.push(scopedReminderId);
    }

    await Promise.all(
      scopedAsyncKeys.map((key) => AsyncStorage.removeItem(toScopedKey(key, userId)))
    );
    await Promise.all(
      scopedSecureKeys.map((key) =>
        SecureStore.deleteItemAsync(toScopedKey(key, userId))
      )
    );
  }

  const legacyReminderId = await SecureStore.getItemAsync(USER_SCOPED_KEYS.accessReminderId);

  if (legacyReminderId) {
    reminderIds.push(legacyReminderId);
  }

  await Promise.all(
    [...new Set(reminderIds)].map((identifier) =>
      Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {})
    )
  );

  await AsyncStorage.multiRemove(scopedAsyncKeys);
  await Promise.all(scopedSecureKeys.map((key) => SecureStore.deleteItemAsync(key)));
}
