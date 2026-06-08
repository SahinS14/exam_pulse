import {
  USER_SCOPED_KEYS,
  getScopedAsyncItem,
  setScopedAsyncItem,
} from "./userScopedState";

export async function getLastStudyActivity(userId) {
  const raw = await getScopedAsyncItem(USER_SCOPED_KEYS.lastStudyActivity, userId);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

export async function recordStudyActivity(userId, patch) {
  const current = (await getLastStudyActivity(userId)) || {};
  const next = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  await setScopedAsyncItem(
    USER_SCOPED_KEYS.lastStudyActivity,
    JSON.stringify(next),
    userId
  );

  return next;
}
