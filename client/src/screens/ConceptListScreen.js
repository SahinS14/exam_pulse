import { useCallback, useState } from "react";
import {
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { getConcepts } from "../api/content";
import { EmptyState, ErrorState, LoadingState } from "../components/ScreenState";
import { useAppTheme } from "../utils/theme";

export default function ConceptListScreen({ navigation, route }) {
  const { colors } = useAppTheme();
  const { module } = route.params;
  const [concepts, setConcepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadConcepts = useCallback(async (isRefresh = false) => {
    try {
      setError("");
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const data = await getConcepts(module._id);
      setConcepts(data);
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Failed to load concepts.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [module._id]);

  useFocusEffect(
    useCallback(() => {
      loadConcepts();
    }, [loadConcepts])
  );

  if (loading) {
    return <LoadingState label="Loading concepts..." />;
  }

  if (error) {
    return <ErrorState title="Unable to load concepts" subtitle={error} onRetry={() => loadConcepts()} />;
  }

  if (!concepts.length) {
    return <EmptyState title="No concepts found" subtitle="Nothing added yet." />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        refreshing={refreshing}
        onRefresh={() => loadConcepts(true)}
        contentContainerStyle={styles.list}
        data={concepts}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => navigation.navigate("ConceptDetail", { concept: item })}
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Text style={[styles.cardTitle, { color: colors.text }]}>{item.title}</Text>
            <Text numberOfLines={3} style={[styles.cardSubtitle, { color: colors.subtext }]}>
              {item.explanation}
            </Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  list: { padding: 16, gap: 12 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
  },
  cardTitle: { fontSize: 17, fontWeight: "700", marginBottom: 8 },
  cardSubtitle: { lineHeight: 21 },
});
