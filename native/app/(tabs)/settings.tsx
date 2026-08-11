import React from "react";
import { Alert, Pressable, StyleSheet, Text } from "react-native";
import { Screen, Title, Card, colors } from "../../src/ui/primitives";
import { HistoryRepository } from "../../src/data/storage";

export default function SettingsScreen() {
  return (
    <Screen>
      <Title>Settings</Title>
      <Card>
        <Text style={styles.heading}>Data</Text>
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
      <Card>
        <Text style={styles.heading}>About</Text>
        <Text style={styles.body}>
          Magellan Native — GNSS navigation and location sharing built on real device sensors. No simulated or
          fabricated location data is ever shown; unavailable values are labeled "Unavailable".
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { color: colors.text, fontWeight: "700", marginBottom: 8 },
  action: { color: colors.accent, paddingVertical: 8 },
  body: { color: colors.subtext, lineHeight: 20 },
});
