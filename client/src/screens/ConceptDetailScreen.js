import { Image, SafeAreaView, ScrollView, StyleSheet, Text } from "react-native";

export default function ConceptDetailScreen({ route }) {
  const { concept } = route.params;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{concept.title}</Text>
        <Text style={styles.body}>{concept.explanation}</Text>
        {concept.images?.map((imageUrl) => (
          <Image key={imageUrl} source={{ uri: imageUrl }} style={styles.image} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f4f7fb" },
  container: { padding: 20, gap: 14 },
  title: { fontSize: 26, fontWeight: "800", color: "#12213a" },
  body: { color: "#556985", fontSize: 15, lineHeight: 24 },
  image: {
    width: "100%",
    height: 220,
    borderRadius: 16,
    backgroundColor: "#dfe6f2",
  },
});
