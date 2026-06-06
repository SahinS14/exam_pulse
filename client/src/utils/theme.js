import { useColorScheme } from "react-native";
import * as SecureStore from "expo-secure-store";
import { DarkTheme, DefaultTheme } from "@react-navigation/native";
import { create } from "zustand";

const THEME_MODE_KEY = "appThemeMode";

export const typography = {
  xs: 11,
  sm: 12,
  md: 13,
  base: 15,
  lg: 16,
  xl: 18,
  xxl: 21,
  xxxl: 26,
  display: 31,
};

export const fontWeights = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
  extrabold: "800",
};

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  giant: 48,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const shadows = {
  card: {
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  modal: {
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
};

const lightPalette = {
  primary: "#4F46E5",
  primaryLight: "#EEF2FF",
  primaryDark: "#3730A3",
  accent: "#F59E0B",
  accentLight: "#FEF3C7",
  success: "#10B981",
  successLight: "#D1FAE5",
  danger: "#EF4444",
  dangerLight: "#FEE2E2",
  warning: "#F59E0B",
  background: "#F5F7FF",
  surface: "#FFFFFF",
  surfaceSecondary: "#F9FAFB",
  text: "#111827",
  textSecondary: "#6B7280",
  textTertiary: "#9CA3AF",
  border: "#E5E7EB",
  borderLight: "#F3F4F6",
};

const darkPalette = {
  primary: "#7C83FF",
  primaryLight: "#252B5A",
  primaryDark: "#B9BEFF",
  accent: "#FBBF24",
  accentLight: "#493718",
  success: "#34D399",
  successLight: "#163529",
  danger: "#F87171",
  dangerLight: "#402024",
  warning: "#FBBF24",
  background: "#0B1020",
  surface: "#131A2E",
  surfaceSecondary: "#1B243A",
  text: "#F9FAFB",
  textSecondary: "#A8B0C5",
  textTertiary: "#7F89A3",
  border: "#27324A",
  borderLight: "#1D263C",
};

const mapLegacyAliases = (palette, isDark) => ({
  ...palette,
  card: palette.surface,
  cardMuted: palette.surfaceSecondary,
  primaryText: "#FFFFFF",
  subtext: palette.textSecondary,
  warningBg: isDark ? "#3F3014" : palette.accentLight,
  warningText: isDark ? "#FCD34D" : "#92400E",
  dangerBg: isDark ? "#442129" : palette.dangerLight,
  dangerText: isDark ? "#FCA5A5" : "#B91C1C",
  overlay: isDark ? "rgba(2, 6, 23, 0.7)" : "rgba(15, 23, 42, 0.45)",
  shadow: "#000000",
  surfaceSoft: palette.surfaceSecondary,
  successBg: isDark ? "#153729" : palette.successLight,
  successText: isDark ? "#86EFAC" : "#047857",
  softHighlight: isDark ? "#1A2540" : palette.primaryLight,
});

const lightColors = mapLegacyAliases(lightPalette, false);
const darkColors = mapLegacyAliases(darkPalette, true);

const persistMode = async (mode) => {
  if (!mode) {
    await SecureStore.deleteItemAsync(THEME_MODE_KEY);
    return;
  }

  await SecureStore.setItemAsync(THEME_MODE_KEY, mode);
};

export const useThemePreferenceStore = create((set, get) => ({
  mode: null,
  hydrated: false,
  hydrateThemePreference: async () => {
    try {
      const storedMode = await SecureStore.getItemAsync(THEME_MODE_KEY);

      set({
        mode: storedMode === "light" || storedMode === "dark" ? storedMode : null,
        hydrated: true,
      });
    } catch (error) {
      set({ mode: null, hydrated: true });
    }
  },
  setThemeMode: async (mode) => {
    const nextMode = mode === "light" || mode === "dark" ? mode : null;
    await persistMode(nextMode);
    set({ mode: nextMode });
  },
  toggleThemeMode: async (systemScheme) => {
    const currentMode = get().mode;
    const resolvedMode = currentMode || (systemScheme === "dark" ? "dark" : "light");
    const nextMode = resolvedMode === "dark" ? "light" : "dark";

    await persistMode(nextMode);
    set({ mode: nextMode });
  },
}));

export const buildNavigationTheme = (isDark) => {
  const base = isDark ? DarkTheme : DefaultTheme;
  const colors = isDark ? darkColors : lightColors;

  return {
    ...base,
    colors: {
      ...base.colors,
      background: colors.background,
      card: colors.surface,
      border: colors.border,
      text: colors.text,
      primary: colors.primary,
      notification: colors.accent,
    },
  };
};

export function useAppTheme() {
  const systemScheme = useColorScheme();
  const mode = useThemePreferenceStore((state) => state.mode);
  const hydrated = useThemePreferenceStore((state) => state.hydrated);
  const toggleThemeMode = useThemePreferenceStore((state) => state.toggleThemeMode);
  const setThemeMode = useThemePreferenceStore((state) => state.setThemeMode);

  const resolvedMode = mode || (systemScheme === "dark" ? "dark" : "light");
  const isDark = resolvedMode === "dark";

  return {
    isDark,
    themeMode: resolvedMode,
    themePreferenceHydrated: hydrated,
    colors: isDark ? darkColors : lightColors,
    typography,
    spacing,
    radius,
    fontWeights,
    shadows,
    toggleTheme: () => toggleThemeMode(systemScheme),
    setThemeMode,
  };
}
