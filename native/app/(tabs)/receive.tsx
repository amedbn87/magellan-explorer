import React, { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Screen, Title, colors } from "../../src/ui/primitives";
import { decodeLocationPayload } from "../../src/services/transport/payload";
import { WaypointsRepository, HistoryRepository } from "../../src/data/storage";

export default function ReceiveScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const [lastError, setLastError] = useState<string | null>(null);

  if (!permission) return null;

  if (!permission.granted) {
    return (
      <Screen>
        <Title>Receive</Title>
        <Text style={styles.hint}>Camera access is needed to scan a Magellan location QR code.</Text>
        <Pressable style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant camera permission</Text>
        </Pressable>
      </Screen>
    );
  }

  async function onScanned(data: string) {
    if (!scanning) return;
    setScanning(false);
    const result = decodeLocationPayload(data);
    if (!result.ok) {
      setLastError(result.error);
      setTimeout(() => setScanning(true), 1200);
      return;
    }
    setLastError(null);
    const { payload } = result;
    const waypoint = await WaypointsRepository.save({
      name: payload.name ?? "Received location",
      latitude: payload.lat,
      longitude: payload.lon,
      altitudeM: payload.alt,
      accuracyM: payload.acc,
      note: payload.note,
      source: "received",
    });
    await HistoryRepository.add({
      kind: "received",
      transport: "qr",
      label: waypoint.name,
      latitude: waypoint.latitude,
      longitude: waypoint.longitude,
      accuracyM: waypoint.accuracyM,
      at: Date.now(),
    });
    Alert.alert("Location received", waypoint.name, [
      { text: "Scan another", onPress: () => setScanning(true) },
      { text: "Done", style: "cancel" },
    ]);
  }

  return (
    <Screen scroll={false}>
      <Title>Receive</Title>
      <View style={styles.cameraWrap}>
        <CameraView
          style={StyleSheet.absoluteFill}
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={scanning ? (event) => onScanned(event.data) : undefined}
        />
      </View>
      {lastError ? <Text style={styles.error}>{lastError}</Text> : null}
      <Text style={styles.hint}>Point the camera at a Magellan QR code.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: { color: colors.subtext, marginTop: 12 },
  error: { color: colors.danger, marginTop: 12 },
  cameraWrap: {
    height: 360,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  buttonText: { color: "#04121F", fontWeight: "700" },
});
