import React from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useMagellan } from "../../src/state/MagellanProvider";
import { Screen, Title, Card, StatRow, colors, radius, spacing, fontFamily, FixPill, NetworkPill, LabelCaps, DataMono } from "../../src/ui/primitives";

export default function StatusScreen() {
  const { gnss, network, compassHeadingDeg } = useMagellan();
  const hasRawData = gnss.source === "AndroidGnssStatus" && gnss.satellites.length > 0;

  return (
    <Screen scroll={false}>
      <Title>Status</Title>

      <View style={styles.pillRow}>
        <FixPill fixQuality={gnss.fixQuality} />
        <NetworkPill online={network.online} />
      </View>

      <Card>
        <StatRow label="GNSS Source" value={gnss.source} />
        <StatRow label="Satellites" value={gnss.satellitesVisible > 0 ? `${gnss.satellitesUsedInFix} used / ${gnss.satellitesVisible} visible` : "Unavailable"} />
        <StatRow label="Compass" value={compassHeadingDeg !== undefined ? `${compassHeadingDeg.toFixed(0)}°` : "Unavailable"} />
        <StatRow label="Accuracy" value={gnss.accuracyM !== undefined ? `±${gnss.accuracyM.toFixed(1)} m` : "Unavailable"} />
        <StatRow label="Network" value={network.online === null ? "Checking…" : `${network.online ? "Online" : "Offline"} (${network.type})`} />
      </Card>

      <LabelCaps style={styles.sectionLabel}>Satellite Skyplot Data</LabelCaps>
      {!hasRawData ? (
        <Text style={styles.empty}>
          {gnss.source === "AndroidGnssStatus"
            ? "Waiting for satellite status…"
            : `Unavailable — the native GnssStatus module isn't linked on this build. Position still works via ${gnss.source}.`}
        </Text>
      ) : (
        <FlatList
          data={gnss.satellites}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={[styles.row, item.usedInFix && styles.rowUsed]}>
              <Text style={styles.constellation}>{item.constellation}</Text>
              <DataMono style={styles.svid}>#{item.svid}</DataMono>
              <DataMono style={styles.cn0}>{item.cn0DbHz.toFixed(0)} dB-Hz</DataMono>
              <LabelCaps style={styles.azEl}>
                az {item.azimuthDeg.toFixed(0)}° · el {item.elevationDeg.toFixed(0)}°
              </LabelCaps>
            </View>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  pillRow: { flexDirection: "row", gap: spacing.unit * 2, marginBottom: spacing.gutter },
  sectionLabel: { marginTop: spacing.unit, marginBottom: spacing.unit * 2 },
  empty: { color: colors.subtext, lineHeight: 20 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: 10,
    marginBottom: 6,
  },
  rowUsed: { borderColor: colors.good },
  constellation: { color: colors.text, fontFamily: fontFamily.bodyBold, width: 64 },
  svid: { color: colors.subtext, width: 44, fontSize: 12 },
  cn0: { color: colors.text, width: 84, fontSize: 12 },
  azEl: { flex: 1 },
});
