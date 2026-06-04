import Constants from "expo-constants";
import * as Linking from "expo-linking";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import RazorpayCheckout from "react-native-razorpay";

import { createOrder, verifyPayment } from "../../api/payment";
import { useAuthStore } from "../../store/authStore";
import { useResponsiveLayout } from "../../utils/layout";

const SAMPLE_QUESTIONS = [
  {
    title: "1 Mark Preview",
    question: "Define primary memory.",
    solution: "Primary memory is the computer memory directly accessible by the CPU.",
  },
  {
    title: "5 Mark Preview",
    question: "Explain the advantages of DBMS over file systems.",
    solution: "DBMS improves consistency, security, querying, and centralized control.",
  },
  {
    title: "10 Mark Preview",
    question: "Discuss the working of a stack using push and pop operations.",
    solution: "A stack follows LIFO. Push inserts at the top, and pop removes the latest item.",
  },
];

const getNextAccessExpiry = () =>
  new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

export default function PaywallScreen({ navigation }) {
  const layout = useResponsiveLayout();
  const user = useAuthStore((state) => state.user);
  const updatePaymentStatus = useAuthStore((state) => state.updatePaymentStatus);
  const logout = useAuthStore((state) => state.logout);
  const [loading, setLoading] = useState(false);

  const whatsappUrl = useMemo(() => {
    const number = Constants.expoConfig?.extra?.whatsappNumber;
    return `https://wa.me/${number}`;
  }, []);

  useEffect(() => {
    if (user?.role === "admin") {
      navigation.replace("MainTabs");
    }
  }, [navigation, user?.role]);

  const handleOpenSupport = async () => {
    await Linking.openURL(whatsappUrl);
  };

  const handleUnlock = async () => {
    try {
      setLoading(true);
      const order = await createOrder();

      const options = {
        description: "ExamPulse 1 year access",
        currency: order.currency,
        key: order.razorpayKeyId,
        amount: String(order.amount),
        name: "ExamPulse",
        order_id: order.orderId,
        prefill: {
          email: user?.email || "",
          contact: user?.phone || "",
          name: user?.name || "",
        },
        theme: { color: "#1f6feb" },
      };

      const paymentResult = await RazorpayCheckout.open(options);

      const verification = await verifyPayment({
        razorpay_order_id: paymentResult.razorpay_order_id,
        razorpay_payment_id: paymentResult.razorpay_payment_id,
        razorpay_signature: paymentResult.razorpay_signature,
      });

      if (!verification.success) {
        throw new Error(verification.message || "Payment verification failed");
      }

      await updatePaymentStatus({
        isPaid: true,
        accessExpiry: getNextAccessExpiry(),
      });

      navigation.replace("MainTabs");
    } catch (error) {
      if (error?.code === 0) {
        Alert.alert("Payment cancelled", "You can unlock access anytime.");
      } else {
        Alert.alert(
          "Payment failed",
          error?.response?.data?.message ||
            error?.description ||
            error?.message ||
            "Please try again."
        );
      }
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
            paddingTop: layout.isTablet ? 36 : 24,
            paddingBottom: layout.isTablet ? 44 : 32,
          },
        ]}
      >
        <View style={[styles.contentWrap, { maxWidth: layout.contentMaxWidth }]}>
          <View style={styles.heroCard}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>Premium Access</Text>
            </View>
            <Text style={[styles.heading, { fontSize: layout.heroTitleSize }]}>
              Unlock 1 Year Access — ₹50
            </Text>
            <Text style={styles.subtitle}>
              Preview the quality first, then unlock the full PYQ and revision
              library.
            </Text>
          </View>

          <View style={styles.previewGrid}>
            {SAMPLE_QUESTIONS.map((item) => (
              <View
                key={item.title}
                style={[
                  styles.cardWrap,
                  layout.listColumns > 1 && styles.cardWrapHalf,
                ]}
              >
                <View style={styles.card}>
                  <Text style={styles.cardLabel}>{item.title}</Text>
                  <Text style={styles.cardQuestion}>{item.question}</Text>
                  <Text style={styles.cardSolution}>{item.solution}</Text>
                </View>
              </View>
            ))}
          </View>

          <Pressable
            disabled={loading}
            onPress={handleUnlock}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.primaryButtonPressed,
              loading && styles.buttonDisabled,
            ]}
          >
            <Text style={styles.primaryButtonText}>
              {loading ? "Opening Razorpay..." : "Unlock Everything for ₹50 / year"}
            </Text>
          </Pressable>

          <Pressable onPress={handleOpenSupport} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Paid but no access?</Text>
          </Pressable>

          <Pressable
            onPress={async () => {
              await logout();
              navigation.replace("Login");
            }}
          >
            <Text style={styles.linkText}>Use a different account</Text>
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
    alignItems: "center",
  },
  contentWrap: {
    width: "100%",
  },
  heroCard: {
    backgroundColor: "#12213b",
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
  },
  heroBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 14,
  },
  heroBadgeText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 12,
    letterSpacing: 0.5,
  },
  heading: {
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: "#d7e4fb",
  },
  previewGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -6,
    marginBottom: 8,
  },
  cardWrap: {
    width: "100%",
    paddingHorizontal: 6,
    marginBottom: 12,
  },
  cardWrapHalf: {
    width: "50%",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#dce4f2",
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1f6feb",
    marginBottom: 8,
  },
  cardQuestion: {
    fontSize: 16,
    fontWeight: "700",
    color: "#182742",
    marginBottom: 8,
  },
  cardSolution: {
    fontSize: 14,
    lineHeight: 21,
    color: "#5a6c88",
  },
  primaryButton: {
    backgroundColor: "#1f6feb",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 6,
  },
  primaryButtonPressed: {
    opacity: 0.92,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#cfd8e8",
    alignItems: "center",
    paddingVertical: 14,
    marginTop: 12,
    backgroundColor: "#ffffff",
  },
  secondaryButtonText: {
    color: "#1b2b48",
    fontSize: 15,
    fontWeight: "600",
  },
  linkText: {
    marginTop: 20,
    textAlign: "center",
    color: "#1f6feb",
    fontSize: 15,
    fontWeight: "600",
  },
});
