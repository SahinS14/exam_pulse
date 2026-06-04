import { useCallback, useMemo, useState } from "react";
import * as DocumentPicker from "expo-document-picker";
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import AdminSelectorModal from "../../components/AdminSelectorModal";
import { EmptyState, LoadingState } from "../../components/ScreenState";
import {
  createAdminBranch,
  createAdminConcept,
  createAdminModule,
  createAdminSemester,
  createAdminSubject,
  createAdminTopic,
  deleteAdminBranch,
  deleteAdminConcept,
  deleteAdminModule,
  deleteAdminSemester,
  deleteAdminSubject,
  deleteAdminTopic,
  getAdminBranches,
  getAdminConcepts,
  getAdminModules,
  getAdminSemesters,
  getAdminSubjects,
  getAdminTopics,
  updateAdminBranch,
  updateAdminConcept,
  updateAdminModule,
  updateAdminSemester,
  updateAdminSubject,
  updateAdminTopic,
  uploadAdminFile,
} from "../../api/admin";
import { validateUploadAsset } from "../../utils/uploadValidation";

const resourceConfig = {
  branch: {
    title: "Manage Branches",
    list: getAdminBranches,
    create: createAdminBranch,
    update: updateAdminBranch,
    remove: deleteAdminBranch,
    emptyTitle: "No branches yet",
    getInitialForm: () => ({ name: "" }),
  },
  semester: {
    title: "Manage Semesters",
    list: getAdminSemesters,
    create: createAdminSemester,
    update: updateAdminSemester,
    remove: deleteAdminSemester,
    emptyTitle: "No semesters yet",
    getInitialForm: () => ({ number: "", branchId: "" }),
  },
  subject: {
    title: "Manage Subjects",
    list: getAdminSubjects,
    create: createAdminSubject,
    update: updateAdminSubject,
    remove: deleteAdminSubject,
    emptyTitle: "No subjects yet",
    getInitialForm: () => ({
      name: "",
      semesterId: "",
      syllabusFileUrl: "",
      syllabusFileName: "",
      syllabusFileSize: null,
      syllabusMimeType: "",
      syllabusUploadedAt: "",
      syllabusFileCloudinaryPublicId: "",
      syllabusFileCloudinaryResourceType: "",
    }),
  },
  module: {
    title: "Manage Modules",
    list: getAdminModules,
    create: createAdminModule,
    update: updateAdminModule,
    remove: deleteAdminModule,
    emptyTitle: "No modules yet",
    getInitialForm: () => ({ number: "", title: "", subjectId: "" }),
  },
  topic: {
    title: "Manage Topics",
    list: getAdminTopics,
    create: createAdminTopic,
    update: updateAdminTopic,
    remove: deleteAdminTopic,
    emptyTitle: "No topics yet",
    getInitialForm: () => ({ name: "", moduleId: "" }),
  },
  concept: {
    title: "Manage Concepts",
    list: getAdminConcepts,
    create: createAdminConcept,
    update: updateAdminConcept,
    remove: deleteAdminConcept,
    emptyTitle: "No concepts yet",
    getInitialForm: () => ({
      title: "",
      explanation: "",
      moduleId: "",
      images: [],
    }),
  },
};

export default function AdminEntityManagerScreen({ route }) {
  const { resource } = route.params;
  const config = resourceConfig[resource];
  const [items, setItems] = useState([]);
  const [lookups, setLookups] = useState({
    branches: [],
    semesters: [],
    subjects: [],
    modules: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectorField, setSelectorField] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState(config.getInitialForm());

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [nextItems, branches, semesters, subjects, modules] = await Promise.all([
        config.list(),
        getAdminBranches(),
        getAdminSemesters(),
        getAdminSubjects(),
        getAdminModules(),
      ]);

      setItems(nextItems);
      setLookups({ branches, semesters, subjects, modules });
    } catch (error) {
      Alert.alert("Load failed", "Please try again.");
    } finally {
      setLoading(false);
    }
  }, [config]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const branchMap = useMemo(
    () => Object.fromEntries(lookups.branches.map((item) => [item._id, item])),
    [lookups.branches]
  );
  const semesterMap = useMemo(
    () => Object.fromEntries(lookups.semesters.map((item) => [item._id, item])),
    [lookups.semesters]
  );
  const subjectMap = useMemo(
    () => Object.fromEntries(lookups.subjects.map((item) => [item._id, item])),
    [lookups.subjects]
  );
  const moduleMap = useMemo(
    () => Object.fromEntries(lookups.modules.map((item) => [item._id, item])),
    [lookups.modules]
  );

  const selectorMeta = useMemo(
    () => ({
      branchId: {
        title: "Select Branch",
        items: lookups.branches,
        getLabel: (item) => item.name,
      },
      semesterId: {
        title: "Select Semester",
        items: lookups.semesters,
        getLabel: (item) => `Semester ${item.number}`,
        getDescription: (item) => branchMap[item.branchId]?.name || "Branch unavailable",
      },
      subjectId: {
        title: "Select Subject",
        items: lookups.subjects,
        getLabel: (item) => item.name,
        getDescription: (item) => {
          const semester = semesterMap[item.semesterId];
          return semester ? `Semester ${semester.number}` : "Semester unavailable";
        },
      },
      moduleId: {
        title: "Select Module",
        items: lookups.modules,
        getLabel: (item) => `Module ${item.number}: ${item.title}`,
        getDescription: (item) => subjectMap[item.subjectId]?.name || "Subject unavailable",
      },
    }),
    [branchMap, lookups.branches, lookups.modules, lookups.semesters, lookups.subjects, semesterMap, subjectMap]
  );

  const currentSelector = selectorField ? selectorMeta[selectorField] : null;

  const openCreate = () => {
    setEditingItem(null);
    setForm(config.getInitialForm());
    setModalVisible(true);
  };

  const openEdit = (item) => {
    setEditingItem(item);

    if (resource === "semester") {
      setForm({
        number: String(item.number || ""),
        branchId: item.branchId || "",
      });
    } else if (resource === "subject") {
      setForm({
        name: item.name || "",
        semesterId: item.semesterId || "",
        syllabusFileUrl: item.syllabusFileUrl || "",
        syllabusFileName: item.syllabusFileName || "",
        syllabusFileSize: item.syllabusFileSize || null,
        syllabusMimeType: item.syllabusMimeType || "",
        syllabusUploadedAt: item.syllabusUploadedAt || "",
        syllabusFileCloudinaryPublicId:
          item.syllabusFileCloudinaryPublicId || "",
        syllabusFileCloudinaryResourceType:
          item.syllabusFileCloudinaryResourceType || "",
      });
    } else if (resource === "module") {
      setForm({
        number: String(item.number || ""),
        title: item.title || "",
        subjectId: item.subjectId || "",
      });
    } else if (resource === "topic") {
      setForm({
        name: item.name || "",
        moduleId: item.moduleId || "",
      });
    } else if (resource === "concept") {
      setForm({
        title: item.title || "",
        explanation: item.explanation || "",
        moduleId: item.moduleId || "",
        images: item.images || [],
      });
    } else {
      setForm({ name: item.name || "" });
    }

    setModalVisible(true);
  };

  const handleDelete = (item) => {
    Alert.alert("Delete item", "This action cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await config.remove(item._id);
            await loadData();
          } catch (error) {
            Alert.alert("Delete failed", "Please try again.");
          }
        },
      },
    ]);
  };

  const validateForm = () => {
    if (resource === "branch" && !form.name.trim()) {
      return "Branch name is required.";
    }

    if (resource === "semester" && (!form.number || !form.branchId)) {
      return "Semester number and branch are required.";
    }

    if (resource === "subject" && (!form.name.trim() || !form.semesterId)) {
      return "Subject name and semester are required.";
    }

    if (resource === "module" && (!form.number || !form.title.trim() || !form.subjectId)) {
      return "Module number, title, and subject are required.";
    }

    if (resource === "topic" && (!form.name.trim() || !form.moduleId)) {
      return "Topic name and module are required.";
    }

    if (resource === "concept" && (!form.title.trim() || !form.explanation.trim() || !form.moduleId)) {
      return "Concept title, explanation, and module are required.";
    }

    return null;
  };

  const buildPayload = () => {
    if (resource === "branch") {
      return { name: form.name.trim() };
    }

    if (resource === "semester") {
      return {
        number: Number(form.number),
        branchId: form.branchId,
      };
    }

    if (resource === "subject") {
      return {
        name: form.name.trim(),
        semesterId: form.semesterId,
        syllabusFileUrl: form.syllabusFileUrl.trim() || undefined,
        syllabusFileName: form.syllabusFileName.trim() || undefined,
        syllabusFileSize: form.syllabusFileSize || undefined,
        syllabusMimeType: form.syllabusMimeType.trim() || undefined,
        syllabusUploadedAt: form.syllabusUploadedAt || undefined,
        syllabusFileCloudinaryPublicId:
          form.syllabusFileCloudinaryPublicId.trim() || undefined,
        syllabusFileCloudinaryResourceType:
          form.syllabusFileCloudinaryResourceType.trim() || undefined,
      };
    }

    if (resource === "module") {
      return {
        number: Number(form.number),
        title: form.title.trim(),
        subjectId: form.subjectId,
      };
    }

    if (resource === "topic") {
      return {
        name: form.name.trim(),
        moduleId: form.moduleId,
      };
    }

    return {
      title: form.title.trim(),
      explanation: form.explanation.trim(),
      moduleId: form.moduleId,
      images: form.images,
    };
  };

  const handleSave = async () => {
    const validationMessage = validateForm();

    if (validationMessage) {
      Alert.alert("Missing information", validationMessage);
      return;
    }

    try {
      setSaving(true);
      const payload = buildPayload();

      if (editingItem) {
        await config.update(editingItem._id, payload);
      } else {
        await config.create(payload);
      }

      setModalVisible(false);
      setForm(config.getInitialForm());
      setEditingItem(null);
      await loadData();
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

  const handleUpload = async (kind) => {
    try {
      const type =
        kind === "image"
          ? "image/*"
          : ["application/pdf", "image/*"];

      const result = await DocumentPicker.getDocumentAsync({ type });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const selectedAsset = result.assets[0];
      const validationMessage = validateUploadAsset(selectedAsset, {
        allowPdf: kind !== "image",
        allowImage: true,
      });

      if (validationMessage) {
        Alert.alert("Invalid file", validationMessage);
        return;
      }

      setUploading(true);
      const upload = await uploadAdminFile(selectedAsset);

      if (kind === "image") {
        setForm((current) => ({
          ...current,
          images: [...(current.images || []), upload.url],
        }));
      } else {
        setForm((current) => ({
          ...current,
          syllabusFileUrl: upload.url,
          syllabusFileName: upload.fileName || "",
          syllabusFileSize: upload.fileSize || null,
          syllabusMimeType: upload.mimeType || "",
          syllabusUploadedAt: upload.uploadedAt || "",
          syllabusFileCloudinaryPublicId:
            upload.cloudinaryPublicId || "",
          syllabusFileCloudinaryResourceType:
            upload.cloudinaryResourceType || "",
        }));
      }
    } catch (error) {
      const message =
        error.response?.data?.errors?.[0]?.message ||
        error.response?.data?.message ||
        "Please try again.";
      Alert.alert("Upload failed", message);
    } finally {
      setUploading(false);
    }
  };

  const renderItemTitle = (item) => {
    if (resource === "branch") {
      return item.name;
    }

    if (resource === "semester") {
      return `Semester ${item.number}`;
    }

    if (resource === "subject") {
      return item.name;
    }

    if (resource === "module") {
      return `Module ${item.number}: ${item.title}`;
    }

    if (resource === "topic") {
      return item.name;
    }

    return item.title;
  };

  const renderItemSubtitle = (item) => {
    if (resource === "semester") {
      return branchMap[item.branchId]?.name || "Branch unavailable";
    }

    if (resource === "subject") {
      const semester = semesterMap[item.semesterId];
      const syllabusState = item.syllabusFileUrl ? "Syllabus attached" : "No syllabus";
      return `${semester ? `Semester ${semester.number}` : "Semester unavailable"} • ${syllabusState}`;
    }

    if (resource === "module") {
      return subjectMap[item.subjectId]?.name || "Subject unavailable";
    }

    if (resource === "topic") {
      return moduleMap[item.moduleId]
        ? `Module ${moduleMap[item.moduleId].number}: ${moduleMap[item.moduleId].title}`
        : "Module unavailable";
    }

    if (resource === "concept") {
      const module = moduleMap[item.moduleId];
      const moduleLabel = module
        ? `Module ${module.number}: ${module.title}`
        : "Module unavailable";
      return `${moduleLabel} • ${item.images?.length || 0} image(s)`;
    }

    return null;
  };

  if (loading) {
    return <LoadingState label={`Loading ${config.title.toLowerCase()}...`} />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        contentContainerStyle={styles.list}
        data={items}
        keyExtractor={(item) => item._id}
        ListHeaderComponent={
          <Pressable onPress={openCreate} style={styles.addButton}>
            <Text style={styles.addButtonText}>Add New</Text>
          </Pressable>
        }
        ListEmptyComponent={
          <EmptyState title={config.emptyTitle} subtitle="Add the first item to get started." />
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{renderItemTitle(item)}</Text>
            {renderItemSubtitle(item) ? (
              <Text style={styles.cardSubtitle}>{renderItemSubtitle(item)}</Text>
            ) : null}

            <View style={styles.cardActions}>
              <Pressable onPress={() => openEdit(item)} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Edit</Text>
              </Pressable>
              <Pressable onPress={() => handleDelete(item)} style={styles.dangerButton}>
                <Text style={styles.dangerButtonText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        )}
      />

      <Modal
        animationType="slide"
        transparent
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <ScrollView contentContainerStyle={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {editingItem ? "Edit Item" : "Add Item"}
              </Text>

              {(resource === "branch" || resource === "topic") && (
                <TextInput
                  onChangeText={(value) => setForm((current) => ({ ...current, name: value }))}
                  placeholder={resource === "branch" ? "Branch name" : "Topic name"}
                  placeholderTextColor="#7f8aa3"
                  style={styles.input}
                  value={form.name}
                />
              )}

              {resource === "semester" && (
                <>
                  <TextInput
                    keyboardType="number-pad"
                    onChangeText={(value) => setForm((current) => ({ ...current, number: value }))}
                    placeholder="Semester number"
                    placeholderTextColor="#7f8aa3"
                    style={styles.input}
                    value={form.number}
                  />
                  <SelectorField
                    label="Branch"
                    onPress={() => setSelectorField("branchId")}
                    value={branchMap[form.branchId]?.name}
                  />
                </>
              )}

              {resource === "subject" && (
                <>
                  <TextInput
                    onChangeText={(value) => setForm((current) => ({ ...current, name: value }))}
                    placeholder="Subject name"
                    placeholderTextColor="#7f8aa3"
                    style={styles.input}
                    value={form.name}
                  />
                  <SelectorField
                    label="Semester"
                    onPress={() => setSelectorField("semesterId")}
                    value={
                      semesterMap[form.semesterId]
                        ? `Semester ${semesterMap[form.semesterId].number}`
                        : ""
                    }
                  />
                  <UploadField
                    buttonLabel={uploading ? "Uploading..." : "Upload Syllabus"}
                    label={form.syllabusFileUrl ? "Syllabus uploaded" : "No syllabus file"}
                    onPress={() => handleUpload("file")}
                  />
                </>
              )}

              {resource === "module" && (
                <>
                  <TextInput
                    keyboardType="number-pad"
                    onChangeText={(value) => setForm((current) => ({ ...current, number: value }))}
                    placeholder="Module number"
                    placeholderTextColor="#7f8aa3"
                    style={styles.input}
                    value={form.number}
                  />
                  <TextInput
                    onChangeText={(value) => setForm((current) => ({ ...current, title: value }))}
                    placeholder="Module title"
                    placeholderTextColor="#7f8aa3"
                    style={styles.input}
                    value={form.title}
                  />
                  <SelectorField
                    label="Subject"
                    onPress={() => setSelectorField("subjectId")}
                    value={subjectMap[form.subjectId]?.name}
                  />
                </>
              )}

              {resource === "topic" && (
                <SelectorField
                  label="Module"
                  onPress={() => setSelectorField("moduleId")}
                  value={
                    moduleMap[form.moduleId]
                      ? `Module ${moduleMap[form.moduleId].number}: ${moduleMap[form.moduleId].title}`
                      : ""
                  }
                />
              )}

              {resource === "concept" && (
                <>
                  <TextInput
                    onChangeText={(value) => setForm((current) => ({ ...current, title: value }))}
                    placeholder="Concept title"
                    placeholderTextColor="#7f8aa3"
                    style={styles.input}
                    value={form.title}
                  />
                  <TextInput
                    multiline
                    onChangeText={(value) =>
                      setForm((current) => ({ ...current, explanation: value }))
                    }
                    placeholder="Explanation"
                    placeholderTextColor="#7f8aa3"
                    style={[styles.input, styles.multiline]}
                    textAlignVertical="top"
                    value={form.explanation}
                  />
                  <SelectorField
                    label="Module"
                    onPress={() => setSelectorField("moduleId")}
                    value={
                      moduleMap[form.moduleId]
                        ? `Module ${moduleMap[form.moduleId].number}: ${moduleMap[form.moduleId].title}`
                        : ""
                    }
                  />
                  <UploadField
                    buttonLabel={uploading ? "Uploading..." : "Add Image"}
                    label={`${form.images?.length || 0} image(s) attached`}
                    onPress={() => handleUpload("image")}
                  />
                  {form.images?.length ? (
                    <View style={styles.imageGrid}>
                      {form.images.map((imageUrl, index) => (
                        <View key={`${imageUrl}-${index}`} style={styles.imageCard}>
                          <Image source={{ uri: imageUrl }} style={styles.previewImage} />
                          <Pressable
                            onPress={() =>
                              setForm((current) => ({
                                ...current,
                                images: current.images.filter((_, imageIndex) => imageIndex !== index),
                              }))
                            }
                            style={styles.removeImageButton}
                          >
                            <Text style={styles.removeImageText}>Remove</Text>
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </>
              )}

              <View style={styles.modalActions}>
                <Pressable
                  onPress={() => setModalVisible(false)}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </Pressable>
                <Pressable
                  disabled={saving}
                  onPress={handleSave}
                  style={[styles.primaryButton, saving && styles.buttonDisabled]}
                >
                  <Text style={styles.primaryButtonText}>
                    {saving ? "Saving..." : "Save"}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {currentSelector ? (
        <AdminSelectorModal
          visible={Boolean(currentSelector)}
          title={currentSelector.title}
          items={currentSelector.items}
          onClose={() => setSelectorField(null)}
          onSelect={(item) => {
            setForm((current) => ({ ...current, [selectorField]: item._id }));
            setSelectorField(null);
          }}
          getLabel={currentSelector.getLabel}
          getDescription={currentSelector.getDescription}
        />
      ) : null}
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

function UploadField({ label, buttonLabel, onPress }) {
  return (
    <View style={styles.uploadField}>
      <Text style={styles.uploadLabel}>{label}</Text>
      <Pressable onPress={onPress} style={styles.primaryButton}>
        <Text style={styles.primaryButtonText}>{buttonLabel}</Text>
      </Pressable>
    </View>
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
  cardTitle: { color: "#13243c", fontSize: 17, fontWeight: "800", marginBottom: 6 },
  cardSubtitle: { color: "#63748f", lineHeight: 20 },
  cardActions: { flexDirection: "row", gap: 10, marginTop: 14 },
  primaryButton: {
    flex: 1,
    backgroundColor: "#1f6feb",
    borderRadius: 12,
    alignItems: "center",
    paddingVertical: 14,
  },
  primaryButtonText: { color: "#ffffff", fontWeight: "700" },
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
  buttonDisabled: { opacity: 0.6 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(10, 20, 35, 0.45)",
    justifyContent: "flex-end",
  },
  modalCard: {
    maxHeight: "90%",
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalContent: { padding: 20, gap: 12, paddingBottom: 32 },
  modalTitle: { color: "#172840", fontSize: 20, fontWeight: "800", marginBottom: 4 },
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
  uploadField: {
    gap: 10,
  },
  uploadLabel: {
    color: "#61728d",
    lineHeight: 20,
  },
  imageGrid: { gap: 10 },
  imageCard: {
    borderWidth: 1,
    borderColor: "#dce4f2",
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#ffffff",
  },
  previewImage: {
    width: "100%",
    height: 180,
    backgroundColor: "#dfe6f2",
  },
  removeImageButton: {
    alignItems: "center",
    paddingVertical: 12,
  },
  removeImageText: {
    color: "#b42318",
    fontWeight: "700",
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
});
