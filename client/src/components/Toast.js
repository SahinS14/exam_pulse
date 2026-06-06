import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { fontWeights, radius, shadows, spacing, typography, useAppTheme } from "../utils/theme";

const TYPE_CONFIG = {
  success: { icon: "checkmark-circle", colorKey: "success" },
  error: { icon: "alert-circle", colorKey: "danger" },
  info: { icon: "information-circle", colorKey: "primary" },
};

export default function Toast({ message, type = "info" }) {
  const { colors } = useAppTheme();
  const translateY = useRef(new Animated.Value(80)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!message) {
      return undefined;
    }

    const show = Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]);

    const hide = Animated.parallel([
      Animated.timing(translateY, {
        toValue: 80,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]);

    show.start();
    const timeoutId = setTimeout(() => hide.start(), 2000);
    return () => clearTimeout(timeoutId);
  }, [message, opacity, translateY]);

  if (!message) {
    return null;
  }

  const config = TYPE_CONFIG[type] || TYPE_CONFIG.info;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.container,
        shadows.modal,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <Ionicons name={config.icon} size={20} color={colors[config.colorKey]} />
      <Text style={[styles.message, { color: colors.text }]}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  message: {
    flex: 1,
    fontSize: typography.md,
    fontWeight: fontWeights.medium,
  },
});
