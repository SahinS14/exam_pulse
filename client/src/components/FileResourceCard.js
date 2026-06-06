import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  formatFileDate,
  formatFileSize,
  getFileBadgeLabel,
  isPdfFile,
} from "../utils/fileResources";
import {
  fontWeights,
  radius,
  shadows,
  spacing,
  typography,
  useAppTheme,
} from "../utils/theme";
import { useResponsiveLayout } from "../utils/layout";

function getFileVisuals({ url, mimeType, fileName, colors, isDark }) {
  const pdf = isPdfFile({ url, mimeType, fileName });

  if (pdf) {
    return {
      icon: "document-text-outline",
      iconColor: colors.danger,
      iconBackground: isDark ? "#3B1F26" : colors.dangerLight,
      badgeBackground: isDark ? "#402024" : "#FFF1F2",
      badgeText: isDark ? "#FCA5A5" : "#B91C1C",
    };
  }

  return {
    icon: "image-outline",
    iconColor: colors.primary,
    iconBackground: isDark ? "#222C51" : colors.primaryLight,
    badgeBackground: isDark ? "#202B4A" : "#EEF4FF",
    badgeText: isDark ? "#C7D2FE" : colors.primaryDark,
  };
}

export default function FileResourceCard({
  resourceId,
  title,
  subtitle,
  fileUrl,
  fileName,
  fileSize,
  mimeType,
  uploadedAt,
  onOpen,
  onDownload,
  downloadProgress = 0,
  downloading = false,
}) {
  const { colors, isDark } = useAppTheme();
  const layout = useResponsiveLayout();
  const badgeLabel = getFileBadgeLabel({ url: fileUrl, mimeType, fileName });
  const visuals = getFileVisuals({ url: fileUrl, mimeType, fileName, colors, isDark });
  const compactLayout = layout.width < 380;

  return (
    <View
      style={[
        styles.card,
        shadows.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.borderLight,
        },
      ]}
    >
      <View style={styles.topRow}>
        <View style={[styles.iconWrap, { backgroundColor: visuals.iconBackground }]}>
          <Ionicons name={visuals.icon} size={28} color={visuals.iconColor} />
        </View>

        <View style={styles.contentWrap}>
          <View style={[styles.titleRow, compactLayout && styles.titleRowStacked]}>
            <View style={styles.titleGroup}>
              <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
                {title}
              </Text>
              {subtitle ? (
                <Text
                  style={[styles.subtitle, { color: colors.textSecondary }]}
                  numberOfLines={1}
                >
                  {subtitle}
                </Text>
              ) : null}
            </View>

            <View
              style={[
                styles.badge,
                {
                  backgroundColor: visuals.badgeBackground,
                },
              ]}
            >
              <Text style={[styles.badgeText, { color: visuals.badgeText }]}>{badgeLabel}</Text>
            </View>
          </View>

          <View style={styles.metaWrap}>
            <View
              style={[
                styles.metaPill,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.borderLight,
                },
              ]}
            >
              <Ionicons name="folder-open-outline" size={13} color={colors.textTertiary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {formatFileSize(fileSize)}
              </Text>
            </View>

            <View
              style={[
                styles.metaPill,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.borderLight,
                },
              ]}
            >
              <Ionicons name="time-outline" size={13} color={colors.textTertiary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {formatFileDate(uploadedAt, resourceId)}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {downloading ? (
        <View style={styles.progressBlock}>
          <View style={styles.progressLabelRow}>
            <Text style={[styles.progressLabel, { color: colors.primary }]}>Downloading</Text>
            <Text style={[styles.progressValue, { color: colors.primary }]}>
              {Math.round(downloadProgress * 100)}%
            </Text>
          </View>
          <View
            style={[
              styles.progressTrack,
              { backgroundColor: isDark ? colors.border : colors.primaryLight },
            ]}
          >
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.max(4, Math.round(downloadProgress * 100))}%`,
                  backgroundColor: colors.primary,
                },
              ]}
            />
          </View>
        </View>
      ) : null}

      <View style={[styles.actionRow, compactLayout && styles.actionRowStacked]}>
        <Pressable
          onPress={onOpen}
          style={({ pressed }) => [
            styles.secondaryButton,
            {
              backgroundColor: colors.surfaceSecondary,
              borderColor: colors.border,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            },
          ]}
        >
          <Ionicons name="open-outline" size={18} color={colors.text} />
          <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Open</Text>
        </Pressable>

        <Pressable
          onPress={onDownload}
          disabled={downloading}
          style={({ pressed }) => [
            styles.primaryButton,
            {
              backgroundColor: colors.primary,
              opacity: downloading ? 0.75 : 1,
              transform: [{ scale: pressed && !downloading ? 0.98 : 1 }],
            },
          ]}
        >
          <Ionicons name="download-outline" size={18} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>
            {downloading ? "Downloading..." : "Download"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  contentWrap: {
    flex: 1,
    gap: spacing.sm,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  titleRowStacked: {
    flexDirection: "column",
  },
  titleGroup: {
    flex: 1,
    gap: spacing.xxs,
  },
  title: {
    fontSize: typography.lg,
    fontWeight: fontWeights.bold,
    lineHeight: 24,
  },
  subtitle: {
    fontSize: typography.md,
    fontWeight: fontWeights.medium,
  },
  badge: {
    minWidth: 52,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: typography.xs,
    fontWeight: fontWeights.extrabold,
    letterSpacing: 0.4,
  },
  metaWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xxs,
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  metaText: {
    fontSize: typography.sm,
    fontWeight: fontWeights.medium,
  },
  progressBlock: {
    gap: spacing.xs,
  },
  progressLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressLabel: {
    fontSize: typography.sm,
    fontWeight: fontWeights.semibold,
  },
  progressValue: {
    fontSize: typography.sm,
    fontWeight: fontWeights.bold,
  },
  progressTrack: {
    height: 6,
    borderRadius: radius.full,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: radius.full,
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  actionRowStacked: {
    flexDirection: "column",
  },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  secondaryButtonText: {
    fontSize: typography.base,
    fontWeight: fontWeights.semibold,
  },
  primaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: typography.base,
    fontWeight: fontWeights.bold,
  },
});
