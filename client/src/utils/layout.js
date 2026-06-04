import { useWindowDimensions } from "react-native";

export function useResponsiveLayout() {
  const { width, height } = useWindowDimensions();

  const isSmallPhone = width < 360;
  const isTablet = width >= 768;
  const isLargeTablet = width >= 1024;
  const horizontalPadding = isTablet ? 28 : isSmallPhone ? 14 : 18;
  const sectionGap = isTablet ? 18 : 12;
  const contentMaxWidth = isLargeTablet ? 1080 : isTablet ? 920 : 680;
  const formMaxWidth = isTablet ? 540 : 480;
  const listColumns = width >= 860 ? 2 : 1;
  const wideActionRow = width >= 640;
  const heroTitleSize = isTablet ? 38 : isSmallPhone ? 28 : 34;
  const bodyFontSize = isTablet ? 16 : 15;
  const imagePreviewWidth = Math.min(
    Math.max(width - horizontalPadding * 2 - 24, 220),
    isTablet ? 420 : 340
  );

  return {
    width,
    height,
    isSmallPhone,
    isTablet,
    isLargeTablet,
    horizontalPadding,
    sectionGap,
    contentMaxWidth,
    formMaxWidth,
    listColumns,
    wideActionRow,
    heroTitleSize,
    bodyFontSize,
    imagePreviewWidth,
  };
}
