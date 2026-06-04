import { useCallback, useState } from "react";
import {
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { getTopics } from "../api/content";
import { EmptyState, ErrorState, LoadingState } from "../components/ScreenState";
import { useAppTheme } from "../utils/theme";
import { useResponsiveLayout } from "../utils/layout";

export default function TopicListScreen({ navigation, route }) {
  const { colors } = useAppTheme();
  const layout = useResponsiveLayout();
  const { module } = route.params;
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadTopics = useCallback(async (isRefresh = false) => {
    try {
      setError("");
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const data = await getTopics(module._id);
      setTopics(data);
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Failed to load topics.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [module._id]);

  useFocusEffect(
    useCallback(() => {
      loadTopics();
    }, [loadTopics])
  );

  if (loading) {
    return <LoadingState label="Loading topics..." />;
  }

  if (error) {
    return <ErrorState title="Unable to load topics" subtitle={error} onRetry={() => loadTopics()} />;
  }

  if (!topics.length) {
    return <EmptyState title="No topics found" subtitle="Add content to this module." />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        numColumns={layout.listColumns}
        refreshing={refreshing}
        onRefresh={() => loadTopics(true)}
        columnWrapperStyle={layout.listColumns > 1 ? styles.columnWrapper : undefined}
        contentContainerStyle={[
          styles.list,
          {
            paddingHorizontal: layout.horizontalPadding,
            paddingVertical: layout.sectionGap,
          },
        ]}
        data={topics}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <View style={[styles.itemWrap, layout.listColumns > 1 && styles.itemWrapHalf]}>
            <Pressable
              onPress={() => navigation.navigate("QuestionList", { topic: item })}
              style={[
                styles.card,
                styles.cardFill,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.cardTitle, { color: colors.text }]}>{item.name}</Text>
            </Pressable>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  list: { alignItems: "center" },
  columnWrapper: { gap: 12 },
  itemWrap: { width: "100%", marginBottom: 12 },
  itemWrapHalf: { width: "50%", paddingHorizontal: 6 },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    width: "100%",
  },
  cardFill: { minHeight: 96, justifyContent: "center" },
  cardTitle: { fontSize: 17, fontWeight: "700" },
});
