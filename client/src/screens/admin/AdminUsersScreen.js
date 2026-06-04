import { useCallback, useState } from "react";
import { Alert, FlatList, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { blockAdminUser, getAdminUsers, grantAdminUser } from "../../api/admin";
import { EmptyState, LoadingState } from "../../components/ScreenState";

export default function AdminUsersScreen() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingUserId, setActingUserId] = useState(null);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAdminUsers();
      setUsers(data);
    } catch (error) {
      Alert.alert("Failed to load users", "Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadUsers();
    }, [loadUsers])
  );

  const handleAction = async (userId, action) => {
    try {
      setActingUserId(userId);
      if (action === "block") {
        await blockAdminUser(userId);
      } else {
        await grantAdminUser(userId);
      }
      await loadUsers();
    } catch (error) {
      Alert.alert("Action failed", "Please try again.");
    } finally {
      setActingUserId(null);
    }
  };

  if (loading) {
    return <LoadingState label="Loading users..." />;
  }

  if (!users.length) {
    return <EmptyState title="No users found" subtitle="No registered users yet." />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        contentContainerStyle={styles.list}
        data={users}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>{item.email}</Text>
            <Text style={styles.meta}>Role: {item.role}</Text>
            <Text style={styles.meta}>Paid: {item.isPaid ? "Yes" : "No"}</Text>
            <Text style={styles.meta}>
              Access Expiry: {item.accessExpiry ? new Date(item.accessExpiry).toLocaleDateString() : "Not granted"}
            </Text>

            {item.role !== "admin" ? (
              <View style={styles.actionRow}>
                <Pressable
                  onPress={() => handleAction(item._id, "block")}
                  disabled={actingUserId === item._id}
                  style={[styles.secondaryButton, actingUserId === item._id && styles.buttonDisabled]}
                >
                  <Text style={styles.secondaryButtonText}>Block</Text>
                </Pressable>
                <Pressable
                  onPress={() => handleAction(item._id, "grant")}
                  disabled={actingUserId === item._id}
                  style={[styles.primaryButton, actingUserId === item._id && styles.buttonDisabled]}
                >
                  <Text style={styles.primaryButtonText}>Grant Access</Text>
                </Pressable>
              </View>
            ) : null}
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
  name: { color: "#13243c", fontSize: 17, fontWeight: "800", marginBottom: 6 },
  meta: { color: "#63748f", lineHeight: 20 },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  primaryButton: {
    flex: 1,
    backgroundColor: "#1f6feb",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  primaryButtonText: { color: "#ffffff", fontWeight: "700" },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d3dceb",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  secondaryButtonText: { color: "#20354f", fontWeight: "700" },
  buttonDisabled: { opacity: 0.6 },
});

