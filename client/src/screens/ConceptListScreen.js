import { useCallback, useState } from "react";
import {
  FlatList,
  LayoutAnimation,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";

import { getConcepts } from "../api/content";
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

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function ConceptListScreen({ navigation, route }) {
  const { colors } = useAppTheme();
  const layout = useResponsiveLayout();
  const { module } = route.params;
  const [concepts, setConcepts] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadConcepts = useCallback(async (isRefresh = false) => {
    try {
      setError("");
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const data = await getConcepts(module._id);
      setConcepts(data);
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Failed to load concepts.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [module._id]);

  useFocusEffect(
    useCallback(() => {
      loadConcepts();
    }, [loadConcepts])
  );

  const toggleExpand = (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId((current) => (current === id ? null : id));
  };

  if (loading) {
    return (
      <PageSkeleton
        titleWidth="54%"
        subtitleWidth="58%"
        rows={4}
        rowHeight={90}
      />
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Unable to load concepts"
        subtitle={error}
        onRetry={() => loadConcepts()}
      />
    );
  }

  if (!concepts.length) {
    return (
      <EmptyState
        icon="bulb-outline"
        title="No concepts added yet"
        subtitle="Important concepts for this module will appear here."
      />
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <FlatList
        data={concepts}
        keyExtractor={(item) => item._id}
        refreshing={refreshing}
        onRefresh={() => loadConcepts(true)}
        contentContainerStyle={[
          styles.list,
          {
            paddingHorizontal: layout.horizontalPadding,
            paddingBottom: spacing.xxxl,
            alignItems: "center",
          },
        ]}
        ListHeaderComponent={
          <AnimatedScreenView style={[styles.header, { maxWidth: layout.contentMaxWidth }]}>
            <Text style={[styles.title, { color: colors.text }]}>Important Concepts</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Module {module.number} • {module.title}
            </Text>
            <SectionHeader title="Tap a concept to expand" />
          </AnimatedScreenView>
        }
        renderItem={({ item, index }) => {
          const expanded = expandedId === item._id;
          return (
            <StaggeredItem
              style={[styles.itemWrap, { maxWidth: layout.contentMaxWidth }]}
              index={index}
            >
              <Pressable
                onPress={() => toggleExpand(item._id)}
                style={[
                  styles.card,
                  shadows.card,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.headerRow}>
                  <View style={[styles.iconWrap, { backgroundColor: colors.accentLight }]}>
                    <Ionicons name="bulb-outline" size={22} color={colors.accent} />
                  </View>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>{item.title}</Text>
                  <Ionicons
                    name={expanded ? "chevron-up" : "chevron-down"}
                    size={20}
                    color={colors.textTertiary}
                  />
                </View>

                {expanded ? (
                  <>
                    <Text numberOfLines={4} style={[styles.cardBody, { color: colors.textSecondary }]}>
                      {item.explanation}
                    </Text>
                    <Pressable
                      onPress={() => navigation.navigate("ConceptDetail", { concept: item })}
                      style={styles.detailLink}
                    >
                      <Text style={[styles.detailLinkText, { color: colors.primary }]}>
                        Open full concept
                      </Text>
                    </Pressable>
                  </>
                ) : null}
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
  itemWrap: {
    width: "100%",
    marginBottom: spacing.md,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  cardTitle: {
    flex: 1,
    fontSize: typography.lg,
    fontWeight: fontWeights.bold,
    paddingRight: spacing.sm,
  },
  cardBody: {
    marginTop: spacing.md,
    fontSize: typography.md,
    lineHeight: 22,
  },
  detailLink: {
    marginTop: spacing.md,
  },
  detailLinkText: {
    fontSize: typography.md,
    fontWeight: fontWeights.semibold,
  },
});
