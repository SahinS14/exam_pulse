import * as ExpoLinking from "expo-linking";

const prefixes = [ExpoLinking.createURL("/"), "exampulse://"];

function getString(value, fallback) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export function resolveNotificationRoute(data = {}) {
  const url = typeof data?.url === "string" ? data.url.trim() : "";

  if (!url) {
    return {
      name: "Notifications",
      params: undefined,
      requiresPremium: false,
    };
  }

  const parsed = ExpoLinking.parse(url);
  const path = (parsed.path || "").replace(/^\/+/, "");
  const segments = path.split("/").filter(Boolean);
  const query = parsed.queryParams || {};

  if (segments[0] === "questions" && segments[1]) {
    return {
      name: "QuestionList",
      params: {
        topic: {
          _id: segments[1],
          name: getString(query.topicName, "Question Bank"),
        },
      },
      requiresPremium: true,
    };
  }

  if (segments[0] === "concepts" && segments[1]) {
    return {
      name: "ConceptList",
      params: {
        module: {
          _id: segments[1],
          title: getString(query.moduleTitle, "Module"),
          number: Number(query.moduleNumber) || undefined,
        },
      },
      requiresPremium: true,
    };
  }

  if (segments[0] === "notes" && segments[1]) {
    return {
      name: "Notes",
      params: {
        module: {
          _id: segments[1],
          title: getString(query.moduleTitle, "Module"),
          number: Number(query.moduleNumber) || undefined,
        },
      },
      requiresPremium: true,
    };
  }

  return {
    name: "Notifications",
    params: undefined,
    requiresPremium: false,
  };
}

export const linking = {
  prefixes,
  config: {
    screens: {
      Login: "login",
      Register: "register",
      Paywall: "paywall",
      Notifications: "notifications",
      QuestionList: "questions/:topicId",
      ConceptList: "concepts/:moduleId",
      Notes: "notes/:moduleId",
      MainTabs: {
        screens: {
          HomeTab: "home",
          BrowseTab: "browse",
          SearchTab: "search",
          BookmarksTab: "bookmarks",
          AdminTab: "admin",
        },
      },
    },
  },
};
