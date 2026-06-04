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

import { getSubjects } from "../api/content";
import { EmptyState, ErrorState, LoadingState } from "../components/ScreenState";
import { useAppTheme } from "../utils/theme";
import { useResponsiveLayout } from "../utils/layout";

export default function SubjectScreen({ navigation, route }) {
  const { colors } = useAppTheme();
  const layout = useResponsiveLayout();
  const { semester } = route.params;
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadSubjects = useCallback(async (isRefresh = false) => {
    try {
      setError("");
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const data = await getSubjects(semester._id);
      setSubjects(data);
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Failed to load subjects.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [semester._id]);

  useFocusEffect(
    useCallback(() => {
      loadSubjects();
    }, [loadSubjects])
  );

  if (loading) {
    return <LoadingState label="Loading subjects..." />;
  }

  if (error) {
    return <ErrorState title="Unable to load subjects" subtitle={error} onRetry={() => loadSubjects()} />;
  }

  if (!subjects.length) {
    return (
      <EmptyState
        title="No subjects found"
        subtitle="This semester has no subjects yet."
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        numColumns={layout.listColumns}
        refreshing={refreshing}
        onRefresh={() => loadSubjects(true)}
        columnWrapperStyle={layout.listColumns > 1 ? styles.columnWrapper : undefined}
        contentContainerStyle={[
          styles.list,
          {
            paddingHorizontal: layout.horizontalPadding,
            paddingVertical: layout.sectionGap,
          },
        ]}
        data={subjects}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <View style={[styles.itemWrap, layout.listColumns > 1 && styles.itemWrapHalf]}>
            <Pressable
              onPress={() => navigation.navigate("Module", { subject: item })}
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
  safeArea: {
    flex: 1,
  },
  list: {
    alignItems: "center",
  },
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
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
});
