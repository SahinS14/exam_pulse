import { useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import EmptyState from "./EmptyState";
import AnimatedScreenView from "./AnimatedScreenView";
import QuestionCard from "./QuestionCard";
import SectionHeader from "./SectionHeader";
import StaggeredItem from "./StaggeredItem";
import { spacing, typography, useAppTheme } from "../utils/theme";
import { useResponsiveLayout } from "../utils/layout";

const CATEGORY_ORDER = ["1 Mark", "2 Mark", "5 Mark", "10 Mark", "Short", "Long"];

function groupQuestions(questions, activeFilter) {
  const scoped = activeFilter === "All"
    ? questions
    : questions.filter((question) => question.markCategory === activeFilter);

  const grouped = scoped.reduce((accumulator, question) => {
    const key = question.markCategory || "Other";
    if (!accumulator[key]) {
      accumulator[key] = [];
    }
    accumulator[key].push(question);
    return accumulator;
  }, {});

  return Object.entries(grouped)
    .sort(([left], [right]) => {
      const leftIndex = CATEGORY_ORDER.indexOf(left);
      const rightIndex = CATEGORY_ORDER.indexOf(right);

      if (leftIndex === -1 && rightIndex === -1) {
        return left.localeCompare(right);
      }
      if (leftIndex === -1) {
        return 1;
      }
      if (rightIndex === -1) {
        return -1;
      }
      return leftIndex - rightIndex;
    })
    .map(([title, data]) => ({ title, data }));
}

export default function QuestionGroupList({
  questions,
  onPressQuestion,
  emptyTitle,
  emptySubtitle,
  refreshing = false,
  onRefresh,
  headerContent,
}) {
  const { colors } = useAppTheme();
  const layout = useResponsiveLayout();
  const filters = ["All", ...CATEGORY_ORDER.filter((item) => questions.some((q) => q.markCategory === item))];
  const [activeFilter, setActiveFilter] = useState("All");
  const groupedQuestions = useMemo(
    () => groupQuestions(questions, activeFilter),
    [questions, activeFilter]
  );
  const filteredCount = groupedQuestions.reduce(
    (total, section) => total + section.data.length,
    0
  );

  if (!questions.length) {
    return (
      <EmptyState
        icon="help-circle-outline"
        title={emptyTitle}
        subtitle={emptySubtitle || "No questions found yet."}
      />
    );
  }

  return (
    <ScrollView
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        ) : undefined
      }
      contentContainerStyle={[
        styles.content,
        {
          backgroundColor: colors.background,
          paddingHorizontal: layout.horizontalPadding,
          paddingTop: spacing.md,
          paddingBottom: spacing.xxxl,
          alignItems: "center",
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <AnimatedScreenView style={[styles.page, { maxWidth: layout.contentMaxWidth }]}>
        {headerContent ? <View style={styles.headerWrap}>{headerContent}</View> : null}
        <View style={styles.listHeaderRow}>
          <Text style={[styles.listTitle, { color: colors.text }]}>Question Groups</Text>
          <Text style={[styles.listCount, { color: colors.textSecondary }]}>
            {filteredCount} result{filteredCount === 1 ? "" : "s"}
          </Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {filters.map((filter) => {
            const active = filter === activeFilter;
            return (
              <Pressable
                key={filter}
                onPress={() => setActiveFilter(filter)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active ? colors.primary : colors.surface,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    {
                      color: active ? "#FFFFFF" : colors.textSecondary,
                    },
                  ]}
                >
                  {filter}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {groupedQuestions.map((section) => (
          <View key={section.title} style={styles.sectionWrap}>
            <SectionHeader title={`${section.title} Questions (${section.data.length})`} />
            {section.data.map((question, index) => (
              <StaggeredItem key={question._id} index={index}>
                <QuestionCard
                  question={question}
                  onPress={() => onPressQuestion(question)}
                  style={{ marginBottom: spacing.md }}
                />
              </StaggeredItem>
            ))}
          </View>
        ))}
      </AnimatedScreenView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
  },
  page: {
    width: "100%",
  },
  headerWrap: {
    marginBottom: spacing.md,
  },
  listHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  listTitle: {
    fontSize: typography.xl,
    fontWeight: "700",
    flex: 1,
  },
  listCount: {
    fontSize: typography.sm,
    fontWeight: "600",
  },
  filterRow: {
    paddingBottom: spacing.sm,
    marginBottom: spacing.md,
  },
  filterChip: {
    overflow: "hidden",
    borderWidth: 1,
    borderRadius: 9999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
  },
  filterChipText: {
    fontSize: typography.md,
    fontWeight: "600",
  },
  sectionWrap: {
    marginBottom: spacing.lg,
  },
});
