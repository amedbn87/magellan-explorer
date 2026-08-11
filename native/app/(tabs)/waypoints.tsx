import React, { useCallback, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Screen, Title, colors } from "../../src/ui/primitives";
import { WaypointsRepository, GroupsRepository } from "../../src/data/storage";
import type { Waypoint, WaypointGroup } from "../../src/data/types";
import { formatCoord } from "../../src/services/navigation/geo";

export default function WaypointsScreen() {
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [groups, setGroups] = useState<WaypointGroup[]>([]);

  const reload = useCallback(async () => {
    const [w, g] = await Promise.all([WaypointsRepository.list(), GroupsRepository.list()]);
    setWaypoints(w);
    setGroups(g);
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  function groupName(id: string | undefined) {
    if (!id) return null;
    return groups.find((g) => g.id === id)?.name ?? null;
  }

  async function remove(id: string) {
    await WaypointsRepository.remove(id);
    reload();
  }

  return (
    <Screen scroll={false}>
      <Title>Waypoints</Title>
      <FlatList
        data={waypoints}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>No saved waypoints yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Pressable style={styles.rowMain} onPress={() => router.push(`/navigate/${item.id}`)}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.coord}>{formatCoord(item.latitude, item.longitude)}</Text>
              {groupName(item.groupId) ? <Text style={styles.group}>{groupName(item.groupId)}</Text> : null}
            </Pressable>
            <Pressable
              onPress={() =>
                Alert.alert("Delete waypoint", item.name, [
                  { text: "Cancel", style: "cancel" },
                  { text: "Delete", style: "destructive", onPress: () => remove(item.id) },
                ])
              }
            >
              <Text style={styles.delete}>🗑️</Text>
            </Pressable>
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  coord: { color: colors.subtext, fontSize: 12, marginTop: 2 },
  group: { color: colors.accent, fontSize: 11, marginTop: 4 },
  delete: { fontSize: 18, paddingHorizontal: 8 },
});
