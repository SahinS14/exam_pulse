import { useCallback, useState } from "react";
import { SafeAreaView, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { getTopRevisionQuestions } from "../api/content";
import QuestionGroupList from "../components/QuestionGroupList";
import { ErrorState, LoadingState } from "../components/ScreenState";

export default function TopRevisionScreen({ navigation, route }) {
  const { module } = route.params;
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadQuestions = useCallback(async (isRefresh = false) => {
    try {
      setError("");
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const data = await getTopRevisionQuestions(module._id);
      setQuestions(data);
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Failed to load top revision questions.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [module._id]);

  useFocusEffect(
    useCallback(() => {
      loadQuestions();
    }, [loadQuestions])
  );

  if (loading) {
    return <LoadingState label="Loading top revision questions..." />;
  }

  if (error) {
    return <ErrorState title="Unable to load top revision questions" subtitle={error} onRetry={() => loadQuestions()} />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <QuestionGroupList
        emptyTitle="No top revision questions yet"
        onPressQuestion={(question) =>
          navigation.navigate("QuestionDetail", { question })
        }
        questions={questions}
        refreshing={refreshing}
        onRefresh={() => loadQuestions(true)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
});
