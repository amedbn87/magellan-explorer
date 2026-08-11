import React from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useMagellan } from "../../src/state/MagellanProvider";
import { Screen, Title, colors } from "../../src/ui/primitives";

export default function SatellitesScreen() {
  const { gnss } = useMagellan();
  const hasRawData = gnss.source === "AndroidGnssStatus" && gnss.satellites.length > 0;

  return (
    <Screen scroll={false}>
      <Title>Satellites</Title>
      {!hasRawData ? (
        <Text style={styles.empty}>
          {gnss.source === "AndroidGnssStatus"
            ? "Waiting for satellite status…"
            : "Unavailable — the native GnssStatus module isn't linked on this build. Position still works via " +
              gnss.source +
              "."}
        </Text>
      ) : (
        <>
          <Text style={styles.summary}>
            {gnss.satellitesUsedInFix} used in fix / {gnss.satellitesVisible} visible
          </Text>
          <FlatList
            data={gnss.satellites}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={[styles.row, item.usedInFix && styles.rowUsed]}>
                <Text style={styles.constellation}>{item.constellation}</Text>
                <Text style={styles.svid}>#{item.svid}</Text>
                <Text style={styles.cn0}>{item.cn0DbHz.toFixed(0)} dB-Hz</Text>
                <Text style={styles.azEl}>
                  az {item.azimuthDeg.toFixed(0)}° · el {item.elevationDeg.toFixed(0)}°
                </Text>
              </View>
            )}
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { color: colors.subtext, marginTop: 12, lineHeight: 20 },
  summary: { color: colors.text, fontWeight: "600", marginBottom: 10 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
  },
  rowUsed: { borderColor: colors.good },
  constellation: { color: colors.text, fontWeight: "700", width: 64 },
  svid: { color: colors.subtext, width: 44 },
  cn0: { color: colors.text, width: 76 },
  azEl: { color: colors.subtext, flex: 1 },
});
