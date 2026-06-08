import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";

import { searchContent } from "../api/content";
import AppBrandHeader from "../components/AppBrandHeader";
import AnimatedScreenView from "../components/AnimatedScreenView";
import EmptyState from "../components/EmptyState";
import QuestionCard from "../components/QuestionCard";
import SectionHeader from "../components/SectionHeader";
import SkeletonLoader from "../components/SkeletonLoader";
import StatBadge from "../components/StatBadge";
import StaggeredItem from "../components/StaggeredItem";
import { useAuthStore } from "../store/authStore";
import { useAppStore } from "../store/appStore";
import { openStudyResource } from "../utils/fileResources";
import { useResponsiveLayout } from "../utils/layout";
import {
  fontWeights,
  radius,
  shadows,
  spacing,
  typography,
  useAppTheme,
} from "../utils/theme";
import {
  USER_SCOPED_KEYS,
  getScopedAsyncItem,
  setScopedAsyncItem,
} from "../utils/userScopedState";

const POPULAR_TOPICS = [
  "SQL",
  "Normalization",
  "TCP/IP",
  "OS Scheduling",
  "Deadlock",
  "ER Model",
];

async function readRecentSearches(userId) {
  const raw = await getScopedAsyncItem(USER_SCOPED_KEYS.recentSearches, userId);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

async function saveRecentSearch(term, userId) {
  const current = await readRecentSearches(userId);
  const next = [term, ...current.filter((item) => item !== term)].slice(0, 6);
  await setScopedAsyncItem(
    USER_SCOPED_KEYS.recentSearches,
    JSON.stringify(next),
    userId
  );
  return next;
}

function SearchSkeleton({ colors }) {
  return (
    <View style={styles.resultsBlock}>
      {[0, 1, 2, 3].map((item) => (
        <View
          key={item}
          style={[
            styles.skeletonCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderLight,
            },
          ]}
        >
          <SkeletonLoader height={18} width="28%" borderRadius={radius.md} />
          <SkeletonLoader
            height={16}
            width="82%"
            borderRadius={radius.md}
            style={{ marginTop: spacing.md }}
          />
          <SkeletonLoader
            height={16}
            width="64%"
            borderRadius={radius.md}
            style={{ marginTop: spacing.xs }}
          />
        </View>
      ))}
    </View>
  );
}

function SearchChip({ icon, label, onPress, colors, variant = "surface" }) {
  const isPrimary = variant === "primary";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.topicChip,
        {
          backgroundColor: isPrimary ? colors.primaryLight : colors.surface,
          borderColor: isPrimary ? colors.primaryLight : colors.border,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
    >
      <Ionicons
        name={icon}
        size={16}
        color={isPrimary ? colors.primary : colors.textSecondary}
      />
      <Text
        style={[
          styles.topicChipText,
          { color: isPrimary ? colors.primaryDark : colors.text },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function ResultCard({ icon, iconTint, title, subtitle, badge, onPress }) {
  const { colors } = useAppTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.resultCard,
        shadows.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.borderLight,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
      ]}
    >
      <View style={[styles.resultIconWrap, { backgroundColor: iconTint.background }]}>
        <Ionicons name={icon} size={20} color={iconTint.color} />
      </View>

      <View style={styles.resultBody}>
        <Text numberOfLines={1} style={[styles.resultTitle, { color: colors.text }]}>
          {title}
        </Text>
        <Text numberOfLines={2} style={[styles.resultSubtitle, { color: colors.textSecondary }]}>
          {subtitle}
        </Text>
      </View>

      <View style={styles.resultRight}>
        {badge ? <StatBadge label={badge} color="accent" /> : null}
        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
      </View>
    </Pressable>
  );
}

export default function SearchScreen({ navigation }) {
  const { colors } = useAppTheme();
  const layout = useResponsiveLayout();
  const userId = useAuthStore((state) => state.user?._id);
  const selectedBranch = useAppStore((state) => state.selectedBranch);
  const selectedSemester = useAppStore((state) => state.selectedSemester);

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recentSearches, setRecentSearches] = useState([]);
  const [results, setResults] = useState({
    questions: [],
    concepts: [],
    notes: [],
  });

  useFocusEffect(
    useCallback(() => {
      readRecentSearches(userId).then(setRecentSearches).catch(() => setRecentSearches([]));
    }, [userId])
  );

  useEffect(() => {
    const normalized = query.trim();

    if (normalized.length < 2) {
      setLoading(false);
      setError("");
      setResults({ questions: [], concepts: [], notes: [] });
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        setLoading(true);
        setError("");
        const data = await searchContent({
          q: normalized,
          branchId: selectedBranch?._id,
          semesterId: selectedSemester?._id,
        });
        setResults(data);
        const nextRecent = await saveRecentSearch(normalized, userId);
        setRecentSearches(nextRecent);
      } catch (loadError) {
        setError(loadError.response?.data?.message || "Search failed.");
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, selectedBranch, selectedSemester, userId]);

  const hasResults = useMemo(
    () =>
      results.questions.length > 0 ||
      results.concepts.length > 0 ||
      results.notes.length > 0,
    [results]
  );

  const applySearch = (value) => {
    setQuery(value);
  };

  const contextText =
    selectedBranch?.name && selectedSemester?.number
      ? `Search is global. Context boost: ${selectedBranch.name} • Semester ${selectedSemester.number}`
      : "Search questions, concepts, and notes across the full library";

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingHorizontal: layout.horizontalPadding,
            paddingTop: spacing.md,
            paddingBottom: spacing.xxxl,
            alignItems: "center",
          },
        ]}
      >
        <AnimatedScreenView style={[styles.container, { maxWidth: layout.contentMaxWidth }]}>
          <View style={styles.header}>
            <AppBrandHeader />
            <Text style={[styles.title, { color: colors.text }]}>Search</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Find PYQs, concepts, and notes instantly.
            </Text>
          </View>

          <View
            style={[
              styles.searchShell,
              shadows.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderLight,
              },
            ]}
          >
            <Ionicons name="search-outline" size={22} color={colors.textTertiary} />
            <TextInput
              autoFocus
              value={query}
              onChangeText={setQuery}
              placeholder="Search topics, subjects, or keywords"
              placeholderTextColor={colors.textTertiary}
              style={[styles.searchInput, { color: colors.text }]}
            />
            {query.length ? (
              <Pressable onPress={() => setQuery("")} hitSlop={8}>
                <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
              </Pressable>
            ) : null}
          </View>

          <Text style={[styles.contextText, { color: colors.textSecondary }]}>
            {contextText}
          </Text>

          {!query.trim() ? (
            <>
              {recentSearches.length ? (
                <View style={styles.sectionBlock}>
                  <SectionHeader title="Recent Searches" />
                  <View style={styles.chipWrap}>
                    {recentSearches.map((item) => (
                      <SearchChip
                        key={item}
                        icon="time-outline"
                        label={item}
                        onPress={() => applySearch(item)}
                        colors={colors}
                      />
                    ))}
                  </View>
                </View>
              ) : null}

              <View style={styles.sectionBlock}>
                <SectionHeader title="Popular Topics" />
                <View style={styles.chipWrap}>
                  {POPULAR_TOPICS.map((item) => (
                    <SearchChip
                      key={item}
                      icon="trending-up-outline"
                      label={item}
                      onPress={() => applySearch(item)}
                      colors={colors}
                      variant="primary"
                    />
                  ))}
                </View>
              </View>
            </>
          ) : null}

          {loading ? <SearchSkeleton colors={colors} /> : null}

          {!loading && error ? (
            <EmptyState
              icon="alert-circle-outline"
              title="Search failed"
              subtitle={error}
            />
          ) : null}

          {!loading && query.trim().length >= 2 && !error ? (
            <View style={styles.resultsBlock}>
              {results.questions.length ? (
                <View style={styles.sectionBlock}>
                  <SectionHeader title={`Questions (${results.questions.length})`} />
                  {results.questions.map((item) => (
                    <QuestionCard
                      key={item._id}
                      question={item}
                      onPress={() => navigation.navigate("QuestionDetail", { question: item })}
                      style={{ marginBottom: spacing.md }}
                      showContext
                    />
                  ))}
                </View>
              ) : null}

              {results.concepts.length ? (
                <View style={styles.sectionBlock}>
                  <SectionHeader title={`Concepts (${results.concepts.length})`} />
                  {results.concepts.map((item, index) => (
                    <StaggeredItem key={item._id} index={index}>
                      <ResultCard
                        icon="bulb-outline"
                        iconTint={{
                          background: colors.accentLight,
                          color: colors.accent,
                        }}
                        title={item.title}
                        subtitle={
                          [item.subjectName, item.moduleTitle].filter(Boolean).join(" • ") ||
                          item.explanation
                        }
                        onPress={() => navigation.navigate("ConceptDetail", { concept: item })}
                      />
                    </StaggeredItem>
                  ))}
                </View>
              ) : null}

              {results.notes.length ? (
                <View style={styles.sectionBlock}>
                  <SectionHeader title={`Notes (${results.notes.length})`} />
                  {results.notes.map((item, index) => (
                    <StaggeredItem key={item._id} index={index}>
                      <ResultCard
                        icon="document-text-outline"
                        iconTint={{
                          background: colors.successLight,
                          color: colors.success,
                        }}
                        title={item.title}
                        subtitle={[item.type, item.subjectName, item.moduleTitle]
                          .filter(Boolean)
                          .join(" • ")}
                        badge={item.type}
                        onPress={async () => {
                          await openStudyResource({
                            navigation,
                            title: item.title,
                            subtitle: item.type,
                            url: item.fileUrl,
                            fileName: item.fileName,
                            mimeType: item.mimeType,
                          });
                        }}
                      />
                    </StaggeredItem>
                  ))}
                </View>
              ) : null}

              {!hasResults ? (
                <>
                  <EmptyState
                    icon="search-outline"
                    title={`No results for "${query.trim()}"`}
                    subtitle="Try searching for a topic, subject, or keyword."
                  />
                  <View style={styles.sectionBlock}>
                    <SectionHeader title="Try Popular Topics" />
                    <View style={styles.chipWrap}>
                      {POPULAR_TOPICS.map((item) => (
                        <SearchChip
                          key={item}
                          icon="trending-up-outline"
                          label={item}
                          onPress={() => applySearch(item)}
                          colors={colors}
                          variant="primary"
                        />
                      ))}
                    </View>
                  </View>
                </>
              ) : null}
            </View>
          ) : null}
        </AnimatedScreenView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    width: "100%",
  },
  container: {
    width: "100%",
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.display,
    fontWeight: fontWeights.extrabold,
  },
  subtitle: {
    marginTop: spacing.xs,
    fontSize: typography.base,
    fontWeight: fontWeights.medium,
    lineHeight: 22,
  },
  searchShell: {
    borderWidth: 1,
    borderRadius: radius.xl,
    minHeight: 56,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    marginHorizontal: spacing.sm,
    fontSize: typography.base,
    fontWeight: fontWeights.medium,
  },
  contextText: {
    marginTop: spacing.sm,
    fontSize: typography.md,
    lineHeight: 20,
  },
  sectionBlock: {
    width: "100%",
    marginTop: spacing.xl,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  topicChip: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  topicChipText: {
    fontSize: typography.md,
    fontWeight: fontWeights.semibold,
  },
  resultsBlock: {
    width: "100%",
    marginTop: spacing.lg,
  },
  skeletonCard: {
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  resultCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  resultIconWrap: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  resultBody: {
    flex: 1,
    minWidth: 0,
  },
  resultTitle: {
    fontSize: typography.base,
    fontWeight: fontWeights.bold,
    marginBottom: spacing.xxs,
  },
  resultSubtitle: {
    fontSize: typography.md,
    lineHeight: 20,
  },
  resultRight: {
    alignItems: "flex-end",
    justifyContent: "center",
    gap: spacing.xs,
  },
});
