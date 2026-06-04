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

import { getModules } from "../api/content";
import { EmptyState, ErrorState, LoadingState } from "../components/ScreenState";
import { useAppTheme } from "../utils/theme";
import { useResponsiveLayout } from "../utils/layout";

export default function ModuleScreen({ navigation, route }) {
  const { colors } = useAppTheme();
  const layout = useResponsiveLayout();
  const { subject } = route.params;
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadModules = useCallback(async (isRefresh = false) => {
    try {
      setError("");
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const data = await getModules(subject._id);
      setModules(data.sort((left, right) => left.number - right.number));
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Failed to load modules.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [subject._id]);

  useFocusEffect(
    useCallback(() => {
      loadModules();
    }, [loadModules])
  );

  if (loading) {
    return <LoadingState label="Loading modules..." />;
  }

  if (error) {
    return <ErrorState title="Unable to load modules" subtitle={error} onRetry={() => loadModules()} />;
  }

  if (!modules.length) {
    return (
      <EmptyState
        title="No modules found"
        subtitle="This subject has no modules yet."
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        numColumns={layout.listColumns}
        refreshing={refreshing}
        onRefresh={() => loadModules(true)}
        columnWrapperStyle={layout.listColumns > 1 ? styles.columnWrapper : undefined}
        contentContainerStyle={[
          styles.list,
          {
            paddingHorizontal: layout.horizontalPadding,
            paddingVertical: layout.sectionGap,
          },
        ]}
        data={modules}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <View style={[styles.itemWrap, layout.listColumns > 1 && styles.itemWrapHalf]}>
            <Pressable
              onPress={() =>
                navigation.navigate("ModuleDetail", {
                  module: item,
                  subject,
                })
              }
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Text style={[styles.cardLabel, { color: colors.primary }]}>Module {item.number}</Text>
              <Text style={[styles.cardTitle, { color: colors.text }]}>{item.title}</Text>
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
    minHeight: 110,
    justifyContent: "center",
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
});
