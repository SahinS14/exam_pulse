import { useCallback, useState } from "react";
import { SafeAreaView, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { getMostRepeatedQuestions } from "../api/content";
import QuestionGroupList from "../components/QuestionGroupList";
import { ErrorState, LoadingState } from "../components/ScreenState";

export default function MostRepeatedScreen({ navigation, route }) {
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
      const data = await getMostRepeatedQuestions(module._id);
      setQuestions(data);
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Failed to load most repeated questions.");
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
    return <LoadingState label="Loading most repeated questions..." />;
  }

  if (error) {
    return <ErrorState title="Unable to load most repeated questions" subtitle={error} onRetry={() => loadQuestions()} />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <QuestionGroupList
        emptyTitle="No most repeated questions yet"
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
