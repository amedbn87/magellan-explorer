import React, { useCallback, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Screen, Title, colors } from "../src/ui/primitives";
import { HistoryRepository } from "../src/data/storage";
import type { HistoryEntry } from "../src/data/types";
import { formatCoord } from "../src/services/navigation/geo";

const KIND_LABEL: Record<HistoryEntry["kind"], string> = {
  shared: "Shared",
  received: "Received",
  navigated: "Navigated",
};

export default function HistoryScreen() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  const reload = useCallback(() => {
    HistoryRepository.list().then(setEntries);
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  return (
    <Screen scroll={false}>
      <Title>History</Title>
      {entries.length > 0 ? (
        <Pressable
          onPress={() =>
            Alert.alert("Clear history", "This cannot be undone.", [
              { text: "Cancel", style: "cancel" },
              {
                text: "Clear",
                style: "destructive",
                onPress: async () => {
                  await HistoryRepository.clear();
                  reload();
                },
              },
            ])
          }
        >
          <Text style={styles.clear}>Clear all</Text>
        </Pressable>
      ) : null}
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>No share, receive, or navigation activity yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.rowMain}>
              <Text style={styles.label}>{item.label}</Text>
              <Text style={styles.coord}>{formatCoord(item.latitude, item.longitude)}</Text>
              <Text style={styles.meta}>
                {KIND_LABEL[item.kind]} via {item.transport} · {new Date(item.at).toLocaleString()}
              </Text>
            </View>
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { color: colors.subtext, textAlign: "center", marginTop: 40 },
  clear: { color: colors.danger, marginBottom: 10, textAlign: "right" },
  row: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  rowMain: { flex: 1 },
  label: { color: colors.text, fontWeight: "700", fontSize: 15 },
  coord: { color: colors.subtext, fontSize: 12, marginTop: 2 },
  meta: { color: colors.subtext, fontSize: 11, marginTop: 4 },
});
