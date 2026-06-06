import { SafeAreaView, ScrollView, Pressable, StyleSheet, Text, View } from "react-native";

import { useResponsiveLayout } from "../../utils/layout";
import { useAppTheme } from "../../utils/theme";

const actions = [
  { key: "branch", title: "Manage Branches", route: "AdminEntityManager", params: { resource: "branch" } },
  { key: "semester", title: "Manage Semesters", route: "AdminEntityManager", params: { resource: "semester" } },
  { key: "subject", title: "Manage Subjects", route: "AdminEntityManager", params: { resource: "subject" } },
  { key: "module", title: "Manage Modules", route: "AdminEntityManager", params: { resource: "module" } },
  { key: "topic", title: "Manage Topics", route: "AdminEntityManager", params: { resource: "topic" } },
  { key: "question", title: "Manage Questions", route: "AdminQuestions" },
  { key: "concept", title: "Manage Concepts", route: "AdminEntityManager", params: { resource: "concept" } },
  { key: "note", title: "Manage Notes", route: "AdminNotes" },
  { key: "notifications", title: "Send Notifications", route: "AdminNotifications" },
  { key: "users", title: "View Users", route: "AdminUsers" },
  { key: "reports", title: "View Reports", route: "AdminReports" },
];

export default function AdminDashboardScreen({ navigation }) {
  const { colors } = useAppTheme();
  const layout = useResponsiveLayout();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            paddingHorizontal: layout.horizontalPadding,
            paddingVertical: layout.sectionGap,
            alignItems: "center",
          },
        ]}
      >
        <View style={[styles.contentWrap, { maxWidth: layout.contentMaxWidth }]}>
        <Text style={[styles.heading, { color: colors.text, fontSize: layout.heroTitleSize }]}>Admin Panel</Text>
        <Text style={[styles.subtitle, { color: colors.subtext }]}>
          Manage the complete ExamPulse content structure and student access from here.
        </Text>

        <View style={styles.grid}>
          {actions.map((action) => (
            <View
              key={action.key}
              style={[
                styles.gridItem,
                layout.listColumns > 1 && styles.gridItemHalf,
              ]}
            >
              <Pressable
                onPress={() => navigation.navigate(action.route, action.params)}
                style={[
                  styles.card,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.cardTitle, { color: colors.text }]}>{action.title}</Text>
              </Pressable>
            </View>
          ))}
        </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { gap: 12 },
  contentWrap: { width: "100%" },
  heading: {
    fontWeight: "800",
    marginBottom: 6,
  },
  subtitle: {
    lineHeight: 22,
    marginBottom: 16,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -6,
  },
  gridItem: {
    width: "100%",
    paddingHorizontal: 6,
    marginBottom: 12,
  },
  gridItemHalf: {
    width: "50%",
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    minHeight: 100,
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
});
