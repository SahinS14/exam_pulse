import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { addBookmark, getBookmarks, removeBookmark, submitReport } from "../api/content";
import StatBadge from "../components/StatBadge";
import Toast from "../components/Toast";
import { useResponsiveLayout } from "../utils/layout";
import {
  fontWeights,
  radius,
  shadows,
  spacing,
  typography,
  useAppTheme,
} from "../utils/theme";

const REPORT_REASONS = [
  "Wrong Solution",
  "Missing Diagram",
  "Incorrect Answer",
  "Broken PDF",
];

export default function QuestionDetailScreen({ route }) {
  const { colors } = useAppTheme();
  const layout = useResponsiveLayout();
  const { question } = route.params;
  const [bookmarked, setBookmarked] = useState(false);
  const [loadingBookmark, setLoadingBookmark] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "info" });

  useEffect(() => {
    let mounted = true;

    const loadBookmarks = async () => {
      const items = await getBookmarks();
      if (mounted) {
        setBookmarked(items.some((item) => item.questionId?._id === question._id));
      }
    };

    loadBookmarks().catch(() => {});

    return () => {
      mounted = false;
    };
  }, [question._id]);

  const years = useMemo(
    () => question.yearAppeared?.map((item) => `${item.examName} ${item.year}`) || [],
    [question.yearAppeared]
  );
  const images = Array.isArray(question.images) ? question.images.filter(Boolean) : [];

  const highFrequency = Number(question.frequency) > 3;
  const compactLayout = layout.width < 390;
  const imageCardWidth = compactLayout ? 152 : 180;

  const handleBookmark = async () => {
    try {
      setLoadingBookmark(true);
      if (bookmarked) {
        await removeBookmark(question._id);
        setBookmarked(false);
        setToast({ message: "Bookmark removed", type: "success" });
      } else {
        await addBookmark(question._id);
        setBookmarked(true);
        setToast({ message: "Bookmark added", type: "success" });
      }
    } catch (error) {
      setToast({ message: "Bookmark failed", type: "error" });
    } finally {
      setLoadingBookmark(false);
    }
  };

  const handleReport = async (reason) => {
    try {
      await submitReport({ questionId: question._id, reason });
      setReportVisible(false);
      setToast({ message: "Report submitted", type: "success" });
    } catch (error) {
      if (error.response?.status === 409) {
        setReportVisible(false);
        setToast({
          message: error.response?.data?.message || "You already reported this question.",
          type: "info",
        });
        return;
      }

      Alert.alert(
        "Report failed",
        error.response?.data?.message || "Please try again."
      );
    }
  };

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
              styles.headerCard,
              shadows.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.badgesRow}>
              <StatBadge label={question.markCategory || "Question"} color="primary" />
              {Number(question.frequency) > 0 ? (
                <StatBadge
                  label={`${highFrequency ? "🔥 " : ""}${question.frequency}x frequency`}
                  color={highFrequency ? "accent" : "success"}
                />
              ) : null}
            </View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Question Detail</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              Review the PYQ, check solution steps, and save it for quick revision.
            </Text>
          </View>

          <View
            style={[
              styles.questionCard,
              shadows.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.cardHeaderRow}>
              <View style={[styles.cardHeaderIcon, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="help-circle-outline" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.cardHeaderTitle, { color: colors.text }]}>Question</Text>
            </View>
            <Text style={[styles.questionText, { color: colors.text }]}>
              {question.questionText}
            </Text>
          </View>

          <View
            style={[
              styles.solutionCard,
              {
                backgroundColor: colors.successLight,
                borderColor: colors.success,
              },
            ]}
          >
            <View style={styles.cardHeaderRow}>
              <View style={[styles.cardHeaderIcon, { backgroundColor: "#FFFFFF" }]}>
                <Ionicons name="checkmark-done-outline" size={20} color={colors.success} />
              </View>
              <Text style={[styles.solutionTitle, { color: colors.success }]}>Solution</Text>
            </View>
            <Text style={[styles.solutionText, { color: colors.text }]}>
              {question.solutionText || "Solution not available yet."}
            </Text>
          </View>

          <View style={[styles.infoGrid, compactLayout && styles.infoGridStacked]}>
            <View
              style={[
                styles.infoCard,
                shadows.card,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Frequency</Text>
              <Text style={[styles.infoValue, { color: highFrequency ? colors.accent : colors.text }]}>
                {Number(question.frequency) || 0}
              </Text>
            </View>
            <View
              style={[
                styles.infoCard,
                shadows.card,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Diagrams</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {images.length}
              </Text>
            </View>
          </View>

          <View style={styles.sectionWrap}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Year Appeared</Text>
            {years.length ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.yearsRow}
              >
                {years.map((item) => (
                  <View
                    key={item}
                    style={[
                      styles.yearChip,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.yearChipText, { color: colors.textSecondary }]}>
                      {item}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <Text style={[styles.mutedText, { color: colors.textSecondary }]}>
                No exam history added yet.
              </Text>
            )}
          </View>

          <View style={styles.sectionWrap}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Images</Text>
            {images.length ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.imageRow}
              >
                {images.map((imageUrl, index) => (
                  <Image
                    key={`${imageUrl}-${index}`}
                    source={{ uri: imageUrl }}
                    style={[
                      styles.questionImage,
                      {
                        borderColor: colors.border,
                        width: imageCardWidth,
                      },
                    ]}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>
            ) : (
              <Text style={[styles.mutedText, { color: colors.textSecondary }]}>
                No diagrams or supporting images added.
              </Text>
            )}
          </View>

          <View style={[styles.actionsRow, compactLayout && styles.actionsRowStacked]}>
            <Pressable
              disabled={loadingBookmark}
              onPress={handleBookmark}
              style={[
                styles.primaryButton,
                {
                  backgroundColor: colors.primary,
                },
              ]}
            >
              <Ionicons
                name={bookmarked ? "bookmark" : "bookmark-outline"}
                size={18}
                color="#FFFFFF"
              />
              <Text style={styles.primaryButtonText}>
                {bookmarked ? "Saved" : "Save"}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setReportVisible(true)}
              style={[
                styles.secondaryButton,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons name="flag-outline" size={18} color={colors.text} />
              <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
                Report
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <Modal
        animationType="slide"
        transparent
        visible={reportVisible}
        onRequestClose={() => setReportVisible(false)}
      >
        <View style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}>
          <View
            style={[
              styles.modalCard,
              shadows.modal,
              {
                backgroundColor: colors.surface,
              },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>Report this question</Text>
            {REPORT_REASONS.map((reason) => (
              <Pressable
                key={reason}
                onPress={() => handleReport(reason)}
                style={[
                  styles.modalOption,
                  {
                    borderBottomColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.modalOptionText, { color: colors.text }]}>{reason}</Text>
              </Pressable>
            ))}
            <Pressable onPress={() => setReportVisible(false)} style={styles.modalCancel}>
              <Text style={[styles.modalCancelText, { color: colors.primary }]}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <Toast message={toast.message} type={toast.type} />
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
  headerCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  headerTitle: {
    fontSize: typography.xxxl,
    fontWeight: fontWeights.extrabold,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: typography.md,
    lineHeight: 22,
  },
  questionCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  cardHeaderIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  cardHeaderTitle: {
    fontSize: typography.lg,
    fontWeight: fontWeights.bold,
  },
  questionText: {
    fontSize: typography.xl,
    lineHeight: 32,
    fontWeight: fontWeights.extrabold,
  },
  solutionCard: {
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  solutionTitle: {
    fontSize: typography.lg,
    fontWeight: fontWeights.bold,
  },
  solutionText: {
    fontSize: typography.base,
    lineHeight: 24,
  },
  infoGrid: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  infoGridStacked: {
    flexDirection: "column",
  },
  infoCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  infoLabel: {
    fontSize: typography.sm,
    fontWeight: fontWeights.medium,
    marginBottom: spacing.xxs,
  },
  infoValue: {
    fontSize: typography.xxl,
    fontWeight: fontWeights.extrabold,
  },
  sectionWrap: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.lg,
    fontWeight: fontWeights.bold,
    marginBottom: spacing.sm,
  },
  yearsRow: {
    paddingBottom: spacing.xs,
  },
  yearChip: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
  },
  yearChipText: {
    fontSize: typography.md,
    fontWeight: fontWeights.medium,
  },
  imageRow: {
    paddingBottom: spacing.xs,
  },
  questionImage: {
    height: 128,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginRight: spacing.sm,
    backgroundColor: "#FFFFFF",
  },
  mutedText: {
    fontSize: typography.md,
  },
  actionsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  actionsRowStacked: {
    flexDirection: "column",
  },
  primaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: typography.base,
    fontWeight: fontWeights.bold,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingVertical: spacing.md,
  },
  secondaryButtonText: {
    fontSize: typography.base,
    fontWeight: fontWeights.bold,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalCard: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
  },
  modalTitle: {
    fontSize: typography.xl,
    fontWeight: fontWeights.extrabold,
    marginBottom: spacing.md,
  },
  modalOption: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  modalOptionText: {
    fontSize: typography.base,
    fontWeight: fontWeights.medium,
  },
  modalCancel: {
    alignItems: "center",
    paddingTop: spacing.md,
  },
  modalCancelText: {
    fontSize: typography.base,
    fontWeight: fontWeights.bold,
  },
});
