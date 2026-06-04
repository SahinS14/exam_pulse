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

import { registerUser } from "../../api/auth";
import { useAuthStore } from "../../store/authStore";
import { useResponsiveLayout } from "../../utils/layout";

export default function RegisterScreen({ navigation }) {
  const layout = useResponsiveLayout();
  const saveLogin = useAuthStore((state) => state.login);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);

  const getRegisterErrorAlert = (error) => {
    const status = error.response?.status;
    const message =
      error.response?.data?.errors?.[0]?.message ||
      error.response?.data?.message ||
      "Please try again.";

    if (status === 429) {
      return {
        title: "Too many attempts",
        message,
      };
    }

    return {
      title: "Registration failed",
      message,
    };
  };

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleRegister = async () => {
    if (!form.name || !form.email || !form.phone || !form.password) {
      Alert.alert("Missing fields", "Fill in all registration fields.");
      return;
    }

    try {
      setLoading(true);
      const data = await registerUser(form);
      await saveLogin(data);
      navigation.replace("Paywall");
    } catch (error) {
      const alertConfig = getRegisterErrorAlert(error);
      Alert.alert(alertConfig.title, alertConfig.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
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
          <Text style={[styles.heading, { fontSize: layout.heroTitleSize }]}>
            Create account
          </Text>
          <Text style={styles.subtitle}>
            Sign up free and unlock the full library after payment.
          </Text>
        </View>

        <View style={[styles.formCard, { maxWidth: layout.formMaxWidth }]}>
          <TextInput
            onChangeText={(value) => updateField("name", value)}
            placeholder="Full name"
            placeholderTextColor="#7f8aa3"
            style={styles.input}
            value={form.name}
          />
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={(value) => updateField("email", value)}
            placeholder="Email"
            placeholderTextColor="#7f8aa3"
            style={styles.input}
            value={form.email}
          />
          <TextInput
            keyboardType="phone-pad"
            onChangeText={(value) => updateField("phone", value)}
            placeholder="Phone"
            placeholderTextColor="#7f8aa3"
            style={styles.input}
            value={form.phone}
          />
          <TextInput
            onChangeText={(value) => updateField("password", value)}
            placeholder="Password"
            placeholderTextColor="#7f8aa3"
            secureTextEntry
            style={styles.input}
            value={form.password}
          />

          <Pressable
            disabled={loading}
            onPress={handleRegister}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.primaryButtonPressed,
              loading && styles.buttonDisabled,
            ]}
          >
            <Text style={styles.primaryButtonText}>
              {loading ? "Creating account..." : "Register"}
            </Text>
          </Pressable>

          <Pressable onPress={() => navigation.goBack()}>
            <Text style={styles.linkText}>Already have an account? Login</Text>
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
  container: {
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
