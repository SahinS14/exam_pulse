import { FlatList, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";

import { useResponsiveLayout } from "../utils/layout";
import { useAppTheme } from "../utils/theme";

const options = [
  { key: "Topics", title: "Topics" },
  { key: "MostRepeated", title: "Most Repeated Questions" },
  { key: "Concepts", title: "Important Concepts" },
  { key: "Notes", title: "Notes" },
  { key: "Syllabus", title: "Syllabus" },
  { key: "TopRevision", title: "Top Revision Questions" },
];

export default function ModuleDetailScreen({ navigation, route }) {
  const { colors } = useAppTheme();
  const layout = useResponsiveLayout();
  const { module, subject } = route.params;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <FlatList
        numColumns={layout.listColumns}
        columnWrapperStyle={layout.listColumns > 1 ? styles.columnWrapper : undefined}
        contentContainerStyle={[
          styles.list,
          {
            paddingHorizontal: layout.horizontalPadding,
            paddingVertical: layout.sectionGap,
            alignItems: "center",
          },
        ]}
        data={options}
        keyExtractor={(item) => item.key}
        ListHeaderComponent={
          <View
            style={[
              styles.summaryCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                maxWidth: layout.contentMaxWidth,
              },
            ]}
          >
            <Text style={[styles.summaryLabel, { color: colors.primary }]}>
              {subject?.name || "Subject"}
            </Text>
            <Text style={[styles.summaryTitle, { color: colors.text }]}>
              Module {module.number}: {module.title}
            </Text>
            <Text style={[styles.summaryText, { color: colors.subtext }]}>
              Open topics, revision buckets, concepts, notes, and syllabus from here.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.itemWrap, layout.listColumns > 1 && styles.itemWrapHalf]}>
            <Pressable
              onPress={() => {
                if (item.key === "Topics") {
                  navigation.navigate("TopicList", { module });
                }
                if (item.key === "MostRepeated") {
                  navigation.navigate("MostRepeated", { module });
                }
                if (item.key === "Concepts") {
                  navigation.navigate("ConceptList", { module });
                }
                if (item.key === "Notes") {
                  navigation.navigate("Notes", { module });
                }
                if (item.key === "Syllabus") {
                  navigation.navigate("Syllabus", { subject });
                }
                if (item.key === "TopRevision") {
                  navigation.navigate("TopRevision", { module });
                }
              }}
              style={[
                styles.card,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.cardTitle, { color: colors.text }]}>{item.title}</Text>
            </Pressable>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  list: {
    alignItems: "center",
  },
  summaryCard: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 22,
    padding: 20,
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 8,
  },
  summaryTitle: {
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 8,
  },
  summaryText: {
    lineHeight: 21,
  },
  columnWrapper: { gap: 12 },
  itemWrap: { width: "100%", marginBottom: 12 },
  itemWrapHalf: { width: "50%", paddingHorizontal: 6 },
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    minHeight: 110,
    width: "100%",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
});
