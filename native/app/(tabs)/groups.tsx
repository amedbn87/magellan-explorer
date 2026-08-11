import React, { useCallback, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Screen, Title, colors } from "../../src/ui/primitives";
import { GroupsRepository, WaypointsRepository } from "../../src/data/storage";
import type { WaypointGroup } from "../../src/data/types";

export default function GroupsScreen() {
  const [groups, setGroups] = useState<WaypointGroup[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [newName, setNewName] = useState("");

  const reload = useCallback(async () => {
    const g = await GroupsRepository.list();
    setGroups(g);
    const entries = await Promise.all(
      g.map(async (group) => [group.id, (await WaypointsRepository.listByGroup(group.id)).length] as const),
    );
    setCounts(Object.fromEntries(entries));
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  async function create() {
    const name = newName.trim();
    if (!name) return;
    await GroupsRepository.create(name);
    setNewName("");
    reload();
  }

  async function remove(id: string, name: string) {
    Alert.alert("Delete group", `"${name}" — waypoints inside will be ungrouped, not deleted.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await GroupsRepository.remove(id);
          reload();
        },
      },
    ]);
  }

  return (
    <Screen scroll={false}>
      <Title>Groups</Title>
      <View style={styles.addRow}>
        <TextInput
          style={styles.input}
          placeholder="New group name (e.g. Al Khor Fishing)"
          placeholderTextColor={colors.subtext}
          value={newName}
          onChangeText={setNewName}
          onSubmitEditing={create}
        />
        <Pressable style={styles.addButton} onPress={create}>
          <Text style={styles.addButtonText}>Add</Text>
        </Pressable>
      </View>
      <FlatList
        data={groups}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>No groups yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.rowMain}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.count}>{counts[item.id] ?? 0} location(s)</Text>
            </View>
            <Pressable onPress={() => remove(item.id, item.name)}>
              <Text style={styles.delete}>🗑️</Text>
            </Pressable>
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  addRow: { flexDirection: "row", marginBottom: 12, gap: 8 },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    color: colors.text,
  },
  addButton: { backgroundColor: colors.accent, borderRadius: 10, paddingHorizontal: 16, justifyContent: "center" },
  addButtonText: { color: "#04121F", fontWeight: "700" },
  empty: { color: colors.subtext, textAlign: "center", marginTop: 40 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  rowMain: { flex: 1 },
  name: { color: colors.text, fontWeight: "700", fontSize: 15 },
  count: { color: colors.subtext, fontSize: 12, marginTop: 2 },
  delete: { fontSize: 18, paddingHorizontal: 8 },
});
