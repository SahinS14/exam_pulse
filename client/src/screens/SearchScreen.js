import { useEffect, useState } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { searchContent } from "../api/content";
import { EmptyState, LoadingState } from "../components/ScreenState";
import { useAppStore } from "../store/appStore";
import { useResponsiveLayout } from "../utils/layout";
import { useAppTheme } from "../utils/theme";

export default function SearchScreen({ navigation }) {
  const { colors } = useAppTheme();
  const layout = useResponsiveLayout();
  const selectedBranch = useAppStore((state) => state.selectedBranch);
  const selectedSemester = useAppStore((state) => state.selectedSemester);
  const contextHydrated = useAppStore((state) => state.hydrated);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState({
    questions: [],
    concepts: [],
    notes: [],
  });

  useEffect(() => {
    if (!query.trim() || !selectedBranch?._id || !selectedSemester?._id) {
      setResults({ questions: [], concepts: [], notes: [] });
      setError("");
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        setLoading(true);
        setError("");
        const data = await searchContent({
          q: query.trim(),
          branchId: selectedBranch._id,
          semesterId: selectedSemester._id,
        });
        setResults(data);
      } catch (loadError) {
        setError(loadError.response?.data?.message || "Search failed.");
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(timeoutId);
  }, [query, selectedBranch, selectedSemester]);

  const missingContext = !selectedBranch?._id || !selectedSemester?._id;
  const hasResults =
    results.questions.length || results.concepts.length || results.notes.length;

  if (!contextHydrated) {
    return <LoadingState label="Loading search context..." />;
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingHorizontal: layout.horizontalPadding,
            alignSelf: "center",
            width: "100%",
            maxWidth: layout.contentMaxWidth,
          },
        ]}
      >
        <TextInput
          onChangeText={setQuery}
          placeholder="Search questions, concepts, notes"
          placeholderTextColor="#7b879d"
          style={[
            styles.input,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              color: colors.text,
            },
          ]}
          value={query}
        />
        <Text style={[styles.context, { color: colors.subtext }]}>
          {selectedBranch?.name && selectedSemester?.number
            ? `${selectedBranch.name} • Semester ${selectedSemester.number}`
            : "Choose a branch and semester from Browse first"}
        </Text>
      </View>

      {loading ? <LoadingState label="Searching..." /> : null}

      {!loading && missingContext ? (
        <View style={styles.info}>
          <Text style={[styles.infoText, { color: colors.subtext }]}>
            Search is filtered by your selected branch and semester.
          </Text>
        </View>
      ) : null}

      {!loading && !missingContext && error ? (
        <View style={styles.info}>
          <Text style={[styles.infoText, { color: colors.dangerText }]}>{error}</Text>
        </View>
      ) : null}

      {!loading && !missingContext ? (
        <ScrollView contentContainerStyle={styles.results}>
          <ResultGroup
            items={results.questions}
            onPress={(item) => navigation.navigate("QuestionDetail", { question: item })}
            title="Questions"
          />
          <ResultGroup
            items={results.concepts}
            onPress={(item) => navigation.navigate("ConceptDetail", { concept: item })}
            title="Concepts"
          />
          <ResultGroup
            items={results.notes}
            onPress={(item) =>
              navigation.navigate("WebViewer", { title: item.title, url: item.fileUrl })
            }
            title="Notes"
          />
          {!hasResults && query.trim() && !error ? (
            <EmptyState
              title="No search results"
              subtitle="Try a different keyword or browse a different branch and semester."
            />
          ) : null}
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}

function ResultGroup({ title, items, onPress }) {
  const { colors } = useAppTheme();

  if (!items.length) {
    return null;
  }

  return (
    <View style={styles.group}>
      <Text style={[styles.groupTitle, { color: colors.text }]}>{title}</Text>
      {items.map((item) => (
        <Pressable
          key={item._id}
          onPress={() => onPress(item)}
          style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            {item.questionText || item.title}
          </Text>
          <Text numberOfLines={2} style={[styles.cardSubtitle, { color: colors.subtext }]}>
            {item.solutionText || item.explanation || item.type}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { paddingTop: 16 },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  context: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: "600",
  },
  info: { paddingHorizontal: 16, paddingTop: 20 },
  infoText: { fontSize: 15, lineHeight: 22 },
  results: {
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 28,
    gap: 18,
    alignItems: "center",
  },
  group: { gap: 10 },
  groupTitle: { fontSize: 18, fontWeight: "800" },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    width: "100%",
    maxWidth: 920,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", marginBottom: 6 },
  cardSubtitle: { lineHeight: 20 },
});
