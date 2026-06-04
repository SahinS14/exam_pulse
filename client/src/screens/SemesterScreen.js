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

import { getSemesters } from "../api/content";
import { EmptyState, ErrorState, LoadingState } from "../components/ScreenState";
import { useAppStore } from "../store/appStore";
import { useAppTheme } from "../utils/theme";
import { useResponsiveLayout } from "../utils/layout";

export default function SemesterScreen({ navigation, route }) {
  const { colors } = useAppTheme();
  const layout = useResponsiveLayout();
  const { branch } = route.params;
  const setSelectedSemester = useAppStore((state) => state.setSelectedSemester);
  const [semesters, setSemesters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadSemesters = useCallback(async (isRefresh = false) => {
    try {
      setError("");
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const data = await getSemesters(branch._id);
      setSemesters(data.sort((left, right) => left.number - right.number));
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Failed to load semesters.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [branch._id]);

  useFocusEffect(
    useCallback(() => {
      loadSemesters();
    }, [loadSemesters])
  );

  if (loading) {
    return <LoadingState label="Loading semesters..." />;
  }

  if (error) {
    return <ErrorState title="Unable to load semesters" subtitle={error} onRetry={() => loadSemesters()} />;
  }

  if (!semesters.length) {
    return (
      <EmptyState
        title="No semesters found"
        subtitle="This branch has no semester content yet."
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        numColumns={layout.listColumns}
        refreshing={refreshing}
        onRefresh={() => loadSemesters(true)}
        columnWrapperStyle={layout.listColumns > 1 ? styles.columnWrapper : undefined}
        contentContainerStyle={[
          styles.list,
          {
            paddingHorizontal: layout.horizontalPadding,
            paddingVertical: layout.sectionGap,
          },
        ]}
        data={semesters}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <View style={[styles.itemWrap, layout.listColumns > 1 && styles.itemWrapHalf]}>
            <Pressable
              onPress={() => {
                setSelectedSemester(item);
                navigation.navigate("Subject", { branch, semester: item });
              }}
              style={[
                styles.card,
                styles.cardFill,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.cardTitle, { color: colors.text }]}>Semester {item.number}</Text>
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
