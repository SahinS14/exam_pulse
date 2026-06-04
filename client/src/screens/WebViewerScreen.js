import { SafeAreaView, StyleSheet, Text } from "react-native";
import { WebView } from "react-native-webview";

import { EmptyState } from "../components/ScreenState";

export default function WebViewerScreen({ route }) {
  const { url } = route.params;
  const normalizedUrl = typeof url === "string" ? url.trim() : "";

  if (!normalizedUrl) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <EmptyState title="No file available" subtitle="The requested file is missing." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <WebView
        originWhitelist={["*"]}
        setSupportMultipleWindows={false}
        source={{ uri: normalizedUrl }}
        startInLoadingState
      />
      <Text style={styles.footer}>
        If the file does not load, check the file URL.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f4f7fb" },
  footer: {
    textAlign: "center",
    color: "#6a7b95",
    fontSize: 12,
    paddingVertical: 8,
    backgroundColor: "#ffffff",
  },
});
