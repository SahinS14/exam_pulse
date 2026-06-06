import { SafeAreaView, StyleSheet, View } from "react-native";

import { useResponsiveLayout } from "../utils/layout";
import { radius, spacing, useAppTheme } from "../utils/theme";
import SkeletonLoader from "./SkeletonLoader";

export default function PageSkeleton({
  titleWidth = "42%",
  subtitleWidth = "68%",
  heroHeight = 0,
  withSearchBar = false,
  withChips = false,
  rows = 4,
  rowHeight = 96,
}) {
  const { colors } = useAppTheme();
  const layout = useResponsiveLayout();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.screen,
          {
            paddingHorizontal: layout.horizontalPadding,
            paddingTop: spacing.md,
          },
        ]}
      >
        <View style={[styles.container, { maxWidth: layout.contentMaxWidth }]}>
          <SkeletonLoader height={30} width={titleWidth} borderRadius={radius.md} />
          <SkeletonLoader
            height={18}
            width={subtitleWidth}
            borderRadius={radius.md}
            style={{ marginTop: spacing.xs }}
          />

          {withSearchBar ? (
            <SkeletonLoader
              height={56}
              width="100%"
              borderRadius={radius.xl}
              style={{ marginTop: spacing.lg }}
            />
          ) : null}

          {heroHeight ? (
            <SkeletonLoader
              height={heroHeight}
              width="100%"
              borderRadius={radius.xl}
              style={{ marginTop: spacing.lg }}
            />
          ) : null}

          {withChips ? (
            <View style={styles.chipRow}>
              {[0, 1, 2, 3].map((item) => (
                <SkeletonLoader
                  key={item}
                  height={38}
                  width={84}
                  borderRadius={radius.full}
                />
              ))}
            </View>
          ) : null}

          <View style={styles.listWrap}>
            {Array.from({ length: rows }).map((_, index) => (
              <SkeletonLoader
                key={`${rowHeight}-${index}`}
                height={rowHeight}
                width="100%"
                borderRadius={radius.xl}
                style={{ marginBottom: index === rows - 1 ? 0 : spacing.md }}
              />
            ))}
          </View>
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
    alignItems: "center",
  },
  container: {
    width: "100%",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  listWrap: {
    marginTop: spacing.lg,
  },
});
