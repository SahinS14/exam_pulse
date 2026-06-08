import { useCallback, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";

import {
  getNotificationsInbox,
  markAllNotificationsRead,
  markNotificationRead,
} from "../api/notifications";
import AnimatedScreenView from "../components/AnimatedScreenView";
import EmptyState from "../components/EmptyState";
import PageSkeleton from "../components/PageSkeleton";
import { ErrorState } from "../components/ScreenState";
import { resolveNotificationRoute } from "../navigation/linking";
import StaggeredItem from "../components/StaggeredItem";
import Toast from "../components/Toast";
import { useNotificationStore } from "../store/notificationStore";
import {
  fontWeights,
  radius,
  shadows,
  spacing,
  typography,
  useAppTheme,
} from "../utils/theme";
import { useResponsiveLayout } from "../utils/layout";

function formatRelativeDate(value) {
  if (!value) {
    return "Recently";
  }

  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return "Recently";
  }

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

const TYPE_META = {
  admin: {
    icon: "notifications-outline",
    color: "#4F46E5",
    background: "#EEF2FF",
    badge: "ADMIN",
  },
  promotion: {
    icon: "megaphone-outline",
    color: "#F59E0B",
    background: "#FEF3C7",
    badge: "PROMO",
  },
  content: {
    icon: "sparkles-outline",
    color: "#10B981",
    background: "#D1FAE5",
    badge: "UPDATE",
  },
  system: {
    icon: "shield-checkmark-outline",
    color: "#8B5CF6",
    background: "#EDE9FE",
    badge: "SYSTEM",
  },
};

export default function NotificationCenterScreen({ navigation }) {
  const { colors } = useAppTheme();
  const layout = useResponsiveLayout();
  const setUnreadCount = useNotificationStore((state) => state.setUnreadCount);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState({ message: "", type: "info" });

  const hydrateUnreadCount = useCallback((nextItems) => {
    const unread = nextItems.filter((item) => !item.isRead).length;
    setUnreadCount(unread);
  }, [setUnreadCount]);

  const loadInbox = useCallback(async (isRefresh = false) => {
    try {
      setError("");
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const data = await getNotificationsInbox();
      const nextItems = Array.isArray(data) ? data : [];
      setItems(nextItems);
      hydrateUnreadCount(nextItems);
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Failed to load notifications.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [hydrateUnreadCount]);

  useFocusEffect(
    useCallback(() => {
      loadInbox();
    }, [loadInbox])
  );

  if (loading) {
    return (
      <PageSkeleton
        titleWidth="52%"
        subtitleWidth="70%"
        rows={5}
        rowHeight={96}
      />
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Unable to load notifications"
        subtitle={error}
        onRetry={() => loadInbox()}
      />
    );
  }

  const unreadCount = items.filter((item) => !item.isRead).length;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <FlatList
        data={items}
        keyExtractor={(item) => item._id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadInbox(true)}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={[
          styles.list,
          {
            paddingHorizontal: layout.horizontalPadding,
            paddingBottom: spacing.xxxl,
          },
        ]}
        ListHeaderComponent={
          <AnimatedScreenView style={[styles.header, { maxWidth: layout.contentMaxWidth }]}>
            <View style={styles.headerRow}>
              <View style={styles.headerCopy}>
                <Text style={[styles.title, { color: colors.text }]}>Notifications</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  Alerts, promotions, and study updates from ExamPulse.
                </Text>
              </View>
              {unreadCount ? (
                <Pressable
                  onPress={async () => {
                    await markAllNotificationsRead();
                    const nextItems = items.map((item) => ({
                      ...item,
                      isRead: true,
                    }));
                    setItems(nextItems);
                    hydrateUnreadCount(nextItems);
                    setToast({ message: "All notifications marked as read.", type: "success" });
                  }}
                >
                  <Text style={[styles.markAll, { color: colors.primary }]}>Mark all read</Text>
                </Pressable>
              ) : null}
            </View>
          </AnimatedScreenView>
        }
        ListEmptyComponent={
          <EmptyState
            icon="notifications-outline"
            title="No notifications yet"
            subtitle="Admin alerts and content updates will appear here."
          />
        }
        renderItem={({ item, index }) => {
          const meta = TYPE_META[item.type] || TYPE_META.admin;
          return (
            <StaggeredItem
              style={[styles.itemWrap, { maxWidth: layout.contentMaxWidth }]}
              index={index}
            >
              <Pressable
                onPress={async () => {
                  if (!item.isRead) {
                    await markNotificationRead(item._id);
                    const nextItems = items.map((entry) =>
                      entry._id === item._id ? { ...entry, isRead: true } : entry
                    );
                    setItems(nextItems);
                    hydrateUnreadCount(nextItems);
                  }

                  const destination = resolveNotificationRoute(item.data);
                  navigation.navigate(destination.name, destination.params);
                }}
                style={[
                  styles.card,
                  shadows.card,
                  {
                    backgroundColor: colors.surface,
                    borderColor: item.isRead ? colors.border : colors.primary,
                  },
                ]}
              >
                <View style={[styles.iconWrap, { backgroundColor: meta.background }]}>
                  <Ionicons name={meta.icon} size={22} color={meta.color} />
                </View>
                <View style={styles.body}>
                  <View style={styles.metaRow}>
                    <Text numberOfLines={1} style={[styles.badge, { color: meta.color }]}>
                      {meta.badge}
                    </Text>
                    <Text style={[styles.time, { color: colors.textTertiary }]}>
                      {formatRelativeDate(item.sentAt || item.createdAt)}
                    </Text>
                  </View>
                  <Text numberOfLines={2} style={[styles.cardTitle, { color: colors.text }]}>
                    {item.title}
                  </Text>
                  <Text numberOfLines={3} style={[styles.cardBody, { color: colors.textSecondary }]}>
                    {item.body}
                  </Text>
                </View>
              </Pressable>
            </StaggeredItem>
          );
        }}
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
  header: {
    width: "100%",
    marginBottom: spacing.lg,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: typography.display,
    fontWeight: fontWeights.extrabold,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.base,
    lineHeight: 24,
  },
  markAll: {
    fontSize: typography.md,
    fontWeight: fontWeights.semibold,
    paddingTop: spacing.xs,
  },
  itemWrap: {
    width: "100%",
    marginBottom: spacing.md,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xxs,
    gap: spacing.sm,
  },
  badge: {
    fontSize: typography.xs,
    fontWeight: fontWeights.bold,
    flex: 1,
  },
  time: {
    fontSize: typography.sm,
    flexShrink: 0,
  },
  cardTitle: {
    fontSize: typography.base,
    fontWeight: fontWeights.bold,
    marginBottom: spacing.xxs,
  },
  cardBody: {
    fontSize: typography.md,
    lineHeight: 20,
  },
});
