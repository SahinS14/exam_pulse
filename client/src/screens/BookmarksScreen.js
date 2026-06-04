import { useCallback, useState } from "react";
import { SafeAreaView, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { getBookmarks } from "../api/content";
import QuestionGroupList from "../components/QuestionGroupList";
import { ErrorState, LoadingState } from "../components/ScreenState";

export default function BookmarksScreen({ navigation }) {
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadBookmarks = useCallback(async (isRefresh = false) => {
    try {
      setError("");
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const data = await getBookmarks();
      setBookmarks(
        data.map((item) => item.questionId).filter(Boolean)
      );
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Failed to load bookmarks.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadBookmarks();
    }, [loadBookmarks])
  );

  if (loading) {
    return <LoadingState label="Loading bookmarks..." />;
  }

  if (error) {
    return <ErrorState title="Unable to load bookmarks" subtitle={error} onRetry={() => loadBookmarks()} />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <QuestionGroupList
        emptyTitle="No bookmarks yet"
        onPressQuestion={(question) =>
          navigation.navigate("QuestionDetail", { question })
        }
        questions={bookmarks}
        refreshing={refreshing}
        onRefresh={() => loadBookmarks(true)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
});
