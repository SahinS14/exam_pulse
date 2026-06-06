import { useState } from "react";
import { Linking, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";

import EmptyState from "../components/EmptyState";
import SkeletonLoader from "../components/SkeletonLoader";
import {
  fontWeights,
  radius,
  shadows,
  spacing,
  typography,
  useAppTheme,
} from "../utils/theme";

function ViewerLoading({ colors }) {
  return (
    <View style={styles.loadingWrap}>
      <SkeletonLoader height={22} width="36%" borderRadius={radius.md} />
      <SkeletonLoader
        height={16}
        width="62%"
        borderRadius={radius.md}
        style={{ marginTop: spacing.xs }}
      />
      <SkeletonLoader
        height={420}
        width="100%"
        borderRadius={radius.xl}
        style={{ marginTop: spacing.lg }}
      />
      <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
        Preparing file preview...
      </Text>
    </View>
  );
}

export default function WebViewerScreen({ route }) {
  const { colors } = useAppTheme();
  const { url, title, subtitle } = route.params || {};
  const normalizedUrl = typeof url === "string" ? url.trim() : "";
  const [hasError, setHasError] = useState(false);
  const resolvedTitle = title || "Preview";
  const resolvedSubtitle = subtitle || "Study resource preview";

  const hostLabel = normalizedUrl
    ? normalizedUrl.replace(/^https?:\/\//i, "").split("/")[0] || ""
    : "";

  if (!normalizedUrl) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <EmptyState title="No file available" subtitle="The requested file is missing." />
      </SafeAreaView>
    );
  }

  if (hasError) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.errorWrap}>
          <EmptyState
            icon="open-outline"
            title="Preview unavailable"
            subtitle="This file could not be rendered inside the app. Try opening it directly."
            ctaLabel="Open Externally"
            onCta={() => Linking.openURL(normalizedUrl)}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.screen}>
        <View
          style={[
            styles.headerCard,
            shadows.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderLight,
            },
          ]}
        >
          <View style={styles.headerTextWrap}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {resolvedTitle}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
              {resolvedSubtitle}
            </Text>
          </View>

          <Pressable
            onPress={() => Linking.openURL(normalizedUrl)}
            style={({ pressed }) => [
              styles.externalButton,
              {
                backgroundColor: colors.surfaceSecondary,
                borderColor: colors.border,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            <Ionicons name="open-outline" size={18} color={colors.text} />
          </Pressable>
        </View>

        {hostLabel ? (
          <View style={styles.metaRow}>
            <Ionicons name="globe-outline" size={14} color={colors.textTertiary} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]} numberOfLines={1}>
              {hostLabel}
            </Text>
          </View>
        ) : null}

        <View
          style={[
            styles.viewerShell,
            shadows.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderLight,
            },
          ]}
        >
          <WebView
            originWhitelist={["*"]}
            setSupportMultipleWindows={false}
            source={{ uri: normalizedUrl }}
            startInLoadingState
            renderLoading={() => <ViewerLoading colors={colors} />}
            onError={() => setHasError(true)}
            onHttpError={() => setHasError(true)}
            style={styles.webview}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  screen: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  headerCard: {
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  headerTextWrap: {
    flex: 1,
    gap: spacing.xxs,
  },
  title: {
    fontSize: typography.lg,
    fontWeight: fontWeights.bold,
  },
  subtitle: {
    fontSize: typography.sm,
    fontWeight: fontWeights.medium,
  },
  externalButton: {
    width: 42,
    height: 42,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xxs,
    paddingHorizontal: spacing.xs,
  },
  metaText: {
    flex: 1,
    fontSize: typography.sm,
    fontWeight: fontWeights.medium,
  },
  viewerShell: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.xl,
    overflow: "hidden",
  },
  webview: {
    flex: 1,
    backgroundColor: "transparent",
  },
  loadingWrap: {
    flex: 1,
    padding: spacing.lg,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.sm,
    fontWeight: fontWeights.medium,
  },
  errorWrap: {
    flex: 1,
    justifyContent: "center",
  },
});
