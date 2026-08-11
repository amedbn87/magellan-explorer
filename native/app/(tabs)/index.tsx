import React, { useState } from "react";
import { Alert, Pressable, StyleSheet, Text } from "react-native";
import { router } from "expo-router";
import { useMagellan } from "../../src/state/MagellanProvider";
import { Screen, Title, Card, StatRow, colors } from "../../src/ui/primitives";
import { formatCoord } from "../../src/services/navigation/geo";
import { WaypointsRepository } from "../../src/data/storage";

export default function HomeScreen() {
  const { gnss, compassHeadingDeg } = useMagellan();
  const [saving, setSaving] = useState(false);

  const hasFix = gnss.latitude !== undefined && gnss.longitude !== undefined;

  async function quickAdd() {
    if (!hasFix) {
      Alert.alert("No GNSS fix yet", "Waiting for a real position from the device.");
      return;
    }
    setSaving(true);
    try {
      const waypoint = await WaypointsRepository.save({
        name: `Waypoint ${new Date().toLocaleTimeString()}`,
        latitude: gnss.latitude!,
        longitude: gnss.longitude!,
        altitudeM: gnss.altitudeM,
        accuracyM: gnss.accuracyM,
        source: "live",
      });
      Alert.alert("Saved", waypoint.name);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <Title>Magellan</Title>

      <Card>
        <Text style={styles.cardHeading}>Position</Text>
        <StatRow
          label="Coordinates"
          value={hasFix ? formatCoord(gnss.latitude!, gnss.longitude!) : "Acquiring…"}
        />
        <StatRow label="Altitude" value={gnss.altitudeM !== undefined ? `${gnss.altitudeM.toFixed(1)} m` : "Unavailable"} />
        <StatRow label="Accuracy" value={gnss.accuracyM !== undefined ? `±${gnss.accuracyM.toFixed(1)} m` : "Unavailable"} />
        <StatRow label="Speed" value={gnss.speedMps !== undefined ? `${(gnss.speedMps * 3.6).toFixed(1)} km/h` : "Unavailable"} />
        <StatRow label="Compass heading" value={compassHeadingDeg !== undefined ? `${compassHeadingDeg.toFixed(0)}°` : "Unavailable"} />
        <StatRow label="Fix quality" value={gnss.fixQuality} />
        <StatRow label="Satellites used" value={gnss.satellitesVisible > 0 ? `${gnss.satellitesUsedInFix}/${gnss.satellitesVisible}` : "Unavailable"} />
        <StatRow label="Source" value={gnss.source} />
      </Card>

      <Pressable
        style={[styles.primaryButton, (!hasFix || saving) && styles.buttonDisabled]}
        disabled={!hasFix || saving}
        onPress={quickAdd}
      >
        <Text style={styles.primaryButtonText}>{saving ? "Saving…" : "📍 Add Location — Current"}</Text>
      </Pressable>

      <Pressable style={styles.secondaryButton} onPress={() => router.push("/map-picker")}>
        <Text style={styles.secondaryButtonText}>🗺️ Add Location — Select From Map</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardHeading: { color: colors.text, fontSize: 16, fontWeight: "700", marginBottom: 8 },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 10,
  },
  buttonDisabled: { opacity: 0.5 },
  primaryButtonText: { color: "#04121F", fontWeight: "700", fontSize: 15 },
  secondaryButton: {
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryButtonText: { color: colors.text, fontWeight: "600", fontSize: 15 },
});
