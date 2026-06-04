import { useColorScheme } from "react-native";
import * as SecureStore from "expo-secure-store";
import { DarkTheme, DefaultTheme } from "@react-navigation/native";
import { create } from "zustand";

const THEME_MODE_KEY = "appThemeMode";

const lightColors = {
  background: "#f4f7fb",
  card: "#ffffff",
  cardMuted: "#eef4ff",
  border: "#dce4f2",
  text: "#13243c",
  subtext: "#62738d",
  primary: "#1f6feb",
  primaryText: "#ffffff",
  warningBg: "#fff1d6",
  warningText: "#825400",
  dangerBg: "#fff1f0",
  dangerText: "#b42318",
  overlay: "rgba(10, 20, 35, 0.45)",
  shadow: "#12213b",
  surfaceSoft: "#eef5ff",
  successBg: "#ecfbf2",
  successText: "#12994b",
  softHighlight: "#f7faff",
};

const darkColors = {
  background: "#09111f",
  card: "#121e33",
  cardMuted: "#0f1930",
  border: "#20314e",
  text: "#f4f7fb",
  subtext: "#a2b1c8",
  primary: "#4d9dff",
  primaryText: "#09111f",
  warningBg: "#3d2d0f",
  warningText: "#ffd48a",
  dangerBg: "#35151a",
  dangerText: "#ffb4ab",
  overlay: "rgba(4, 8, 16, 0.75)",
  shadow: "#000000",
  surfaceSoft: "#101b30",
  successBg: "#133225",
  successText: "#5ce4a2",
  softHighlight: "#0e1a2e",
};

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
      set({
        mode: null,
        hydrated: true,
      });
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
      card: colors.card,
      border: colors.border,
      text: colors.text,
      primary: colors.primary,
      notification: colors.primary,
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
    toggleTheme: () => toggleThemeMode(systemScheme),
    setThemeMode,
  };
}
