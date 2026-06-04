import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Image,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SymbolView } from "expo-symbols";

import { getRecentUpdates } from "../api/content";
import { ErrorState } from "../components/ScreenState";
import { useAppStore } from "../store/appStore";
import { useAuthStore } from "../store/authStore";
import { useResponsiveLayout } from "../utils/layout";
import { useAppTheme } from "../utils/theme";

const HEADER_LOGO = require("../../assets/images/exampulse.png");

const QUICK_ACCESS_ITEMS = [
  {
    key: "mostRepeated",
    title: "Most Repeated Questions",
    icon: "flame.circle.fill",
    fallback: "🔥",
    tint: "#ff7c1f",
    background: "#fff2e6",
  },
  {
    key: "concepts",
    title: "Important Concepts",
    icon: "lightbulb.max.fill",
    fallback: "✦",
    tint: "#7a52ff",
    background: "#f3efff",
  },
  {
    key: "notes",
    title: "Notes",
    icon: "book.closed.fill",
    fallback: "▥",
    tint: "#18b86a",
    background: "#ebfbf2",
  },
  {
    key: "topRevision",
    title: "Top Revision Questions",
    icon: "star.square.fill",
    fallback: "★",
    tint: "#f6b100",
    background: "#fff8e7",
  },
];

function HomeSymbol({ name, size, tintColor, fallback }) {
  return (
    <SymbolView
      name={name}
      size={size}
      tintColor={tintColor}
      fallback={
        <Text
          style={{
            color: tintColor,
            fontSize: size * 0.72,
            fontWeight: "700",
            textAlign: "center",
          }}
        >
          {fallback}
        </Text>
      }
    />
  );
}

function formatRelativeDate(value) {
  if (!value) {
    return "Recently";
  }

  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return "Recently";
  }

  const diffMs = Date.now() - timestamp;
  const minutes = Math.max(1, Math.floor(diffMs / (60 * 1000)));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 60) {
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

function useAnimatedPress() {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = useCallback(() => {
    Animated.spring(scale, {
      toValue: 0.975,
      friction: 8,
      tension: 180,
      useNativeDriver: true,
    }).start();
  }, [scale]);

  const onPressOut = useCallback(() => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 8,
      tension: 180,
      useNativeDriver: true,
    }).start();
  }, [scale]);

  return {
    animatedStyle: { transform: [{ scale }] },
    onPressIn,
    onPressOut,
  };
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

function getGreetingPrefix() {
  const hour = new Date().getHours();

  if (hour < 12) {
    return "Good Morning";
  }

  if (hour < 17) {
    return "Good Afternoon";
  }

  return "Good Evening";
}

function ThemeToggleButton({ colors, isDark, onToggle }) {
  const progress = useRef(new Animated.Value(isDark ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(progress, {
      toValue: isDark ? 1 : 0,
      friction: 8,
      tension: 150,
      useNativeDriver: true,
    }).start();
  }, [isDark, progress]);

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 28],
  });

  const moonOpacity = progress.interpolate({
    inputRange: [0, 0.45, 1],
    outputRange: [1, 0.25, 0],
  });

  const sunOpacity = progress.interpolate({
    inputRange: [0, 0.55, 1],
    outputRange: [0, 0.25, 1],
  });

  return (
    <Pressable onPress={onToggle} style={({ pressed }) => [pressed ? styles.pressedButton : null]}>
      <View
        style={[
          styles.themeToggle,
          {
            backgroundColor: isDark ? "#162640" : "#eef3ff",
            borderColor: isDark ? "#264066" : "#d7e0f3",
          },
        ]}
      >
        <Animated.View style={[styles.themeIconLeft, { opacity: moonOpacity }]}>
          <HomeSymbol
            name="moon.stars.fill"
            size={15}
            tintColor={isDark ? "#7f92b2" : "#5d6f90"}
            fallback="☾"
          />
        </Animated.View>
        <Animated.View style={[styles.themeIconRight, { opacity: sunOpacity }]}>
          <HomeSymbol
            name="sun.max.fill"
            size={15}
            tintColor={isDark ? "#ffbf4f" : "#c67a15"}
            fallback="☀"
          />
        </Animated.View>
        <Animated.View
          style={[
            styles.themeKnob,
            {
              backgroundColor: isDark ? "#122a4f" : "#ffffff",
              transform: [{ translateX }],
            },
          ]}
        >
          <HomeSymbol
            name={isDark ? "sun.max.fill" : "moon.stars.fill"}
            size={16}
            tintColor={isDark ? "#ffbf4f" : "#15315e"}
            fallback={isDark ? "☀" : "☾"}
          />
        </Animated.View>
      </View>
    </Pressable>
  );
}

function HeroIllustration({ size }) {
  return (
    <View style={[styles.heroIllustrationWrap, { width: size, height: size }]}>
      <View style={styles.heroIllustrationHalo} />
      <View style={[styles.heroOrb, styles.heroOrbLarge]} />
      <View style={[styles.heroOrb, styles.heroOrbSmall]} />
      <View style={styles.heroBadgeTop}>
        <HomeSymbol
          name="graduationcap.fill"
          size={size * 0.22}
          tintColor="#ffffff"
          fallback="⌂"
        />
      </View>
      <View style={styles.heroBadgeBottom}>
        <HomeSymbol
          name="books.vertical.fill"
          size={size * 0.18}
          tintColor="#102d64"
          fallback="▥"
        />
      </View>
      <View style={styles.heroSpark}>
        <HomeSymbol
          name="sparkles"
          size={size * 0.12}
          tintColor="#ffb14a"
          fallback="✦"
        />
      </View>
    </View>
  );
}

function buildRecentFeed(recentUpdates) {
  const questionItems = recentUpdates.questions.map((question) => ({
    key: `question-${question._id}`,
    type: "question",
    badge: "NEW QUESTION",
    title:
      question.tags?.[0] ||
      question.markCategory ||
      "New PYQ Added",
    subtitle:
      question.questionText?.trim()?.slice(0, 68) ||
      "Question bank update",
    timestamp: question.createdAt,
    icon: "doc.text.fill",
    fallback: "▤",
    tint: "#18b86a",
    background: "#ebfbf2",
    payload: question,
  }));

  const noteItems = recentUpdates.notes.map((note) => ({
    key: `note-${note._id}`,
    type: "note",
    badge: "NEW NOTES",
    title: note.title || "New Notes Uploaded",
    subtitle: note.title || note.type || "Study material update",
    timestamp: note.uploadedAt || note.createdAt,
    icon: "doc.richtext.fill",
    fallback: "☰",
    tint: "#7a52ff",
    background: "#f3edff",
    payload: note,
  }));

  return [...questionItems, ...noteItems]
    .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
    .slice(0, 3);
}

function buildQuickAccessItems(recentUpdates) {
  const repeatedCount = recentUpdates.questions.filter(
    (question) => Number.isFinite(question.frequency) && question.frequency > 1
  ).length;
  const noteCount = recentUpdates.notes.length;

  return QUICK_ACCESS_ITEMS.map((item) => {
    if (item.key === "mostRepeated" && repeatedCount > 0) {
      return {
        ...item,
        meta: `${repeatedCount} repeated`,
      };
    }

    if (item.key === "notes" && noteCount > 0) {
      return {
        ...item,
        meta: `${noteCount} recent files`,
      };
    }

    return item;
  });
}

function buildMotivationSubtitle({
  selectedBranch,
  selectedSemester,
  recentUpdates,
}) {
  if (selectedBranch?.name && selectedSemester?.number) {
    return `Let's continue your ${selectedBranch.name} Semester ${selectedSemester.number} preparation.`;
  }

  if (recentUpdates.questions.length) {
    return "Fresh PYQs are waiting to sharpen your revision today.";
  }

  if (recentUpdates.notes.length) {
    return "New notes have been added to keep your preparation moving.";
  }

  return "Stay consistent and make one strong study session count today.";
}

function buildSmartTip({ recentUpdates, selectedBranch, selectedSemester }) {
  const rankedQuestion = [...recentUpdates.questions]
    .filter((question) => Number.isFinite(question.frequency) && question.frequency > 0)
    .sort((a, b) => (b.frequency || 0) - (a.frequency || 0))[0];

  if (rankedQuestion) {
    const label =
      rankedQuestion.tags?.[0] ||
      rankedQuestion.markCategory ||
      rankedQuestion.questionText?.split(" ").slice(0, 3).join(" ");

    return {
      title: "Exam Insight",
      body: `Questions on ${label || "this topic"} appeared ${rankedQuestion.frequency} times in previous exams.`,
      accent: "#2f74ff",
      ctaLabel: "View Related Questions",
      actionType: "questions",
    };
  }

  const latestNote = recentUpdates.notes[0];

  if (latestNote) {
    return {
      title: "Exam Insight",
      body: `${latestNote.title} was uploaded recently. Use it as your next revision anchor.`,
      accent: "#18b86a",
      ctaLabel: "Open Latest Note",
      actionType: "note",
    };
  }

  return {
    title: "Exam Insight",
    body: selectedBranch?.name && selectedSemester?.number
      ? `${selectedBranch.name} Semester ${selectedSemester.number} is ready. Start with one focused revision block today.`
      : "Choose your branch and semester to unlock a more focused study path.",
    accent: "#7a52ff",
    ctaLabel: null,
    actionType: null,
  };
}

function getPremiumStatus({ isPaid, accessExpiry }) {
  const hasExpiry = Boolean(accessExpiry);
  const expiryTimestamp = hasExpiry ? new Date(accessExpiry).getTime() : 0;
  const isActive = Boolean(isPaid) && hasExpiry && expiryTimestamp > Date.now();
  const daysRemaining = isActive
    ? Math.max(0, Math.ceil((expiryTimestamp - Date.now()) / (24 * 60 * 60 * 1000)))
    : 0;

  if (isActive) {
    return {
      title: "Access Active",
      subtitle: "Your premium library is unlocked.",
      dateLabel: formatExpiryDate(accessExpiry),
      daysLabel: `${daysRemaining} Days`,
      background: "#ecfbf2",
      iconBackground: "#dcf8e8",
      tint: "#16a34a",
    };
  }

  if (Boolean(isPaid) && hasExpiry) {
    return {
      title: "Access Expired",
      subtitle: "Renew to continue using premium content.",
      dateLabel: formatExpiryDate(accessExpiry),
      daysLabel: "Renew now",
      background: "#fff5e8",
      iconBackground: "#ffe6bf",
      tint: "#d97706",
    };
  }

  return {
    title: "Access Locked",
    subtitle: "Upgrade to unlock the full exam library.",
    dateLabel: "Renew now",
    daysLabel: "Upgrade",
    background: "#fff0f1",
    iconBackground: "#ffe1e4",
    tint: "#e11d48",
  };
}

function SectionHeader({ title, actionLabel, onPress, colors }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      {actionLabel ? (
        <Pressable onPress={onPress}>
          <Text style={[styles.sectionAction, { color: colors.primary }]}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function CardSurface({ children, backgroundColor, borderColor, shadowColor, style }) {
  return (
    <View
      style={[
        styles.cardSurface,
        {
          backgroundColor,
          borderColor,
          shadowColor,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

function SkeletonBlock({ width, height, borderRadius, backgroundColor, style }) {
  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor,
        },
        style,
      ]}
    />
  );
}

function HomeLoadingSkeleton({ colors, layout }) {
  const isCompactPhone = layout.width < 390;

  return (
    <View style={styles.dashboardSpacing}>
      <View style={styles.greetingSection}>
        <SkeletonBlock
          width="58%"
          height={isCompactPhone ? 18 : 20}
          borderRadius={999}
          backgroundColor={colors.border}
          style={{ marginBottom: 12 }}
        />
        <SkeletonBlock
          width="72%"
          height={isCompactPhone ? 34 : 38}
          borderRadius={16}
          backgroundColor={colors.border}
          style={{ marginBottom: 10 }}
        />
        <SkeletonBlock
          width="64%"
          height={16}
          borderRadius={10}
          backgroundColor={colors.border}
        />
      </View>

      <CardSurface
        backgroundColor={colors.card}
        borderColor={colors.border}
        shadowColor={colors.shadow}
        style={[styles.heroCard, { minHeight: isCompactPhone ? 208 : 228 }]}
      >
        <SkeletonBlock
          width="42%"
          height={20}
          borderRadius={12}
          backgroundColor={colors.cardMuted}
          style={{ marginBottom: 18 }}
        />
        <SkeletonBlock
          width="52%"
          height={44}
          borderRadius={18}
          backgroundColor={colors.cardMuted}
          style={{ marginBottom: 12 }}
        />
        <SkeletonBlock
          width="30%"
          height={18}
          borderRadius={10}
          backgroundColor={colors.cardMuted}
          style={{ marginBottom: 8 }}
        />
        <SkeletonBlock
          width="34%"
          height={18}
          borderRadius={10}
          backgroundColor={colors.cardMuted}
          style={{ marginBottom: 22 }}
        />
        <SkeletonBlock
          width={148}
          height={52}
          borderRadius={999}
          backgroundColor="#ffffff"
        />
      </CardSurface>

      <View style={styles.quickGrid}>
        {Array.from({ length: 4 }).map((_, index) => (
          <CardSurface
            key={`skeleton-quick-${index}`}
            backgroundColor={colors.card}
            borderColor={colors.border}
            shadowColor={colors.shadow}
            style={styles.quickCard}
          >
            <SkeletonBlock
              width={56}
              height={56}
              borderRadius={18}
              backgroundColor={colors.cardMuted}
              style={{ marginBottom: 18 }}
            />
            <SkeletonBlock
              width="76%"
              height={16}
              borderRadius={10}
              backgroundColor={colors.border}
              style={{ marginBottom: 8 }}
            />
            <SkeletonBlock
              width="54%"
              height={16}
              borderRadius={10}
              backgroundColor={colors.border}
            />
          </CardSurface>
        ))}
      </View>

      <CardSurface
        backgroundColor={colors.card}
        borderColor={colors.border}
        shadowColor={colors.shadow}
        style={styles.updatesCard}
      >
        {Array.from({ length: 3 }).map((_, index) => (
          <View
            key={`update-skeleton-${index}`}
            style={[
              styles.updateRow,
              index < 2 && {
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: colors.border,
              },
            ]}
          >
            <SkeletonBlock
              width={54}
              height={54}
              borderRadius={18}
              backgroundColor={colors.cardMuted}
              style={{ marginRight: 14 }}
            />
            <View style={{ flex: 1 }}>
              <SkeletonBlock
                width="66%"
                height={18}
                borderRadius={10}
                backgroundColor={colors.border}
                style={{ marginBottom: 8 }}
              />
              <SkeletonBlock
                width="48%"
                height={15}
                borderRadius={10}
                backgroundColor={colors.border}
              />
            </View>
            <SkeletonBlock
              width={42}
              height={14}
              borderRadius={10}
              backgroundColor={colors.border}
            />
          </View>
        ))}
      </CardSurface>

      <CardSurface
        backgroundColor={colors.card}
        borderColor={colors.border}
        shadowColor={colors.shadow}
        style={styles.tipCard}
      >
        <SkeletonBlock
          width={50}
          height={50}
          borderRadius={18}
          backgroundColor={colors.cardMuted}
          style={{ marginRight: 14 }}
        />
        <View style={{ flex: 1 }}>
          <SkeletonBlock
            width="34%"
            height={18}
            borderRadius={10}
            backgroundColor={colors.border}
            style={{ marginBottom: 10 }}
          />
          <SkeletonBlock
            width="84%"
            height={16}
            borderRadius={10}
            backgroundColor={colors.border}
            style={{ marginBottom: 8 }}
          />
          <SkeletonBlock
            width="64%"
            height={16}
            borderRadius={10}
            backgroundColor={colors.border}
          />
        </View>
      </CardSurface>

      <CardSurface
        backgroundColor={colors.card}
        borderColor={colors.border}
        shadowColor={colors.shadow}
        style={styles.premiumCard}
      >
        <SkeletonBlock
          width={56}
          height={56}
          borderRadius={18}
          backgroundColor={colors.cardMuted}
          style={{ marginRight: 14 }}
        />
        <View style={{ flex: 1 }}>
          <SkeletonBlock
            width="42%"
            height={18}
            borderRadius={10}
            backgroundColor={colors.border}
            style={{ marginBottom: 8 }}
          />
          <SkeletonBlock
            width="58%"
            height={15}
            borderRadius={10}
            backgroundColor={colors.border}
          />
        </View>
        <SkeletonBlock
          width={72}
          height={28}
          borderRadius={12}
          backgroundColor={colors.border}
        />
      </CardSurface>
    </View>
  );
}

function HomeErrorPanel({ colors, subtitle, onRetry }) {
  return (
    <CardSurface
      backgroundColor={colors.card}
      borderColor={colors.border}
      shadowColor={colors.shadow}
      style={styles.errorCard}
    >
      <Text style={[styles.errorTitle, { color: colors.text }]}>
        Unable to load your dashboard
      </Text>
      <Text style={[styles.errorSubtitle, { color: colors.subtext }]}>
        {subtitle}
      </Text>
      <Pressable
        onPress={onRetry}
        style={[styles.errorButton, { backgroundColor: colors.primary }]}
      >
        <Text style={styles.errorButtonText}>Retry</Text>
      </Pressable>
    </CardSurface>
  );
}

function HomeEmptyPanel({ colors }) {
  return (
    <CardSurface
      backgroundColor={colors.card}
      borderColor={colors.border}
      shadowColor={colors.shadow}
      style={styles.updatesCard}
    >
      <View style={styles.emptyPanel}>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          No recent updates yet
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.subtext }]}>
          Fresh PYQs and notes uploaded by the admin will appear here.
        </Text>
      </View>
    </CardSurface>
  );
}

function QuickAccessCard({ item, colors, width, onPress }) {
  const { animatedStyle, onPressIn, onPressOut } = useAnimatedPress();

  return (
    <Animated.View style={[{ width }, animatedStyle]}>
      <Pressable onPress={() => onPress(item)} onPressIn={onPressIn} onPressOut={onPressOut}>
        <CardSurface
          backgroundColor={colors.card}
          borderColor={colors.border}
          shadowColor={colors.shadow}
          style={styles.quickCard}
        >
          <View
            style={[
              styles.quickIconWrap,
              { backgroundColor: item.background },
            ]}
          >
            <HomeSymbol
              name={item.icon}
              size={30}
              tintColor={item.tint}
              fallback={item.fallback}
            />
          </View>
          <Text style={[styles.quickTitle, { color: colors.text }]}>
            {item.title}
          </Text>
          {item.meta ? (
            <Text style={[styles.quickMeta, { color: colors.subtext }]}>
              {item.meta}
            </Text>
          ) : null}
        </CardSurface>
      </Pressable>
    </Animated.View>
  );
}

export function StudentHomeView({
  colors,
  isDark,
  layout,
  loading,
  error,
  refreshing,
  userName,
  userDisplayName,
  greetingPrefix,
  subtitle,
  unreadCount,
  continueData,
  quickAccessItems,
  recentFeed,
  smartTip,
  premiumStatus,
  onRefresh,
  onRetry,
  onOpenBrowse,
  onOpenNotifications,
  onToggleTheme,
  onOpenSearch,
  onOpenSmartTip,
  onOpenContinue,
  onOpenQuickAccess,
  onOpenRecentUpdates,
  onOpenRecentUpdate,
  onOpenPremium,
  onLogout,
}) {
  const isCompactPhone = layout.width < 390;
  const isNarrow = layout.width < 375;
  const stackHero = isCompactPhone;
  const stackPremium = layout.width < 400;
  const heroIllustrationSize = layout.isTablet ? 132 : isNarrow ? 86 : 102;
  const heroMinHeight = layout.isTablet ? 164 : isNarrow ? 146 : 154;
  const cardGap = layout.isTablet ? 18 : 14;
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileInitial = (userDisplayName || userName || "S").trim().charAt(0).toUpperCase();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: layout.horizontalPadding,
            paddingTop: layout.isTablet ? 22 : 14,
            paddingBottom: layout.isTablet ? 40 : 30,
          },
        ]}
      >
        <View style={[styles.page, { maxWidth: layout.contentMaxWidth }]}>
          {profileMenuOpen ? (
            <Pressable
              style={styles.profileMenuBackdrop}
              onPress={() => setProfileMenuOpen(false)}
            />
          ) : null}
          <View
            style={[
              styles.topBar,
              { marginBottom: layout.isTablet ? 16 : 10, marginTop: 6 },
            ]}
          >
            <View style={styles.headerBrand}>
              <View
                style={[
                  styles.headerLogoCrop,
                  {
                    width: layout.isTablet ? 56 : isCompactPhone ? 46 : 50,
                    height: layout.isTablet ? 56 : isCompactPhone ? 46 : 50,
                    marginTop: layout.isTablet ? 2 : 4,
                  },
                ]}
              >
                <Image
                  source={HEADER_LOGO}
                  resizeMode="cover"
                  style={[
                    styles.headerLogoImage,
                    {
                      width: layout.isTablet ? 112 : isCompactPhone ? 94 : 102,
                      height: layout.isTablet ? 74 : isCompactPhone ? 62 : 68,
                    },
                  ]}
                />
              </View>
              <Text
                style={[
                  styles.headerBrandText,
                  {
                    color: colors.text,
                    fontSize: layout.isTablet ? 30 : isCompactPhone ? 23 : 26,
                  },
                ]}
              >
                <Text style={{ color: colors.text }}>Exam</Text>
                <Text style={{ color: "#ff7a1b" }}>Pulse</Text>
              </Text>
            </View>

            <View style={styles.headerActions}>
              <ThemeToggleButton
                colors={colors}
                isDark={isDark}
                onToggle={onToggleTheme}
              />

              <Pressable
                onPress={onOpenNotifications}
                style={({ pressed }) => [
                  styles.headerButton,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    shadowColor: colors.shadow,
                  },
                  pressed ? styles.pressedButton : null,
                ]}
              >
                <HomeSymbol
                  name="bell"
                  size={20}
                  tintColor={colors.text}
                  fallback="◌"
                />
                {unreadCount > 0 ? (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationBadgeText}>
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </Text>
                  </View>
                ) : null}
              </Pressable>

              <View style={styles.profileMenuAnchor}>
                <Pressable
                  onPress={() => setProfileMenuOpen((current) => !current)}
                  style={({ pressed }) => [
                    styles.profileButton,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      shadowColor: colors.shadow,
                    },
                    pressed ? styles.pressedButton : null,
                  ]}
                >
                  <Text style={[styles.profileInitial, { color: colors.text }]}>
                    {profileInitial}
                  </Text>
                </Pressable>

                {profileMenuOpen ? (
                  <View
                    style={[
                      styles.profileMenu,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        shadowColor: colors.shadow,
                      },
                    ]}
                  >
                    <Text style={[styles.profileMenuName, { color: colors.text }]}>
                      {userDisplayName || userName}
                    </Text>
                    <Pressable
                      onPress={async () => {
                        setProfileMenuOpen(false);
                        await onLogout();
                      }}
                      style={({ pressed }) => [
                        styles.profileMenuLogout,
                        {
                          backgroundColor: isDark ? "#1b2942" : "#f3f7ff",
                          borderColor: colors.border,
                        },
                        pressed ? styles.pressedButton : null,
                      ]}
                    >
                      <Text style={[styles.profileMenuLogoutText, { color: colors.text }]}>
                        Logout
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          <View style={styles.greetingSection}>
            <Text style={[styles.greetingKicker, { color: colors.subtext }]}>
              {greetingPrefix}
            </Text>
            <Text
              style={[
                styles.greetingTitle,
                {
                  color: colors.text,
                  fontSize: layout.isTablet ? 38 : isCompactPhone ? 29 : 34,
                  lineHeight: layout.isTablet ? 44 : isCompactPhone ? 35 : 40,
                },
              ]}
            >
              {userName} 👋
            </Text>
            <Text style={[styles.greetingSubtitle, { color: colors.subtext }]}>
              {subtitle}
            </Text>
          </View>

          {loading ? (
            <HomeLoadingSkeleton colors={colors} layout={layout} />
          ) : (
            <View style={styles.dashboardSpacing}>
              <CardSurface
                backgroundColor={isDark ? "#10275a" : "#0d2d72"}
                borderColor={isDark ? "#1f447f" : "#123781"}
                shadowColor={colors.shadow}
                style={[styles.heroCard, { minHeight: heroMinHeight }]}
              >
                <View style={[styles.heroGlow, styles.heroGlowTop]} />
                <View style={[styles.heroGlow, styles.heroGlowBottom]} />

                <View
                  style={[
                    styles.heroCardContent,
                    stackHero ? styles.heroCardContentCompact : null,
                    { gap: cardGap },
                  ]}
                >
                  <View style={styles.heroCopy}>
                    <Text style={styles.heroEyebrow}>Continue Studying</Text>
                    <Text numberOfLines={2} style={styles.heroHeadline}>
                      {continueData.primary}
                    </Text>
                    <Text numberOfLines={1} style={styles.heroMeta}>
                      {continueData.secondary}
                    </Text>
                    <Text numberOfLines={2} style={styles.heroTopic}>
                      {continueData.tertiary}
                    </Text>
                    <View
                      style={[
                        styles.progressTrack,
                        {
                          backgroundColor: "rgba(255,255,255,0.18)",
                          width: stackHero ? "92%" : "76%",
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: continueData.progressValue
                              ? `${continueData.progressValue}%`
                              : "28%",
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.progressCaption}>
                      {continueData.progressLabel}
                    </Text>

                    <Pressable
                      onPress={onOpenContinue}
                      style={({ pressed }) => [
                        styles.heroButton,
                        pressed ? styles.pressedButton : null,
                      ]}
                    >
                      <Text style={styles.heroButtonText}>{continueData.ctaLabel}</Text>
                      <HomeSymbol
                        name="arrow.right"
                        size={18}
                        tintColor="#0d2d72"
                        fallback="→"
                      />
                    </Pressable>
                  </View>

                  <HeroIllustration size={heroIllustrationSize} />
                </View>
              </CardSurface>

              <SectionHeader title="Quick Access" colors={colors} />

              <View style={styles.quickGrid}>
                {quickAccessItems.map((item) => (
                  <QuickAccessCard
                    key={item.key}
                    item={item}
                    colors={colors}
                    width={layout.isTablet ? "24%" : "48%"}
                    onPress={onOpenQuickAccess}
                  />
                ))}
              </View>

              <SectionHeader
                title="Recent Updates"
                actionLabel="View All"
                onPress={onOpenRecentUpdates}
                colors={colors}
              />

              {error ? (
                <HomeErrorPanel colors={colors} subtitle={error} onRetry={onRetry} />
              ) : recentFeed.length ? (
                <CardSurface
                  backgroundColor={colors.card}
                  borderColor={colors.border}
                  shadowColor={colors.shadow}
                  style={styles.updatesCard}
                >
                  {recentFeed.map((item, index) => (
                    <Pressable
                      key={item.key}
                      onPress={() => onOpenRecentUpdate(item)}
                      style={({ pressed }) => [
                        styles.updateRow,
                        index < recentFeed.length - 1 && {
                          borderBottomWidth: StyleSheet.hairlineWidth,
                          borderBottomColor: colors.border,
                        },
                        pressed ? styles.pressedRow : null,
                      ]}
                    >
                      <View
                        style={[
                          styles.updateIconWrap,
                          { backgroundColor: item.background },
                        ]}
                      >
                        <HomeSymbol
                          name={item.icon}
                          size={24}
                          tintColor={item.tint}
                          fallback={item.fallback}
                        />
                      </View>

                      <View style={styles.updateBody}>
                        <View
                          style={[
                            styles.updateBadge,
                            { backgroundColor: item.background },
                          ]}
                        >
                          <Text style={[styles.updateBadgeText, { color: item.tint }]}>
                            {item.badge}
                          </Text>
                        </View>
                        <Text
                          numberOfLines={2}
                          style={[styles.updateTitle, { color: colors.text }]}
                        >
                          {item.title}
                        </Text>
                        <Text
                          numberOfLines={2}
                          style={[styles.updateSubtitle, { color: colors.subtext }]}
                        >
                          {item.subtitle}
                        </Text>
                      </View>

                      <View style={styles.updateMeta}>
                        <Text style={[styles.updateTime, { color: colors.subtext }]}>
                          {formatRelativeDate(item.timestamp)}
                        </Text>
                        <HomeSymbol
                          name="chevron.right"
                          size={15}
                          tintColor={colors.subtext}
                          fallback="›"
                        />
                      </View>
                    </Pressable>
                  ))}
                </CardSurface>
              ) : (
                <HomeEmptyPanel colors={colors} />
              )}

              <Pressable
                onPress={smartTip.ctaLabel ? onOpenSmartTip : undefined}
                style={({ pressed }) => [pressed ? styles.pressedCard : null]}
              >
                <CardSurface
                  backgroundColor={isDark ? "#131f33" : "#eef5ff"}
                  borderColor={colors.border}
                  shadowColor={colors.shadow}
                  style={[
                    styles.tipCard,
                    stackPremium ? styles.tipCardStacked : null,
                  ]}
                >
                  <View
                    style={[
                      styles.tipIconWrap,
                      { backgroundColor: isDark ? "#1c2c47" : "#ddeaff" },
                    ]}
                  >
                    <HomeSymbol
                      name="scope"
                      size={30}
                      tintColor={smartTip.accent}
                      fallback="◎"
                    />
                  </View>
                  <View style={styles.tipBody}>
                    <Text style={[styles.tipTitle, { color: colors.text }]}>
                      {smartTip.title}
                    </Text>
                    <Text style={[styles.tipText, { color: colors.subtext }]}>
                      {smartTip.body}
                    </Text>
                    {smartTip.ctaLabel ? (
                      <Text style={[styles.tipLink, { color: colors.primary }]}>
                        {smartTip.ctaLabel} →
                      </Text>
                    ) : null}
                  </View>
                </CardSurface>
              </Pressable>

              <Pressable
                onPress={onOpenPremium}
                style={({ pressed }) => [pressed ? styles.pressedCard : null]}
              >
                <CardSurface
                  backgroundColor={premiumStatus.background}
                  borderColor="transparent"
                  shadowColor={colors.shadow}
                  style={styles.premiumCard}
                >
                  <View
                    style={[
                      styles.premiumIconWrap,
                      { backgroundColor: premiumStatus.iconBackground },
                    ]}
                  >
                    <HomeSymbol
                      name="checkmark.shield.fill"
                      size={30}
                      tintColor={premiumStatus.tint}
                      fallback="✓"
                    />
                  </View>

                  <View style={styles.premiumBody}>
                    <Text style={[styles.premiumTitle, { color: premiumStatus.tint }]}>
                      {premiumStatus.title}
                    </Text>
                    <Text
                      style={[
                        styles.premiumSubtitle,
                        { color: isDark ? "#a9bfd0" : "#45616b" },
                      ]}
                    >
                      {premiumStatus.subtitle}
                    </Text>
                  </View>

                  <View style={styles.premiumMeta}>
                    <Text
                      style={[
                        styles.premiumMetaLabel,
                        { color: isDark ? "#8ea1b4" : "#667886" },
                      ]}
                    >
                      Valid Till
                    </Text>
                    <Text style={[styles.premiumMetaDate, { color: premiumStatus.tint }]}>
                      {premiumStatus.dateLabel}
                    </Text>
                    <Text style={[styles.premiumDaysText, { color: premiumStatus.tint }]}>
                      {premiumStatus.daysLabel}
                    </Text>
                  </View>
                </CardSurface>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function HomeScreen({ navigation }) {
  const { colors, isDark, toggleTheme } = useAppTheme();
  const layout = useResponsiveLayout();
  const user = useAuthStore((state) => state.user);
  const accessExpiry = useAuthStore((state) => state.accessExpiry);
  const isPaid = useAuthStore((state) => state.isPaid);
  const logout = useAuthStore((state) => state.logout);
  const selectedBranch = useAppStore((state) => state.selectedBranch);
  const selectedSemester = useAppStore((state) => state.selectedSemester);
  const isAdmin = user?.role === "admin";

  const [recentUpdates, setRecentUpdates] = useState({ questions: [], notes: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const recentUpdatesRef = useRef(recentUpdates);

  useEffect(() => {
    recentUpdatesRef.current = recentUpdates;
  }, [recentUpdates]);

  const loadDashboard = useCallback(
    async (isRefresh = false) => {
      try {
        const hasCachedContent =
          recentUpdatesRef.current.questions.length > 0 ||
          recentUpdatesRef.current.notes.length > 0;

        if (isRefresh) {
          setRefreshing(true);
        } else if (!hasCachedContent) {
          setLoading(true);
        }

        if (isAdmin) {
          setRecentUpdates({ questions: [], notes: [] });
          return;
        }

        const updates = await getRecentUpdates();
        setRecentUpdates(updates);
        setError("");
      } catch (loadError) {
        if (!(
          recentUpdatesRef.current.questions.length > 0 ||
          recentUpdatesRef.current.notes.length > 0
        )) {
          setError(
            loadError.response?.data?.message || "Failed to load home dashboard."
          );
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isAdmin]
  );

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
      return () => {};
    }, [loadDashboard])
  );

  const userName = user?.name?.split(" ")?.[0] || "Student";
  const userDisplayName = user?.name || userName;
  const recentFeed = useMemo(() => buildRecentFeed(recentUpdates), [recentUpdates]);
  const subtitle = useMemo(
    () => buildMotivationSubtitle({ selectedBranch, selectedSemester, recentUpdates }),
    [recentUpdates, selectedBranch, selectedSemester]
  );
  const smartTip = useMemo(
    () => buildSmartTip({ recentUpdates, selectedBranch, selectedSemester }),
    [recentUpdates, selectedBranch, selectedSemester]
  );
  const quickAccessItems = useMemo(
    () => buildQuickAccessItems(recentUpdates),
    [recentUpdates]
  );
  const premiumStatus = useMemo(
    () => getPremiumStatus({ isPaid, accessExpiry }),
    [accessExpiry, isPaid]
  );

  const continueData = useMemo(() => {
    if (selectedBranch?.name && selectedSemester?.number) {
      return {
        primary: selectedBranch.name,
        secondary: `Semester ${selectedSemester.number}`,
        tertiary: "Continue Learning",
        ctaLabel: "Continue",
        progressLabel: "Progress tracking unlocks as you keep studying.",
        progressValue: null,
      };
    }

    if (selectedBranch?.name) {
      return {
        primary: selectedBranch.name,
        secondary: "Selected Branch",
        tertiary: "Continue Learning",
        ctaLabel: "Continue",
        progressLabel: "Select a semester to personalize this path.",
        progressValue: null,
      };
    }

    return {
      primary: "Start Learning",
      secondary: "Choose your branch and semester",
      tertiary: "Build your study path",
      ctaLabel: "Start Learning",
      progressLabel: "Start with a branch and semester.",
      progressValue: null,
    };
  }, [selectedBranch, selectedSemester]);

  if (loading && isAdmin) {
    return <ErrorState title="Loading admin dashboard..." />;
  }

  if (isAdmin) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.adminContainer,
            {
              paddingHorizontal: layout.horizontalPadding,
              paddingVertical: layout.isTablet ? 28 : 20,
              maxWidth: layout.formMaxWidth,
            },
          ]}
        >
          <Text style={[styles.adminTitle, { color: colors.text }]}>ExamPulse Admin</Text>
          <Text style={[styles.adminSubtitle, { color: colors.subtext }]}>
            Welcome, {user?.name || "Admin"}
          </Text>
          <View
            style={[
              styles.adminBanner,
              { backgroundColor: colors.warningBg, borderColor: colors.warningText },
            ]}
          >
            <Text style={[styles.adminBannerTitle, { color: colors.warningText }]}>
              Admin access enabled
            </Text>
            <Text style={[styles.adminBannerText, { color: colors.warningText }]}>
              Use the Admin tab to manage branches, semesters, subjects, modules,
              topics, questions, notes, users, and reports.
            </Text>
          </View>
          <Pressable
            onPress={() => navigation.navigate("AdminTab")}
            style={[styles.primaryAdminButton, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.primaryAdminButtonText}>Open Admin Panel</Text>
          </Pressable>
          <Pressable
            onPress={async () => {
              await logout();
              navigation.replace("Login");
            }}
            style={[
              styles.secondaryAdminButton,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.secondaryAdminButtonText, { color: colors.text }]}>
              Logout
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <StudentHomeView
      colors={colors}
      isDark={isDark}
      layout={layout}
      loading={loading}
      error={error}
      refreshing={refreshing}
      userName={userName}
      userDisplayName={userDisplayName}
      greetingPrefix={getGreetingPrefix()}
      subtitle={subtitle}
      unreadCount={recentFeed.length}
      continueData={continueData}
      quickAccessItems={quickAccessItems}
      recentFeed={recentFeed}
      smartTip={smartTip}
      premiumStatus={premiumStatus}
      onRefresh={() => loadDashboard(true)}
      onRetry={() => loadDashboard()}
      onOpenBrowse={() => navigation.navigate("BrowseTab")}
      onOpenNotifications={() => navigation.navigate("BookmarksTab")}
      onToggleTheme={() => toggleTheme()}
      onOpenSearch={() => navigation.navigate("SearchTab")}
      onOpenSmartTip={() => {
        if (smartTip.actionType === "note" && recentFeed.find((item) => item.type === "note")) {
          const noteItem = recentFeed.find((item) => item.type === "note");
          navigation.navigate("WebViewer", {
            title: noteItem.payload.title,
            url: noteItem.payload.fileUrl,
          });
          return;
        }

        navigation.navigate("SearchTab");
      }}
      onOpenContinue={() => navigation.navigate("BrowseTab")}
      onOpenQuickAccess={() => navigation.navigate("BrowseTab")}
      onOpenRecentUpdates={() => navigation.navigate("BrowseTab")}
      onOpenRecentUpdate={(item) => {
        if (item.type === "question") {
          navigation.navigate("QuestionDetail", { question: item.payload });
          return;
        }

        if (item.type === "note" && item.payload?.fileUrl) {
          navigation.navigate("WebViewer", {
            title: item.payload.title,
            url: item.payload.fileUrl,
          });
          return;
        }

        navigation.navigate("BrowseTab");
      }}
      onOpenPremium={() => navigation.navigate("Paywall")}
      onLogout={async () => {
        await logout();
        navigation.replace("Login");
      }}
    />
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    alignItems: "center",
  },
  page: {
    width: "100%",
  },
  dashboardSpacing: {
    gap: 22,
  },
  cardSurface: {
    borderWidth: 1,
    borderRadius: 28,
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  adminContainer: {
    alignSelf: "center",
    width: "100%",
    gap: 16,
  },
  adminTitle: {
    fontSize: 30,
    fontWeight: "800",
  },
  adminSubtitle: {
    fontSize: 16,
    lineHeight: 24,
  },
  adminBanner: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
  },
  adminBannerTitle: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 4,
  },
  adminBannerText: {
    lineHeight: 21,
  },
  primaryAdminButton: {
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
  },
  primaryAdminButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryAdminButton: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 15,
    alignItems: "center",
  },
  secondaryAdminButtonText: {
    fontSize: 15,
    fontWeight: "700",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  profileMenuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  headerButton: {
    width: 46,
    height: 46,
    borderWidth: 1,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
    position: "relative",
  },
  themeToggle: {
    width: 58,
    height: 34,
    borderWidth: 1,
    borderRadius: 999,
    position: "relative",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  themeIconLeft: {
    position: "absolute",
    left: 10,
    top: 9,
  },
  themeIconRight: {
    position: "absolute",
    right: 10,
    top: 9,
  },
  themeKnob: {
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  notificationBadge: {
    minWidth: 19,
    height: 19,
    borderRadius: 999,
    paddingHorizontal: 5,
    position: "absolute",
    top: 6,
    right: 4,
    backgroundColor: "#ff6b2b",
    alignItems: "center",
    justifyContent: "center",
  },
  notificationBadgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "800",
  },
  headerBrand: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    flex: 1,
    minWidth: 0,
    paddingRight: 10,
  },
  headerLogoCrop: {
    overflow: "hidden",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    backgroundColor: "transparent",
  },
  headerLogoImage: {
    alignSelf: "center",
    transform: [{ translateY: -2 }],
  },
  headerBrandText: {
    fontWeight: "900",
    letterSpacing: -0.8,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    zIndex: 2,
  },
  profileMenuAnchor: {
    position: "relative",
  },
  profileButton: {
    width: 46,
    height: 46,
    borderWidth: 1,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  profileInitial: {
    fontSize: 16,
    fontWeight: "800",
  },
  profileMenu: {
    position: "absolute",
    top: 54,
    right: 0,
    width: 176,
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  profileMenuName: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 10,
  },
  profileMenuLogout: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  profileMenuLogoutText: {
    fontSize: 14,
    fontWeight: "700",
  },
  pressedButton: {
    opacity: 0.92,
    transform: [{ scale: 0.97 }],
  },
  pressedCard: {
    transform: [{ scale: 0.985 }],
  },
  pressedRow: {
    opacity: 0.86,
  },
  greetingSection: {
    marginBottom: 6,
  },
  greetingKicker: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 5,
  },
  greetingTitle: {
    fontWeight: "800",
    marginBottom: 6,
    letterSpacing: -0.6,
  },
  greetingSubtitle: {
    fontSize: 15,
    lineHeight: 23,
  },
  heroCard: {
    overflow: "hidden",
    paddingHorizontal: 20,
    paddingVertical: 12,
    minHeight: 150,
    position: "relative",
  },
  heroGlow: {
    position: "absolute",
    borderRadius: 999,
    opacity: 0.32,
  },
  heroGlowTop: {
    width: 220,
    height: 220,
    backgroundColor: "#1d4ed8",
    top: -82,
    left: -68,
  },
  heroGlowBottom: {
    width: 260,
    height: 260,
    backgroundColor: "#08162f",
    right: -88,
    bottom: -120,
  },
  heroCardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  heroCardContentCompact: {
    flexDirection: "column",
    alignItems: "flex-start",
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },
  heroEyebrow: {
    color: "#ff9d2d",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 8,
  },
  heroHeadline: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 31,
    letterSpacing: -0.8,
    marginBottom: 2,
  },
  heroMeta: {
    color: "rgba(255,255,255,0.84)",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 2,
  },
  heroTopic: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 6,
  },
  progressTrack: {
    width: "78%",
    height: 4,
    borderRadius: 999,
    overflow: "hidden",
    marginBottom: 7,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 999,
  },
  progressCaption: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 11,
    lineHeight: 15,
    marginBottom: 8,
    maxWidth: 170,
  },
  heroButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    minWidth: 112,
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  heroButtonText: {
    color: "#0d2d72",
    fontSize: 13,
    fontWeight: "800",
  },
  heroIllustrationWrap: {
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    position: "relative",
  },
  heroIllustrationHalo: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  heroOrb: {
    position: "absolute",
    borderRadius: 999,
  },
  heroOrbLarge: {
    width: "68%",
    height: "68%",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  heroOrbSmall: {
    width: "42%",
    height: "42%",
    right: "10%",
    bottom: "6%",
    backgroundColor: "rgba(255,122,27,0.18)",
  },
  heroBadgeTop: {
    width: "48%",
    height: "48%",
    borderRadius: 999,
    backgroundColor: "#173b79",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.08)",
  },
  heroBadgeBottom: {
    position: "absolute",
    right: "10%",
    bottom: "10%",
    width: "32%",
    height: "32%",
    borderRadius: 20,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(16,45,100,0.08)",
  },
  heroSpark: {
    position: "absolute",
    left: "12%",
    top: "16%",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: -6,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
  },
  sectionAction: {
    fontSize: 16,
    fontWeight: "700",
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 14,
  },
  quickCard: {
    minHeight: 158,
    paddingHorizontal: 18,
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "space-between",
  },
  quickIconWrap: {
    width: 66,
    height: 66,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  quickTitle: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
    minHeight: 44,
  },
  quickMeta: {
    marginTop: 10,
    textAlign: "center",
    fontSize: 13,
    lineHeight: 18,
  },
  updatesCard: {
    overflow: "hidden",
  },
  updateRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  updateIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  updateBody: {
    flex: 1,
    minWidth: 0,
    paddingRight: 10,
  },
  updateBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    marginBottom: 8,
  },
  updateBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  updateTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  updateSubtitle: {
    fontSize: 15,
    lineHeight: 21,
  },
  updateMeta: {
    alignItems: "flex-end",
    justifyContent: "space-between",
    minHeight: 54,
    paddingTop: 2,
    gap: 6,
  },
  updateTime: {
    fontSize: 14,
    fontWeight: "500",
  },
  tipCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  tipCardStacked: {
    gap: 12,
  },
  tipIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  tipBody: {
    flex: 1,
    minWidth: 0,
  },
  tipTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 6,
  },
  tipText: {
    fontSize: 16,
    lineHeight: 24,
  },
  tipLink: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: "700",
  },
  premiumCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  premiumIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  premiumBody: {
    flex: 1,
    minWidth: 0,
    paddingRight: 10,
  },
  premiumTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 2,
  },
  premiumSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  premiumMeta: {
    alignItems: "flex-end",
    minWidth: 70,
  },
  premiumMetaLabel: {
    fontSize: 12,
    marginBottom: 3,
  },
  premiumMetaDate: {
    fontSize: 13,
    fontWeight: "800",
    textAlign: "right",
  },
  premiumDaysText: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: "700",
  },
  errorCard: {
    paddingHorizontal: 20,
    paddingVertical: 22,
  },
  errorTitle: {
    fontSize: 21,
    fontWeight: "800",
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  errorButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 999,
  },
  errorButtonText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 15,
  },
  emptyPanel: {
    paddingHorizontal: 20,
    paddingVertical: 26,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
});
