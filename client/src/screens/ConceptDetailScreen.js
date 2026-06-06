import {
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import {
  fontWeights,
  radius,
  shadows,
  spacing,
  typography,
  useAppTheme,
} from "../utils/theme";
import { useResponsiveLayout } from "../utils/layout";

export default function ConceptDetailScreen({ route }) {
  const { colors } = useAppTheme();
  const layout = useResponsiveLayout();
  const { concept } = route.params;
  const images = Array.isArray(concept.images) ? concept.images.filter(Boolean) : [];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.container,
          {
            paddingHorizontal: layout.horizontalPadding,
            paddingBottom: spacing.xxxl,
            alignItems: "center",
          },
        ]}
      >
        <View style={[styles.contentWrap, { maxWidth: layout.contentMaxWidth }]}>
          <View
            style={[
              styles.heroCard,
              shadows.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={[styles.iconWrap, { backgroundColor: colors.accentLight }]}>
              <Ionicons name="bulb-outline" size={24} color={colors.accent} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>{concept.title}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Understand the idea clearly, then connect it back to your PYQs and revision flow.
            </Text>
          </View>

          <View
            style={[
              styles.bodyCard,
              shadows.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Explanation</Text>
            <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
              {concept.explanation}
            </Text>
          </View>

          <View style={styles.sectionWrap}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Supporting Images</Text>
            {images.length ? (
              <View style={styles.imageList}>
                {images.map((imageUrl, index) => (
                  <Image
                    key={`${imageUrl}-${index}`}
                    source={{ uri: imageUrl }}
                    style={[styles.image, { borderColor: colors.border }]}
                    resizeMode="cover"
                  />
                ))}
              </View>
            ) : (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No supporting images added for this concept yet.
              </Text>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    paddingTop: spacing.md,
  },
  contentWrap: {
    width: "100%",
  },
  heroCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.xxxl,
    fontWeight: fontWeights.extrabold,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.md,
    lineHeight: 22,
  },
  bodyCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionWrap: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.lg,
    fontWeight: fontWeights.bold,
    marginBottom: spacing.sm,
  },
  bodyText: {
    fontSize: typography.base,
    lineHeight: 24,
  },
  imageList: {
    gap: spacing.md,
  },
  image: {
    width: "100%",
    height: 220,
    borderRadius: radius.xl,
    borderWidth: 1,
    backgroundColor: "#FFFFFF",
  },
  emptyText: {
    fontSize: typography.md,
  },
});
