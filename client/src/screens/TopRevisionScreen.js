import { useCallback, useMemo, useState } from "react";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";

import { getTopRevisionQuestions } from "../api/content";
import QuestionGroupList from "../components/QuestionGroupList";
import SkeletonLoader from "../components/SkeletonLoader";
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

function TopRevisionSkeleton({ colors, layout }) {
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.loadingScreen,
          {
            paddingHorizontal: layout.horizontalPadding,
            paddingTop: spacing.md,
          },
        ]}
      >
        <View style={[styles.container, { maxWidth: layout.contentMaxWidth }]}>
          <SkeletonLoader height={30} width="52%" borderRadius={radius.md} />
          <SkeletonLoader
            height={18}
            width="68%"
            borderRadius={radius.md}
            style={{ marginTop: spacing.xs }}
          />
          <SkeletonLoader
            height={144}
            width="100%"
            borderRadius={radius.xl}
            style={{ marginTop: spacing.xl }}
          />
          {[0, 1, 2].map((item) => (
            <SkeletonLoader
              key={item}
              height={112}
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

function HeaderContent({ colors, module, questions, compactLayout }) {
  const frequentCount = questions.filter((item) => Number(item.frequency) >= 2).length;
  const markGroups = new Set(questions.map((item) => item.markCategory).filter(Boolean)).size;

  return (
    <View style={styles.headerStack}>
      <View
        style={[
          styles.heroCard,
          shadows.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.borderLight,
          },
        ]}
      >
        <View style={[styles.heroTop, compactLayout && styles.heroTopStacked]}>
          <View style={[styles.heroIconWrap, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="star-outline" size={28} color={colors.primary} />
          </View>
          <View style={styles.heroTextWrap}>
            <Text style={[styles.heroEyebrow, { color: colors.primary }]}>Top Revision</Text>
            <Text style={[styles.heroTitle, { color: colors.text }]} numberOfLines={2}>
              {module.title || `Module ${module.number}`}
            </Text>
            <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
              Keep your final revision focused on the highest-priority questions.
            </Text>
          </View>
        </View>

        <View style={[styles.metricsRow, compactLayout && styles.metricsRowStacked]}>
          <View
            style={[
              styles.metricCard,
              { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderLight },
            ]}
          >
            <Text style={[styles.metricValue, { color: colors.text }]}>{questions.length}</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Questions</Text>
          </View>
          <View
            style={[
              styles.metricCard,
              { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderLight },
            ]}
          >
            <Text style={[styles.metricValue, { color: colors.text }]}>{frequentCount}</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Repeated</Text>
          </View>
          <View
            style={[
              styles.metricCard,
              { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderLight },
            ]}
          >
            <Text style={[styles.metricValue, { color: colors.text }]}>{markGroups}</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Mark Types</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function TopRevisionScreen({ navigation, route }) {
  const { colors } = useAppTheme();
  const layout = useResponsiveLayout();
  const { module } = route.params;
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadQuestions = useCallback(
    async (isRefresh = false) => {
      try {
        setError("");
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        const data = await getTopRevisionQuestions(module._id);
        setQuestions(data);
      } catch (loadError) {
        setError(loadError.response?.data?.message || "Failed to load top revision questions.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [module._id]
  );

  useFocusEffect(
    useCallback(() => {
      loadQuestions();
    }, [loadQuestions])
  );

  const headerContent = useMemo(
    () => (
      <HeaderContent
        colors={colors}
        module={module}
        questions={questions}
        compactLayout={layout.width < 390}
      />
    ),
    [colors, layout.width, module, questions]
  );

  if (loading) {
    return <TopRevisionSkeleton colors={colors} layout={layout} />;
  }

  if (error) {
    return (
      <ErrorState
        title="Unable to load top revision questions"
        subtitle={error}
        onRetry={() => loadQuestions()}
      />
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <QuestionGroupList
        emptyTitle="No top revision questions yet"
        emptySubtitle="Revision-priority questions for this module will appear here once they are tagged."
        onPressQuestion={(question) => navigation.navigate("QuestionDetail", { question })}
        questions={questions}
        refreshing={refreshing}
        onRefresh={() => loadQuestions(true)}
        headerContent={headerContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  loadingScreen: {
    flex: 1,
    alignItems: "center",
  },
  container: {
    width: "100%",
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  heroTop: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "flex-start",
  },
  heroTopStacked: {
    flexDirection: "column",
  },
  heroIconWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTextWrap: {
    flex: 1,
    gap: spacing.xxs,
  },
  heroEyebrow: {
    fontSize: typography.sm,
    fontWeight: fontWeights.bold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: typography.xxl,
    fontWeight: fontWeights.bold,
    lineHeight: 30,
  },
  heroSubtitle: {
    fontSize: typography.base,
    fontWeight: fontWeights.medium,
    lineHeight: 22,
  },
  metricsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  metricsRowStacked: {
    flexWrap: "wrap",
  },
  metricCard: {
    flex: 1,
    minWidth: 92,
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
    textAlign: "center",
  },
});
