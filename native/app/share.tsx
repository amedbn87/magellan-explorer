import React, { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text } from "react-native";
import { useFocusEffect } from "expo-router";
import QRCode from "react-native-qrcode-svg";
import { Screen, Title, Card, colors } from "../src/ui/primitives";
import { WaypointsRepository, HistoryRepository } from "../src/data/storage";
import type { Waypoint } from "../src/data/types";
import { encodeLocationPayload, MAGELLAN_PAYLOAD_PREFIX, MAGELLAN_PAYLOAD_VERSION } from "../src/services/transport/payload";
import { formatCoord } from "../src/services/navigation/geo";

export default function ShareScreen() {
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [selected, setSelected] = useState<Waypoint | null>(null);
  // The payload timestamp is fixed at selection time (an event handler), not
  // recomputed on every render — Date.now() is impure and must not be called
  // during render.
  const [selectedAt, setSelectedAt] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      WaypointsRepository.list().then(setWaypoints);
    }, []),
  );

  const selectWaypoint = useCallback((waypoint: Waypoint) => {
    const at = Date.now();
    setSelected(waypoint);
    setSelectedAt(at);
    HistoryRepository.add({
      kind: "shared",
      transport: "qr",
      label: waypoint.name,
      latitude: waypoint.latitude,
      longitude: waypoint.longitude,
      accuracyM: waypoint.accuracyM,
      at,
    });
  }, []);

  const encoded =
    selected && selectedAt !== null
      ? encodeLocationPayload({
          t: MAGELLAN_PAYLOAD_PREFIX,
          v: MAGELLAN_PAYLOAD_VERSION,
          lat: selected.latitude,
          lon: selected.longitude,
          alt: selected.altitudeM,
          acc: selected.accuracyM,
          ts: selectedAt,
          name: selected.name,
          src: "waypoint",
        })
      : null;

  return (
    <Screen>
      <Title>Share</Title>

      {selected ? (
        <Card style={styles.qrCard}>
          <QRCode value={encoded!} size={220} backgroundColor={colors.card} color={colors.text} />
          <Text style={styles.qrLabel}>{selected.name}</Text>
          <Text style={styles.qrCoord}>{formatCoord(selected.latitude, selected.longitude)}</Text>
          <Pressable onPress={() => { setSelected(null); setSelectedAt(null); }}>
            <Text style={styles.change}>Choose a different waypoint</Text>
          </Pressable>
        </Card>
      ) : (
        <>
          <Text style={styles.hint}>Pick a waypoint to generate its QR code.</Text>
          <FlatList
            data={waypoints}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ListEmptyComponent={<Text style={styles.hint}>No waypoints saved yet.</Text>}
            renderItem={({ item }) => (
              <Pressable style={styles.row} onPress={() => selectWaypoint(item)}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.coord}>{formatCoord(item.latitude, item.longitude)}</Text>
              </Pressable>
            )}
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: { color: colors.subtext, marginBottom: 12 },
  row: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  name: { color: colors.text, fontWeight: "700" },
  coord: { color: colors.subtext, fontSize: 12, marginTop: 2 },
  qrCard: { alignItems: "center", paddingVertical: 24 },
  qrLabel: { color: colors.text, fontWeight: "700", marginTop: 16 },
  qrCoord: { color: colors.subtext, marginTop: 4 },
  change: { color: colors.accent, marginTop: 16 },
});
