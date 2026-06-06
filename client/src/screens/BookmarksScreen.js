import { useCallback, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Swipeable } from "react-native-gesture-handler";
import { useFocusEffect } from "@react-navigation/native";

import { getBookmarks, removeBookmark } from "../api/content";
import AppBrandHeader from "../components/AppBrandHeader";
import AnimatedScreenView from "../components/AnimatedScreenView";
import EmptyState from "../components/EmptyState";
import QuestionCard from "../components/QuestionCard";
import SectionHeader from "../components/SectionHeader";
import SkeletonLoader from "../components/SkeletonLoader";
import StaggeredItem from "../components/StaggeredItem";
import Toast from "../components/Toast";
import { ErrorState } from "../components/ScreenState";
import { useResponsiveLayout } from "../utils/layout";
import {
  fontWeights,
  radius,
  shadows,
  spacing,
  typography,
  useAppTheme,
} from "../utils/theme";

const FILTERS = ["All", "1 Mark", "2 Mark", "5 Mark", "10 Mark"];

function normalizeBookmark(item) {
  const question = item.questionId;
  if (!question) {
    return null;
  }

  return {
    ...question,
    bookmarkId: item._id,
    subjectName: question.topicId?.moduleId?.subjectId?.name || "Saved Questions",
    moduleTitle: question.topicId?.moduleId?.title || null,
  };
}

function BookmarksSkeleton({ colors, layout }) {
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.skeletonScreen,
          {
            paddingHorizontal: layout.horizontalPadding,
            paddingTop: spacing.md,
          },
        ]}
      >
        <View style={[styles.container, { maxWidth: layout.contentMaxWidth }]}>
          <SkeletonLoader height={30} width="46%" borderRadius={radius.md} />
          <SkeletonLoader
            height={18}
            width="70%"
            borderRadius={radius.md}
            style={{ marginTop: spacing.xs }}
          />
          <SkeletonLoader
            height={136}
            width="100%"
            borderRadius={radius.xl}
            style={{ marginTop: spacing.xl }}
          />
          <View style={styles.skeletonFilters}>
            {FILTERS.map((item) => (
              <SkeletonLoader
                key={item}
                height={38}
                width={86}
                borderRadius={radius.full}
              />
            ))}
          </View>
          {[0, 1, 2].map((item) => (
            <SkeletonLoader
              key={item}
              height={116}
              width="100%"
              borderRadius={radius.xl}
              style={{ marginTop: spacing.md }}
            />
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

function BookmarkRow({ question, onPress, onRemove }) {
  const { colors } = useAppTheme();

  const renderRightActions = () => (
    <Pressable
      onPress={() => onRemove(question)}
      style={[
        styles.removeAction,
        shadows.card,
        {
          backgroundColor: colors.danger,
        },
      ]}
    >
      <Ionicons name="trash-outline" size={22} color="#FFFFFF" />
      <Text style={styles.removeActionText}>Remove</Text>
    </Pressable>
  );

  return (
    <Swipeable renderRightActions={renderRightActions} overshootRight={false}>
      <QuestionCard question={question} onPress={onPress} showContext />
    </Swipeable>
  );
}

export default function BookmarksScreen({ navigation }) {
  const { colors } = useAppTheme();
  const layout = useResponsiveLayout();
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [toast, setToast] = useState({ message: "", type: "info" });

  const loadBookmarks = useCallback(async (isRefresh = false) => {
    try {
      setError("");
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const data = await getBookmarks();
      setBookmarks(data.map(normalizeBookmark).filter(Boolean));
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Failed to load bookmarks.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadBookmarks();
    }, [loadBookmarks])
  );

  const filteredBookmarks = useMemo(() => {
    if (activeFilter === "All") {
      return bookmarks;
    }

    return bookmarks.filter((item) => item.markCategory === activeFilter);
  }, [activeFilter, bookmarks]);

  const groupedBookmarks = useMemo(
    () =>
      filteredBookmarks.reduce((accumulator, item) => {
        const key = item.subjectName || "Saved Questions";
        if (!accumulator[key]) {
          accumulator[key] = [];
        }
        accumulator[key].push(item);
        return accumulator;
      }, {}),
    [filteredBookmarks]
  );

  const markSummary = useMemo(() => {
    const oneMark = bookmarks.filter((item) => item.markCategory === "1 Mark").length;
    const longForm = bookmarks.filter(
      (item) => item.markCategory === "5 Mark" || item.markCategory === "10 Mark"
    ).length;

    return {
      oneMark,
      longForm,
      subjects: Object.keys(
        bookmarks.reduce((accumulator, item) => {
          accumulator[item.subjectName || "Saved Questions"] = true;
          return accumulator;
        }, {})
      ).length,
    };
  }, [bookmarks]);

  const handleRemove = async (question) => {
    try {
      await removeBookmark(question._id);
      setBookmarks((current) => current.filter((item) => item._id !== question._id));
      setToast({ message: "Bookmark removed", type: "success" });
    } catch (removeError) {
      setToast({ message: "Failed to remove bookmark", type: "error" });
    }
  };

  if (loading) {
    return <BookmarksSkeleton colors={colors} layout={layout} />;
  }

  if (error) {
    return (
      <ErrorState
        title="Unable to load bookmarks"
        subtitle={error}
        onRetry={() => loadBookmarks()}
      />
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadBookmarks(true)}
            tintColor={colors.primary}
          />
        }
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
            <View style={styles.headerRow}>
              <Text style={[styles.title, { color: colors.text }]}>My Bookmarks</Text>
              <View style={[styles.countBadge, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.countBadgeText, { color: colors.primary }]}>
                  {bookmarks.length}
                </Text>
              </View>
            </View>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Save important questions and revisit them anytime.
            </Text>
          </View>

          <View
            style={[
              styles.summaryCard,
              shadows.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderLight,
              },
            ]}
          >
            <View style={styles.summaryHeader}>
              <View style={[styles.summaryIcon, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="bookmark-outline" size={24} color={colors.primary} />
              </View>
              <View style={styles.summaryTextWrap}>
                <Text style={[styles.summaryTitle, { color: colors.text }]}>
                  Saved Question Bank
                </Text>
                <Text style={[styles.summarySubtitle, { color: colors.textSecondary }]}>
                  Swipe left on any question to remove it from bookmarks.
                </Text>
              </View>
            </View>

            <View style={styles.summaryMetrics}>
              <View
                style={[
                  styles.metricCard,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.borderLight,
                  },
                ]}
              >
                <Text style={[styles.metricValue, { color: colors.text }]}>
                  {markSummary.subjects}
                </Text>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
                  Subjects
                </Text>
              </View>
              <View
                style={[
                  styles.metricCard,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.borderLight,
                  },
                ]}
              >
                <Text style={[styles.metricValue, { color: colors.text }]}>
                  {markSummary.oneMark}
                </Text>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
                  1 Mark
                </Text>
              </View>
              <View
                style={[
                  styles.metricCard,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.borderLight,
                  },
                ]}
              >
                <Text style={[styles.metricValue, { color: colors.text }]}>
                  {markSummary.longForm}
                </Text>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
                  Long Form
                </Text>
              </View>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {FILTERS.map((filter) => {
              const active = filter === activeFilter;
              return (
                <Pressable
                  key={filter}
                  onPress={() => setActiveFilter(filter)}
                  style={({ pressed }) => [
                    styles.filterChip,
                    {
                      backgroundColor: active ? colors.primary : colors.surface,
                      borderColor: active ? colors.primary : colors.border,
                      opacity: pressed ? 0.92 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: active ? "#FFFFFF" : colors.textSecondary },
                    ]}
                  >
                    {filter}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {!filteredBookmarks.length ? (
            <EmptyState
              icon="bookmark-outline"
              title="Nothing saved yet"
              subtitle="Bookmark questions while studying to find them here."
              ctaLabel="Browse Questions"
              onCta={() => navigation.navigate("BrowseTab")}
            />
          ) : (
            Object.entries(groupedBookmarks).map(([subjectName, questions]) => (
              <View key={subjectName} style={styles.sectionWrap}>
                <SectionHeader title={subjectName} />
                <Text style={[styles.sectionMeta, { color: colors.textSecondary }]}>
                  {questions.length} saved question{questions.length === 1 ? "" : "s"}
                </Text>
                {questions.map((question, index) => (
                  <StaggeredItem key={question._id} index={index} style={{ marginTop: spacing.md }}>
                    <BookmarkRow
                      question={question}
                      onPress={() => navigation.navigate("QuestionDetail", { question })}
                      onRemove={handleRemove}
                    />
                  </StaggeredItem>
                ))}
              </View>
            ))
          )}
        </AnimatedScreenView>
      </ScrollView>
      <Toast message={toast.message} type={toast.type} />
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
  skeletonScreen: {
    flex: 1,
    alignItems: "center",
  },
  container: {
    width: "100%",
  },
  skeletonFilters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  header: {
    marginBottom: spacing.lg,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  title: {
    fontSize: typography.display,
    fontWeight: fontWeights.extrabold,
    marginRight: spacing.sm,
  },
  subtitle: {
    marginTop: spacing.xs,
    fontSize: typography.base,
    fontWeight: fontWeights.medium,
    lineHeight: 22,
  },
  countBadge: {
    minWidth: 34,
    height: 34,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xs,
  },
  countBadgeText: {
    fontSize: typography.md,
    fontWeight: fontWeights.bold,
  },
  summaryCard: {
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  summaryIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryTextWrap: {
    flex: 1,
    gap: spacing.xxs,
  },
  summaryTitle: {
    fontSize: typography.xl,
    fontWeight: fontWeights.bold,
  },
  summarySubtitle: {
    fontSize: typography.md,
    fontWeight: fontWeights.medium,
    lineHeight: 20,
  },
  summaryMetrics: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  metricCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xxs,
  },
  metricValue: {
    fontSize: typography.xl,
    fontWeight: fontWeights.bold,
  },
  metricLabel: {
    fontSize: typography.sm,
    fontWeight: fontWeights.medium,
  },
  filterRow: {
    paddingBottom: spacing.xs,
    paddingRight: spacing.sm,
  },
  filterChip: {
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
  },
  filterChipText: {
    fontSize: typography.md,
    fontWeight: fontWeights.semibold,
  },
  sectionWrap: {
    width: "100%",
    marginTop: spacing.xl,
  },
  sectionMeta: {
    fontSize: typography.sm,
    fontWeight: fontWeights.medium,
    marginTop: -spacing.sm,
  },
  removeAction: {
    width: 104,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  removeActionText: {
    color: "#FFFFFF",
    fontSize: typography.sm,
    fontWeight: fontWeights.semibold,
    marginTop: spacing.xxs,
  },
});
