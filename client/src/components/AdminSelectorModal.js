import { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export default function AdminSelectorModal({
  visible,
  title,
  items,
  onClose,
  onSelect,
  getLabel,
  getDescription,
}) {
  const [query, setQuery] = useState("");

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return items;
    }

    return items.filter((item) => {
      const label = getLabel(item).toLowerCase();
      const description = getDescription ? getDescription(item).toLowerCase() : "";
      return label.includes(normalizedQuery) || description.includes(normalizedQuery);
    });
  }, [getDescription, getLabel, items, query]);

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{title}</Text>
          <TextInput
            autoCapitalize="none"
            onChangeText={setQuery}
            placeholder="Search"
            placeholderTextColor="#7d8aa1"
            style={styles.input}
            value={query}
          />

          <FlatList
            data={filteredItems}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  onSelect(item);
                  setQuery("");
                }}
                style={styles.option}
              >
                <Text style={styles.optionTitle}>{getLabel(item)}</Text>
                {getDescription ? (
                  <Text style={styles.optionSubtitle}>{getDescription(item)}</Text>
                ) : null}
              </Pressable>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No matching items found.</Text>
            }
          />

          <Pressable
            onPress={() => {
              setQuery("");
              onClose();
            }}
            style={styles.cancelButton}
          >
            <Text style={styles.cancelText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(10, 20, 35, 0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    maxHeight: "82%",
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
  },
  title: {
    color: "#172840",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d6dfee",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    color: "#172840",
    marginBottom: 14,
  },
  option: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#e7edf7",
  },
  optionTitle: {
    color: "#172840",
    fontSize: 15,
    fontWeight: "700",
  },
  optionSubtitle: {
    color: "#61728d",
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  emptyText: {
    paddingVertical: 20,
    textAlign: "center",
    color: "#687994",
  },
  cancelButton: {
    marginTop: 14,
    alignItems: "center",
    paddingVertical: 14,
  },
  cancelText: {
    color: "#1f6feb",
    fontSize: 15,
    fontWeight: "700",
  },
});
