import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { radius, useAppTheme } from "../utils/theme";

const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);

export default function SkeletonLoader({
  width = "100%",
  height = 16,
  borderRadius = radius.md,
  style,
}) {
  const { isDark } = useAppTheme();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 1300,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    loop.start();
    return () => loop.stop();
  }, [progress]);

  const shimmerWidth = typeof width === "number" ? Math.max(width * 0.45, 80) : 140;
  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-shimmerWidth, shimmerWidth * 2],
  });

  const baseColor = isDark ? "#1B243A" : "#E5E7EB";
  const highlightColor = isDark ? "#27324A" : "#F3F4F6";
  const shellStyle = useMemo(
    () => [
      styles.shell,
      {
        width,
        height,
        borderRadius,
        backgroundColor: baseColor,
      },
      style,
    ],
    [width, height, borderRadius, baseColor, style]
  );

  return (
    <View style={shellStyle}>
      <AnimatedGradient
        colors={[baseColor, highlightColor, baseColor]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[
          styles.shimmer,
          {
            width: shimmerWidth,
            transform: [{ translateX }],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    overflow: "hidden",
  },
  shimmer: {
    ...StyleSheet.absoluteFillObject,
  },
});
