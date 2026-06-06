import { useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { fontWeights, radius, shadows, spacing, typography, useAppTheme } from "../utils/theme";
import StatBadge from "./StatBadge";

export default function QuestionCard({ question, onPress, style, showContext }) {
  const { colors } = useAppTheme();
  const scale = useRef(new Animated.Value(1)).current;
  const isHighFrequency = Number(question.frequency) > 3;
  const appearedText = Array.isArray(question.yearAppeared) ? question.yearAppeared.length : 0;

  const animateScale = (toValue) => {
    Animated.timing(scale, {
      toValue,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        onPress={() => onPress?.(question)}
        onPressIn={() => animateScale(0.97)}
        onPressOut={() => animateScale(1)}
        style={[
          styles.card,
          shadows.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.topRow}>
          <View style={styles.badgesRow}>
            <StatBadge label={question.markCategory || "Question"} color="primary" />
            {Number(question.frequency) > 0 ? (
              <StatBadge
                label={`${isHighFrequency ? "🔥 " : ""}${question.frequency}x`}
                color={isHighFrequency ? "accent" : "success"}
              />
            ) : null}
          </View>
          <View style={[styles.chevronWrap, { backgroundColor: colors.surfaceSecondary }]}>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </View>
        </View>

        <Text numberOfLines={3} style={[styles.questionText, { color: colors.text }]}>
          {question.questionText}
        </Text>

        {appearedText > 0 ? (
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={14} color={colors.textTertiary} />
            <Text style={[styles.metaText, { color: colors.textTertiary }]}>
              Appeared in {appearedText} exam{appearedText === 1 ? "" : "s"}
            </Text>
          </View>
        ) : null}

        {showContext ? (
          <View style={styles.contextRow}>
            <Ionicons name="library-outline" size={14} color={colors.textSecondary} />
            <Text numberOfLines={1} style={[styles.contextText, { color: colors.textSecondary }]}>
              {[question.subjectName, question.moduleTitle].filter(Boolean).join(" • ")}
            </Text>
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  badgesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flexWrap: "wrap",
    flex: 1,
    marginRight: spacing.sm,
  },
  chevronWrap: {
    width: 30,
    height: 30,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  questionText: {
    fontSize: typography.base,
    fontWeight: fontWeights.bold,
    lineHeight: 24,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xxs,
    marginTop: spacing.sm,
  },
  metaText: {
    fontSize: typography.sm,
    fontWeight: fontWeights.medium,
  },
  contextRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xxs,
    marginTop: spacing.sm,
  },
  contextText: {
    fontSize: typography.md,
    fontWeight: fontWeights.medium,
    flex: 1,
  },
});
