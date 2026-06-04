import { useCallback, useState } from "react";
import { SafeAreaView, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { getQuestionsByTopic } from "../api/content";
import QuestionGroupList from "../components/QuestionGroupList";
import { ErrorState, LoadingState } from "../components/ScreenState";

export default function QuestionListScreen({ navigation, route }) {
  const { topic } = route.params;
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
      const data = await getQuestionsByTopic(topic._id);
      setQuestions(data);
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Failed to load questions.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [topic._id]);

  useFocusEffect(
    useCallback(() => {
      loadQuestions();
    }, [loadQuestions])
  );

  if (loading) {
    return <LoadingState label="Loading questions..." />;
  }

  if (error) {
    return <ErrorState title="Unable to load questions" subtitle={error} onRetry={() => loadQuestions()} />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <QuestionGroupList
        emptyTitle="No questions found for this topic"
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
