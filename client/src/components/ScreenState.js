import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { radius, spacing, typography, useAppTheme } from "../utils/theme";
import EmptyState from "./EmptyState";
import SkeletonLoader from "./SkeletonLoader";

export { default as EmptyState } from "./EmptyState";

export function LoadingState({
  label = "Loading...",
  rows = 3,
  itemHeight = 80,
  withHero = false,
}) {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.loadingWrap}>
        {withHero ? (
          <SkeletonLoader
            height={140}
            borderRadius={20}
            style={{ marginBottom: spacing.lg }}
          />
        ) : null}
        {Array.from({ length: rows }).map((_, index) => (
          <SkeletonLoader
            key={`${label}-${index}`}
            height={itemHeight}
            borderRadius={16}
            style={{ marginBottom: index === rows - 1 ? 0 : spacing.md }}
          />
        ))}
        <Text style={[styles.loadingLabel, { color: colors.textSecondary }]}>{label}</Text>
      </View>
    </View>
  );
}

export function ErrorState({ title = "Something went wrong", subtitle, onRetry }) {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.errorWrap}>
        <View style={[styles.errorIconWrap, { backgroundColor: colors.dangerLight }]}>
          <Ionicons name="alert-circle-outline" size={32} color={colors.danger} />
        </View>
        <Text style={[styles.errorTitle, { color: colors.text }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.errorSubtitle, { color: colors.textSecondary }]}>
            {subtitle}
          </Text>
        ) : null}
        {onRetry ? (
          <Pressable
            onPress={onRetry}
            style={({ pressed }) => [
              styles.retryButton,
              { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.md,
    justifyContent: "center",
  },
  loadingWrap: {
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
  },
  loadingLabel: {
    marginTop: spacing.lg,
    textAlign: "center",
    fontSize: typography.md,
  },
  errorWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  errorIconWrap: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  errorTitle: {
    fontSize: typography.xxl,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  errorSubtitle: {
    fontSize: typography.base,
    lineHeight: 24,
    textAlign: "center",
    maxWidth: 320,
  },
  retryButton: {
    marginTop: spacing.lg,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  retryText: {
    color: "#FFFFFF",
    fontSize: typography.base,
    fontWeight: "600",
  },
});
