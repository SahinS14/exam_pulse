import { Image, StyleSheet, Text, View } from "react-native";

import { fontWeights, spacing, typography, useAppTheme } from "../utils/theme";

const logoSource = require("../../assets/images/exampulse.png");

export default function AppBrandHeader({
  style,
  textColor,
  examTextColor,
  pulseTextColor,
  logoSize = 64,
  textSize = typography.lg,
  marginTop = spacing.sm,
  marginBottom = spacing.md,
}) {
  const { colors } = useAppTheme();
  const primaryTextColor = textColor || examTextColor || colors.primaryDark;
  const accentTextColor = textColor || pulseTextColor || colors.accent;

  return (
    <View style={[styles.row, { marginTop, marginBottom }, style]}>
      <View
        style={[
          styles.logoViewport,
          {
            width: logoSize,
            height: logoSize,
            borderRadius: Math.round(logoSize * 0.24),
          },
        ]}
      >
        <Image
          source={logoSource}
          style={[
            styles.logoImage,
            {
              width: logoSize * 1.95,
              height: logoSize * 1.3,
              left: -logoSize * 0.47,
              top: -logoSize * 0.13,
            },
          ]}
          resizeMode="contain"
        />
      </View>
      <Text style={[styles.text, { fontSize: textSize }]}>
        <Text style={{ color: primaryTextColor }}>Exam</Text>
        <Text style={{ color: accentTextColor }}>Pulse</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoViewport: {
    overflow: "hidden",
    marginRight: spacing.xs,
    backgroundColor: "transparent",
  },
  logoImage: {
    position: "absolute",
  },
  text: {
    fontWeight: fontWeights.bold,
    letterSpacing: 0.1,
  },
});
