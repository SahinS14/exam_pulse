import { useCallback, useEffect, useState } from "react";
import { Alert, SafeAreaView, StyleSheet, View } from "react-native";

import { getSyllabus } from "../api/content";
import FileResourceCard from "../components/FileResourceCard";
import { EmptyState, ErrorState, LoadingState } from "../components/ScreenState";
import {
  downloadAndOpenFile,
  isPdfFile,
  openPdfExternally,
} from "../utils/fileResources";
import { useAppTheme } from "../utils/theme";

export default function SyllabusScreen({ navigation, route }) {
  const { colors } = useAppTheme();
  const { subject } = route.params;
  const [syllabus, setSyllabus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const loadSyllabus = useCallback(() => {
    let mounted = true;

    const run = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await getSyllabus(subject._id);

        if (mounted) {
          setSyllabus(data);
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError.response?.data?.message || "Failed to load syllabus.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    run();

    return () => {
      mounted = false;
    };
  }, [subject._id]);

  useEffect(() => loadSyllabus(), [loadSyllabus]);

  if (loading) {
    return <LoadingState label="Loading syllabus..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Unable to load syllabus"
        subtitle={error}
        onRetry={loadSyllabus}
      />
    );
  }

  if (!syllabus?.syllabusFileUrl) {
    return (
      <EmptyState
        title="No syllabus available"
        subtitle="The subject syllabus has not been uploaded yet."
      />
    );
  }

  const handleOpen = async () => {
    try {
      if (
        isPdfFile({
          url: syllabus.syllabusFileUrl,
          mimeType: syllabus.syllabusMimeType,
          fileName: syllabus.syllabusFileName,
        })
      ) {
        await openPdfExternally(syllabus.syllabusFileUrl);
        return;
      }

      navigation.navigate("WebViewer", {
        title: "Syllabus",
        url: syllabus.syllabusFileUrl,
      });
    } catch (openError) {
      Alert.alert("Open failed", "Unable to open this syllabus file right now.");
    }
  };

  const handleDownload = async () => {
    try {
      setDownloading(true);
      setDownloadProgress(0);
      await downloadAndOpenFile({
        url: syllabus.syllabusFileUrl,
        fileName: syllabus.syllabusFileName || `${subject.name}-syllabus`,
        mimeType: syllabus.syllabusMimeType,
        onProgress: setDownloadProgress,
      });
    } catch (downloadError) {
      Alert.alert("Download failed", "Unable to download this syllabus file right now.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        <FileResourceCard
          resourceId={null}
          title={`${subject.name} Syllabus`}
          subtitle="Official subject syllabus"
          fileUrl={syllabus.syllabusFileUrl}
          fileName={syllabus.syllabusFileName}
          fileSize={syllabus.syllabusFileSize}
          mimeType={syllabus.syllabusMimeType}
          uploadedAt={syllabus.syllabusUploadedAt}
          onOpen={handleOpen}
          onDownload={handleDownload}
          downloading={downloading}
          downloadProgress={downloadProgress}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: {
    padding: 16,
  },
});
