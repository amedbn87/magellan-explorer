import React, { useCallback, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useMagellan } from "../../src/state/MagellanProvider";
import { Screen, Title, colors, radius, spacing, fontFamily, LabelCaps, DataMono } from "../../src/ui/primitives";
import { WaypointsRepository, GroupsRepository } from "../../src/data/storage";
import type { Waypoint, WaypointGroup } from "../../src/data/types";
import { bearingDeg, cardinal, distanceMeters, formatDistance } from "../../src/services/navigation/geo";

export default function WaypointsScreen() {
  const { gnss, preferences } = useMagellan();
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

  const hasFix = gnss.latitude !== undefined && gnss.longitude !== undefined;
  const sorted = hasFix
    ? [...waypoints].sort(
        (a, b) =>
          distanceMeters(gnss.latitude!, gnss.longitude!, a.latitude, a.longitude) -
          distanceMeters(gnss.latitude!, gnss.longitude!, b.latitude, b.longitude),
      )
    : waypoints;

  return (
    <Screen scroll={false}>
      <Title>Waypoints</Title>
      <LabelCaps style={styles.sortLabel}>{hasFix ? "SORT: PROXIMITY" : "SORT: RECENT"}</LabelCaps>
      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>No saved waypoints yet.</Text>}
        renderItem={({ item }) => {
          const distance = hasFix
            ? distanceMeters(gnss.latitude!, gnss.longitude!, item.latitude, item.longitude)
            : undefined;
          const bearing = hasFix
            ? bearingDeg(gnss.latitude!, gnss.longitude!, item.latitude, item.longitude)
            : undefined;
          return (
            <View style={styles.row}>
              <Pressable style={styles.rowMain} onPress={() => router.push(`/navigate/${item.id}`)}>
                <View style={styles.rowTop}>
                  <Text style={styles.navIcon}>🧭</Text>
                  <View style={styles.rowInfo}>
                    <Text style={styles.name}>{item.name}</Text>
                    {groupName(item.groupId) ? <LabelCaps style={styles.group}>{groupName(item.groupId)}</LabelCaps> : null}
                  </View>
                  <View style={styles.rowStats}>
                    <DataMono style={styles.distance}>
                      {distance !== undefined ? formatDistance(distance, preferences.distanceUnit) : "—"}
                    </DataMono>
                    {bearing !== undefined ? <LabelCaps style={styles.bearing}>{cardinal(bearing)}</LabelCaps> : null}
                  </View>
                </View>
              </Pressable>
              <Pressable
                style={styles.deleteButton}
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
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  sortLabel: { marginBottom: spacing.gutter },
  empty: { color: colors.subtext, textAlign: "center", marginTop: 40 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    marginBottom: spacing.unit * 2,
  },
  rowMain: { flex: 1, padding: spacing.gutter },
  rowTop: { flexDirection: "row", alignItems: "center" },
  navIcon: { fontSize: 18, marginRight: spacing.gutter },
  rowInfo: { flex: 1 },
  rowStats: { alignItems: "flex-end" },
  name: { color: colors.text, fontFamily: fontFamily.bodyBold, fontSize: 15 },
  group: { color: colors.accent, marginTop: 4 },
  distance: { fontSize: 15 },
  bearing: { color: colors.subtext, marginTop: 2 },
  deleteButton: { paddingHorizontal: spacing.gutter, paddingVertical: spacing.gutter },
  delete: { fontSize: 18 },
});
