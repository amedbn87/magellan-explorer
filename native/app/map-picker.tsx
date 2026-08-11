import React, { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Map as MapLibreMap, Camera, Marker } from "@maplibre/maplibre-react-native";
import type { NativeSyntheticEvent } from "react-native";
import { Screen, Title, colors } from "../src/ui/primitives";
import { WaypointsRepository } from "../src/data/storage";
import { useMagellan } from "../src/state/MagellanProvider";
import { formatCoord } from "../src/services/navigation/geo";

// Keyless demo-tiles style. Swap for a self-hosted / paid vector style before
// shipping at scale — the public demotiles server has no uptime guarantee.
// See MASTER PROMPT section 11/17: no private key is committed here.
const OSM_STYLE_URL = "https://demotiles.maplibre.org/style.json";

export default function MapPickerScreen() {
  const { gnss } = useMagellan();
  const [picked, setPicked] = useState<{ latitude: number; longitude: number } | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const initialCenter: [number, number] =
    gnss.longitude !== undefined && gnss.latitude !== undefined ? [gnss.longitude, gnss.latitude] : [0, 0];

  async function save() {
    if (!picked) return;
    setSaving(true);
    try {
      const waypoint = await WaypointsRepository.save({
        name: name.trim() || `Map pin ${new Date().toLocaleTimeString()}`,
        latitude: picked.latitude,
        longitude: picked.longitude,
        source: "map",
      });
      Alert.alert("Saved", waypoint.name);
      router.back();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen scroll={false}>
      <Title>Select From Map</Title>
      <View style={styles.mapWrap}>
        <MapLibreMap
          style={StyleSheet.absoluteFill}
          mapStyle={OSM_STYLE_URL}
          onPress={(event: NativeSyntheticEvent<{ lngLat: [number, number] }>) => {
            const [longitude, latitude] = event.nativeEvent.lngLat;
            setPicked({ latitude, longitude });
          }}
        >
          <Camera initialViewState={{ center: initialCenter, zoom: 12 }} />
          {picked ? (
            <Marker id="picked" lngLat={[picked.longitude, picked.latitude]}>
              <View style={styles.pin} />
            </Marker>
          ) : null}
        </MapLibreMap>
      </View>

      {picked ? (
        <View style={styles.confirmRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.coord}>{formatCoord(picked.latitude, picked.longitude)}</Text>
            <TextInput
              style={styles.input}
              placeholder="Name this location"
              placeholderTextColor={colors.subtext}
              value={name}
              onChangeText={setName}
            />
          </View>
          <Pressable style={styles.saveButton} disabled={saving} onPress={save}>
            <Text style={styles.saveButtonText}>{saving ? "Saving…" : "Save"}</Text>
          </Pressable>
        </View>
      ) : (
        <Text style={styles.hint}>Tap the map to drop a pin.</Text>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  mapWrap: { flex: 1, borderRadius: 16, overflow: "hidden", marginBottom: 12 },
  hint: { color: colors.subtext, textAlign: "center" },
  pin: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.accent, borderWidth: 2, borderColor: "#fff" },
  confirmRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  coord: { color: colors.text, fontWeight: "600", marginBottom: 4 },
  input: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    color: colors.text,
  },
  saveButton: { backgroundColor: colors.accent, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12 },
  saveButtonText: { color: "#04121F", fontWeight: "700" },
});
