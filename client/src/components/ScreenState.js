import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { useResponsiveLayout } from "../utils/layout";
import { useAppTheme } from "../utils/theme";

export function LoadingState({ label = "Loading..." }) {
  const { colors } = useAppTheme();
  const layout = useResponsiveLayout();

  return (
    <View style={[styles.center, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text
        style={[
          styles.caption,
          { color: colors.subtext, maxWidth: layout.formMaxWidth },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

export function EmptyState({ title, subtitle }) {
  const { colors } = useAppTheme();
  const layout = useResponsiveLayout();

  return (
    <View style={[styles.center, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text, maxWidth: layout.formMaxWidth }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.caption, { color: colors.subtext, maxWidth: layout.formMaxWidth }]}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

export function ErrorState({ title = "Something went wrong", subtitle, onRetry }) {
  const { colors } = useAppTheme();
  const layout = useResponsiveLayout();

  return (
    <View style={[styles.center, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text, maxWidth: layout.formMaxWidth }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.caption, { color: colors.subtext, maxWidth: layout.formMaxWidth }]}>
          {subtitle}
        </Text>
      ) : null}
      {onRetry ? (
        <Pressable
          onPress={onRetry}
          style={[styles.button, { backgroundColor: colors.primary }]}
        >
          <Text style={[styles.buttonText, { color: colors.primaryText }]}>Retry</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#18304b",
    textAlign: "center",
  },
  caption: {
    marginTop: 10,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  button: {
    marginTop: 18,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  buttonText: {
    fontWeight: "700",
  },
});
