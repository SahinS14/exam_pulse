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

import { getSubjects } from "../api/content";
import AnimatedScreenView from "../components/AnimatedScreenView";
import EmptyState from "../components/EmptyState";
import PageSkeleton from "../components/PageSkeleton";
import SectionHeader from "../components/SectionHeader";
import StaggeredItem from "../components/StaggeredItem";
import { ErrorState } from "../components/ScreenState";
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
import {
  USER_SCOPED_KEYS,
  getScopedAsyncItem,
  setScopedAsyncItem,
} from "../utils/userScopedState";

const DOT_COLORS = ["#4F46E5", "#10B981", "#F59E0B", "#8B5CF6", "#EF4444", "#14B8A6"];

export default function SubjectScreen({ navigation, route }) {
  const { colors } = useAppTheme();
  const layout = useResponsiveLayout();
  const compactLayout = layout.width < 390;
  const { branch, semester } = route.params;
  const userId = useAuthStore((state) => state.user?._id);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const rememberSubject = useCallback(async (subject) => {
    try {
      const raw = await getScopedAsyncItem(USER_SCOPED_KEYS.exploredSubjects, userId);
      const current = raw ? JSON.parse(raw) : [];
      const next = Array.isArray(current)
        ? Array.from(new Set([...current, subject._id]))
        : [subject._id];
      await setScopedAsyncItem(
        USER_SCOPED_KEYS.exploredSubjects,
        JSON.stringify(next),
        userId
      );
    } catch (storageError) {
      // Non-blocking local UX storage.
    }
  }, [userId]);

  const loadSubjects = useCallback(async (isRefresh = false) => {
    try {
      setError("");
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const data = await getSubjects(semester._id);
      setSubjects(data);
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Failed to load subjects.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [semester._id]);

  useFocusEffect(
    useCallback(() => {
      loadSubjects();
    }, [loadSubjects])
  );

  if (loading) {
    return (
      <PageSkeleton
        titleWidth="40%"
        subtitleWidth="58%"
        rows={5}
        rowHeight={88}
      />
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Unable to load subjects"
        subtitle={error}
        onRetry={() => loadSubjects()}
      />
    );
  }

  if (!subjects.length) {
    return (
      <EmptyState
        icon="library-outline"
        title="No subjects found"
        subtitle="This semester has no subjects yet."
      />
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <FlatList
        data={subjects}
        keyExtractor={(item) => item._id}
        refreshing={refreshing}
        onRefresh={() => loadSubjects(true)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.list,
          {
            paddingHorizontal: layout.horizontalPadding,
            paddingBottom: spacing.xxxl,
          },
        ]}
        ListHeaderComponent={
          <AnimatedScreenView style={[styles.header, { maxWidth: layout.contentMaxWidth }]}>
            <Text style={[styles.title, { color: colors.text }]}>Subjects</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Semester {semester.number} • {branch?.name || "Your branch"}
            </Text>
            <SectionHeader title="Choose a subject" />
            <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
              Open a subject to see modules and study content.
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
                await rememberSubject(item);
                await recordStudyActivity(userId, {
                  branchId: branch?._id || null,
                  branchName: branch?.name || null,
                  semesterId: semester._id,
                  semesterNumber: semester.number,
                  subjectId: item._id,
                  subjectName: item.name,
                  moduleId: null,
                  moduleNumber: null,
                  moduleTitle: null,
                  module: null,
                  topicId: null,
                  topicName: null,
                });
                navigation.navigate("Module", { subject: item });
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
              <View
                style={[
                  styles.iconWrap,
                  compactLayout && styles.iconWrapCompact,
                  {
                    backgroundColor: `${DOT_COLORS[index % DOT_COLORS.length]}16`,
                  },
                ]}
              >
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor: DOT_COLORS[index % DOT_COLORS.length],
                    },
                  ]}
                />
              </View>
              <View style={styles.body}>
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
                  {`${Number(item.moduleCount) || 0} Module${
                    Number(item.moduleCount) === 1 ? "" : "s"
                  } available`}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={compactLayout ? 18 : 20} color={colors.textTertiary} />
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
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    minHeight: 78,
  },
  cardCompact: {
    paddingHorizontal: spacing.sm,
    minHeight: 72,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  iconWrapCompact: {
    width: 34,
    height: 34,
    marginRight: spacing.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
  },
  body: {
    flex: 1,
    minWidth: 0,
    paddingRight: spacing.xs,
  },
  cardTitle: {
    fontSize: typography.base,
    fontWeight: fontWeights.semibold,
    lineHeight: 20,
    marginBottom: 4,
  },
  cardTitleCompact: {
    fontSize: typography.md,
  },
  cardSubtitle: {
    fontSize: typography.sm,
    fontWeight: fontWeights.medium,
  },
  cardSubtitleCompact: {
    fontSize: typography.xs,
  },
});
