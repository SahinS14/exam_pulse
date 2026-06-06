import { FlatList, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useResponsiveLayout } from "../utils/layout";
import {
  fontWeights,
  radius,
  shadows,
  spacing,
  typography,
  useAppTheme,
} from "../utils/theme";

const options = [
  {
    key: "Topics",
    title: "Topics",
    subtitle: "Browse topic-wise PYQs",
    icon: "list-outline",
    color: "#4F46E5",
    bg: "#EEF2FF",
  },
  {
    key: "MostRepeated",
    title: "Most Repeated",
    subtitle: "Focus on high-frequency questions",
    icon: "flame-outline",
    color: "#EF4444",
    bg: "#FEE2E2",
  },
  {
    key: "Concepts",
    title: "Important Concepts",
    subtitle: "Revise must-know ideas",
    icon: "bulb-outline",
    color: "#F59E0B",
    bg: "#FEF3C7",
  },
  {
    key: "Notes",
    title: "Notes",
    subtitle: "Open PDFs and study files",
    icon: "document-text-outline",
    color: "#10B981",
    bg: "#D1FAE5",
  },
  {
    key: "Syllabus",
    title: "Syllabus",
    subtitle: "Check the official scope",
    icon: "reader-outline",
    color: "#6B7280",
    bg: "#F3F4F6",
  },
  {
    key: "TopRevision",
    title: "Top Revision",
    subtitle: "Fast-track revision questions",
    icon: "star-outline",
    color: "#8B5CF6",
    bg: "#EDE9FE",
  },
];

export default function ModuleDetailScreen({ navigation, route }) {
  const { colors } = useAppTheme();
  const layout = useResponsiveLayout();
  const { module, subject } = route.params;
  const singleColumn = layout.width < 390;
  const compactLayout = layout.width < 430;
  const cardGap = spacing.md;
  const cardWidth =
    singleColumn
      ? Math.min(layout.contentMaxWidth, layout.width - layout.horizontalPadding * 2)
      : Math.floor(
          (layout.width - layout.horizontalPadding * 2 - cardGap) / 2
        );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <FlatList
        data={options}
        keyExtractor={(item) => item.key}
        numColumns={singleColumn ? 1 : 2}
        columnWrapperStyle={singleColumn ? undefined : styles.columnWrapper}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.list,
          {
            paddingHorizontal: layout.horizontalPadding,
            paddingBottom: spacing.xxxl,
          },
        ]}
        ListHeaderComponent={
          <View style={[styles.headerStack, { maxWidth: layout.contentMaxWidth }]}>
            <View
              style={[
                styles.summaryCard,
                shadows.card,
                compactLayout && styles.summaryCardCompact,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.summaryLabel, { color: colors.primary }]}>
                {subject?.name || "Subject"}
              </Text>
              <Text
                style={[styles.summaryTitle, compactLayout && styles.summaryTitleCompact, { color: colors.text }]}
              >
                Module {module.number}: {module.title}
              </Text>
              <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
                Open topics, revision buckets, concepts, notes, and syllabus from here.
              </Text>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View
            style={[
              styles.itemWrap,
              {
                width: cardWidth,
              },
              singleColumn && styles.itemWrapSingle,
            ]}
          >
            <Pressable
              onPress={() => {
                if (item.key === "Topics") {
                  navigation.navigate("TopicList", { module });
                }
                if (item.key === "MostRepeated") {
                  navigation.navigate("MostRepeated", { module });
                }
                if (item.key === "Concepts") {
                  navigation.navigate("ConceptList", { module });
                }
                if (item.key === "Notes") {
                  navigation.navigate("Notes", { module });
                }
                if (item.key === "Syllabus") {
                  navigation.navigate("Syllabus", { subject });
                }
                if (item.key === "TopRevision") {
                  navigation.navigate("TopRevision", { module });
                }
              }}
              style={[
                styles.card,
                shadows.card,
                compactLayout && styles.cardCompact,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={[styles.iconWrap, { backgroundColor: item.bg }]}>
                <Ionicons name={item.icon} size={26} color={item.color} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.text }]}>{item.title}</Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                {item.subtitle}
              </Text>
            </Pressable>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  list: {
    paddingTop: spacing.md,
  },
  headerStack: {
    width: "100%",
    alignSelf: "center",
  },
  summaryCard: {
    width: "100%",
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    alignSelf: "center",
  },
  summaryCardCompact: {
    padding: spacing.lg,
  },
  summaryLabel: {
    fontSize: typography.sm,
    fontWeight: fontWeights.extrabold,
    marginBottom: spacing.xs,
  },
  summaryTitle: {
    fontSize: typography.xxl,
    fontWeight: fontWeights.extrabold,
    marginBottom: spacing.xs,
  },
  summaryTitleCompact: {
    fontSize: typography.xl,
  },
  summaryText: {
    fontSize: typography.md,
    lineHeight: 22,
  },
  columnWrapper: {
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  itemWrap: {
    marginBottom: spacing.md,
  },
  itemWrapSingle: {
    width: "100%",
  },
  card: {
    minHeight: 124,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    justifyContent: "space-between",
  },
  cardCompact: {
    minHeight: 118,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: typography.lg,
    fontWeight: fontWeights.bold,
    lineHeight: 24,
    marginTop: spacing.sm,
    marginBottom: spacing.xxs,
  },
  cardSubtitle: {
    fontSize: typography.sm,
    lineHeight: 18,
  },
});
