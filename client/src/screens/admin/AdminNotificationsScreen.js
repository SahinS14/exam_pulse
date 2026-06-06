import { useCallback, useState } from "react";
import {
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { getAdminNotifications, sendAdminNotification } from "../../api/admin";
import EmptyState from "../../components/EmptyState";
import { ErrorState, LoadingState } from "../../components/ScreenState";
import Toast from "../../components/Toast";
import {
  fontWeights,
  radius,
  shadows,
  spacing,
  typography,
  useAppTheme,
} from "../../utils/theme";
import { useResponsiveLayout } from "../../utils/layout";

const TYPES = [
  { key: "admin", label: "General" },
  { key: "promotion", label: "Promotion" },
  { key: "system", label: "System" },
];

function formatRelativeDate(value) {
  if (!value) {
    return "Recently";
  }

  const timestamp = new Date(value).getTime();
  const diffMs = Date.now() - timestamp;
  const hours = Math.floor(diffMs / (60 * 60 * 1000));
  const days = Math.floor(hours / 24);

  if (hours < 1) {
    const minutes = Math.max(1, Math.floor(diffMs / (60 * 1000)));
    return `${minutes}m ago`;
  }
  if (hours < 24) {
    return `${hours}h ago`;
  }
  if (days === 1) {
    return "Yesterday";
  }
  return `${days}d ago`;
}

export default function AdminNotificationsScreen() {
  const { colors } = useAppTheme();
  const layout = useResponsiveLayout();

  const [items, setItems] = useState([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState("admin");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState({ message: "", type: "info" });

  const loadNotifications = useCallback(async () => {
    try {
      setError("");
      setLoading(true);
      const data = await getAdminNotifications();
      setItems(Array.isArray(data) ? data : []);
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications])
  );

  if (loading) {
    return <LoadingState label="Loading notifications..." rows={5} itemHeight={88} />;
  }

  if (error) {
    return <ErrorState title="Unable to load notifications" subtitle={error} onRetry={loadNotifications} />;
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <FlatList
        data={items}
        keyExtractor={(item) => item._id}
        contentContainerStyle={[
          styles.list,
          {
            paddingHorizontal: layout.horizontalPadding,
            paddingBottom: spacing.xxxl,
          },
        ]}
        ListHeaderComponent={
          <View style={[styles.formCardWrap, { maxWidth: layout.contentMaxWidth }]}>
            <View
              style={[
                styles.formCard,
                shadows.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.title, { color: colors.text }]}>Send Notification</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Send promotional or general announcements to all student users.
              </Text>

              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Title"
                placeholderTextColor={colors.textTertiary}
                style={[
                  styles.input,
                  { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.border },
                ]}
              />

              <TextInput
                value={body}
                onChangeText={setBody}
                placeholder="Notification message"
                placeholderTextColor={colors.textTertiary}
                multiline
                style={[
                  styles.textarea,
                  { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.border },
                ]}
              />

              <View style={styles.typeRow}>
                {TYPES.map((option) => {
                  const selected = type === option.key;
                  return (
                    <Pressable
                      key={option.key}
                      onPress={() => setType(option.key)}
                      style={[
                        styles.typeChip,
                        {
                          backgroundColor: selected ? colors.primary : colors.surfaceSecondary,
                          borderColor: selected ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.typeChipText,
                          { color: selected ? "#FFFFFF" : colors.textSecondary },
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Pressable
                disabled={sending}
                onPress={async () => {
                  try {
                    setSending(true);
                    const created = await sendAdminNotification({ title, body, type });
                    setItems((current) => [created, ...current]);
                    setTitle("");
                    setBody("");
                    setType("admin");
                    setToast({ message: "Notification sent to students.", type: "success" });
                  } catch (sendError) {
                    setToast({
                      message: sendError.response?.data?.message || "Failed to send notification.",
                      type: "error",
                    });
                  } finally {
                    setSending(false);
                  }
                }}
                style={[
                  styles.sendButton,
                  { backgroundColor: colors.primary, opacity: sending ? 0.7 : 1 },
                ]}
              >
                <Text style={styles.sendButtonText}>{sending ? "Sending..." : "Send Notification"}</Text>
              </Pressable>
            </View>

              <Text style={[styles.historyTitle, { color: colors.text }]}>Recent Notifications</Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="notifications-outline"
            title="No notifications sent yet"
            subtitle="Your sent admin notifications will appear here."
          />
        }
        renderItem={({ item }) => (
          <View style={[styles.itemWrap, { maxWidth: layout.contentMaxWidth }]}>
            <View
              style={[
                styles.historyCard,
                shadows.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.historyHeader}>
                <Text numberOfLines={1} style={[styles.historyBadge, { color: colors.primary }]}>
                  {String(item.type || "admin").toUpperCase()}
                </Text>
                <Text style={[styles.historyTime, { color: colors.textTertiary }]}>
                  {formatRelativeDate(item.sentAt || item.createdAt)}
                </Text>
              </View>
              <Text numberOfLines={2} style={[styles.historyItemTitle, { color: colors.text }]}>
                {item.title}
              </Text>
              <Text numberOfLines={4} style={[styles.historyBody, { color: colors.textSecondary }]}>
                {item.body}
              </Text>
              <Text style={[styles.historyRecipients, { color: colors.textTertiary }]}>
                Audience: {item.audience || "students"}
              </Text>
            </View>
          </View>
        )}
      />
      <Toast message={toast.message} type={toast.type} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  list: {
    paddingTop: spacing.md,
    alignItems: "center",
  },
  formCardWrap: {
    width: "100%",
  },
  formCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: typography.xxl,
    fontWeight: fontWeights.extrabold,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.md,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.md,
    marginBottom: spacing.md,
  },
  textarea: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.md,
    minHeight: 120,
    textAlignVertical: "top",
    marginBottom: spacing.md,
  },
  typeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  typeChip: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  typeChipText: {
    fontSize: typography.sm,
    fontWeight: fontWeights.semibold,
  },
  sendButton: {
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  sendButtonText: {
    color: "#FFFFFF",
    fontSize: typography.md,
    fontWeight: fontWeights.bold,
  },
  historyTitle: {
    fontSize: typography.lg,
    fontWeight: fontWeights.bold,
    marginBottom: spacing.md,
  },
  itemWrap: {
    width: "100%",
    marginBottom: spacing.md,
  },
  historyCard: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  historyBadge: {
    fontSize: typography.xs,
    fontWeight: fontWeights.bold,
    flex: 1,
  },
  historyTime: {
    fontSize: typography.sm,
    flexShrink: 0,
  },
  historyItemTitle: {
    fontSize: typography.base,
    fontWeight: fontWeights.bold,
    marginBottom: spacing.xxs,
  },
  historyBody: {
    fontSize: typography.md,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  historyRecipients: {
    fontSize: typography.sm,
  },
});
