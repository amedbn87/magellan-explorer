import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useMagellan } from "../../src/state/MagellanProvider";
import { Screen, Title, Card, StatRow, colors } from "../../src/ui/primitives";
import { WaypointsRepository, HistoryRepository } from "../../src/data/storage";
import type { Waypoint } from "../../src/data/types";
import {
  bearingDeg,
  cardinal,
  distanceMeters,
  formatCoord,
  formatDistance,
  isArrived,
  normalizeRelativeBearing,
} from "../../src/services/navigation/geo";

export default function NavigateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { gnss, compassHeadingDeg } = useMagellan();
  const [waypoint, setWaypoint] = useState<Waypoint | null>(null);

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

  if (!waypoint) {
    return (
      <Screen>
        <Title>Navigate</Title>
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

  return (
    <Screen>
      <Title>{waypoint.name}</Title>

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
        <Text style={styles.distanceBig}>{distance !== undefined ? formatDistance(distance) : "—"}</Text>
        {arrived ? <Text style={styles.arrived}>Arrived</Text> : null}
      </View>

      <Card>
        <StatRow label="Destination" value={formatCoord(waypoint.latitude, waypoint.longitude)} />
        <StatRow label="Current" value={hasFix ? formatCoord(gnss.latitude!, gnss.longitude!) : "Acquiring…"} />
        <StatRow label="Bearing to target" value={targetBearing !== undefined ? `${targetBearing.toFixed(0)}° ${cardinal(targetBearing)}` : "Unavailable"} />
        <StatRow label="Current heading" value={compassHeadingDeg !== undefined ? `${compassHeadingDeg.toFixed(0)}°` : "Unavailable"} />
        <StatRow label="Speed" value={gnss.speedMps !== undefined ? `${(gnss.speedMps * 3.6).toFixed(1)} km/h` : "Unavailable"} />
        <StatRow label="Altitude" value={gnss.altitudeM !== undefined ? `${gnss.altitudeM.toFixed(1)} m` : "Unavailable"} />
        <StatRow label="GPS accuracy" value={gnss.accuracyM !== undefined ? `±${gnss.accuracyM.toFixed(1)} m` : "Unavailable"} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: { color: colors.subtext },
  arrowWrap: { alignItems: "center", marginVertical: 24 },
  arrow: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.card,
    borderColor: colors.accent,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  arrowArrived: { borderColor: colors.good },
  arrowGlyph: { fontSize: 48 },
  distanceBig: { color: colors.text, fontSize: 28, fontWeight: "700", marginTop: 16 },
  arrived: { color: colors.good, fontWeight: "700", marginTop: 4 },
});
