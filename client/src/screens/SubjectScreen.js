import { useCallback, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
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

import { getModules, getSubjects } from "../api/content";
import AnimatedScreenView from "../components/AnimatedScreenView";
import EmptyState from "../components/EmptyState";
import PageSkeleton from "../components/PageSkeleton";
import SectionHeader from "../components/SectionHeader";
import StaggeredItem from "../components/StaggeredItem";
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

const EXPLORED_SUBJECTS_KEY = "exploredSubjectIds";
const DOT_COLORS = ["#4F46E5", "#10B981", "#F59E0B", "#8B5CF6", "#EF4444", "#14B8A6"];

export default function SubjectScreen({ navigation, route }) {
  const { colors } = useAppTheme();
  const layout = useResponsiveLayout();
  const compactLayout = layout.width < 390;
  const { branch, semester } = route.params;
  const [subjects, setSubjects] = useState([]);
  const [moduleCountMap, setModuleCountMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const rememberSubject = useCallback(async (subject) => {
    try {
      const raw = await AsyncStorage.getItem(EXPLORED_SUBJECTS_KEY);
      const current = raw ? JSON.parse(raw) : [];
      const next = Array.isArray(current)
        ? Array.from(new Set([...current, subject._id]))
        : [subject._id];
      await AsyncStorage.setItem(EXPLORED_SUBJECTS_KEY, JSON.stringify(next));
    } catch (storageError) {
      // Non-blocking local UX storage.
    }
  }, []);

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

      const countEntries = await Promise.all(
        data.map(async (subject) => {
          try {
            const modules = await getModules(subject._id);
            return [subject._id, modules.length];
          } catch (moduleError) {
            return [subject._id, 0];
          }
        })
      );

      setModuleCountMap(Object.fromEntries(countEntries));
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
                  {`${moduleCountMap[item._id] || 0} Module${
                    moduleCountMap[item._id] === 1 ? "" : "s"
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
