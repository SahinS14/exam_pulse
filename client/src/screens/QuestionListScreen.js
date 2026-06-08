import { useCallback, useMemo, useState } from "react";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";

import { getQuestionsByTopicPage } from "../api/content";
import PageSkeleton from "../components/PageSkeleton";
import QuestionGroupList from "../components/QuestionGroupList";
import { ErrorState } from "../components/ScreenState";
import {
  fontWeights,
  radius,
  shadows,
  spacing,
  typography,
  useAppTheme,
} from "../utils/theme";

const PAGE_SIZE = 20;

function mergeUniqueById(currentItems, nextItems) {
  const seen = new Set(currentItems.map((item) => item._id));
  const merged = [...currentItems];

  nextItems.forEach((item) => {
    if (!seen.has(item._id)) {
      seen.add(item._id);
      merged.push(item);
    }
  });

  return merged;
}

export default function QuestionListScreen({ navigation, route }) {
  const { colors } = useAppTheme();
  const topic =
    route.params?.topic ||
    {
      _id: route.params?.topicId,
      name: route.params?.topicName || "Question Bank",
    };
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [loadMoreError, setLoadMoreError] = useState("");
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);

  const loadQuestions = useCallback(async ({ isRefresh = false, nextPage = 1 } = {}) => {
    try {
      const append = nextPage > 1 && !isRefresh;

      if (!append) {
        setError("");
      }
      setLoadMoreError("");

      if (isRefresh) {
        setRefreshing(true);
      } else if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const response = await getQuestionsByTopicPage({
        topicId: topic._id,
        page: nextPage,
        limit: PAGE_SIZE,
      });

      const nextItems = response.items || [];

      setQuestions((currentItems) =>
        append ? mergeUniqueById(currentItems, nextItems) : nextItems
      );
      setPage(response.page || nextPage);
      setHasNextPage(Boolean(response.hasNextPage));
    } catch (loadError) {
      const message =
        loadError.response?.data?.message || "Failed to load questions.";

      if (nextPage > 1 && !isRefresh) {
        setLoadMoreError(message);
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [topic._id]);

  useFocusEffect(
    useCallback(() => {
      loadQuestions();
    }, [loadQuestions])
  );

  const handleLoadMore = useCallback(() => {
    if (loading || refreshing || loadingMore || !hasNextPage) {
      return;
    }

    loadQuestions({ nextPage: page + 1 });
  }, [hasNextPage, loadQuestions, loading, loadingMore, page, refreshing]);

  const stats = useMemo(() => {
    const highFrequencyCount = questions.filter((item) => Number(item.frequency) > 2).length;
    return {
      total: questions.length,
      highFrequency: highFrequencyCount,
    };
  }, [questions]);

  if (loading) {
    return (
      <PageSkeleton
        titleWidth="44%"
        subtitleWidth="72%"
        heroHeight={132}
        withChips
        rows={4}
        rowHeight={108}
      />
    );
  }

  if (error) {
    return <ErrorState title="Unable to load questions" subtitle={error} onRetry={() => loadQuestions()} />;
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <QuestionGroupList
        emptyTitle="No questions found for this topic"
        onPressQuestion={(question) =>
          navigation.navigate("QuestionDetail", { question })
        }
        questions={questions}
        refreshing={refreshing}
        onRefresh={() => loadQuestions({ isRefresh: true, nextPage: 1 })}
        footerContent={
          hasNextPage ? (
            <View style={styles.loadMoreWrap}>
              {loadMoreError ? (
                <Text style={[styles.loadMoreError, { color: colors.danger }]}>
                  {loadMoreError}
                </Text>
              ) : null}
              <Pressable
                disabled={loadingMore}
                onPress={handleLoadMore}
                style={[
                  styles.loadMoreButton,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    opacity: loadingMore ? 0.7 : 1,
                  },
                ]}
              >
                <Text style={[styles.loadMoreText, { color: colors.primary }]}>
                  {loadingMore ? "Loading more..." : "Load More"}
                </Text>
              </Pressable>
            </View>
          ) : null
        }
        headerContent={
          <View
            style={[
              styles.headerCard,
              shadows.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.headerLabel, { color: colors.primary }]}>Question Bank</Text>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{topic.name}</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              Browse PYQs by mark category and open detailed solutions from here.
            </Text>

            <View style={styles.statsRow}>
              <View
                style={[
                  styles.statChip,
                  { backgroundColor: colors.primaryLight, borderColor: colors.border },
                ]}
              >
                <Ionicons name="help-circle-outline" size={16} color={colors.primary} />
                <Text style={[styles.statText, { color: colors.text }]}>
                  {stats.total} Questions
                </Text>
              </View>
              <View
                style={[
                  styles.statChip,
                  {
                    backgroundColor: stats.highFrequency ? colors.accentLight : colors.surfaceSecondary,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons
                  name={stats.highFrequency ? "flame-outline" : "options-outline"}
                  size={16}
                  color={stats.highFrequency ? colors.accent : colors.textSecondary}
                />
                <Text style={[styles.statText, { color: colors.text }]}>
                  {stats.highFrequency} High Frequency
                </Text>
              </View>
            </View>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  headerCard: {
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing.lg,
  },
  headerLabel: {
    fontSize: typography.sm,
    fontWeight: fontWeights.bold,
    marginBottom: spacing.xs,
  },
  headerTitle: {
    fontSize: typography.xxxl,
    fontWeight: fontWeights.extrabold,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: typography.md,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  statChip: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  statText: {
    fontSize: typography.sm,
    fontWeight: fontWeights.semibold,
  },
  loadMoreButton: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    alignSelf: "center",
  },
  loadMoreWrap: {
    alignItems: "center",
  },
  loadMoreText: {
    fontSize: typography.md,
    fontWeight: fontWeights.bold,
  },
  loadMoreError: {
    fontSize: typography.sm,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
});
