import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";

import { getBranches } from "../api/content";
import AppBrandHeader from "../components/AppBrandHeader";
import EmptyState from "../components/EmptyState";
import PageSkeleton from "../components/PageSkeleton";
import SectionHeader from "../components/SectionHeader";
import { ErrorState } from "../components/ScreenState";
import { useAppStore } from "../store/appStore";
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

const BRANCH_META = {
  CSE: {
    icon: "code-slash-outline",
    color: "#4F46E5",
    background: "#EEF2FF",
  },
  ECE: {
    icon: "radio-outline",
    color: "#F59E0B",
    background: "#FEF3C7",
  },
  EEE: {
    icon: "flash-outline",
    color: "#10B981",
    background: "#D1FAE5",
  },
  EIE: {
    icon: "pulse-outline",
    color: "#8B5CF6",
    background: "#EDE9FE",
  },
  VLSI: {
    icon: "layers-outline",
    color: "#EF4444",
    background: "#FEE2E2",
  },
  CST: {
    icon: "grid-outline",
    color: "#14B8A6",
    background: "#CCFBF1",
  },
  "CSE AI": {
    icon: "hardware-chip-outline",
    color: "#4F46E5",
    background: "#EEF2FF",
  },
  Mechanical: {
    icon: "construct-outline",
    color: "#2563EB",
    background: "#DBEAFE",
  },
  Civil: {
    icon: "business-outline",
    color: "#EC4899",
    background: "#FCE7F3",
  },
};

function getBranchMeta(name) {
  return (
    BRANCH_META[name] || {
      icon: "school-outline",
      color: "#4F46E5",
      background: "#EEF2FF",
    }
  );
}

function BranchRow({ item, semesterLabel, hasSemesters, onPress, index, compactLayout }) {
  const { colors } = useAppTheme();
  const meta = getBranchMeta(item.name);
  const scale = useRef(new Animated.Value(0.96)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        delay: index * 50,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 250,
        delay: index * 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index, opacity, scale]);

  const animateScale = (value) => {
    Animated.timing(scale, {
      toValue: value,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ opacity, transform: [{ scale }] }}>
      <Pressable
        onPress={() => onPress(item)}
        onPressIn={() => animateScale(0.98)}
        onPressOut={() => animateScale(1)}
        style={[
          styles.branchCard,
          shadows.card,
          compactLayout && styles.branchCardCompact,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.branchTopRow}>
          <View
            style={[
              styles.branchIconWrap,
              compactLayout && styles.branchIconWrapCompact,
              { backgroundColor: meta.background },
            ]}
          >
            <Ionicons name={meta.icon} size={compactLayout ? 22 : 24} color={meta.color} />
          </View>

          <Ionicons
            name="chevron-forward"
            size={compactLayout ? 18 : 20}
            color={colors.textTertiary}
          />
        </View>

        <View style={styles.branchTextWrap}>
          <Text
            numberOfLines={2}
            style={[
              styles.branchTitle,
              compactLayout && styles.branchTitleCompact,
              { color: colors.text },
            ]}
          >
            {item.name}
          </Text>
          <Text
            numberOfLines={1}
            style={[
              styles.branchSubtitle,
              compactLayout && styles.branchSubtitleCompact,
              { color: hasSemesters ? colors.textSecondary : colors.warning },
            ]}
          >
            {hasSemesters ? semesterLabel : "Coming Soon"}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function BranchScreen({ navigation }) {
  const { colors } = useAppTheme();
  const layout = useResponsiveLayout();
  const userId = useAuthStore((state) => state.user?._id);
  const setSelectedBranch = useAppStore((state) => state.setSelectedBranch);
  const compactLayout = layout.width < 390;
  const listColumns = layout.width >= 720 ? 3 : layout.width >= 360 ? 2 : 1;
  const cardGap = spacing.md;
  const cardWidth =
    listColumns === 1
      ? Math.min(layout.contentMaxWidth, layout.width - layout.horizontalPadding * 2)
      : Math.floor(
          (layout.width - layout.horizontalPadding * 2 - cardGap * (listColumns - 1)) /
            listColumns
        );

  const [branches, setBranches] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadBranches = useCallback(async (isRefresh = false) => {
    try {
      setError("");
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const branchData = await getBranches();
      setBranches(branchData);
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Failed to load branches.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadBranches();
    }, [loadBranches])
  );

  const filteredBranches = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return branches;
    }

    return branches.filter((branch) => branch.name?.toLowerCase().includes(normalized));
  }, [branches, query]);

  if (loading) {
    return (
      <PageSkeleton
        titleWidth="38%"
        subtitleWidth="66%"
        withSearchBar
        rows={4}
        rowHeight={92}
      />
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Unable to load branches"
        subtitle={error}
        onRetry={() => loadBranches()}
      />
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <FlatList
        data={filteredBranches}
        keyExtractor={(item) => item._id}
        numColumns={listColumns}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadBranches(true)}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        columnWrapperStyle={listColumns > 1 ? styles.columnWrapper : undefined}
        contentContainerStyle={[
          styles.content,
          {
            paddingHorizontal: layout.horizontalPadding,
            paddingBottom: spacing.xxxl,
          },
        ]}
        ListHeaderComponent={
          <View style={[styles.header, { maxWidth: layout.contentMaxWidth }]}>
            <AppBrandHeader />
            <Text style={[styles.title, { color: colors.text }]}>Browse</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Explore branches and start your preparation
            </Text>

            <View
              style={[
                styles.searchBar,
                shadows.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons name="search-outline" size={20} color={colors.textTertiary} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search for branches..."
                placeholderTextColor={colors.textTertiary}
                style={[styles.searchInput, { color: colors.text }]}
              />
            </View>

            <SectionHeader title="Choose your branch" />
            <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
              Select your branch to continue to semesters and subjects.
            </Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="search-outline"
            title="No matching branches"
            subtitle="Try another keyword to find your branch."
          />
        }
        renderItem={({ item, index }) => {
          const count = Number(item.semesterCount) || 0;
          const hasSemesters = count > 0;
          const semesterLabel = `${count} Semester${count > 1 ? "s" : ""}`;

          return (
            <View
              style={[
                styles.rowWrap,
                {
                  width: cardWidth,
                  maxWidth: listColumns === 1 ? layout.contentMaxWidth : undefined,
                },
              ]}
            >
              <BranchRow
                item={item}
                semesterLabel={semesterLabel}
                hasSemesters={hasSemesters}
                index={index}
                compactLayout={compactLayout}
                onPress={async (branch) => {
                  await recordStudyActivity(userId, {
                    branchId: branch._id,
                    branchName: branch.name,
                    semesterId: null,
                    semesterNumber: null,
                    subjectId: null,
                    subjectName: null,
                    moduleId: null,
                    moduleNumber: null,
                    moduleTitle: null,
                    module: null,
                    topicId: null,
                    topicName: null,
                  });
                  await setSelectedBranch(branch);
                  navigation.navigate("Semester", { branch });
                }}
              />
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
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
    marginBottom: spacing.md,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: typography.base,
    fontWeight: fontWeights.medium,
  },
  sectionHint: {
    fontSize: typography.sm,
    lineHeight: 18,
    marginTop: -spacing.xs,
    marginBottom: spacing.sm,
  },
  rowWrap: {
    marginBottom: spacing.sm,
  },
  columnWrapper: {
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  branchCard: {
    justifyContent: "space-between",
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 138,
  },
  branchCardCompact: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    minHeight: 128,
  },
  branchTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  branchIconWrap: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  branchIconWrapCompact: {
    width: 46,
    height: 46,
  },
  branchTextWrap: {
    minWidth: 0,
  },
  branchTitle: {
    fontSize: typography.base,
    fontWeight: fontWeights.semibold,
    lineHeight: 20,
    marginBottom: spacing.xxs,
  },
  branchTitleCompact: {
    fontSize: typography.md,
  },
  branchSubtitle: {
    fontSize: typography.sm,
    fontWeight: fontWeights.medium,
  },
  branchSubtitleCompact: {
    fontSize: typography.xs,
  },
});
