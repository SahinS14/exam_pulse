import { Pressable, StyleSheet, Text, View } from "react-native";

import { useResponsiveLayout } from "../utils/layout";
import { useAppTheme } from "../utils/theme";
import {
  formatFileDate,
  formatFileSize,
  getFileBadgeLabel,
} from "../utils/fileResources";

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
  const { colors } = useAppTheme();
  const layout = useResponsiveLayout();
  const badgeLabel = getFileBadgeLabel({ url: fileUrl, mimeType, fileName });

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: colors.cardMuted }]}>
          <Text style={[styles.badgeText, { color: colors.primary }]}>{badgeLabel}</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: colors.subtext }]}>{subtitle}</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.metaRow}>
        <Text style={[styles.metaText, { color: colors.subtext }]}>
          Size: {formatFileSize(fileSize)}
        </Text>
        <Text style={[styles.metaText, { color: colors.subtext }]}>
          Uploaded: {formatFileDate(uploadedAt, resourceId)}
        </Text>
      </View>

      {downloading ? (
        <Text style={[styles.progressText, { color: colors.primary }]}>
          Downloading... {Math.round(downloadProgress * 100)}%
        </Text>
      ) : null}

      <View style={[styles.actionRow, layout.wideActionRow && styles.actionRowWide]}>
        <Pressable
          onPress={onOpen}
          style={[
            styles.secondaryButton,
            layout.wideActionRow ? styles.inlineButton : styles.stackedButton,
            { borderColor: colors.border },
          ]}
        >
          <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Open</Text>
        </Pressable>
        <Pressable
          onPress={onDownload}
          disabled={downloading}
          style={[
            styles.primaryButton,
            layout.wideActionRow ? styles.inlineButton : styles.stackedButton,
            { backgroundColor: colors.primary },
            downloading && styles.buttonDisabled,
          ]}
        >
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
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  badge: {
    minWidth: 52,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  badgeText: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  metaRow: {
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    fontWeight: "600",
  },
  progressText: {
    fontSize: 13,
    fontWeight: "700",
  },
  actionRow: {
    gap: 10,
  },
  actionRowWide: {
    flexDirection: "row",
  },
  inlineButton: {
    flex: 1,
  },
  stackedButton: {
    width: "100%",
  },
  primaryButton: {
    borderRadius: 12,
    alignItems: "center",
    paddingVertical: 13,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  secondaryButton: {
    borderWidth: 1,
    borderRadius: 12,
    alignItems: "center",
    paddingVertical: 13,
    backgroundColor: "#ffffff",
  },
  secondaryButtonText: {
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
