import React from "react";
import { Alert, Pressable, StyleSheet, Switch, Text } from "react-native";
import { router } from "expo-router";
import { useMagellan } from "../src/state/MagellanProvider";
import { Screen, Card, LabelCaps, colors, spacing, fontFamily } from "../src/ui/primitives";
import { HistoryRepository } from "../src/data/storage";

function SettingRow({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.settingRow} onPress={onPress}>
      <Text style={styles.settingLabel}>{label}</Text>
      <Text style={styles.settingValue}>{value} ›</Text>
    </Pressable>
  );
}

function SwitchRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Pressable style={styles.settingRow} onPress={() => onChange(!value)}>
      <Text style={styles.settingLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.surfaceVariant, true: colors.primaryContainer }}
        thumbColor={value ? colors.onPrimaryContainer : colors.outline}
      />
    </Pressable>
  );
}

export default function SettingsScreen() {
  const { preferences, setPreferences } = useMagellan();

  return (
    <Screen>
      <LabelCaps style={styles.sectionHeading}>Position</LabelCaps>
      <Card>
        <SettingRow
          label="Distance Units"
          value={preferences.distanceUnit === "metric" ? "Metric (km, m)" : "Imperial (mi, ft)"}
          onPress={() =>
            setPreferences({ distanceUnit: preferences.distanceUnit === "metric" ? "imperial" : "metric" })
          }
        />
        <SwitchRow
          label="Coordinate Format: DMS"
          value={preferences.coordinateFormat === "dms"}
          onChange={(v) => setPreferences({ coordinateFormat: v ? "dms" : "decimal" })}
        />
      </Card>

      <LabelCaps style={styles.sectionHeading}>Data</LabelCaps>
      <Card>
        <Pressable onPress={() => router.push("/history")}>
          <Text style={styles.action}>View history</Text>
        </Pressable>
        <Pressable
          onPress={() =>
            Alert.alert("Clear history", "This removes share/receive/navigate history only — waypoints and groups are kept.", [
              { text: "Cancel", style: "cancel" },
              { text: "Clear", style: "destructive", onPress: () => HistoryRepository.clear() },
            ])
          }
        >
          <Text style={styles.action}>Clear history</Text>
        </Pressable>
      </Card>

      <LabelCaps style={styles.sectionHeading}>About</LabelCaps>
      <Card>
        <Text style={styles.body}>
          Magellan — GNSS navigation and location sharing built on real device sensors. No simulated or fabricated
          location data is ever shown; unavailable values are labeled &ldquo;Unavailable&rdquo;.
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionHeading: { marginBottom: spacing.unit * 2, marginTop: spacing.unit },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  settingLabel: { color: colors.text, fontFamily: fontFamily.body, fontSize: 15 },
  settingValue: { color: colors.subtext, fontSize: 13 },
  action: { color: colors.accent, paddingVertical: 8, fontFamily: fontFamily.bodyBold },
  body: { color: colors.subtext, lineHeight: 20 },
});
