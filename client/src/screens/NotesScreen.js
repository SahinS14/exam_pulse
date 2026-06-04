import { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  SafeAreaView,
  StyleSheet,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { getNotes } from "../api/content";
import FileResourceCard from "../components/FileResourceCard";
import { EmptyState, ErrorState, LoadingState } from "../components/ScreenState";
import {
  downloadAndOpenFile,
  isPdfFile,
  openPdfExternally,
} from "../utils/fileResources";
import { useResponsiveLayout } from "../utils/layout";
import { useAppTheme } from "../utils/theme";

export default function NotesScreen({ navigation, route }) {
  const { colors } = useAppTheme();
  const layout = useResponsiveLayout();
  const { module } = route.params;
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [downloadingId, setDownloadingId] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState({});

  const loadNotes = useCallback(async (isRefresh = false) => {
    try {
      setError("");
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const data = await getNotes(module._id);
      setNotes(data);
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Failed to load notes.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [module._id]);

  useFocusEffect(
    useCallback(() => {
      loadNotes();
    }, [loadNotes])
  );

  if (loading) {
    return <LoadingState label="Loading notes..." />;
  }

  if (error) {
    return <ErrorState title="Unable to load notes" subtitle={error} onRetry={() => loadNotes()} />;
  }

  if (!notes.length) {
    return <EmptyState title="No notes found" subtitle="No note files are available." />;
  }

  const handleOpen = async (item) => {
    try {
      if (isPdfFile({ url: item.fileUrl, mimeType: item.mimeType, fileName: item.fileName })) {
        await openPdfExternally(item.fileUrl);
        return;
      }

      navigation.navigate("WebViewer", {
        title: item.title,
        url: item.fileUrl,
      });
    } catch (openError) {
      Alert.alert("Open failed", "Unable to open this file right now.");
    }
  };

  const handleDownload = async (item) => {
    try {
      setDownloadingId(item._id);
      setDownloadProgress((current) => ({ ...current, [item._id]: 0 }));
      await downloadAndOpenFile({
        url: item.fileUrl,
        fileName: item.fileName || item.title,
        mimeType: item.mimeType,
        onProgress: (progress) =>
          setDownloadProgress((current) => ({
            ...current,
            [item._id]: progress,
          })),
      });
    } catch (downloadError) {
      Alert.alert("Download failed", "Unable to download this file right now.");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <FlatList
        refreshing={refreshing}
        onRefresh={() => loadNotes(true)}
        contentContainerStyle={[
          styles.list,
          {
            paddingHorizontal: layout.horizontalPadding,
            paddingVertical: layout.sectionGap,
            alignItems: "center",
          },
        ]}
        data={notes}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <View style={{ width: "100%", maxWidth: layout.contentMaxWidth, marginBottom: 12 }}>
            <FileResourceCard
              resourceId={item._id}
              title={item.title}
              subtitle={item.type}
              fileUrl={item.fileUrl}
              fileName={item.fileName}
              fileSize={item.fileSize}
              mimeType={item.mimeType}
              uploadedAt={item.uploadedAt}
              onOpen={() => handleOpen(item)}
              onDownload={() => handleDownload(item)}
              downloading={downloadingId === item._id}
              downloadProgress={downloadProgress[item._id] || 0}
            />
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  list: { },
});
