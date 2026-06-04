import { useMemo } from "react";
import {
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useResponsiveLayout } from "../utils/layout";
import { EmptyState } from "./ScreenState";
import { useAppTheme } from "../utils/theme";

const CATEGORY_ORDER = [
  "1 Mark",
  "2 Mark",
  "5 Mark",
  "10 Mark",
  "Short",
  "Long",
];

function groupQuestions(questions) {
  const grouped = questions.reduce((accumulator, question) => {
    const key = question.markCategory || "Other";
    if (!accumulator[key]) {
      accumulator[key] = [];
    }
    accumulator[key].push(question);
    return accumulator;
  }, {});

  return Object.entries(grouped).sort(([left], [right]) => {
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
  }).map(([title, data]) => ({
    title,
    data,
  }));
}

export default function QuestionGroupList({
  questions,
  onPressQuestion,
  emptyTitle,
  refreshing = false,
  onRefresh,
}) {
  const { colors } = useAppTheme();
  const layout = useResponsiveLayout();
  const groupedQuestions = useMemo(() => groupQuestions(questions), [questions]);

  if (!groupedQuestions.length) {
    return <EmptyState title={emptyTitle} subtitle="No questions found yet." />;
  }

  return (
    <SectionList
      contentContainerStyle={[
        styles.content,
        {
          backgroundColor: colors.background,
          paddingHorizontal: layout.horizontalPadding,
          paddingTop: layout.sectionGap,
          alignItems: "center",
        },
      ]}
      sections={groupedQuestions}
      keyExtractor={(item) => item._id}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        ) : undefined
      }
      renderSectionHeader={({ section }) => (
        <View
          style={[
            styles.sectionHeader,
            { maxWidth: layout.contentMaxWidth, width: "100%" },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {section.title} Questions ({section.data.length})
          </Text>
        </View>
      )}
      renderItem={({ item: question }) => (
        <View
          style={[
            styles.cardWrap,
            { maxWidth: layout.contentMaxWidth, width: "100%" },
          ]}
        >
          <Pressable
            onPress={() => onPressQuestion(question)}
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                shadowColor: colors.shadow,
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <Text style={[styles.badge, { color: colors.primary }]}>{question.markCategory}</Text>
              <Text style={[styles.frequency, { color: colors.subtext }]}>Frequency: {question.frequency}</Text>
            </View>
            <Text numberOfLines={3} style={[styles.questionText, { color: colors.text }]}>
              {question.questionText}
            </Text>
            <Text numberOfLines={1} style={[styles.years, { color: colors.subtext }]}>
              {question.yearAppeared
                ?.map((item) => `${item.examName} ${item.year}`)
                .join(" • ")}
            </Text>
          </Pressable>
        </View>
      )}
      stickySectionHeadersEnabled={false}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 28,
  },
  sectionHeader: {
    paddingTop: 8,
    paddingBottom: 10,
  },
  sectionTitle: {
    color: "#18304b",
    fontSize: 18,
    fontWeight: "800",
  },
  cardWrap: {
    marginBottom: 12,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    shadowColor: "#12213b",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  badge: {
    fontWeight: "700",
    fontSize: 13,
  },
  frequency: {
    fontSize: 13,
    fontWeight: "600",
  },
  questionText: {
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
    marginBottom: 8,
  },
  years: {
    fontSize: 13,
  },
});
