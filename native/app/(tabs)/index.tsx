import React, { useEffect, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Map as MapLibreMap, Camera, Marker, type CameraRef } from "@maplibre/maplibre-react-native";
import { useMagellan } from "../../src/state/MagellanProvider";
import { colors, radius, spacing, fontFamily, FixPill, NetworkPill, LabelCaps, DataMono } from "../../src/ui/primitives";
import { formatCoordinates } from "../../src/services/navigation/geo";
import { WaypointsRepository } from "../../src/data/storage";

// Same keyless OSM style used by the map picker — no API key committed.
const OSM_STYLE_URL = "https://demotiles.maplibre.org/style.json";
const DEFAULT_CENTER: [number, number] = [0, 0];

export default function MapScreen() {
  const { gnss, compassHeadingDeg, network, preferences } = useMagellan();
  const [saving, setSaving] = useState(false);
  const cameraRef = useRef<CameraRef>(null);
  const hasCenteredOnce = useRef(false);

  const hasFix = gnss.latitude !== undefined && gnss.longitude !== undefined;
  const position: [number, number] = hasFix ? [gnss.longitude!, gnss.latitude!] : DEFAULT_CENTER;

  // Recenter automatically the first time a fix arrives, then leave the
  // camera under the user's control (pinch/pan) — matches the "Recenter"
  // button being a distinct, user-triggered action in the Stitch reference.
  // Refs must only be read/written in effects/handlers, never during render.
  useEffect(() => {
    if (hasFix && !hasCenteredOnce.current) {
      hasCenteredOnce.current = true;
      cameraRef.current?.jumpTo({ center: position });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasFix]);

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

  const coords = hasFix ? formatCoordinates(gnss.latitude!, gnss.longitude!, preferences.coordinateFormat) : null;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable style={styles.headerButton} onPress={() => router.push("/menu")}>
          <Text style={styles.headerIcon}>☰</Text>
        </Pressable>
        <Text style={styles.headerTitle}>NAVIGATOR</Text>
        <FixPill fixQuality={gnss.fixQuality} />
      </View>

      <View style={styles.mapWrap}>
        <MapLibreMap style={StyleSheet.absoluteFill} mapStyle={OSM_STYLE_URL}>
          <Camera ref={cameraRef} initialViewState={{ center: position, zoom: 14 }} />
          {hasFix ? (
            <Marker id="current-position" lngLat={position} anchor="center">
              <View style={styles.markerWrap}>
                <View
                  style={[
                    styles.headingCone,
                    { transform: [{ rotate: `${compassHeadingDeg ?? 0}deg` }] },
                  ]}
                />
                <View style={styles.markerDot} />
              </View>
            </Marker>
          ) : null}
        </MapLibreMap>

        {!hasFix ? (
          <View style={styles.acquiringOverlay}>
            <Text style={styles.acquiringGlyph}>🛰️</Text>
            <Text style={styles.acquiringLabel}>ACQUIRING GNSS FIX…</Text>
            <LabelCaps style={styles.acquiringSub}>
              Satellites visible: {gnss.satellitesVisible > 0 ? gnss.satellitesUsedInFix : "—"}
            </LabelCaps>
          </View>
        ) : null}

        <View style={styles.controls}>
          <Pressable
            style={styles.controlButton}
            onPress={() => hasFix && cameraRef.current?.easeTo({ center: position, duration: 300 })}
          >
            <Text style={styles.controlIcon}>🎯</Text>
          </Pressable>
        </View>

        <View style={styles.hud}>
          <View style={styles.hudRow}>
            <NetworkPill online={network.online} />
          </View>
          <View style={styles.hudCards}>
            <View style={[styles.hudCard, { flex: 1.4 }]}>
              <LabelCaps>Position{preferences.coordinateFormat === "decimal" ? " (WGS84)" : ""}</LabelCaps>
              {coords ? (
                <>
                  <DataMono style={styles.hudValue}>{coords.primary}</DataMono>
                  {coords.secondary ? <DataMono style={styles.hudValue}>{coords.secondary}</DataMono> : null}
                </>
              ) : (
                <DataMono style={styles.hudValue}>Acquiring…</DataMono>
              )}
              <LabelCaps style={styles.hudSub}>
                {gnss.accuracyM !== undefined ? `Acc: ±${gnss.accuracyM.toFixed(1)}m` : ""}
              </LabelCaps>
            </View>
            <View style={styles.hudCard}>
              <LabelCaps>Speed</LabelCaps>
              <DataMono style={styles.hudValueBig}>
                {gnss.speedMps !== undefined ? (gnss.speedMps * 3.6).toFixed(1) : "—"}
                <Text style={styles.hudUnit}> km/h</Text>
              </DataMono>
            </View>
            <View style={styles.hudCard}>
              <LabelCaps>Altitude</LabelCaps>
              <DataMono style={styles.hudValueBig}>
                {gnss.altitudeM !== undefined ? gnss.altitudeM.toFixed(0) : "—"}
                <Text style={styles.hudUnit}> m</Text>
              </DataMono>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.actionsRow}>
        <Pressable style={[styles.actionButton, saving && styles.actionButtonDisabled]} disabled={saving || !hasFix} onPress={quickAdd}>
          <Text style={styles.actionButtonText}>{saving ? "Saving…" : "📍 Add Current Location"}</Text>
        </Pressable>
        <Pressable style={styles.actionButtonSecondary} onPress={() => router.push("/map-picker")}>
          <Text style={styles.actionButtonSecondaryText}>🗺️</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.marginMobile,
    height: spacing.touchTargetMin,
    backgroundColor: colors.surfaceContainerLow,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  headerButton: { padding: spacing.unit * 2 },
  headerIcon: { color: colors.primary, fontSize: 20 },
  headerTitle: { color: colors.text, fontFamily: fontFamily.bodyBold, letterSpacing: 1 },
  mapWrap: { flex: 1 },
  markerWrap: { width: 64, height: 64, alignItems: "center", justifyContent: "center" },
  headingCone: {
    position: "absolute",
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${colors.primary}22`,
  },
  markerDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.onPrimary,
  },
  acquiringOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: `${colors.background}CC`,
  },
  acquiringGlyph: { fontSize: 40, marginBottom: spacing.gutter },
  acquiringLabel: { color: colors.text, fontFamily: fontFamily.bodyBold, letterSpacing: 1, marginBottom: spacing.unit },
  acquiringSub: {},
  controls: { position: "absolute", top: spacing.marginMobile, right: spacing.marginMobile },
  controlButton: {
    width: spacing.touchTargetMin,
    height: spacing.touchTargetMin,
    borderRadius: radius.lg,
    backgroundColor: `${colors.surfaceContainer}E6`,
    borderColor: colors.border,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  controlIcon: { fontSize: 20 },
  hud: { position: "absolute", left: spacing.marginMobile, right: spacing.marginMobile, bottom: spacing.marginMobile, gap: spacing.unit * 2 },
  hudRow: { flexDirection: "row" },
  hudCards: { flexDirection: "row", gap: spacing.unit * 2 },
  hudCard: {
    flex: 1,
    backgroundColor: `${colors.surfaceContainer}E6`,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.gutter,
  },
  hudValue: { fontSize: 14 },
  hudValueBig: { fontSize: 22, marginTop: 4 },
  hudUnit: { fontSize: 12, color: colors.subtext },
  hudSub: { marginTop: 4, textTransform: "none" },
  actionsRow: { flexDirection: "row", gap: spacing.unit * 2, padding: spacing.marginMobile },
  actionButton: {
    flex: 1,
    backgroundColor: colors.primaryContainer,
    borderRadius: radius.lg,
    paddingVertical: 14,
    alignItems: "center",
  },
  actionButtonDisabled: { opacity: 0.5 },
  actionButtonText: { color: colors.onPrimaryContainer, fontFamily: fontFamily.bodyBold, fontSize: 14 },
  actionButtonSecondary: {
    width: spacing.touchTargetMin,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonSecondaryText: { fontSize: 18 },
});
