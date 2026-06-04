import { useState } from "react";
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { loginUser } from "../../api/auth";
import { useAuthStore } from "../../store/authStore";
import { useResponsiveLayout } from "../../utils/layout";

function hasActiveAccess(user) {
  if (user?.role === "admin") {
    return true;
  }

  const isPaid = user?.isPaid;
  const accessExpiry = user?.accessExpiry;

  if (!isPaid || !accessExpiry) {
    return false;
  }

  return new Date(accessExpiry).getTime() > Date.now();
}

export default function LoginScreen({ navigation }) {
  const layout = useResponsiveLayout();
  const saveLogin = useAuthStore((state) => state.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const getLoginErrorAlert = (error) => {
    const status = error.response?.status;
    const message =
      error.response?.data?.errors?.[0]?.message ||
      error.response?.data?.message ||
      "Please try again.";

    if (status === 401) {
      return {
        title: "Invalid credentials",
        message,
      };
    }

    if (status === 429) {
      return {
        title: "Too many attempts",
        message,
      };
    }

    return {
      title: "Login failed",
      message,
    };
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Missing fields", "Enter your email and password.");
      return;
    }

    try {
      setLoading(true);
      console.log("LOGIN REQUEST", { email });
      console.log("LOGIN REQUEST START");
      const data = await loginUser({ email, password });
      console.log("LOGIN RESPONSE", {
        status: 200,
        data,
      });
      await saveLogin(data);
      navigation.replace(hasActiveAccess(data.user) ? "MainTabs" : "Paywall");
    } catch (error) {
      console.log("LOGIN ERROR", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
      const alertConfig = getLoginErrorAlert(error);
      Alert.alert(alertConfig.title, alertConfig.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: layout.horizontalPadding,
            paddingVertical: layout.isTablet ? 40 : 24,
          },
        ]}
      >
        <View style={[styles.hero, { maxWidth: layout.formMaxWidth }]}>
          <View style={styles.brandBadge}>
            <Text style={styles.brandBadgeText}>ExamPulse</Text>
          </View>
          <Text style={[styles.heading, { fontSize: layout.heroTitleSize }]}>Login</Text>
          <Text style={styles.subtitle}>
            Continue to your exam preparation dashboard.
          </Text>
        </View>

        <View style={[styles.formCard, { maxWidth: layout.formMaxWidth }]}>
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor="#7f8aa3"
            style={styles.input}
            value={email}
          />
          <TextInput
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor="#7f8aa3"
            secureTextEntry
            style={styles.input}
            value={password}
          />

          <Pressable
            disabled={loading}
            onPress={handleLogin}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.primaryButtonPressed,
              loading && styles.buttonDisabled,
            ]}
          >
            <Text style={styles.primaryButtonText}>
              {loading ? "Logging in..." : "Login"}
            </Text>
          </Pressable>

          <Pressable onPress={() => navigation.navigate("Register")}>
            <Text style={styles.linkText}>New here? Create an account</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f4f7fb",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 18,
  },
  hero: {
    width: "100%",
  },
  brandBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#e7f0ff",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 16,
  },
  brandBadgeText: {
    color: "#1f6feb",
    fontWeight: "800",
    fontSize: 12,
    letterSpacing: 0.5,
  },
  formCard: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#d4deee",
    padding: 18,
    shadowColor: "#12213b",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  heading: {
    fontWeight: "800",
    color: "#12213b",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: "#5a6c88",
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d4deee",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#16253f",
    backgroundColor: "#ffffff",
    marginBottom: 14,
  },
  primaryButton: {
    backgroundColor: "#1f6feb",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 8,
  },
  primaryButtonPressed: {
    opacity: 0.9,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  linkText: {
    marginTop: 18,
    textAlign: "center",
    color: "#1f6feb",
    fontSize: 15,
    fontWeight: "600",
  },
});
