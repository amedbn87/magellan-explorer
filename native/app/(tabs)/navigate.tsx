import React, { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useMagellan } from "../../src/state/MagellanProvider";
import { Screen, Title, colors, radius, spacing, fontFamily, LabelCaps, DataMono } from "../../src/ui/primitives";
import { WaypointsRepository } from "../../src/data/storage";
import type { Waypoint } from "../../src/data/types";
import { bearingDeg, cardinal, distanceMeters, formatDistance } from "../../src/services/navigation/geo";

/**
 * The Stitch reference's bottom nav has a "Routes" tab. This app has no
 * multi-waypoint route-planning feature (only single-target navigation to
 * a saved waypoint), so faking a "Routes" list would mean either dead UI or
 * a duplicate of the Waypoints tab. Instead this tab does the one real,
 * useful thing available: resume the currently active navigation, or let
 * you pick a target to start one. See MASTER UI/ENGINEERING INTEGRATION
 * TASK section 16 (documented engineering deviation).
 */
export default function NavigateTabScreen() {
  const { gnss, activeWaypointId, preferences } = useMagellan();
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [activeWaypoint, setActiveWaypoint] = useState<Waypoint | null>(null);

  useFocusEffect(
    useCallback(() => {
      WaypointsRepository.list().then((all) => {
        setWaypoints(all);
        setActiveWaypoint(activeWaypointId ? (all.find((w) => w.id === activeWaypointId) ?? null) : null);
      });
    }, [activeWaypointId]),
  );

  const hasFix = gnss.latitude !== undefined && gnss.longitude !== undefined;
  const sorted = hasFix
    ? [...waypoints].sort(
        (a, b) =>
          distanceMeters(gnss.latitude!, gnss.longitude!, a.latitude, a.longitude) -
          distanceMeters(gnss.latitude!, gnss.longitude!, b.latitude, b.longitude),
      )
    : waypoints;

  if (activeWaypoint) {
    return (
      <Screen scroll={false}>
        <Title>Navigate</Title>
        <Pressable style={styles.activeCard} onPress={() => router.push(`/navigate/${activeWaypoint.id}`)}>
          <LabelCaps>Currently navigating to</LabelCaps>
          <Text style={styles.activeName}>{activeWaypoint.name}</Text>
          <Text style={styles.resume}>Tap to resume →</Text>
        </Pressable>
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <Title>Navigate</Title>
      <LabelCaps style={styles.hint}>SELECT A TARGET</LabelCaps>
      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>No waypoints saved yet — add one from the map.</Text>}
        renderItem={({ item }) => {
          const distance = hasFix ? distanceMeters(gnss.latitude!, gnss.longitude!, item.latitude, item.longitude) : undefined;
          const bearing = hasFix ? bearingDeg(gnss.latitude!, gnss.longitude!, item.latitude, item.longitude) : undefined;
          return (
            <Pressable style={styles.row} onPress={() => router.push(`/navigate/${item.id}`)}>
              <View style={styles.rowMain}>
                <Text style={styles.name}>{item.name}</Text>
              </View>
              <View style={styles.rowMeta}>
                <DataMono style={styles.distance}>{distance !== undefined ? formatDistance(distance, preferences.distanceUnit) : "—"}</DataMono>
                {bearing !== undefined ? <LabelCaps style={styles.bearing}>{cardinal(bearing)}</LabelCaps> : null}
              </View>
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: { marginBottom: spacing.gutter },
  empty: { color: colors.subtext, textAlign: "center", marginTop: 40 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.gutter,
    marginBottom: spacing.unit * 2,
  },
  rowMain: { flex: 1 },
  name: { color: colors.text, fontFamily: fontFamily.bodyBold, fontSize: 15 },
  rowMeta: { alignItems: "flex-end" },
  distance: { fontSize: 16 },
  bearing: { color: colors.accent, marginTop: 2 },
  activeCard: {
    backgroundColor: colors.primaryContainer,
    borderRadius: radius.lg,
    padding: spacing.gutter * 1.5,
  },
  activeName: { color: colors.onPrimary, fontFamily: fontFamily.bodyBold, fontSize: 22, marginTop: 6 },
  resume: { color: colors.onPrimary, marginTop: 12, opacity: 0.8 },
});
