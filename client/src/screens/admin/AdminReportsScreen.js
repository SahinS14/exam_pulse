import { useCallback, useState } from "react";
import { Alert, FlatList, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { getAdminReports, resolveAdminReport } from "../../api/admin";
import { EmptyState, LoadingState } from "../../components/ScreenState";

export default function AdminReportsScreen() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState(null);

  const loadReports = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAdminReports();
      setReports(data);
    } catch (error) {
      Alert.alert("Failed to load reports", "Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadReports();
    }, [loadReports])
  );

  const handleResolve = async (reportId) => {
    try {
      setResolvingId(reportId);
      await resolveAdminReport(reportId);
      await loadReports();
    } catch (error) {
      Alert.alert("Resolve failed", "Please try again.");
    } finally {
      setResolvingId(null);
    }
  };

  if (loading) {
    return <LoadingState label="Loading reports..." />;
  }

  if (!reports.length) {
    return <EmptyState title="No pending reports" subtitle="All student reports are resolved." />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        contentContainerStyle={styles.list}
        data={reports}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.reason}>{item.reason}</Text>
            <Text style={styles.meta}>Reporter: {item.userId?.name || "Unknown"}</Text>
            <Text style={styles.meta}>Email: {item.userId?.email || "Unknown"}</Text>
            <Text style={styles.meta}>
              Question: {item.questionId?.questionText || "Question unavailable"}
            </Text>
            <Pressable
              onPress={() => handleResolve(item._id)}
              disabled={resolvingId === item._id}
              style={[styles.button, resolvingId === item._id && styles.buttonDisabled]}
            >
              <Text style={styles.buttonText}>Resolve</Text>
            </Pressable>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f4f7fb" },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#dce4f2",
    padding: 16,
  },
  reason: {
    color: "#a44700",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 8,
  },
  meta: {
    color: "#5f708c",
    lineHeight: 20,
    marginBottom: 4,
  },
  button: {
    marginTop: 14,
    backgroundColor: "#1f6feb",
    borderRadius: 12,
    alignItems: "center",
    paddingVertical: 13,
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
