import "react-native-gesture-handler";

import { useEffect } from "react";
import { AppState } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import NotificationBootstrap from "./src/components/NotificationBootstrap";
import AppNavigator from "./src/navigation/AppNavigator";
import { linking } from "./src/navigation/linking";
import { useAppStore } from "./src/store/appStore";
import { useAuthStore } from "./src/store/authStore";
import {
  flushPendingNavigationReset,
  navigationRef,
  resetToRoute,
} from "./src/navigation/navigationRef";
import {
  buildNavigationTheme,
  useAppTheme,
  useThemePreferenceStore,
} from "./src/utils/theme";

function hasActiveAccess(isPaid, accessExpiry) {
  if (!isPaid || !accessExpiry) {
    return false;
  }

  return new Date(accessExpiry).getTime() > Date.now();
}

export default function App() {
  const { isDark } = useAppTheme();
  const hydrateContext = useAppStore((state) => state.hydrateContext);
  const triggerSessionRefresh = useAppStore((state) => state.triggerSessionRefresh);
  const hydrateThemePreference = useThemePreferenceStore(
    (state) => state.hydrateThemePreference
  );
  const token = useAuthStore((state) => state.token);
  const userRole = useAuthStore((state) => state.user?.role);
  const isPaid = useAuthStore((state) => state.isPaid);
  const accessExpiry = useAuthStore((state) => state.accessExpiry);
  const handleAccessExpired = useAuthStore((state) => state.handleAccessExpired);
  const revalidateSession = useAuthStore((state) => state.revalidateSession);

  useEffect(() => {
    hydrateContext();
    hydrateThemePreference();
  }, [hydrateContext, hydrateThemePreference]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", async (nextState) => {
      if (nextState !== "active") {
        return;
      }

      if (!token) {
        return;
      }

      const result = await revalidateSession();

      if (result.status === "invalid") {
        resetToRoute("Login");
        return;
      }

      if (result.status === "valid") {
        const nextUser = result.user;
        const nextRole = nextUser?.role;
        const nextPaid = Boolean(nextUser?.isPaid);
        const nextAccessExpiry = nextUser?.accessExpiry || null;

        if (
          nextRole !== "admin" &&
          !hasActiveAccess(nextPaid, nextAccessExpiry)
        ) {
          await handleAccessExpired();
          resetToRoute("Paywall");
          return;
        }
      }

      triggerSessionRefresh();
    });

    return () => {
      subscription.remove();
    };
  }, [
    accessExpiry,
    handleAccessExpired,
    isPaid,
    revalidateSession,
    token,
    triggerSessionRefresh,
    userRole,
  ]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer
          ref={navigationRef}
          linking={linking}
          theme={buildNavigationTheme(isDark)}
          onReady={flushPendingNavigationReset}
        >
          <StatusBar style={isDark ? "light" : "dark"} />
          <NotificationBootstrap />
          <AppNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
