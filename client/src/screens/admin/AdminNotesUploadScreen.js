import { useCallback, useMemo, useState } from "react";
import * as DocumentPicker from "expo-document-picker";
import { Alert, FlatList, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import AdminSelectorModal from "../../components/AdminSelectorModal";
import { EmptyState, LoadingState } from "../../components/ScreenState";
import { deleteAdminNote, getAdminModules, getAdminNotes, getAdminSubjects, uploadAdminNote } from "../../api/admin";
import { validateUploadAsset } from "../../utils/uploadValidation";

const NOTE_TYPES = [
  "Module Notes",
  "Handwritten",
  "Revision",
  "Question Bank",
  "Faculty",
];

export default function AdminNotesUploadScreen() {
  const [notes, setNotes] = useState([]);
  const [modules, setModules] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [moduleSelectorVisible, setModuleSelectorVisible] = useState(false);
  const [typeSelectorVisible, setTypeSelectorVisible] = useState(false);
  const [form, setForm] = useState({
    title: "",
    type: "",
    moduleId: "",
    asset: null,
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [nextNotes, nextModules, nextSubjects] = await Promise.all([
        getAdminNotes(),
        getAdminModules(),
        getAdminSubjects(),
      ]);
      setNotes(nextNotes);
      setModules(nextModules);
      setSubjects(nextSubjects);
    } catch (error) {
      Alert.alert("Failed to load notes", "Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const subjectMap = useMemo(
    () => Object.fromEntries(subjects.map((item) => [item._id, item])),
    [subjects]
  );
  const moduleMap = useMemo(
    () => Object.fromEntries(modules.map((item) => [item._id, item])),
    [modules]
  );

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "image/*"],
    });

    if (!result.canceled && result.assets?.length) {
      const selectedAsset = result.assets[0];
      const validationMessage = validateUploadAsset(selectedAsset, {
        allowPdf: true,
        allowImage: true,
      });

      if (validationMessage) {
        Alert.alert("Invalid file", validationMessage);
        return;
      }

      setForm((current) => ({
        ...current,
        asset: selectedAsset,
      }));
    }
  };

  const handleUpload = async () => {
    if (!form.title.trim() || !form.type || !form.moduleId || !form.asset) {
      Alert.alert("Missing information", "Title, type, module, and file are required.");
      return;
    }

    try {
      setSaving(true);
      await uploadAdminNote({
        title: form.title.trim(),
        type: form.type,
        moduleId: form.moduleId,
        asset: form.asset,
      });
      setForm({ title: "", type: "", moduleId: "", asset: null });
      await loadData();
    } catch (error) {
      const message =
        error.response?.data?.errors?.[0]?.message ||
        error.response?.data?.message ||
        "Please try again.";
      Alert.alert("Upload failed", message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (noteId) => {
    Alert.alert("Delete note", "This action cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteAdminNote(noteId);
            await loadData();
          } catch (error) {
            Alert.alert("Delete failed", "Please try again.");
          }
        },
      },
    ]);
  };

  if (loading) {
    return <LoadingState label="Loading notes..." />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        contentContainerStyle={styles.list}
        data={notes}
        keyExtractor={(item) => item._id}
        ListHeaderComponent={
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Upload Note</Text>
            <TextInput
              onChangeText={(value) => setForm((current) => ({ ...current, title: value }))}
              placeholder="Note title"
              placeholderTextColor="#7f8aa3"
              style={styles.input}
              value={form.title}
            />
            <SelectorField
              label="Note Type"
              onPress={() => setTypeSelectorVisible(true)}
              value={form.type}
            />
            <SelectorField
              label="Module"
              onPress={() => setModuleSelectorVisible(true)}
              value={
                moduleMap[form.moduleId]
                  ? `Module ${moduleMap[form.moduleId].number}: ${moduleMap[form.moduleId].title}`
                  : ""
              }
            />
            <Pressable onPress={pickFile} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>
                {form.asset ? form.asset.name : "Pick PDF or image"}
              </Text>
            </Pressable>
            <Pressable
              disabled={saving}
              onPress={handleUpload}
              style={[styles.primaryButton, saving && styles.buttonDisabled]}
            >
              <Text style={styles.primaryButtonText}>{saving ? "Uploading..." : "Upload Note"}</Text>
            </Pressable>
          </View>
        }
        ListEmptyComponent={
          <EmptyState title="No notes uploaded" subtitle="Upload the first note file from the form above." />
        }
        renderItem={({ item }) => {
          const module = moduleMap[item.moduleId];
          const subject = module ? subjectMap[module.subjectId] : null;

          return (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardSubtitle}>{item.type}</Text>
              <Text style={styles.cardMeta}>
                {subject?.name || "Subject unavailable"}
                {" • "}
                {module ? `Module ${module.number}` : "Module unavailable"}
              </Text>
              <Pressable onPress={() => handleDelete(item._id)} style={styles.dangerButton}>
                <Text style={styles.dangerButtonText}>Delete</Text>
              </Pressable>
            </View>
          );
        }}
      />

      <AdminSelectorModal
        visible={moduleSelectorVisible}
        title="Select Module"
        items={modules}
        onClose={() => setModuleSelectorVisible(false)}
        onSelect={(item) => {
          setForm((current) => ({ ...current, moduleId: item._id }));
          setModuleSelectorVisible(false);
        }}
        getLabel={(item) => `Module ${item.number}: ${item.title}`}
        getDescription={(item) => subjectMap[item.subjectId]?.name || "Subject unavailable"}
      />

      {typeSelectorVisible ? (
        <AdminSelectorModal
          visible={typeSelectorVisible}
          title="Select Note Type"
          items={NOTE_TYPES.map((item) => ({ _id: item, name: item }))}
          onClose={() => setTypeSelectorVisible(false)}
          onSelect={(item) => {
            setForm((current) => ({ ...current, type: item.name }));
            setTypeSelectorVisible(false);
          }}
          getLabel={(item) => item.name}
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

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f4f7fb" },
  list: { padding: 16, gap: 12, flexGrow: 1 },
  formCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#dce4f2",
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  formTitle: { color: "#13243c", fontSize: 18, fontWeight: "800" },
  input: {
    borderWidth: 1,
    borderColor: "#d6dfee",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#172840",
    backgroundColor: "#ffffff",
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
  selectorValue: { color: "#172840", fontSize: 15, fontWeight: "600" },
  primaryButton: {
    backgroundColor: "#1f6feb",
    borderRadius: 14,
    alignItems: "center",
    paddingVertical: 15,
  },
  primaryButtonText: { color: "#ffffff", fontWeight: "700", fontSize: 15 },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#d4deee",
    borderRadius: 14,
    alignItems: "center",
    paddingVertical: 15,
    backgroundColor: "#ffffff",
  },
  secondaryButtonText: { color: "#20354f", fontWeight: "700" },
  buttonDisabled: { opacity: 0.6 },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#dce4f2",
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: { color: "#13243c", fontSize: 16, fontWeight: "800" },
  cardSubtitle: { color: "#1f6feb", marginTop: 6, fontWeight: "700" },
  cardMeta: { color: "#62738d", marginTop: 6, lineHeight: 20 },
  dangerButton: {
    marginTop: 14,
    backgroundColor: "#fff1f0",
    borderRadius: 12,
    alignItems: "center",
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: "#f0c5c1",
  },
  dangerButtonText: { color: "#b42318", fontWeight: "700" },
});
