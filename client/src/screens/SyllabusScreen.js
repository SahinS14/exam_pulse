import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { getSyllabus } from "../api/content";
import EmptyState from "../components/EmptyState";
import FileResourceCard from "../components/FileResourceCard";
import SkeletonLoader from "../components/SkeletonLoader";
import { ErrorState } from "../components/ScreenState";
import {
  downloadAndOpenFile,
  isPdfFile,
  openPdfExternally,
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

function SyllabusSkeleton({ colors, layout }) {
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
          <SkeletonLoader height={28} width="42%" borderRadius={radius.md} />
          <SkeletonLoader
            height={18}
            width="64%"
            borderRadius={radius.md}
            style={{ marginTop: spacing.xs }}
          />
          <SkeletonLoader
            height={148}
            width="100%"
            borderRadius={radius.xl}
            style={{ marginTop: spacing.xl }}
          />
          <SkeletonLoader
            height={176}
            width="100%"
            borderRadius={radius.xl}
            style={{ marginTop: spacing.lg }}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

export default function SyllabusScreen({ navigation, route }) {
  const { colors } = useAppTheme();
  const layout = useResponsiveLayout();
  const { subject } = route.params;
  const [syllabus, setSyllabus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const compactLayout = layout.width < 390;

  const loadSyllabus = useCallback(() => {
    let mounted = true;

    const run = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await getSyllabus(subject._id);

        if (mounted) {
          setSyllabus(data);
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError.response?.data?.message || "Failed to load syllabus.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    run();

    return () => {
      mounted = false;
    };
  }, [subject._id]);

  useEffect(() => loadSyllabus(), [loadSyllabus]);

  const syllabusIsPdf = useMemo(
    () =>
      isPdfFile({
        url: syllabus?.syllabusFileUrl,
        mimeType: syllabus?.syllabusMimeType,
        fileName: syllabus?.syllabusFileName,
      }),
    [syllabus]
  );

  if (loading) {
    return <SyllabusSkeleton colors={colors} layout={layout} />;
  }

  if (error) {
    return (
      <ErrorState
        title="Unable to load syllabus"
        subtitle={error}
        onRetry={loadSyllabus}
      />
    );
  }

  if (!syllabus?.syllabusFileUrl) {
    return (
      <EmptyState
        icon="library-outline"
        title="No syllabus available"
        subtitle="The subject syllabus has not been uploaded yet."
      />
    );
  }

  const handleOpen = async () => {
    try {
      if (syllabusIsPdf) {
        await openPdfExternally(syllabus.syllabusFileUrl);
        return;
      }

      navigation.navigate("WebViewer", {
        title: `${subject.name} Syllabus`,
        subtitle: "Subject reference file",
        url: syllabus.syllabusFileUrl,
      });
    } catch (openError) {
      Alert.alert("Open failed", "Unable to open this syllabus file right now.");
    }
  };

  const handleDownload = async () => {
    try {
      setDownloading(true);
      setDownloadProgress(0);
      await downloadAndOpenFile({
        url: syllabus.syllabusFileUrl,
        fileName: syllabus.syllabusFileName || `${subject.name}-syllabus`,
        mimeType: syllabus.syllabusMimeType,
        onProgress: setDownloadProgress,
      });
    } catch (downloadError) {
      Alert.alert("Download failed", "Unable to download this syllabus file right now.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.screen,
          {
            paddingHorizontal: layout.horizontalPadding,
            paddingTop: spacing.md,
            paddingBottom: spacing.xxxl,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.container, { maxWidth: layout.contentMaxWidth }]}>
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
                  {
                    backgroundColor: syllabusIsPdf ? colors.dangerLight : colors.primaryLight,
                  },
                ]}
              >
                <Ionicons
                  name={syllabusIsPdf ? "library-outline" : "image-outline"}
                  size={28}
                  color={syllabusIsPdf ? colors.danger : colors.primary}
                />
              </View>

              <View style={styles.heroTextWrap}>
                <Text style={[styles.heroEyebrow, { color: colors.primary }]}>
                  Official Syllabus
                </Text>
                <Text style={[styles.heroTitle, { color: colors.text }]} numberOfLines={2}>
                  {subject.name}
                </Text>
                <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
                  Keep the latest syllabus ready while studying this subject.
                </Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View
                style={[
                  styles.infoPill,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.borderLight,
                  },
                ]}
              >
                <Ionicons
                  name={syllabusIsPdf ? "document-text-outline" : "images-outline"}
                  size={14}
                  color={colors.textTertiary}
                />
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                  {syllabusIsPdf ? "PDF document" : "Image document"}
                </Text>
              </View>
              <View
                style={[
                  styles.infoPill,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.borderLight,
                  },
                ]}
              >
                <Ionicons name="school-outline" size={14} color={colors.textTertiary} />
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                  Semester reference
                </Text>
              </View>
            </View>
          </View>

          <FileResourceCard
            resourceId={null}
            title={`${subject.name} Syllabus`}
            subtitle="Official subject syllabus"
            fileUrl={syllabus.syllabusFileUrl}
            fileName={syllabus.syllabusFileName}
            fileSize={syllabus.syllabusFileSize}
            mimeType={syllabus.syllabusMimeType}
            uploadedAt={syllabus.syllabusUploadedAt}
            onOpen={handleOpen}
            onDownload={handleDownload}
            downloading={downloading}
            downloadProgress={downloadProgress}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  screen: {
    alignItems: "center",
  },
  container: {
    width: "100%",
    gap: spacing.lg,
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
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
  infoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  infoPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xxs,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  infoText: {
    fontSize: typography.sm,
    fontWeight: fontWeights.medium,
  },
});
