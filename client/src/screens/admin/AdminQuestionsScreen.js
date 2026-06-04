import { useCallback, useMemo, useState } from "react";
import { Alert, FlatList, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { deleteAdminQuestion, getAdminModules, getAdminQuestions, getAdminSubjects, getAdminTopics } from "../../api/admin";
import { EmptyState, LoadingState } from "../../components/ScreenState";

export default function AdminQuestionsScreen({ navigation }) {
  const [questions, setQuestions] = useState([]);
  const [topics, setTopics] = useState([]);
  const [modules, setModules] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [nextQuestions, nextTopics, nextModules, nextSubjects] = await Promise.all([
        getAdminQuestions(),
        getAdminTopics(),
        getAdminModules(),
        getAdminSubjects(),
      ]);
      setQuestions(nextQuestions);
      setTopics(nextTopics);
      setModules(nextModules);
      setSubjects(nextSubjects);
    } catch (error) {
      Alert.alert("Failed to load questions", "Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const topicMap = useMemo(
    () => Object.fromEntries(topics.map((item) => [item._id, item])),
    [topics]
  );
  const moduleMap = useMemo(
    () => Object.fromEntries(modules.map((item) => [item._id, item])),
    [modules]
  );
  const subjectMap = useMemo(
    () => Object.fromEntries(subjects.map((item) => [item._id, item])),
    [subjects]
  );

  const handleDelete = (questionId) => {
    Alert.alert("Delete question", "This action cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteAdminQuestion(questionId);
            await loadData();
          } catch (error) {
            Alert.alert("Delete failed", "Please try again.");
          }
        },
      },
    ]);
  };

  if (loading) {
    return <LoadingState label="Loading questions..." />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        contentContainerStyle={styles.list}
        data={questions}
        keyExtractor={(item) => item._id}
        ListHeaderComponent={
          <Pressable
            onPress={() => navigation.navigate("AdminQuestionForm")}
            style={styles.addButton}
          >
            <Text style={styles.addButtonText}>Add Question</Text>
          </Pressable>
        }
        ListEmptyComponent={
          <EmptyState title="No questions yet" subtitle="Add the first question to populate student content." />
        }
        renderItem={({ item }) => {
          const topic = topicMap[item.topicId];
          const module = topic ? moduleMap[topic.moduleId] : null;
          const subject = module ? subjectMap[module.subjectId] : null;

          return (
            <View style={styles.card}>
              <View style={styles.headerRow}>
                <Text style={styles.badge}>{item.markCategory}</Text>
                <Text style={styles.frequency}>Frequency: {item.frequency}</Text>
              </View>
              <Text style={styles.cardTitle}>{item.questionText}</Text>
              <Text style={styles.cardSubtitle}>
                {subject?.name || "Subject unavailable"}
                {" • "}
                {module ? `Module ${module.number}` : "Module unavailable"}
                {" • "}
                {topic?.name || "Topic unavailable"}
              </Text>
              <View style={styles.actionRow}>
                <Pressable
                  onPress={() => navigation.navigate("AdminQuestionForm", { question: item })}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>Edit</Text>
                </Pressable>
                <Pressable
                  onPress={() => handleDelete(item._id)}
                  style={styles.dangerButton}
                >
                  <Text style={styles.dangerButtonText}>Delete</Text>
                </Pressable>
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f4f7fb" },
  list: { padding: 16, gap: 12, flexGrow: 1 },
  addButton: {
    backgroundColor: "#1f6feb",
    borderRadius: 14,
    alignItems: "center",
    paddingVertical: 15,
    marginBottom: 12,
  },
  addButtonText: { color: "#ffffff", fontWeight: "700", fontSize: 15 },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#dce4f2",
    padding: 16,
    marginBottom: 12,
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  badge: { color: "#1f6feb", fontWeight: "700" },
  frequency: { color: "#61728d", fontWeight: "600" },
  cardTitle: { color: "#13243c", fontSize: 16, fontWeight: "800", lineHeight: 22 },
  cardSubtitle: { color: "#62738d", marginTop: 8, lineHeight: 20 },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d4deee",
    borderRadius: 12,
    alignItems: "center",
    paddingVertical: 14,
    backgroundColor: "#ffffff",
  },
  secondaryButtonText: { color: "#20354f", fontWeight: "700" },
  dangerButton: {
    flex: 1,
    backgroundColor: "#fff1f0",
    borderRadius: 12,
    alignItems: "center",
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#f0c5c1",
  },
  dangerButtonText: { color: "#b42318", fontWeight: "700" },
});

