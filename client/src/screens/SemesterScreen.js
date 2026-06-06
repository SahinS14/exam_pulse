import { useCallback, useMemo, useState } from "react";
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

import { getSemesters, getSubjects } from "../api/content";
import AnimatedScreenView from "../components/AnimatedScreenView";
import EmptyState from "../components/EmptyState";
import PageSkeleton from "../components/PageSkeleton";
import SectionHeader from "../components/SectionHeader";
import StaggeredItem from "../components/StaggeredItem";
import { ErrorState } from "../components/ScreenState";
import { useAppStore } from "../store/appStore";
import { useResponsiveLayout } from "../utils/layout";
import {
  fontWeights,
  radius,
  shadows,
  spacing,
  typography,
  useAppTheme,
} from "../utils/theme";

export default function SemesterScreen({ navigation, route }) {
  const { colors } = useAppTheme();
  const layout = useResponsiveLayout();
  const { branch } = route.params;
  const setSelectedSemester = useAppStore((state) => state.setSelectedSemester);
  const [semesters, setSemesters] = useState([]);
  const [subjectCountMap, setSubjectCountMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadSemesters = useCallback(async (isRefresh = false) => {
    try {
      setError("");
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const data = await getSemesters(branch._id);
      const sorted = data.sort((left, right) => left.number - right.number);
      setSemesters(sorted);

      const countEntries = await Promise.all(
        sorted.map(async (semester) => {
          try {
            const subjects = await getSubjects(semester._id);
            return [semester._id, subjects.length];
          } catch (subjectError) {
            return [semester._id, 0];
          }
        })
      );

      setSubjectCountMap(Object.fromEntries(countEntries));
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Failed to load semesters.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [branch._id]);

  useFocusEffect(
    useCallback(() => {
      loadSemesters();
    }, [loadSemesters])
  );

  const semesterMap = useMemo(
    () => new Map(semesters.map((semester) => [semester.number, semester])),
    [semesters]
  );
  const gridData = Array.from({ length: 8 }, (_, index) => {
    const number = index + 1;
    return semesterMap.get(number) || { _id: `placeholder-${number}`, number, placeholder: true };
  });

  if (loading) {
    return (
      <PageSkeleton
        titleWidth="46%"
        subtitleWidth="64%"
        rows={4}
        rowHeight={118}
      />
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Unable to load semesters"
        subtitle={error}
        onRetry={() => loadSemesters()}
      />
    );
  }

  if (!semesters.length) {
    return (
      <EmptyState
        icon="school-outline"
        title="No semesters found"
        subtitle="This branch has no semester content yet."
      />
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <FlatList
        data={gridData}
        keyExtractor={(item) => item._id}
        numColumns={2}
        refreshing={refreshing}
        onRefresh={() => loadSemesters(true)}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={[
          styles.list,
          {
            paddingHorizontal: layout.horizontalPadding,
            paddingBottom: spacing.xxxl,
          },
        ]}
        ListHeaderComponent={
          <AnimatedScreenView style={[styles.header, { maxWidth: layout.contentMaxWidth }]}>
            <Text style={[styles.title, { color: colors.text }]}>Semesters</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Explore the academic path for {branch.name}.
            </Text>
            <SectionHeader title="Choose a semester" />
          </AnimatedScreenView>
        }
        renderItem={({ item, index }) => {
          const active = !item.placeholder;
          const subjectCount = active ? subjectCountMap[item._id] || 0 : 0;

          return (
            <StaggeredItem style={styles.cardWrap} index={index}>
              <Pressable
                disabled={!active}
                onPress={() => {
                  setSelectedSemester(item);
                  navigation.navigate("Subject", { branch, semester: item });
                }}
                style={[
                  styles.card,
                  shadows.card,
                  {
                    backgroundColor: active ? colors.surface : colors.surfaceSecondary,
                    borderColor: active ? colors.border : colors.borderLight,
                    opacity: active ? 1 : 0.92,
                  },
                ]}
              >
                <View
                  style={[
                    styles.iconWrap,
                    {
                      backgroundColor: active ? colors.primaryLight : colors.borderLight,
                    },
                  ]}
                >
                  <Ionicons
                    name={active ? "albums-outline" : "lock-closed-outline"}
                    size={22}
                    color={active ? colors.primary : colors.textTertiary}
                  />
                </View>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Sem {item.number}</Text>
                <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                  {active
                    ? `${subjectCount} Subject${subjectCount === 1 ? "" : "s"}`
                    : "Coming Soon"}
                </Text>
              </Pressable>
            </StaggeredItem>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  list: {
    paddingTop: spacing.md,
    alignItems: "center",
  },
  header: {
    width: "100%",
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.display,
    fontWeight: fontWeights.extrabold,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.base,
    lineHeight: 24,
    marginBottom: spacing.lg,
  },
  columnWrapper: {
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  cardWrap: {
    width: "48.5%",
  },
  card: {
    minHeight: 120,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.md,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  cardTitle: {
    fontSize: typography.xl,
    fontWeight: fontWeights.bold,
    marginBottom: spacing.xxs,
  },
  cardSubtitle: {
    fontSize: typography.md,
    fontWeight: fontWeights.medium,
    textAlign: "center",
  },
});
