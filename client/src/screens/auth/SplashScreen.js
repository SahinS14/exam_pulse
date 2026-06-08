import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { useAuthStore } from "../../store/authStore";

function hasActiveAccess(isPaid, accessExpiry) {
  if (!isPaid || !accessExpiry) {
    return false;
  }

  return new Date(accessExpiry).getTime() > Date.now();
}

export default function SplashScreen({ navigation }) {
  const hydrateSession = useAuthStore((state) => state.hydrateSession);
  const hydrated = useAuthStore((state) => state.hydrated);
  const token = useAuthStore((state) => state.token);
  const isPaid = useAuthStore((state) => state.isPaid);
  const accessExpiry = useAuthStore((state) => state.accessExpiry);
  const userRole = useAuthStore((state) => state.user?.role);
  const revalidateSession = useAuthStore((state) => state.revalidateSession);
  const [recoverableError, setRecoverableError] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);
  const hasBootstrapped = useRef(false);

  useEffect(() => {
    hydrateSession();
  }, [hydrateSession]);

  const continueWithSession = useCallback(
    async (currentToken) => {
      if (!currentToken) {
        navigation.replace("Login");
        return;
      }

      setCheckingSession(true);
      setRecoverableError("");

      const result = await revalidateSession();

      if (result.status === "invalid") {
        navigation.replace("Login");
        return;
      }

      if (result.status === "unavailable") {
        setRecoverableError(
          result.message ||
            "Unable to reach the server right now. Please try again."
        );
        setCheckingSession(false);
        return;
      }

      const nextUser = result.user;
      navigation.replace(
        nextUser?.role === "admin" ||
          hasActiveAccess(Boolean(nextUser?.isPaid), nextUser?.accessExpiry)
          ? "MainTabs"
          : "Paywall"
      );
    },
    [navigation, revalidateSession]
  );

  useEffect(() => {
    if (!hydrated || hasBootstrapped.current) {
      return;
    }

    hasBootstrapped.current = true;
    continueWithSession(token);
  }, [continueWithSession, hydrated, token]);

  if (recoverableError) {
    return (
      <View style={styles.container}>
        <Text style={styles.logo}>ExamPulse</Text>
        <Text style={styles.caption}>{recoverableError}</Text>
        <Pressable
          onPress={() => continueWithSession(token)}
          style={styles.retryButton}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>ExamPulse</Text>
      <ActivityIndicator size="large" color="#1f6feb" animating={checkingSession} />
      <Text style={styles.caption}>Preparing your study dashboard...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eef4ff",
    paddingHorizontal: 24,
  },
  logo: {
    fontSize: 36,
    fontWeight: "800",
    color: "#13233e",
    marginBottom: 20,
  },
  caption: {
    marginTop: 14,
    fontSize: 15,
    color: "#4a5f82",
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: "#1f6feb",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
