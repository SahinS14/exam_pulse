import { useCallback, useMemo, useState } from "react";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";

import { getQuestionsByTopic } from "../api/content";
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
  const [error, setError] = useState("");

  const loadQuestions = useCallback(async (isRefresh = false) => {
    try {
      setError("");
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const data = await getQuestionsByTopic(topic._id);
      setQuestions(data);
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Failed to load questions.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [topic._id]);

  useFocusEffect(
    useCallback(() => {
      loadQuestions();
    }, [loadQuestions])
  );

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
        onRefresh={() => loadQuestions(true)}
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
});
