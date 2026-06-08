import { useCallback, useState } from "react";
import {
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";

import { getTopics } from "../api/content";
import AnimatedScreenView from "../components/AnimatedScreenView";
import PageSkeleton from "../components/PageSkeleton";
import SectionHeader from "../components/SectionHeader";
import StaggeredItem from "../components/StaggeredItem";
import { EmptyState, ErrorState } from "../components/ScreenState";
import { useAuthStore } from "../store/authStore";
import { recordStudyActivity } from "../utils/studyActivity";
import { useResponsiveLayout } from "../utils/layout";
import {
  fontWeights,
  radius,
  shadows,
  spacing,
  typography,
  useAppTheme,
} from "../utils/theme";

export default function TopicListScreen({ navigation, route }) {
  const { colors } = useAppTheme();
  const layout = useResponsiveLayout();
  const compactLayout = layout.width < 390;
  const { module } = route.params;
  const userId = useAuthStore((state) => state.user?._id);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadTopics = useCallback(async (isRefresh = false) => {
    try {
      setError("");
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const data = await getTopics(module._id);
      setTopics(data);
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Failed to load topics.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [module._id]);

  useFocusEffect(
    useCallback(() => {
      loadTopics();
    }, [loadTopics])
  );

  if (loading) {
    return (
      <PageSkeleton
        titleWidth="30%"
        subtitleWidth="56%"
        rows={5}
        rowHeight={92}
      />
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Unable to load topics"
        subtitle={error}
        onRetry={() => loadTopics()}
      />
    );
  }

  if (!topics.length) {
    return (
      <EmptyState
        icon="list-outline"
        title="No topics found"
        subtitle="Topics for this module will appear here."
      />
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <FlatList
        refreshing={refreshing}
        onRefresh={() => loadTopics(true)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.list,
          {
            paddingHorizontal: layout.horizontalPadding,
            paddingBottom: spacing.xxxl,
          },
        ]}
        data={topics}
        keyExtractor={(item) => item._id}
        ListHeaderComponent={
          <AnimatedScreenView style={[styles.header, { maxWidth: layout.contentMaxWidth }]}>
            <Text style={[styles.title, { color: colors.text }]}>Topics</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Module {module.number} • {module.title}
            </Text>
            <SectionHeader title="Choose a topic" />
            <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
              Select a topic to open its previous year questions.
            </Text>
          </AnimatedScreenView>
        }
        renderItem={({ item, index }) => (
          <StaggeredItem
            style={[styles.itemWrap, { maxWidth: layout.contentMaxWidth }]}
            index={index}
          >
            <Pressable
              onPress={async () => {
                await recordStudyActivity(userId, {
                  moduleId: module._id,
                  moduleNumber: module.number,
                  moduleTitle: module.title,
                  module: {
                    _id: module._id,
                    number: module.number,
                    title: module.title,
                  },
                  topicId: item._id,
                  topicName: item.name,
                });
                navigation.navigate("QuestionList", { topic: item });
              }}
              style={[
                styles.card,
                shadows.card,
                compactLayout && styles.cardCompact,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View
                style={[
                  styles.iconWrap,
                  compactLayout && styles.iconWrapCompact,
                  { backgroundColor: colors.primaryLight },
                ]}
              >
                <Ionicons name="list-outline" size={20} color={colors.primary} />
              </View>
              <View style={styles.cardBody}>
                <Text
                  numberOfLines={2}
                  style={[styles.cardTitle, compactLayout && styles.cardTitleCompact, { color: colors.text }]}
                >
                  {item.name}
                </Text>
                <Text
                  numberOfLines={1}
                  style={[styles.cardSubtitle, compactLayout && styles.cardSubtitleCompact, { color: colors.textSecondary }]}
                >
                  Tap to view question bank
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={compactLayout ? 18 : 20}
                color={colors.textTertiary}
              />
            </Pressable>
          </StaggeredItem>
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
  header: {
    width: "100%",
    marginBottom: spacing.lg,
    alignSelf: "center",
  },
  title: {
    fontSize: typography.display,
    fontWeight: fontWeights.extrabold,
    marginBottom: spacing.xxs,
  },
  subtitle: {
    fontSize: typography.base,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  sectionHint: {
    fontSize: typography.sm,
    lineHeight: 18,
    marginTop: -spacing.xs,
    marginBottom: spacing.sm,
  },
  itemWrap: {
    width: "100%",
    marginBottom: spacing.sm,
    alignSelf: "center",
  },
  card: {
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    width: "100%",
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
  },
  cardCompact: {
    paddingHorizontal: spacing.sm,
    minHeight: 72,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  iconWrapCompact: {
    width: 34,
    height: 34,
    marginRight: spacing.sm,
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
    paddingRight: spacing.xs,
  },
  cardTitle: {
    fontSize: typography.base,
    fontWeight: fontWeights.semibold,
    lineHeight: 20,
  },
  cardTitleCompact: {
    fontSize: typography.md,
  },
  cardSubtitle: {
    fontSize: typography.sm,
    fontWeight: fontWeights.medium,
    marginTop: 4,
  },
  cardSubtitleCompact: {
    fontSize: typography.xs,
  },
});
