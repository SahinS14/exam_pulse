import { useMemo, useState } from "react";
import * as DocumentPicker from "expo-document-picker";
import {
  Alert,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import AdminSelectorModal from "../../components/AdminSelectorModal";
import { LoadingState } from "../../components/ScreenState";
import {
  createAdminQuestion,
  getAdminModules,
  getAdminSubjects,
  getAdminTopics,
  updateAdminQuestion,
  uploadAdminFile,
} from "../../api/admin";
import { validateUploadAsset } from "../../utils/uploadValidation";

const MARK_CATEGORIES = ["1 Mark", "2 Mark", "5 Mark", "10 Mark", "Short", "Long"];
const EMPTY_EXAM_GROUP = { examName: "", yearsText: "" };

const buildExamGroups = (yearAppeared = []) => {
  const groupedEntries = yearAppeared.reduce((accumulator, item) => {
    const examName = item?.examName?.trim();
    const year = item?.year ? String(item.year).trim() : "";

    if (!examName || !year) {
      return accumulator;
    }

    if (!accumulator[examName]) {
      accumulator[examName] = [];
    }

    if (!accumulator[examName].includes(year)) {
      accumulator[examName].push(year);
    }

    return accumulator;
  }, {});

  const examGroups = Object.entries(groupedEntries).map(([examName, years]) => ({
    examName,
    yearsText: years.join(", "),
  }));

  return examGroups.length ? examGroups : [{ ...EMPTY_EXAM_GROUP }];
};

export default function AdminQuestionFormScreen({ navigation, route }) {
  const editingQuestion = route.params?.question;
  const [topics, setTopics] = useState([]);
  const [modules, setModules] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectorVisible, setSelectorVisible] = useState(false);
  const [markSelectorVisible, setMarkSelectorVisible] = useState(false);
  const [form, setForm] = useState({
    questionText: editingQuestion?.questionText || "",
    solutionText: editingQuestion?.solutionText || "",
    markCategory: editingQuestion?.markCategory || "",
    images: editingQuestion?.images || [],
    examGroups: buildExamGroups(editingQuestion?.yearAppeared),
    tags: editingQuestion?.tags || [],
    tagInput: "",
    topicId: editingQuestion?.topicId || "",
    isMostRepeated: Boolean(editingQuestion?.isMostRepeated),
    isTopRevision: Boolean(editingQuestion?.isTopRevision),
  });

  useFocusEffect(
    useMemo(
      () => () => {
        let mounted = true;

        const loadLookups = async () => {
          try {
            setLoading(true);
            const [nextTopics, nextModules, nextSubjects] = await Promise.all([
              getAdminTopics(),
              getAdminModules(),
              getAdminSubjects(),
            ]);

            if (mounted) {
              setTopics(nextTopics);
              setModules(nextModules);
              setSubjects(nextSubjects);
            }
          } catch (error) {
            Alert.alert("Failed to load form data", "Please try again.");
          } finally {
            if (mounted) {
              setLoading(false);
            }
          }
        };

        loadLookups();

        return () => {
          mounted = false;
        };
      },
      []
    )
  );

  const moduleMap = useMemo(
    () => Object.fromEntries(modules.map((item) => [item._id, item])),
    [modules]
  );
  const subjectMap = useMemo(
    () => Object.fromEntries(subjects.map((item) => [item._id, item])),
    [subjects]
  );
  const selectedTopic = topics.find((item) => item._id === form.topicId);
  const validExamEntries = form.examGroups.flatMap((item) => {
    const examName = item.examName.trim();

    if (!examName) {
      return [];
    }

    return item.yearsText
      .split(/[,\n]/)
      .map((year) => year.trim())
      .filter((year) => Number.isInteger(Number(year)) && Number(year) > 0)
      .map((year) => ({
        examName,
        year: Number(year),
      }));
  });
  const computedFrequency = validExamEntries.length;

  const handleUploadImage = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "image/*" });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const selectedAsset = result.assets[0];
      const validationMessage = validateUploadAsset(selectedAsset, {
        allowImage: true,
      });

      if (validationMessage) {
        Alert.alert("Invalid image", validationMessage);
        return;
      }

      setUploading(true);
      const upload = await uploadAdminFile(selectedAsset);
      setForm((current) => ({
        ...current,
        images: [...current.images, upload.url],
      }));
    } catch (error) {
      const message =
        error.response?.data?.errors?.[0]?.message ||
        error.response?.data?.message ||
        "Please try again.";
      Alert.alert("Image upload failed", message);
    } finally {
      setUploading(false);
    }
  };

  const handleExamGroupChange = (index, field, value) => {
    setForm((current) => ({
      ...current,
      examGroups: current.examGroups.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const handleAddExamGroup = () => {
    setForm((current) => ({
      ...current,
      examGroups: [...current.examGroups, { ...EMPTY_EXAM_GROUP }],
    }));
  };

  const handleRemoveExamGroup = (index) => {
    setForm((current) => ({
      ...current,
      examGroups:
        current.examGroups.length === 1
          ? [{ ...EMPTY_EXAM_GROUP }]
          : current.examGroups.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const handleAddTag = () => {
    const tag = form.tagInput.trim();

    if (!tag) {
      return;
    }

    setForm((current) => ({
      ...current,
      tags: current.tags.includes(tag) ? current.tags : [...current.tags, tag],
      tagInput: "",
    }));
  };

  const handleRemoveTag = (tagToRemove) => {
    setForm((current) => ({
      ...current,
      tags: current.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  const handleSave = async () => {
    if (
      !form.questionText.trim() ||
      !form.solutionText.trim() ||
      !form.markCategory ||
      !form.topicId
    ) {
      Alert.alert("Missing information", "Question, solution, mark category, and topic are required.");
      return;
    }

    const payload = {
      questionText: form.questionText.trim(),
      solutionText: form.solutionText.trim(),
      markCategory: form.markCategory,
      images: form.images,
      yearAppeared: validExamEntries.map((item) => ({
        examName: item.examName.trim(),
        year: Number(item.year),
      })),
      tags: form.tags,
      topicId: form.topicId,
      isMostRepeated: form.isMostRepeated,
      isTopRevision: form.isTopRevision,
    };

    try {
      setSaving(true);
      if (editingQuestion) {
        await updateAdminQuestion(editingQuestion._id, payload);
      } else {
        await createAdminQuestion(payload);
      }
      navigation.goBack();
    } catch (error) {
      const message =
        error.response?.data?.errors?.[0]?.message ||
        error.response?.data?.message ||
        "Please try again.";
      Alert.alert("Save failed", message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingState label="Loading question form..." />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <TextInput
          multiline
          onChangeText={(value) => setForm((current) => ({ ...current, questionText: value }))}
          placeholder="Question text"
          placeholderTextColor="#7f8aa3"
          style={[styles.input, styles.multiline]}
          textAlignVertical="top"
          value={form.questionText}
        />
        <TextInput
          multiline
          onChangeText={(value) => setForm((current) => ({ ...current, solutionText: value }))}
          placeholder="Solution text"
          placeholderTextColor="#7f8aa3"
          style={[styles.input, styles.multiline]}
          textAlignVertical="top"
          value={form.solutionText}
        />
        <SelectorField
          label="Mark Category"
          onPress={() => setMarkSelectorVisible(true)}
          value={form.markCategory}
        />
        <SelectorField
          label="Topic"
          onPress={() => setSelectorVisible(true)}
          value={
            selectedTopic
              ? `${selectedTopic.name} • ${moduleMap[selectedTopic.moduleId]?.title || "Module unavailable"}`
              : ""
          }
        />
        <View style={styles.groupCard}>
          <Text style={styles.groupTitle}>Exam Appearance</Text>
          <Text style={styles.groupSubtitle}>
            Add the exam name once, then list all years for that exam like 2023, 2021.
          </Text>
          {form.examGroups.map((item, index) => (
            <View key={`exam-${index}`} style={styles.examRow}>
              <TextInput
                onChangeText={(value) => handleExamGroupChange(index, "examName", value)}
                placeholder="Exam name"
                placeholderTextColor="#7f8aa3"
                style={[styles.input, styles.examNameInput]}
                value={item.examName}
              />
              <TextInput
                onChangeText={(value) => handleExamGroupChange(index, "yearsText", value)}
                placeholder="Years (example: 2023, 2021)"
                placeholderTextColor="#7f8aa3"
                style={[styles.input, styles.examYearInput]}
                value={item.yearsText}
              />
              <Pressable
                onPress={() => handleRemoveExamGroup(index)}
                style={styles.removeMiniButton}
              >
                <Text style={styles.removeMiniButtonText}>Remove</Text>
              </Pressable>
            </View>
          ))}
          <Pressable onPress={handleAddExamGroup} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Add Exam Name</Text>
          </Pressable>
          <View style={styles.frequencyBox}>
            <Text style={styles.frequencyLabel}>Auto Frequency</Text>
            <Text style={styles.frequencyValue}>{computedFrequency}</Text>
          </View>
        </View>

        <View style={styles.groupCard}>
          <Text style={styles.groupTitle}>Tags</Text>
          <View style={styles.tagInputRow}>
            <TextInput
              onChangeText={(value) => setForm((current) => ({ ...current, tagInput: value }))}
              placeholder="Add tag"
              placeholderTextColor="#7f8aa3"
              style={[styles.input, styles.tagInput]}
              value={form.tagInput}
            />
            <Pressable onPress={handleAddTag} style={styles.addTagButton}>
              <Text style={styles.addTagButtonText}>Add</Text>
            </Pressable>
          </View>
          <View style={styles.tagsWrap}>
            {form.tags.length ? (
              form.tags.map((tag) => (
                <Pressable
                  key={tag}
                  onPress={() => handleRemoveTag(tag)}
                  style={styles.tagChip}
                >
                  <Text style={styles.tagChipText}>{tag} ×</Text>
                </Pressable>
              ))
            ) : (
              <Text style={styles.groupSubtitle}>No tags added yet.</Text>
            )}
          </View>
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Most Repeated</Text>
          <Switch
            onValueChange={(value) =>
              setForm((current) => ({ ...current, isMostRepeated: value }))
            }
            value={form.isMostRepeated}
          />
        </View>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Top Revision</Text>
          <Switch
            onValueChange={(value) =>
              setForm((current) => ({ ...current, isTopRevision: value }))
            }
            value={form.isTopRevision}
          />
        </View>

        <Pressable onPress={handleUploadImage} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>
            {uploading ? "Uploading..." : "Add Image"}
          </Text>
        </Pressable>

        {form.images.length ? (
          <View style={styles.imageList}>
            {form.images.map((imageUrl, index) => (
              <View key={`${imageUrl}-${index}`} style={styles.imageCard}>
                <Image source={{ uri: imageUrl }} style={styles.image} />
                <Pressable
                  onPress={() =>
                    setForm((current) => ({
                      ...current,
                      images: current.images.filter((_, itemIndex) => itemIndex !== index),
                    }))
                  }
                  style={styles.removeButton}
                >
                  <Text style={styles.removeButtonText}>Remove</Text>
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}

        <Pressable
          disabled={saving}
          onPress={handleSave}
          style={[styles.primaryButton, saving && styles.buttonDisabled]}
        >
          <Text style={styles.primaryButtonText}>{saving ? "Saving..." : "Save Question"}</Text>
        </Pressable>
      </ScrollView>

      <AdminSelectorModal
        visible={selectorVisible}
        title="Select Topic"
        items={topics}
        onClose={() => setSelectorVisible(false)}
        onSelect={(item) => {
          setForm((current) => ({ ...current, topicId: item._id }));
          setSelectorVisible(false);
        }}
        getLabel={(item) => item.name}
        getDescription={(item) => {
          const module = moduleMap[item.moduleId];
          const subject = module ? subjectMap[module.subjectId] : null;
          return `${subject?.name || "Subject unavailable"} • ${module ? `Module ${module.number}: ${module.title}` : "Module unavailable"}`;
        }}
      />

      <Modal
        animationType="slide"
        transparent
        visible={markSelectorVisible}
        onRequestClose={() => setMarkSelectorVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select Mark Category</Text>
            {MARK_CATEGORIES.map((item) => (
              <Pressable
                key={item}
                onPress={() => {
                  setForm((current) => ({ ...current, markCategory: item }));
                  setMarkSelectorVisible(false);
                }}
                style={styles.modalOption}
              >
                <Text style={styles.modalOptionText}>{item}</Text>
              </Pressable>
            ))}
            <Pressable
              onPress={() => setMarkSelectorVisible(false)}
              style={styles.modalClose}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function SelectorField({ label, value, onPress }) {
  return (
    <Pressable onPress={onPress} style={styles.selectorField}>
      <Text style={styles.selectorLabel}>{label}</Text>
      <Text style={styles.selectorValue}>{value || "Tap to choose"}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f4f7fb" },
  container: { padding: 16, gap: 12, paddingBottom: 28 },
  groupCard: {
    borderWidth: 1,
    borderColor: "#d6dfee",
    borderRadius: 14,
    backgroundColor: "#ffffff",
    padding: 14,
    gap: 10,
  },
  groupTitle: {
    color: "#172840",
    fontSize: 16,
    fontWeight: "800",
  },
  groupSubtitle: {
    color: "#5f708c",
    lineHeight: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d6dfee",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#172840",
    backgroundColor: "#ffffff",
  },
  multiline: { minHeight: 120 },
  examRow: {
    gap: 10,
  },
  examNameInput: {
    minHeight: 52,
  },
  examYearInput: {
    minHeight: 52,
  },
  selectorField: {
    borderWidth: 1,
    borderColor: "#d6dfee",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#ffffff",
  },
  selectorLabel: {
    color: "#5f708c",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  selectorValue: {
    color: "#172840",
    fontSize: 15,
    fontWeight: "600",
  },
  switchRow: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d6dfee",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  switchLabel: { color: "#172840", fontWeight: "700" },
  primaryButton: {
    backgroundColor: "#1f6feb",
    borderRadius: 14,
    alignItems: "center",
    paddingVertical: 15,
  },
  primaryButtonText: { color: "#ffffff", fontWeight: "700", fontSize: 15 },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#d6dfee",
    borderRadius: 12,
    alignItems: "center",
    paddingVertical: 13,
    backgroundColor: "#ffffff",
  },
  secondaryButtonText: {
    color: "#20354f",
    fontWeight: "700",
  },
  removeMiniButton: {
    alignItems: "center",
    paddingVertical: 10,
  },
  removeMiniButtonText: {
    color: "#b42318",
    fontWeight: "700",
  },
  frequencyBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d6dfee",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#f8fbff",
  },
  frequencyLabel: {
    color: "#5f708c",
    fontWeight: "700",
  },
  frequencyValue: {
    color: "#1f6feb",
    fontSize: 18,
    fontWeight: "800",
  },
  tagInputRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  tagInput: {
    flex: 1,
  },
  addTagButton: {
    backgroundColor: "#1f6feb",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  addTagButtonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  tagsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tagChip: {
    backgroundColor: "#eef4ff",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tagChipText: {
    color: "#1f4f9a",
    fontWeight: "700",
  },
  buttonDisabled: { opacity: 0.6 },
  imageList: { gap: 10 },
  imageCard: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#dce4f2",
    backgroundColor: "#ffffff",
  },
  image: { width: "100%", height: 180, backgroundColor: "#dfe6f2" },
  removeButton: { alignItems: "center", paddingVertical: 12 },
  removeButtonText: { color: "#b42318", fontWeight: "700" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(10, 20, 35, 0.45)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  modalTitle: { color: "#172840", fontSize: 20, fontWeight: "800", marginBottom: 12 },
  modalOption: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#e7edf7",
  },
  modalOptionText: { color: "#172840", fontWeight: "700" },
  modalClose: { alignItems: "center", paddingTop: 16 },
  modalCloseText: { color: "#1f6feb", fontWeight: "700" },
});
