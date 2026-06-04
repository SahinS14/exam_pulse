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

import { addBookmark, getBookmarks, removeBookmark, submitReport } from "../api/content";
import { useResponsiveLayout } from "../utils/layout";
import { useAppTheme } from "../utils/theme";

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

  useEffect(() => {
    let mounted = true;

    const loadBookmarks = async () => {
      const items = await getBookmarks();
      if (mounted) {
        setBookmarked(
          items.some((item) => item.questionId?._id === question._id)
        );
      }
    };

    loadBookmarks().catch(() => {});

    return () => {
      mounted = false;
    };
  }, [question._id]);

  const yearsLabel = useMemo(
    () =>
      question.yearAppeared
        ?.map((item) => `${item.examName} ${item.year}`)
        .join(", "),
    [question.yearAppeared]
  );

  const handleBookmark = async () => {
    try {
      setLoadingBookmark(true);
      if (bookmarked) {
        await removeBookmark(question._id);
        setBookmarked(false);
      } else {
        await addBookmark(question._id);
        setBookmarked(true);
      }
    } catch (error) {
      Alert.alert("Bookmark failed", "Please try again.");
    } finally {
      setLoadingBookmark(false);
    }
  };

  const handleReport = async (reason) => {
    try {
      await submitReport({ questionId: question._id, reason });
      setReportVisible(false);
      Alert.alert("Report submitted", "The admin has been notified.");
    } catch (error) {
      Alert.alert("Report failed", "Please try again.");
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            paddingHorizontal: layout.horizontalPadding,
            paddingBottom: layout.isTablet ? 40 : 32,
            alignItems: "center",
          },
        ]}
      >
        <View style={[styles.contentWrap, { maxWidth: layout.contentMaxWidth }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.badge, { color: colors.primary }]}>{question.markCategory}</Text>
          <Text style={[styles.frequency, { color: colors.subtext }]}>Frequency: {question.frequency}</Text>
        </View>
        <Text style={[styles.question, { color: colors.text }]}>{question.questionText}</Text>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Solution</Text>
        <Text style={[styles.body, { color: colors.subtext }]}>{question.solutionText}</Text>

        {question.images?.length ? (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Images</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.imageRow}
            >
              {question.images.map((imageUrl) => (
                <Image
                  key={imageUrl}
                  source={{ uri: imageUrl }}
                  style={[
                    styles.image,
                    {
                      width: layout.imagePreviewWidth,
                      height: layout.imagePreviewWidth * 0.7,
                    },
                  ]}
                />
              ))}
            </ScrollView>
          </>
        ) : null}

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Year Appeared</Text>
        <Text style={[styles.body, { color: colors.subtext }]}>{yearsLabel || "No exam history added."}</Text>

        <View style={[styles.actionRow, layout.wideActionRow && styles.actionRowWide]}>
          <Pressable
            disabled={loadingBookmark}
            onPress={handleBookmark}
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.primaryButtonText}>
              {bookmarked ? "Remove Bookmark" : "Save Bookmark"}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setReportVisible(true)}
            style={[
              styles.secondaryButton,
              { borderColor: colors.border, backgroundColor: colors.card },
            ]}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Report Issue</Text>
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
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Report this question</Text>
            {REPORT_REASONS.map((reason) => (
              <Pressable
                key={reason}
                onPress={() => handleReport(reason)}
                style={[styles.modalOption, { borderBottomColor: colors.border }]}
              >
                <Text style={[styles.modalOptionText, { color: colors.text }]}>{reason}</Text>
              </Pressable>
            ))}
            <Pressable
              onPress={() => setReportVisible(false)}
              style={styles.modalCancel}
            >
              <Text style={[styles.modalCancelText, { color: colors.primary }]}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { paddingTop: 20 },
  contentWrap: { width: "100%" },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  badge: { fontWeight: "700", fontSize: 14 },
  frequency: { fontWeight: "600", fontSize: 14 },
  question: {
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 30,
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 16,
    marginBottom: 8,
  },
  body: {
    fontSize: 15,
    lineHeight: 24,
  },
  imageRow: { gap: 12, paddingVertical: 4 },
  image: { borderRadius: 16, backgroundColor: "#dfe6f2" },
  actionRow: { marginTop: 22, gap: 12 },
  actionRowWide: { flexDirection: "row" },
  primaryButton: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    flex: 1,
  },
  primaryButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  secondaryButton: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 15,
    alignItems: "center",
    flex: 1,
  },
  secondaryButtonText: { fontWeight: "700", fontSize: 15 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(10, 20, 35, 0.35)",
    justifyContent: "flex-end",
  },
  modalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 6,
  },
  modalOption: {
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalOptionText: { fontSize: 15, fontWeight: "600" },
  modalCancel: {
    marginTop: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalCancelText: { fontWeight: "700" },
});
