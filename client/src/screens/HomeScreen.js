import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import Svg, { Circle } from "react-native-svg";

import { getBookmarks, getRecentUpdates } from "../api/content";
import { getNotificationsUnreadCount } from "../api/notifications";
import AppBrandHeader from "../components/AppBrandHeader";
import SectionHeader from "../components/SectionHeader";
import SkeletonLoader from "../components/SkeletonLoader";
import StatBadge from "../components/StatBadge";
import Toast from "../components/Toast";
import { ErrorState, EmptyState } from "../components/ScreenState";
import { useAppStore } from "../store/appStore";
import { useAuthStore } from "../store/authStore";
import { useNotificationStore } from "../store/notificationStore";
import { useResponsiveLayout } from "../utils/layout";
import { resetToRoute } from "../navigation/navigationRef";
import {
  fontWeights,
  radius,
  shadows,
  spacing,
  typography,
  useAppTheme,
} from "../utils/theme";
import { openStudyResource } from "../utils/fileResources";
import { getLastStudyActivity } from "../utils/studyActivity";
import {
  USER_SCOPED_KEYS,
  getScopedAsyncItem,
  setScopedAsyncItem,
} from "../utils/userScopedState";

const QUICK_ACCESS = [
  {
    key: "mostRepeated",
    title: "Most Repeated",
    icon: "repeat-outline",
    color: "#4F46E5",
    bg: "#EEF2FF",
  },
  {
    key: "concepts",
    title: "Important Concepts",
    icon: "bulb-outline",
    color: "#F59E0B",
    bg: "#FEF3C7",
  },
  {
    key: "notes",
    title: "Notes",
    icon: "document-text-outline",
    color: "#10B981",
    bg: "#D1FAE5",
  },
  {
    key: "topRevision",
    title: "Top Revision",
    icon: "star-outline",
    color: "#7C3AED",
    bg: "#EDE9FE",
  },
];

function formatRelativeDate(value) {
  if (!value) {
    return "Recently";
  }

  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return "Recently";
  }

  const diffMs = Date.now() - timestamp;
  const hours = Math.floor(diffMs / (60 * 60 * 1000));
  const days = Math.floor(hours / 24);

  if (hours < 1) {
    const minutes = Math.max(1, Math.floor(diffMs / (60 * 1000)));
    return `${minutes}m ago`;
  }

  if (hours < 24) {
    return `${hours}h ago`;
  }

  if (days === 1) {
    return "Yesterday";
  }

  return `${days}d ago`;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) {
    return "Good Morning";
  }
  if (hour < 17) {
    return "Good Afternoon";
  }
  return "Good Evening";
}

function formatExpiryDate(value) {
  if (!value) {
    return "Not active";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unavailable";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

async function updateStreak(userId) {
  const today = new Date().toISOString().slice(0, 10);
  const stored = await getScopedAsyncItem(USER_SCOPED_KEYS.studyStreak, userId);

  if (!stored) {
    const next = { count: 1, lastDate: today };
    await setScopedAsyncItem(
      USER_SCOPED_KEYS.studyStreak,
      JSON.stringify(next),
      userId
    );
    return next.count;
  }

  const parsed = JSON.parse(stored);
  if (parsed.lastDate === today) {
    return parsed.count || 1;
  }

  const previous = new Date(parsed.lastDate);
  const current = new Date(today);
  const dayGap = Math.round((current - previous) / (24 * 60 * 60 * 1000));
  const nextCount = dayGap === 1 ? (parsed.count || 0) + 1 : 1;
  const next = { count: nextCount, lastDate: today };
  await setScopedAsyncItem(
    USER_SCOPED_KEYS.studyStreak,
    JSON.stringify(next),
    userId
  );
  return next.count;
}

async function getExploredSubjectsCount(userId) {
  const raw = await getScopedAsyncItem(USER_SCOPED_KEYS.exploredSubjects, userId);
  if (!raw) {
    return 0;
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch (error) {
    return 0;
  }
}

function buildRecentItems(recentUpdates) {
  const questions = (recentUpdates.questions || []).map((question) => ({
    id: `question-${question._id}`,
    type: "question",
    badge: "NEW QUESTION",
    title: question.tags?.[0] || question.markCategory || "Fresh PYQ added",
    subtitle: question.questionText || "Question bank updated",
    timestamp: question.createdAt,
    icon: "help-circle-outline",
    color: "#4F46E5",
    bg: "#EEF2FF",
    payload: question,
  }));

  const notes = (recentUpdates.notes || []).map((note) => ({
    id: `note-${note._id}`,
    type: "note",
    badge: "NEW NOTE",
    title: note.title || "New note uploaded",
    subtitle: note.type || "Study material updated",
    timestamp: note.uploadedAt || note.createdAt,
    icon: "document-text-outline",
    color: "#10B981",
    bg: "#D1FAE5",
    payload: note,
  }));

  return [...questions, ...notes]
    .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
    .slice(0, 4);
}

function buildInsight(recentUpdates) {
  const ranked = [...(recentUpdates.questions || [])]
    .filter((item) => Number(item.frequency) > 0)
    .sort((a, b) => Number(b.frequency) - Number(a.frequency))[0];

  if (ranked) {
    const topic =
      ranked.tags?.[0] ||
      ranked.markCategory ||
      ranked.questionText?.split(" ").slice(0, 3).join(" ");

    return {
      message: `Questions on ${topic || "this topic"} appeared ${ranked.frequency} times in previous exams.`,
      hasAction: true,
    };
  }

  const latestNote = recentUpdates.notes?.[0];
  if (latestNote) {
    return {
      message: `${latestNote.title || "Latest notes"} can be your next revision anchor.`,
      hasAction: false,
    };
  }

  return {
    message: "Add subjects to see exam insights.",
    hasAction: false,
  };
}

function HomeLoading({ layout }) {
  return (
    <View>
      <SkeletonLoader height={152} borderRadius={radius.xl} style={{ marginBottom: spacing.lg }} />
      <View style={styles.streakRow}>
        {[0, 1, 2].map((item) => (
          <SkeletonLoader
            key={item}
            width="31%"
            height={84}
            borderRadius={radius.lg}
            style={{ marginBottom: spacing.lg }}
          />
        ))}
      </View>
      <View style={styles.grid}>
        {[0, 1, 2, 3].map((item) => (
          <SkeletonLoader
            key={item}
            width={layout.width >= 390 ? "48%" : "100%"}
            height={120}
            borderRadius={radius.lg}
            style={{ marginBottom: spacing.md }}
          />
        ))}
      </View>
      <SkeletonLoader height={120} borderRadius={radius.lg} style={{ marginBottom: spacing.lg }} />
      <SkeletonLoader height={220} borderRadius={radius.xl} style={{ marginBottom: spacing.lg }} />
    </View>
  );
}

function CircularDaysRing({ daysRemaining, color }) {
  const safeDays = Math.max(0, Math.min(daysRemaining, 365));
  const size = 70;
  const strokeWidth = 7;
  const radiusValue = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radiusValue;
  const progress = safeDays / 365;
  const dashOffset = circumference * (1 - progress);

  return (
    <View style={styles.ringWrap}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radiusValue}
          stroke="rgba(255,255,255,0.22)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radiusValue}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={styles.ringContent}>
        <Text style={[styles.ringValue, { color }]}>{safeDays}</Text>
        <Text style={styles.ringLabel}>Days Left</Text>
      </View>
    </View>
  );
}

function QuickAccessCard({ item, subtitle, onPress, wrapStyle }) {
  const { colors } = useAppTheme();
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (value) => {
    Animated.timing(scale, {
      toValue: value,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={[styles.quickCardWrap, wrapStyle, { transform: [{ scale }] }]}>
      <Pressable
        onPress={() => onPress(item)}
        onPressIn={() => animateTo(0.97)}
        onPressOut={() => animateTo(1)}
        style={[
          styles.quickCard,
          shadows.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={[styles.quickIconWrap, { backgroundColor: item.bg }]}>
          <Ionicons name={item.icon} size={28} color={item.color} />
        </View>
        <Text style={[styles.quickTitle, { color: colors.text }]}>{item.title}</Text>
        {subtitle ? (
          <Text style={[styles.quickSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

export default function HomeScreen({ navigation }) {
  const { colors, isDark, toggleTheme } = useAppTheme();
  const layout = useResponsiveLayout();
  const user = useAuthStore((state) => state.user);
  const accessExpiry = useAuthStore((state) => state.accessExpiry);
  const isPaid = useAuthStore((state) => state.isPaid);
  const logout = useAuthStore((state) => state.logout);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const setUnreadCount = useNotificationStore((state) => state.setUnreadCount);
  const selectedBranch = useAppStore((state) => state.selectedBranch);
  const selectedSemester = useAppStore((state) => state.selectedSemester);
  const sessionRefreshNonce = useAppStore((state) => state.sessionRefreshNonce);
  const isFocused = useIsFocused();

  const [recentUpdates, setRecentUpdates] = useState({ questions: [], notes: [] });
  const [bookmarkCount, setBookmarkCount] = useState(0);
  const [streakCount, setStreakCount] = useState(1);
  const [exploredSubjectsCount, setExploredSubjectsCount] = useState(0);
  const [lastActivity, setLastActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "info" });
  const entrance = useRef(new Animated.Value(0)).current;

  const isAdmin = user?.role === "admin";

  const animateEntrance = useCallback(() => {
    entrance.setValue(0);
    Animated.parallel([
      Animated.timing(entrance, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [entrance]);

  const loadDashboard = useCallback(
    async (isRefresh = false) => {
      try {
        setError("");
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const [streak, exploredCount, activity] = await Promise.all([
          updateStreak(user?._id),
          getExploredSubjectsCount(user?._id),
          getLastStudyActivity(user?._id),
        ]);

        setStreakCount(streak);
        setExploredSubjectsCount(exploredCount);
        setLastActivity(activity);

        if (isAdmin) {
          setRecentUpdates({ questions: [], notes: [] });
          setBookmarkCount(0);
          return;
        }

        const [updates, bookmarks, unreadResponse] = await Promise.all([
          getRecentUpdates(),
          getBookmarks(),
          getNotificationsUnreadCount(),
        ]);

        setRecentUpdates(updates || { questions: [], notes: [] });
        setBookmarkCount(Array.isArray(bookmarks) ? bookmarks.length : 0);
        setUnreadCount(unreadResponse?.unreadCount || 0);
      } catch (loadError) {
        setError(loadError.response?.data?.message || "Failed to load your dashboard.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isAdmin, setUnreadCount, user?._id]
  );

  useFocusEffect(
    useCallback(() => {
      animateEntrance();
      loadDashboard();
    }, [animateEntrance, loadDashboard])
  );

  useEffect(() => {
    if (!isFocused || !sessionRefreshNonce) {
      return;
    }

    loadDashboard(true);
  }, [isFocused, loadDashboard, sessionRefreshNonce]);

  useEffect(() => {
    if (!toast.message) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setToast({ message: "", type: "info" });
    }, 2200);

    return () => clearTimeout(timer);
  }, [toast]);

  const userName = user?.name?.split(" ")?.[0] || "Student";
  const greeting = getGreeting();
  const initials = (user?.name || "S")
    .split(" ")
    .map((item) => item.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const recentItems = useMemo(() => buildRecentItems(recentUpdates), [recentUpdates]);
  const insight = useMemo(() => buildInsight(recentUpdates), [recentUpdates]);

  const continueCard = useMemo(() => {
    if (lastActivity?.subjectName) {
      return {
        title: lastActivity.subjectName,
        subtitle: lastActivity.moduleNumber
          ? `Module ${lastActivity.moduleNumber}`
          : selectedSemester?.number
            ? `Semester ${selectedSemester.number}`
            : "Resume studying",
        hint: lastActivity.topicName || "Continue where you stopped last time.",
        ctaLabel: "Continue",
      };
    }

    if (selectedBranch?.name && selectedSemester?.number) {
      return {
        title: selectedBranch.name,
        subtitle: `Semester ${selectedSemester.number}`,
        hint: "Continue learning with your selected academic path.",
        ctaLabel: "Continue",
      };
    }

    return {
      title: "Start Learning",
      subtitle: "Pick your branch to begin",
      hint: "Browse branches, semesters, and subjects to unlock study material.",
      ctaLabel: "Start Learning",
    };
  }, [lastActivity, selectedBranch, selectedSemester]);

  const quickAccessCards = useMemo(() => {
    const repeatedCount = recentUpdates.questions.filter((item) => Number(item.frequency) > 1).length;

    return QUICK_ACCESS.map((item) => {
      if (item.key === "mostRepeated" && repeatedCount > 0) {
        return { ...item, subtitle: `${repeatedCount} Questions` };
      }

      if (item.key === "notes" && recentUpdates.notes.length > 0) {
        return { ...item, subtitle: `${recentUpdates.notes.length} Files` };
      }

      return { ...item, subtitle: "Tap to explore" };
    });
  }, [recentUpdates]);

  const daysRemaining = useMemo(() => {
    if (!accessExpiry) {
      return 0;
    }
    const diff = new Date(accessExpiry).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
  }, [accessExpiry]);

  const premiumTone = daysRemaining < 10 ? colors.danger : daysRemaining <= 30 ? colors.warning : colors.success;
  const premiumSubtitle = isPaid && daysRemaining > 0 ? "Premium library unlocked" : "Renew to continue premium access";

  const openRecentItem = async (item) => {
    if (item.type === "question") {
      navigation.navigate("QuestionDetail", { question: item.payload });
      return;
    }

    if (item.type === "note") {
      try {
        await openStudyResource({
          navigation,
          title: item.payload.title,
          subtitle: item.payload.type,
          url: item.payload.fileUrl,
          fileName: item.payload.fileName,
          mimeType: item.payload.mimeType,
        });
      } catch (error) {
        setToast({ message: "Unable to open note.", type: "error" });
      }
    }
  };

  const openQuickAccess = (item) => {
    if (lastActivity?.module && item.key === "mostRepeated") {
      navigation.navigate("MostRepeated", { module: lastActivity.module });
      return;
    }

    if (lastActivity?.module && item.key === "concepts") {
      navigation.navigate("ConceptList", { module: lastActivity.module });
      return;
    }

    if (lastActivity?.module && item.key === "notes") {
      navigation.navigate("Notes", { module: lastActivity.module });
      return;
    }

    if (lastActivity?.module && item.key === "topRevision") {
      navigation.navigate("TopRevision", { module: lastActivity.module });
      return;
    }

    navigation.navigate("BrowseTab");
  };

  const openInsight = () => {
    if (insight.hasAction && lastActivity?.module) {
      navigation.navigate("MostRepeated", { module: lastActivity.module });
      return;
    }

    navigation.navigate("BrowseTab");
  };

  const screenAnimatedStyle = {
    opacity: entrance,
    transform: [
      {
        translateY: entrance.interpolate({
          inputRange: [0, 1],
          outputRange: [20, 0],
        }),
      },
    ],
  };

  const headerBleedStyle = {
    marginHorizontal: -layout.horizontalPadding,
    paddingHorizontal: layout.horizontalPadding,
  };
  const constrainedWidthStyle = {
    width: "100%",
    maxWidth: layout.contentMaxWidth,
    alignSelf: "center",
  };
  const stackHero = layout.width < 390;
  const heroCardResponsiveStyle = stackHero
    ? {
        flexDirection: "column",
        alignItems: "flex-start",
        padding: spacing.md,
      }
    : null;
  const heroCopyResponsiveStyle = stackHero
    ? {
        paddingRight: 0,
        marginBottom: spacing.md,
      }
    : null;
  const heroArtworkResponsiveStyle = stackHero
    ? {
        alignSelf: "flex-end",
      }
    : null;
  const heroArtworkCircleResponsiveStyle = stackHero
    ? {
        width: 78,
        height: 78,
      }
    : {
        width: layout.isTablet ? 110 : 96,
        height: layout.isTablet ? 110 : 96,
      };
  const heroTitleResponsiveStyle = stackHero
    ? {
        fontSize: typography.xl,
        lineHeight: 26,
      }
    : {
        fontSize: layout.isTablet ? typography.xxxl : typography.xxl,
      };
  const heroSubtitleResponsiveStyle = stackHero
    ? {
        fontSize: typography.base,
      }
    : null;
  const heroHintResponsiveStyle = stackHero
    ? {
        fontSize: typography.sm,
        lineHeight: 18,
      }
    : null;
  const quickAccessSingleColumn = layout.width < 350;
  const stackAccessCard = layout.width < 390;
  const quickCardWrapStyle = {
    width: quickAccessSingleColumn ? "100%" : "48.5%",
  };
  const streakItems = [
    {
      icon: "flame-outline",
      value: streakCount,
      label: "Day Streak",
      color: colors.accent,
      bg: colors.accentLight,
    },
    {
      icon: "bookmark-outline",
      value: bookmarkCount,
      label: "Bookmarks",
      color: colors.primary,
      bg: colors.primaryLight,
    },
    {
      icon: "library-outline",
      value: exploredSubjectsCount,
      label: "Subjects",
      color: colors.success,
      bg: colors.successLight,
    },
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <Animated.View style={[styles.flex, screenAnimatedStyle]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadDashboard(true)}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingHorizontal: layout.horizontalPadding,
              paddingBottom: spacing.xxxl,
            },
          ]}
        >
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.headerGradient, headerBleedStyle]}
          >
            <View style={constrainedWidthStyle}>
              <View style={styles.brandRow}>
                <AppBrandHeader
                  examTextColor="#D7E3FF"
                  pulseTextColor="#FF9A3D"
                  logoSize={64}
                  textSize={typography.xxl}
                  marginTop={spacing.sm}
                  marginBottom={0}
                />

                <View style={styles.headerActions}>
                  <Pressable
                    onPress={() => navigation.navigate("Notifications")}
                    style={styles.headerIconButton}
                  >
                    <Ionicons name="notifications-outline" size={22} color="#FFFFFF" />
                    {unreadCount > 0 ? (
                      <View style={styles.notificationBadge}>
                        <Text style={styles.notificationBadgeText}>
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </Text>
                      </View>
                    ) : null}
                  </Pressable>
                  <Pressable
                    onPress={() => setProfileOpen((current) => !current)}
                    style={styles.avatar}
                  >
                    <Text style={styles.avatarText}>{initials}</Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.headerRow}>
                <View style={styles.headerCopy}>
                  <Text style={styles.headerKicker}>{greeting}</Text>
                  <Text numberOfLines={1} style={styles.headerName}>
                    {userName}
                  </Text>
                  <Text style={styles.headerSubtitle}>
                    Silicon University exam prep made sharper and faster.
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.heroCard,
                  shadows.card,
                  { backgroundColor: colors.surface },
                  heroCardResponsiveStyle,
                ]}
              >
                <View style={[styles.heroCopyWrap, heroCopyResponsiveStyle]}>
                  <StatBadge
                    label={lastActivity?.subjectName ? "Resume" : "Start Learning"}
                    color="primary"
                    style={{ marginBottom: spacing.sm }}
                  />
                  <Text style={[styles.heroTitle, heroTitleResponsiveStyle, { color: colors.text }]}>
                    {continueCard.title}
                  </Text>
                  <Text
                    style={[
                      styles.heroSubtitle,
                      heroSubtitleResponsiveStyle,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {continueCard.subtitle}
                  </Text>
                  <Text
                    style={[styles.heroHint, heroHintResponsiveStyle, { color: colors.textSecondary }]}
                  >
                    {continueCard.hint}
                  </Text>
                  <Pressable
                    onPress={() => navigation.navigate("BrowseTab")}
                    style={({ pressed }) => [
                      styles.heroButton,
                      {
                        backgroundColor: colors.primary,
                        opacity: pressed ? 0.9 : 1,
                      },
                    ]}
                  >
                    <Text style={styles.heroButtonText}>{continueCard.ctaLabel}</Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                  </Pressable>
                </View>

                <View style={[styles.heroArtworkWrap, heroArtworkResponsiveStyle]}>
                  <View
                    style={[
                      styles.heroArtworkCircle,
                      heroArtworkCircleResponsiveStyle,
                      { backgroundColor: colors.primaryLight },
                    ]}
                  >
                    <Ionicons
                      name="school-outline"
                      size={stackHero ? 36 : layout.isTablet ? 50 : 44}
                      color={colors.primary}
                    />
                  </View>
                  <View style={[styles.heroArtworkBadge, { backgroundColor: colors.accent }]}>
                    <Ionicons name="book-outline" size={18} color="#FFFFFF" />
                  </View>
                </View>
              </View>
            </View>
          </LinearGradient>

          {profileOpen ? (
            <View style={styles.profileBackdrop}>
              <Pressable
                style={styles.profileBackdropDismiss}
                onPress={() => setProfileOpen(false)}
              />
              <View
                style={[
                  styles.profileMenu,
                  shadows.modal,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.profileName, { color: colors.text }]}>{user?.name || "Student"}</Text>
                <Pressable
                  onPress={() => {
                    toggleTheme();
                    setProfileOpen(false);
                  }}
                  style={styles.profileRow}
                >
                  <Ionicons
                    name={isDark ? "sunny-outline" : "moon-outline"}
                    size={18}
                    color={colors.primary}
                  />
                  <Text style={[styles.profileRowText, { color: colors.text }]}>
                    {isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={async () => {
                    setProfileOpen(false);
                    try {
                      await logout();
                    } finally {
                      resetToRoute("Login");
                    }
                  }}
                  style={styles.profileRow}
                >
                  <Ionicons name="log-out-outline" size={18} color={colors.danger} />
                  <Text style={[styles.profileRowText, { color: colors.danger }]}>Logout</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          <View style={[styles.bodyContent, constrainedWidthStyle]}>
            <View style={styles.streakRow}>
              {streakItems.map((item) => (
                <View
                  key={item.label}
                  style={[
                    styles.streakCard,
                    shadows.card,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={[styles.streakIconWrap, { backgroundColor: item.bg }]}>
                    <Ionicons name={item.icon} size={20} color={item.color} />
                  </View>
                  <Text style={[styles.streakValue, { color: colors.text }]}>{item.value}</Text>
                  <Text style={[styles.streakLabel, { color: colors.textSecondary }]}>{item.label}</Text>
                </View>
              ))}
            </View>

            {loading ? <HomeLoading layout={layout} /> : null}

            {!loading && error ? (
              <ErrorState title="Unable to load dashboard" subtitle={error} onRetry={() => loadDashboard()} />
            ) : null}

            {!loading && !error ? (
              <>
                <SectionHeader title="Quick Access" />
                <View style={styles.grid}>
                  {quickAccessCards.map((item) => (
                    <QuickAccessCard
                      key={item.key}
                      item={item}
                      subtitle={item.subtitle}
                      onPress={openQuickAccess}
                      wrapStyle={quickCardWrapStyle}
                    />
                  ))}
                </View>

                <Pressable onPress={openInsight}>
                  <View
                    style={[
                      styles.insightCard,
                      shadows.card,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <View style={[styles.insightAccent, { backgroundColor: colors.accent }]} />
                    <View style={styles.insightBody}>
                      <View style={styles.insightHeader}>
                        <Ionicons name="bulb-outline" size={20} color={colors.accent} />
                        <Text style={[styles.insightTitle, { color: colors.text }]}>Exam Insight</Text>
                      </View>
                      <Text style={[styles.insightText, { color: colors.textSecondary }]}>
                        {insight.message}
                      </Text>
                      {insight.hasAction ? (
                        <Text style={[styles.insightAction, { color: colors.accent }]}>
                          View Related Questions →
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </Pressable>

                <SectionHeader
                  title="Recent Updates"
                  actionLabel="View All"
                  onAction={() => navigation.navigate("BrowseTab")}
                />

                {recentItems.length ? (
                  <View
                    style={[
                      styles.recentCard,
                      shadows.card,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    {recentItems.map((item, index) => (
                      <Pressable
                        key={item.id}
                        onPress={() => openRecentItem(item)}
                        style={[
                          styles.recentRow,
                          index < recentItems.length - 1 && {
                            borderBottomWidth: StyleSheet.hairlineWidth,
                            borderBottomColor: colors.border,
                          },
                        ]}
                      >
                        <View style={[styles.recentIcon, { backgroundColor: item.bg }]}>
                          <Ionicons name={item.icon} size={20} color={item.color} />
                        </View>
                        <View style={styles.recentBody}>
                          <StatBadge
                            label={item.badge}
                            color={item.type === "question" ? "primary" : "success"}
                            style={{ marginBottom: spacing.xs }}
                          />
                          <Text numberOfLines={1} style={[styles.recentTitle, { color: colors.text }]}>
                            {item.title}
                          </Text>
                          <Text
                            numberOfLines={1}
                            style={[styles.recentSubtitle, { color: colors.textSecondary }]}
                          >
                            {item.subtitle}
                          </Text>
                        </View>
                        <View style={styles.recentMeta}>
                          <Text style={[styles.recentTime, { color: colors.textTertiary }]}>
                            {formatRelativeDate(item.timestamp)}
                          </Text>
                          <Ionicons
                            name="chevron-forward"
                            size={16}
                            color={colors.textTertiary}
                          />
                        </View>
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <EmptyState
                    icon="sparkles-outline"
                    title="No recent updates yet"
                    subtitle="Fresh PYQs and notes uploaded by the admin will appear here."
                  />
                )}

                <Pressable onPress={() => navigation.navigate("Paywall")}>
                  <View
                    style={[
                      styles.accessCard,
                      stackAccessCard && styles.accessCardStacked,
                      shadows.card,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        borderLeftColor: premiumTone,
                      },
                    ]}
                  >
                    <View style={[styles.accessLeft, stackAccessCard && styles.accessLeftStacked]}>
                      <View
                        style={[
                          styles.accessIconWrap,
                          {
                            backgroundColor:
                              daysRemaining > 0 ? colors.successLight : colors.dangerLight,
                          },
                        ]}
                      >
                        <Ionicons
                          name={daysRemaining > 0 ? "checkmark-circle" : "alert-circle"}
                          size={24}
                          color={daysRemaining > 0 ? colors.success : colors.danger}
                        />
                      </View>
                      <View style={styles.accessTextWrap}>
                        <Text style={[styles.accessTitle, { color: premiumTone }]}>
                          {daysRemaining > 0 ? "Access Active" : "Access Expired"}
                        </Text>
                        <Text style={[styles.accessSubtitle, { color: colors.textSecondary }]}>
                          {premiumSubtitle}
                        </Text>
                        <Text style={[styles.accessDate, { color: colors.text }]}>
                          Valid Till: {formatExpiryDate(accessExpiry)}
                        </Text>
                      </View>
                    </View>
                    <View style={stackAccessCard && styles.accessRingWrapStacked}>
                      <CircularDaysRing daysRemaining={daysRemaining} color={premiumTone} />
                    </View>
                  </View>
                </Pressable>
              </>
            ) : null}
          </View>
        </ScrollView>
        <Toast message={toast.message} type={toast.type} />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 0,
  },
  headerGradient: {
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    padding: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.giant + spacing.lg,
    overflow: "hidden",
  },
  brandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerCopy: {
    flex: 1,
    paddingRight: spacing.md,
  },
  headerKicker: {
    fontSize: typography.sm,
    color: "rgba(255,255,255,0.82)",
    fontWeight: fontWeights.medium,
    marginBottom: spacing.xs,
  },
  headerName: {
    fontSize: typography.xxxl,
    lineHeight: 34,
    color: "#FFFFFF",
    fontWeight: fontWeights.extrabold,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: typography.md,
    color: "rgba(255,255,255,0.82)",
    lineHeight: 20,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  headerIconButton: {
    width: 42,
    height: 42,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    position: "relative",
  },
  notificationBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: radius.full,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EF4444",
  },
  notificationBadgeText: {
    color: "#FFFFFF",
    fontSize: typography.xs,
    fontWeight: fontWeights.bold,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: radius.full,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontWeight: fontWeights.bold,
    fontSize: typography.md,
  },
  heroCard: {
    marginTop: spacing.xl,
    marginBottom: -spacing.xxxl,
    borderRadius: radius.xl,
    padding: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroCopyWrap: {
    flex: 1,
    paddingRight: spacing.md,
  },
  heroTitle: {
    fontSize: typography.xxl,
    fontWeight: fontWeights.extrabold,
    marginBottom: spacing.xs,
  },
  heroSubtitle: {
    fontSize: typography.lg,
    fontWeight: fontWeights.semibold,
    marginBottom: spacing.xs,
  },
  heroHint: {
    fontSize: typography.md,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  heroButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  heroButtonText: {
    color: "#FFFFFF",
    fontSize: typography.md,
    fontWeight: fontWeights.semibold,
  },
  heroArtworkWrap: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  heroArtworkCircle: {
    width: 96,
    height: 96,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  heroArtworkBadge: {
    position: "absolute",
    bottom: -6,
    right: -6,
    width: 34,
    height: 34,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  profileBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  profileBackdropDismiss: {
    ...StyleSheet.absoluteFillObject,
  },
  profileMenu: {
    position: "absolute",
    top: spacing.xl,
    right: spacing.md,
    width: 220,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  profileName: {
    fontSize: typography.lg,
    fontWeight: fontWeights.bold,
    marginBottom: spacing.md,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  profileRowText: {
    fontSize: typography.md,
    fontWeight: fontWeights.medium,
  },
  bodyContent: {
    paddingTop: spacing.giant,
  },
  streakRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  streakCard: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: 1,
    backgroundColor: "#FFFFFF",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
    minHeight: 84,
  },
  streakIconWrap: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xxs,
  },
  streakValue: {
    fontSize: typography.xl,
    fontWeight: fontWeights.extrabold,
  },
  streakLabel: {
    marginTop: spacing.xxs,
    fontSize: typography.sm,
    fontWeight: fontWeights.medium,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: spacing.xl,
  },
  quickCardWrap: {
    width: "48%",
    marginBottom: spacing.md,
  },
  quickCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    minHeight: 120,
  },
  quickIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  quickTitle: {
    fontSize: typography.lg,
    fontWeight: fontWeights.bold,
    marginBottom: spacing.xxs,
  },
  quickSubtitle: {
    fontSize: typography.sm,
    lineHeight: 18,
  },
  insightCard: {
    flexDirection: "row",
    overflow: "hidden",
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.xl,
  },
  insightAccent: {
    width: 4,
  },
  insightBody: {
    flex: 1,
    padding: spacing.md,
  },
  insightHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  insightTitle: {
    fontSize: typography.lg,
    fontWeight: fontWeights.bold,
  },
  insightText: {
    fontSize: typography.md,
    lineHeight: 22,
  },
  insightAction: {
    marginTop: spacing.sm,
    fontSize: typography.md,
    fontWeight: fontWeights.semibold,
  },
  recentCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    marginBottom: spacing.xl,
    overflow: "hidden",
  },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
  },
  recentIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  recentBody: {
    flex: 1,
    minWidth: 0,
    paddingRight: spacing.sm,
  },
  recentTitle: {
    fontSize: typography.base,
    fontWeight: fontWeights.bold,
    marginBottom: spacing.xxs,
  },
  recentSubtitle: {
    fontSize: typography.md,
  },
  recentMeta: {
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginLeft: spacing.sm,
    minHeight: 44,
  },
  recentTime: {
    fontSize: typography.sm,
  },
  accessCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  accessCardStacked: {
    flexDirection: "column",
    alignItems: "flex-start",
  },
  accessLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingRight: spacing.md,
  },
  accessLeftStacked: {
    width: "100%",
    paddingRight: 0,
  },
  accessIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  accessTextWrap: {
    flex: 1,
  },
  accessTitle: {
    fontSize: typography.lg,
    fontWeight: fontWeights.bold,
    marginBottom: spacing.xxs,
  },
  accessSubtitle: {
    fontSize: typography.md,
    marginBottom: spacing.xxs,
  },
  accessDate: {
    fontSize: typography.sm,
    fontWeight: fontWeights.medium,
  },
  ringWrap: {
    width: 70,
    height: 70,
    alignItems: "center",
    justifyContent: "center",
  },
  accessRingWrapStacked: {
    alignSelf: "flex-end",
    marginTop: spacing.md,
  },
  ringContent: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  ringValue: {
    fontSize: typography.lg,
    fontWeight: fontWeights.extrabold,
  },
  ringLabel: {
    fontSize: typography.xs,
    color: "#6B7280",
    fontWeight: fontWeights.medium,
  },
});
