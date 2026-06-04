import "react-native-gesture-handler";

import { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import NotificationBootstrap from "./src/components/NotificationBootstrap";
import AppNavigator from "./src/navigation/AppNavigator";
import { useAppStore } from "./src/store/appStore";
import {
  buildNavigationTheme,
  useAppTheme,
  useThemePreferenceStore,
} from "./src/utils/theme";

export default function App() {
  const { isDark } = useAppTheme();
  const hydrateContext = useAppStore((state) => state.hydrateContext);
  const hydrateThemePreference = useThemePreferenceStore(
    (state) => state.hydrateThemePreference
  );

  useEffect(() => {
    hydrateContext();
    hydrateThemePreference();
  }, [hydrateContext, hydrateThemePreference]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer theme={buildNavigationTheme(isDark)}>
          <StatusBar style={isDark ? "light" : "dark"} />
          <NotificationBootstrap />
          <AppNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
