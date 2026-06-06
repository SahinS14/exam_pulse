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

import { getModules } from "../api/content";
import AnimatedScreenView from "../components/AnimatedScreenView";
import PageSkeleton from "../components/PageSkeleton";
import SectionHeader from "../components/SectionHeader";
import StaggeredItem from "../components/StaggeredItem";
import { EmptyState, ErrorState } from "../components/ScreenState";
import { useAppTheme, fontWeights, radius, shadows, spacing, typography } from "../utils/theme";
import { useResponsiveLayout } from "../utils/layout";

const LAST_ACTIVITY_KEY = "lastStudyActivity";

export default function ModuleScreen({ navigation, route }) {
  const { colors } = useAppTheme();
  const layout = useResponsiveLayout();
  const compactLayout = layout.width < 390;
  const { subject } = route.params;
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const rememberModule = useCallback(async (module) => {
    try {
      await AsyncStorage.setItem(
        LAST_ACTIVITY_KEY,
        JSON.stringify({
          subjectName: subject.name,
          moduleNumber: module.number,
          moduleTitle: module.title,
          module: {
            _id: module._id,
            number: module.number,
            title: module.title,
          },
        })
      );
    } catch (error) {
      // Local activity memory should not block navigation.
    }
  }, [subject.name]);

  const loadModules = useCallback(async (isRefresh = false) => {
    try {
      setError("");
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const data = await getModules(subject._id);
      setModules(data.sort((left, right) => left.number - right.number));
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Failed to load modules.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [subject._id]);

  useFocusEffect(
    useCallback(() => {
      loadModules();
    }, [loadModules])
  );

  if (loading) {
    return (
      <PageSkeleton
        titleWidth="38%"
        subtitleWidth="62%"
        rows={4}
        rowHeight={92}
      />
    );
  }

  if (error) {
    return <ErrorState title="Unable to load modules" subtitle={error} onRetry={() => loadModules()} />;
  }

  if (!modules.length) {
    return (
      <EmptyState
        title="No modules found"
        subtitle="This subject has no modules yet."
      />
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <FlatList
        refreshing={refreshing}
        onRefresh={() => loadModules(true)}
        contentContainerStyle={[
          styles.list,
          {
            paddingHorizontal: layout.horizontalPadding,
            paddingBottom: spacing.xxxl,
          },
        ]}
        data={modules}
        keyExtractor={(item) => item._id}
        ListHeaderComponent={
          <AnimatedScreenView style={[styles.header, { maxWidth: layout.contentMaxWidth }]}>
            <Text style={[styles.title, { color: colors.text }]}>Modules</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Explore all modules for {subject.name}.
            </Text>
            <SectionHeader title="Choose a module" />
            <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
              Open a module to see topics, notes, concepts, and revision sections.
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
                await rememberModule(item);
                navigation.navigate("ModuleDetail", {
                  module: item,
                  subject,
                });
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
                <Ionicons name="layers-outline" size={20} color={colors.primary} />
              </View>
              <View style={styles.cardBody}>
                <Text
                  numberOfLines={2}
                  style={[styles.cardTitle, compactLayout && styles.cardTitleCompact, { color: colors.text }]}
                >
                  Module {item.number}: {item.title}
                </Text>
                <Text
                  numberOfLines={1}
                  style={[styles.cardSubtitle, compactLayout && styles.cardSubtitleCompact, { color: colors.textSecondary }]}
                >
                  Tap to open module resources
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
  safeArea: {
    flex: 1,
  },
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
  itemWrap: { width: "100%", marginBottom: spacing.sm, alignSelf: "center" },
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
