import { Pressable, StyleSheet, Text, View } from "react-native";

import { fontWeights, spacing, typography, useAppTheme } from "../utils/theme";

export default function SectionHeader({ title, actionLabel, onAction }) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.row}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction}>
          <Text style={[styles.action, { color: colors.primary }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: typography.xl,
    fontWeight: fontWeights.bold,
    flex: 1,
    marginRight: spacing.sm,
  },
  action: {
    fontSize: typography.sm,
    fontWeight: fontWeights.semibold,
  },
});
