import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";

import { getNotesPage } from "../api/content";
import EmptyState from "../components/EmptyState";
import FileResourceCard from "../components/FileResourceCard";
import SectionHeader from "../components/SectionHeader";
import SkeletonLoader from "../components/SkeletonLoader";
import { ErrorState } from "../components/ScreenState";
import {
  downloadAndOpenFile,
  isPdfFile,
  openStudyResource,
} from "../utils/fileResources";
import { useResponsiveLayout } from "../utils/layout";
import {
  fontWeights,
  radius,
  shadows,
  spacing,
  typography,
  useAppTheme,
} from "../utils/theme";

const PAGE_SIZE = 20;

function mergeUniqueById(currentItems, nextItems) {
  const seen = new Set(currentItems.map((item) => item._id));
  const merged = [...currentItems];

  nextItems.forEach((item) => {
    if (!seen.has(item._id)) {
      seen.add(item._id);
      merged.push(item);
    }
  });

  return merged;
}

function buildTypeSummary(notes) {
  const uniqueTypes = new Set(notes.map((item) => item.type).filter(Boolean));
  if (!uniqueTypes.size) {
    return "Study files ready to open or download";
  }

  if (uniqueTypes.size === 1) {
    return `${[...uniqueTypes][0]} available in this module`;
  }

  return `${uniqueTypes.size} note categories available in this module`;
}

function NotesSkeleton({ colors, layout }) {
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.screen,
          {
            paddingHorizontal: layout.horizontalPadding,
            paddingTop: spacing.md,
          },
        ]}
      >
        <View style={[styles.container, { maxWidth: layout.contentMaxWidth }]}>
          <SkeletonLoader height={28} width="48%" borderRadius={radius.md} />
          <SkeletonLoader height={18} width="72%" borderRadius={radius.md} style={{ marginTop: spacing.xs }} />
          <SkeletonLoader
            height={132}
            width="100%"
            borderRadius={radius.xl}
            style={{ marginTop: spacing.xl }}
          />
          <View style={styles.skeletonList}>
            {[0, 1, 2].map((item) => (
              <SkeletonLoader
                key={item}
                height={176}
                width="100%"
                borderRadius={radius.xl}
              />
            ))}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

export default function NotesScreen({ navigation, route }) {
  const { colors } = useAppTheme();
  const layout = useResponsiveLayout();
  const module =
    route.params?.module ||
    {
      _id: route.params?.moduleId,
      number: route.params?.moduleNumber,
      title: route.params?.moduleTitle || "Module",
    };
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [loadMoreError, setLoadMoreError] = useState("");
  const [downloadingId, setDownloadingId] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState({});
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const compactLayout = layout.width < 390;
  const singleMetricColumn = layout.width < 350;

  const loadNotes = useCallback(
    async ({ isRefresh = false, nextPage = 1 } = {}) => {
      try {
        const append = nextPage > 1 && !isRefresh;

        if (!append) {
          setError("");
        }
        setLoadMoreError("");

        if (isRefresh) {
          setRefreshing(true);
        } else if (append) {
          setLoadingMore(true);
        } else {
          setLoading(true);
        }

        const response = await getNotesPage({
          moduleId: module._id,
          page: nextPage,
          limit: PAGE_SIZE,
        });

        const nextItems = response.items || [];

        setNotes((currentItems) =>
          append ? mergeUniqueById(currentItems, nextItems) : nextItems
        );
        setPage(response.page || nextPage);
        setHasNextPage(Boolean(response.hasNextPage));
      } catch (loadError) {
        const message =
          loadError.response?.data?.message || "Failed to load notes.";

        if (nextPage > 1 && !isRefresh) {
          setLoadMoreError(message);
        } else {
          setError(message);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [module._id]
  );

  useFocusEffect(
    useCallback(() => {
      loadNotes();
    }, [loadNotes])
  );

  const handleLoadMore = useCallback(() => {
    if (loading || refreshing || loadingMore || !hasNextPage) {
      return;
    }

    loadNotes({ nextPage: page + 1 });
  }, [hasNextPage, loadNotes, loading, loadingMore, page, refreshing]);

  const totalFiles = notes.length;
  const pdfCount = useMemo(
    () =>
      notes.filter((item) =>
        isPdfFile({ url: item.fileUrl, mimeType: item.mimeType, fileName: item.fileName })
      ).length,
    [notes]
  );
  const imageCount = totalFiles - pdfCount;
  const summaryText = useMemo(() => buildTypeSummary(notes), [notes]);

  const handleOpen = async (item) => {
    try {
      await openStudyResource({
        navigation,
        title: item.title,
        subtitle: item.type,
        url: item.fileUrl,
        fileName: item.fileName,
        mimeType: item.mimeType,
      });
    } catch (openError) {
      Alert.alert("Open failed", "Unable to open this file right now.");
    }
  };

  const handleDownload = async (item) => {
    try {
      setDownloadingId(item._id);
      setDownloadProgress((current) => ({ ...current, [item._id]: 0 }));
      await downloadAndOpenFile({
        url: item.fileUrl,
        fileName: item.fileName || item.title,
        mimeType: item.mimeType,
        onProgress: (progress) =>
          setDownloadProgress((current) => ({
            ...current,
            [item._id]: progress,
          })),
      });
    } catch (downloadError) {
      Alert.alert("Download failed", "Unable to download this file right now.");
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) {
    return <NotesSkeleton colors={colors} layout={layout} />;
  }

  if (error) {
    return (
      <ErrorState
        title="Unable to load notes"
        subtitle={error}
        onRetry={() => loadNotes()}
      />
    );
  }

  const renderHeader = () => (
    <View style={styles.headerStack}>
      <View
        style={[
          styles.heroCard,
          shadows.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.borderLight,
          },
        ]}
      >
        <View style={[styles.heroTop, compactLayout && styles.heroTopStacked]}>
          <View
            style={[
              styles.heroIconWrap,
              { backgroundColor: colors.successLight },
            ]}
          >
            <Ionicons name="document-text-outline" size={28} color={colors.success} />
          </View>
          <View style={styles.heroTextWrap}>
            <Text style={[styles.heroEyebrow, { color: colors.success }]}>Module Notes</Text>
            <Text style={[styles.heroTitle, { color: colors.text }]} numberOfLines={2}>
              {module.title || `Module ${module.number}`}
            </Text>
            <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
              {summaryText}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.metricsRow,
            compactLayout && styles.metricsRowStacked,
            singleMetricColumn && styles.metricsRowSingleColumn,
          ]}
        >
          <View
            style={[
              styles.metricCard,
              { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderLight },
            ]}
          >
            <Text style={[styles.metricValue, { color: colors.text }]}>{totalFiles}</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Files</Text>
          </View>
          <View
            style={[
              styles.metricCard,
              { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderLight },
            ]}
          >
            <Text style={[styles.metricValue, { color: colors.text }]}>{pdfCount}</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>PDFs</Text>
          </View>
          <View
            style={[
              styles.metricCard,
              { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderLight },
            ]}
          >
            <Text style={[styles.metricValue, { color: colors.text }]}>{imageCount}</Text>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Images</Text>
          </View>
        </View>
      </View>

      <SectionHeader title="Available Resources" />
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <FlatList
        data={notes}
        keyExtractor={(item) => item._id}
        refreshing={refreshing}
        onRefresh={() => loadNotes({ isRefresh: true, nextPage: 1 })}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <EmptyState
            icon="document-text-outline"
            title="No notes uploaded yet"
            subtitle="Module notes, handwritten sheets, and revision files will appear here once added."
          />
        }
        ListFooterComponent={
          hasNextPage ? (
            <View style={[styles.footerWrap, { maxWidth: layout.contentMaxWidth }]}>
              {loadMoreError ? (
                <Text style={[styles.loadMoreError, { color: colors.danger }]}>
                  {loadMoreError}
                </Text>
              ) : null}
              <Pressable
                disabled={loadingMore}
                onPress={handleLoadMore}
                style={[
                  styles.loadMoreButton,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    opacity: loadingMore ? 0.7 : 1,
                  },
                ]}
              >
                <Text style={[styles.loadMoreText, { color: colors.primary }]}>
                  {loadingMore ? "Loading more..." : "Load More"}
                </Text>
              </Pressable>
            </View>
          ) : null
        }
        contentContainerStyle={[
          styles.list,
          {
            paddingHorizontal: layout.horizontalPadding,
            paddingTop: spacing.md,
            paddingBottom: spacing.xxxl,
          },
          !notes.length && styles.listEmpty,
        ]}
        renderItem={({ item }) => (
          <View
            style={[
              styles.cardWrap,
              {
                maxWidth: layout.contentMaxWidth,
              },
            ]}
          >
            <FileResourceCard
              resourceId={item._id}
              title={item.title}
              subtitle={item.type}
              fileUrl={item.fileUrl}
              fileName={item.fileName}
              fileSize={item.fileSize}
              mimeType={item.mimeType}
              uploadedAt={item.uploadedAt}
              onOpen={() => handleOpen(item)}
              onDownload={() => handleDownload(item)}
              downloading={downloadingId === item._id}
              downloadProgress={downloadProgress[item._id] || 0}
            />
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  screen: {
    flex: 1,
    alignItems: "center",
  },
  container: {
    width: "100%",
  },
  headerStack: {
    width: "100%",
    gap: spacing.xl,
    marginBottom: spacing.md,
    alignSelf: "center",
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  heroTop: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "flex-start",
  },
  heroTopStacked: {
    flexDirection: "column",
  },
  heroIconWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTextWrap: {
    flex: 1,
    gap: spacing.xxs,
  },
  heroEyebrow: {
    fontSize: typography.sm,
    fontWeight: fontWeights.bold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: typography.xxl,
    fontWeight: fontWeights.bold,
    lineHeight: 30,
  },
  heroSubtitle: {
    fontSize: typography.base,
    fontWeight: fontWeights.medium,
    lineHeight: 22,
  },
  metricsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  metricsRowStacked: {
    flexWrap: "wrap",
  },
  metricsRowSingleColumn: {
    flexDirection: "column",
  },
  metricCard: {
    flex: 1,
    minWidth: 92,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xxs,
  },
  metricValue: {
    fontSize: typography.xl,
    fontWeight: fontWeights.bold,
  },
  metricLabel: {
    fontSize: typography.sm,
    fontWeight: fontWeights.medium,
  },
  skeletonList: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  list: {
    flexGrow: 1,
    width: "100%",
  },
  listEmpty: {
    justifyContent: "center",
  },
  cardWrap: {
    width: "100%",
    marginBottom: spacing.md,
    alignSelf: "center",
  },
  footerWrap: {
    width: "100%",
    alignSelf: "center",
    alignItems: "center",
    marginTop: spacing.sm,
  },
  loadMoreButton: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  loadMoreText: {
    fontSize: typography.md,
    fontWeight: fontWeights.bold,
  },
  loadMoreError: {
    fontSize: typography.sm,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
});
