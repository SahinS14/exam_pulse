import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

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

  useEffect(() => {
    hydrateSession();
  }, [hydrateSession]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (!token) {
      navigation.replace("Login");
      return;
    }

    navigation.replace(
      userRole === "admin" || hasActiveAccess(isPaid, accessExpiry)
        ? "MainTabs"
        : "Paywall"
    );
  }, [accessExpiry, hydrated, isPaid, navigation, token, userRole]);

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>ExamPulse</Text>
      <ActivityIndicator size="large" color="#1f6feb" />
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
});
