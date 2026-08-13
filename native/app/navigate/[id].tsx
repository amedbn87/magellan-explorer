import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useMagellan } from "../../src/state/MagellanProvider";
import { Screen, colors, radius, spacing, fontFamily, FixPill, LabelCaps, DataMono } from "../../src/ui/primitives";
import { WaypointsRepository, HistoryRepository } from "../../src/data/storage";
import type { Waypoint } from "../../src/data/types";
import {
  bearingDeg,
  cardinal,
  distanceMeters,
  formatDistance,
  formatSpeed,
  isArrived,
  normalizeRelativeBearing,
} from "../../src/services/navigation/geo";

export default function NavigateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { gnss, compassHeadingDeg, preferences, setActiveWaypointId } = useMagellan();
  const [waypoint, setWaypoint] = useState<Waypoint | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!id) return;
    WaypointsRepository.list().then((all) => {
      const found = all.find((w) => w.id === id) ?? null;
      setWaypoint(found);
      if (found) {
        HistoryRepository.add({
          kind: "navigated",
          transport: "qr",
          label: found.name,
          latitude: found.latitude,
          longitude: found.longitude,
          accuracyM: found.accuracyM,
          at: Date.now(),
        });
      }
    });
  }, [id]);

  // Mark this as the active navigation target for as long as the screen is
  // open, so the Navigate tab can offer "resume" if the user switches away
  // without explicitly stopping. Only the STOP button below clears it.
  useFocusEffect(() => {
    if (id) setActiveWaypointId(id);
  });

  // ETA is derived from real distance/speed further below — never shown
  // unless we have both a real distance and meaningful forward speed to
  // compute it from. Date.now() is impure, so "now" is a ticking state
  // value rather than read directly during render. All hooks must run
  // unconditionally (before the early return below), per Rules of Hooks.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!waypoint) {
    return (
      <Screen>
        <Text style={styles.hint}>Loading waypoint…</Text>
      </Screen>
    );
  }

  const hasFix = gnss.latitude !== undefined && gnss.longitude !== undefined;
  const distance = hasFix ? distanceMeters(gnss.latitude!, gnss.longitude!, waypoint.latitude, waypoint.longitude) : undefined;
  const targetBearing = hasFix ? bearingDeg(gnss.latitude!, gnss.longitude!, waypoint.latitude, waypoint.longitude) : undefined;
  const relativeBearing =
    targetBearing !== undefined && compassHeadingDeg !== undefined
      ? normalizeRelativeBearing(targetBearing, compassHeadingDeg)
      : undefined;
  const arrived = distance !== undefined && isArrived(distance, gnss.accuracyM);
  const eta =
    distance !== undefined && gnss.speedMps !== undefined && gnss.speedMps > 0.3
      ? new Date(now + (distance / gnss.speedMps) * 1000)
      : undefined;

  function stopNavigation() {
    setActiveWaypointId(null);
    router.back();
  }

  return (
    <Screen scroll={false} style={styles.screen}>
      <View style={styles.header}>
        <View>
          <LabelCaps>Destination</LabelCaps>
          <Text style={styles.name}>{waypoint.name}</Text>
        </View>
        <FixPill fixQuality={gnss.fixQuality} />
      </View>

      <View style={styles.arrowWrap}>
        <View
          style={[
            styles.arrow,
            { transform: [{ rotate: `${relativeBearing ?? 0}deg` }] },
            arrived && styles.arrowArrived,
          ]}
        >
          <Text style={styles.arrowGlyph}>⬆️</Text>
        </View>
        <DataMono style={styles.distanceBig}>
          {distance !== undefined ? formatDistance(distance, preferences.distanceUnit) : "—"}
        </DataMono>
        {arrived ? <Text style={styles.arrived}>ARRIVED</Text> : null}
      </View>

      <View style={styles.telemetryGrid}>
        <View style={styles.telemetryCell}>
          <LabelCaps>Bearing</LabelCaps>
          <DataMono style={styles.telemetryValue}>
            {targetBearing !== undefined ? `${targetBearing.toFixed(0)}° ${cardinal(targetBearing)}` : "—"}
          </DataMono>
        </View>
        <View style={styles.telemetryCell}>
          <LabelCaps>Speed</LabelCaps>
          <DataMono style={styles.telemetryValue}>
            {gnss.speedMps !== undefined ? formatSpeed(gnss.speedMps, preferences.distanceUnit) : "—"}
          </DataMono>
        </View>
        <View style={styles.telemetryCell}>
          <LabelCaps>ETA</LabelCaps>
          <DataMono style={styles.telemetryValue}>
            {eta ? eta.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
          </DataMono>
        </View>
        <View style={styles.telemetryCell}>
          <LabelCaps>Accuracy</LabelCaps>
          <DataMono style={styles.telemetryValue}>
            {gnss.accuracyM !== undefined ? `±${gnss.accuracyM.toFixed(0)}m` : "—"}
          </DataMono>
        </View>
      </View>

      <Pressable style={styles.stopButton} onPress={stopNavigation}>
        <Text style={styles.stopIcon}>✕</Text>
        <Text style={styles.stopLabel}>STOP NAVIGATION</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { justifyContent: "space-between" },
  hint: { color: colors.subtext },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  name: { color: colors.text, fontFamily: fontFamily.bodyBold, fontSize: 22, marginTop: 4 },
  arrowWrap: { alignItems: "center", marginVertical: 24 },
  arrow: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.card,
    borderColor: colors.accent,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  arrowArrived: { borderColor: colors.good },
  arrowGlyph: { fontSize: 52 },
  distanceBig: { color: colors.text, fontSize: 32, marginTop: 16 },
  arrived: { color: colors.good, fontFamily: fontFamily.bodyBold, marginTop: 4 },
  telemetryGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.unit * 2 },
  telemetryCell: {
    flexBasis: "47%",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.gutter,
  },
  telemetryValue: { fontSize: 20, marginTop: 6 },
  stopButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.unit * 2,
    backgroundColor: colors.errorContainer,
    borderRadius: radius.lg,
    paddingVertical: 16,
    marginBottom: spacing.gutter,
  },
  stopIcon: { color: colors.onErrorContainer, fontSize: 16, fontWeight: "700" },
  stopLabel: { color: colors.onErrorContainer, fontFamily: fontFamily.bodyBold, letterSpacing: 1 },
});
