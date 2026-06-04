import { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SymbolView } from "expo-symbols";

import { getBranches, getSemesters } from "../api/content";
import { EmptyState, ErrorState, LoadingState } from "../components/ScreenState";
import { useAppStore } from "../store/appStore";
import { useAppTheme } from "../utils/theme";
import { useResponsiveLayout } from "../utils/layout";

const HEADER_LOGO = require("../../assets/images/exampulse.png");

const BRANCH_VISUALS = {
  CSE: {
    icon: "chevron.left.forwardslash.chevron.right",
    fallback: "</>",
    tint: "#2563eb",
    background: "#edf4ff",
  },
  "CSE AI": {
    icon: "brain.head.profile",
    fallback: "AI",
    tint: "#16a34a",
    background: "#eefcf3",
  },
  CST: {
    icon: "display",
    fallback: "▣",
    tint: "#8b5cf6",
    background: "#f4efff",
  },
  ECE: {
    icon: "cpu",
    fallback: "◫",
    tint: "#f97316",
    background: "#fff4ea",
  },
  EEE: {
    icon: "bolt",
    fallback: "⚡",
    tint: "#f4b400",
    background: "#fff9e8",
  },
  Mechanical: {
    icon: "gearshape",
    fallback: "⚙",
    tint: "#1d4ed8",
    background: "#eef4ff",
  },
  Civil: {
    icon: "building.2",
    fallback: "▦",
    tint: "#ef476f",
    background: "#fff0f3",
  },
};

function BrowseSymbol({ name, size, tintColor, fallback }) {
  return (
    <SymbolView
      name={name}
      size={size}
      tintColor={tintColor}
      fallback={
        <Text
          style={{
            color: tintColor,
            fontSize: size * 0.62,
            fontWeight: "700",
            textAlign: "center",
          }}
        >
          {fallback}
        </Text>
      }
    />
  );
}

function getBranchVisual(name) {
  return (
    BRANCH_VISUALS[name] || {
      icon: "books.vertical",
      fallback: "▥",
      tint: "#1f6feb",
      background: "#edf4ff",
    }
  );
}

function BranchCard({ item, colors, columnWidth, semesterLabel, onPress }) {
  const visual = getBranchVisual(item.name);
  const isLongTitle = item.name?.length >= 10;
  const isLongSubtitle = semesterLabel?.length >= 14;

  return (
    <View style={[styles.branchWrap, { width: columnWidth }]}>
      <Pressable
        onPress={() => onPress(item)}
        style={({ pressed }) => [
          styles.branchCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            shadowColor: colors.shadow,
          },
          pressed ? styles.pressedCard : null,
        ]}
      >
        <View style={[styles.branchIconWrap, { backgroundColor: visual.background }]}>
          <BrowseSymbol
            name={visual.icon}
            size={30}
            tintColor={visual.tint}
            fallback={visual.fallback}
          />
        </View>

        <View style={styles.branchBody}>
          <Text
            numberOfLines={1}
            style={[
              styles.branchTitle,
              {
                color: colors.text,
                fontSize: isLongTitle ? 15 : 17,
              },
            ]}
          >
            {item.name}
          </Text>
          <Text
            numberOfLines={1}
            style={[
              styles.branchSubtitle,
              {
                color: colors.subtext,
                fontSize: isLongSubtitle ? 12 : 13,
              },
            ]}
          >
            {semesterLabel}
          </Text>
        </View>

        <BrowseSymbol
          name="chevron.right"
          size={18}
          tintColor={colors.subtext}
          fallback="›"
        />
      </Pressable>
    </View>
  );
}

export default function BranchScreen({ navigation }) {
  const { colors, isDark } = useAppTheme();
  const layout = useResponsiveLayout();
  const setSelectedBranch = useAppStore((state) => state.setSelectedBranch);

  const [branches, setBranches] = useState([]);
  const [semesterCountMap, setSemesterCountMap] = useState({});
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

      const countEntries = await Promise.all(
        branchData.map(async (branch) => {
          try {
            const semesters = await getSemesters(branch._id);
            return [branch._id, semesters.length];
          } catch (semesterError) {
            return [branch._id, 0];
          }
        })
      );

      setSemesterCountMap(Object.fromEntries(countEntries));
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

  const normalizedQuery = query.trim().toLowerCase();
  const filteredBranches = useMemo(() => {
    if (!normalizedQuery) {
      return branches;
    }

    return branches.filter((branch) =>
      branch.name?.toLowerCase().includes(normalizedQuery)
    );
  }, [branches, normalizedQuery]);

  const gridColumns = layout.width >= 390 ? 2 : 1;
  const contentWidth = Math.min(
    layout.width - layout.horizontalPadding * 2,
    layout.contentMaxWidth
  );
  const gridGap = 14;
  const columnWidth =
    gridColumns === 2 ? Math.floor((contentWidth - gridGap) / 2) : contentWidth;

  if (loading) {
    return <LoadingState label="Loading branches..." />;
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

  if (!branches.length) {
    return (
      <EmptyState
        title="No branches available"
        subtitle="Ask the admin to add academic content first."
      />
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <FlatList
        key={gridColumns}
        data={filteredBranches}
        keyExtractor={(item) => item._id}
        numColumns={gridColumns}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadBranches(true)}
            tintColor={colors.primary}
          />
        }
        columnWrapperStyle={gridColumns > 1 ? styles.columnWrapper : undefined}
        showsVerticalScrollIndicator={false}
        style={{ width: "100%" }}
        contentContainerStyle={[
          styles.content,
          {
            paddingHorizontal: layout.horizontalPadding,
            paddingTop: 16,
            paddingBottom: 34,
          },
        ]}
        ListHeaderComponent={
          <View
            style={[
              styles.headerArea,
              { width: contentWidth },
            ]}
          >
            <View style={styles.topRow}>
              <View style={styles.brandRow}>
                <View
                  style={[
                    styles.headerLogoCrop,
                    {
                      width: layout.isTablet ? 58 : 48,
                      height: layout.isTablet ? 58 : 48,
                    },
                  ]}
                >
                  <Image
                    source={HEADER_LOGO}
                    resizeMode="cover"
                    style={[
                      styles.headerLogoImage,
                      {
                        width: layout.isTablet ? 112 : 96,
                        height: layout.isTablet ? 74 : 64,
                      },
                    ]}
                  />
                </View>
                <Text
                  style={[
                    styles.brandText,
                    {
                      color: colors.text,
                      fontSize: layout.isTablet ? 30 : layout.isSmallPhone ? 23 : 27,
                    },
                  ]}
                >
                  <Text style={{ color: colors.text }}>Exam</Text>
                  <Text style={{ color: "#ff7a1b" }}>Pulse</Text>
                </Text>
              </View>

              <Pressable
                onPress={() => navigation.navigate("BookmarksTab")}
                style={({ pressed }) => [
                  styles.notificationButton,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    shadowColor: colors.shadow,
                  },
                  pressed ? styles.pressedCard : null,
                ]}
              >
                <BrowseSymbol
                  name="bell"
                  size={22}
                  tintColor={colors.text}
                  fallback="◌"
                />
                <View style={styles.notificationDot} />
              </Pressable>
            </View>

            <Text style={[styles.pageTitle, { color: colors.text }]}>Browse</Text>
            <Text style={[styles.pageSubtitle, { color: colors.subtext }]}>
              Explore branches and start your preparation
            </Text>

            <View
              style={[
                styles.searchWrap,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  shadowColor: colors.shadow,
                },
              ]}
            >
              <BrowseSymbol
                name="magnifyingglass"
                size={22}
                tintColor={colors.subtext}
                fallback="⌕"
              />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search for branches..."
                placeholderTextColor={isDark ? "#7f91aa" : "#8b98ad"}
                style={[styles.searchInput, { color: colors.text }]}
              />
            </View>

            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Choose your branch
            </Text>
          </View>
        }
        ListFooterComponent={
          <View
            style={[
              styles.footerCard,
              {
                backgroundColor: colors.surfaceSoft,
                borderColor: colors.border,
                shadowColor: colors.shadow,
                width: contentWidth,
              },
            ]}
          >
            <View style={styles.footerIconWrap}>
              <BrowseSymbol
                name="clipboard.fill"
                size={30}
                tintColor={colors.primary}
                fallback="▤"
              />
            </View>
            <View style={styles.footerBody}>
              <Text style={[styles.footerTitle, { color: colors.primary }]}>
                All semesters covered
              </Text>
              <Text style={[styles.footerText, { color: colors.subtext }]}>
                Complete study materials, PYQs, notes, concepts and more.
              </Text>
            </View>
            <BrowseSymbol
              name="chevron.right"
              size={20}
              tintColor={colors.primary}
              fallback="›"
            />
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title="No matching branches"
            subtitle="Try a different keyword to find your branch."
          />
        }
        renderItem={({ item }) => {
          const semesterCount = semesterCountMap[item._id] || 0;
          const semesterLabel =
            semesterCount > 0
              ? `${semesterCount} Semester${semesterCount > 1 ? "s" : ""}`
              : "No semesters yet";

          return (
            <BranchCard
              item={item}
              colors={colors}
              columnWidth={columnWidth}
              semesterLabel={semesterLabel}
              onPress={(branch) => {
                setSelectedBranch(branch);
                navigation.navigate("Semester", { branch });
              }}
            />
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
    alignItems: "center",
  },
  headerArea: {
    alignSelf: "center",
    marginBottom: 18,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  },
  headerLogoCrop: {
    overflow: "hidden",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  headerLogoImage: {
    transform: [{ translateY: -2 }],
  },
  brandText: {
    fontWeight: "900",
    letterSpacing: -0.8,
  },
  notificationButton: {
    width: 48,
    height: 48,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
    position: "relative",
  },
  notificationDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: "#ff6b2b",
    position: "absolute",
    top: 11,
    right: 11,
  },
  pageTitle: {
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -0.8,
    marginBottom: 6,
  },
  pageSubtitle: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 18,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 18,
    height: 66,
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
    marginBottom: 22,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 17,
    fontWeight: "500",
  },
  sectionTitle: {
    fontSize: 21,
    fontWeight: "800",
    marginBottom: 14,
  },
  columnWrapper: {
    justifyContent: "space-between",
    width: "100%",
  },
  branchWrap: {
    marginBottom: 14,
  },
  branchCard: {
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 16,
    height: 126,
    flexDirection: "row",
    alignItems: "center",
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  branchIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    flexShrink: 0,
  },
  branchBody: {
    flex: 1,
    minWidth: 0,
    paddingRight: 6,
  },
  branchTitle: {
    fontWeight: "800",
    lineHeight: 20,
    marginBottom: 5,
  },
  branchSubtitle: {
    fontWeight: "500",
  },
  footerCard: {
    width: "100%",
    alignSelf: "center",
    borderWidth: 1,
    borderRadius: 28,
    marginTop: 10,
    paddingHorizontal: 20,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
  },
  footerIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: "rgba(31,111,235,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  footerBody: {
    flex: 1,
    minWidth: 0,
    paddingRight: 10,
  },
  footerTitle: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 6,
  },
  footerText: {
    fontSize: 15,
    lineHeight: 24,
  },
  pressedCard: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
});
