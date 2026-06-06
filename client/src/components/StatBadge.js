import { StyleSheet, Text, View } from "react-native";

import { fontWeights, radius, spacing, typography, useAppTheme } from "../utils/theme";

const COLOR_MAP = {
  primary: {
    backgroundKey: "primaryLight",
    textKey: "primary",
  },
  accent: {
    backgroundKey: "accentLight",
    textKey: "accent",
  },
  success: {
    backgroundKey: "successLight",
    textKey: "success",
  },
  danger: {
    backgroundKey: "dangerLight",
    textKey: "danger",
  },
  warning: {
    backgroundKey: "accentLight",
    textKey: "warning",
  },
};

export default function StatBadge({ label, color = "primary", style }) {
  const { colors } = useAppTheme();
  const palette = COLOR_MAP[color] || COLOR_MAP.primary;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: colors[palette.backgroundKey],
        },
        style,
      ]}
    >
      <Text style={[styles.label, { color: colors[palette.textKey] }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  label: {
    fontSize: typography.sm,
    fontWeight: fontWeights.semibold,
  },
});
