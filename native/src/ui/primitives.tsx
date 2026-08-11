import React from "react";
import { ScrollView, StyleSheet, Text, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const colors = {
  bg: "#0B1220",
  card: "#131C2B",
  border: "#1B2536",
  text: "#E7ECF3",
  subtext: "#7A8699",
  accent: "#3AA7FF",
  warn: "#F5A623",
  danger: "#F25C54",
  good: "#3DD68C",
};

export function Screen({
  children,
  scroll = true,
  style,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
}) {
  const insets = useSafeAreaInsets();
  const Container = scroll ? ScrollView : View;
  return (
    <Container
      style={[styles.screen, { paddingTop: insets.top + 12 }, style]}
      contentContainerStyle={scroll ? styles.scrollContent : undefined}
    >
      {children}
    </Container>
  );
}

export function Title({ children }: { children: React.ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 16 },
  scrollContent: { paddingBottom: 40 },
  title: { color: colors.text, fontSize: 24, fontWeight: "700", marginBottom: 16 },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  statLabel: { color: colors.subtext, fontSize: 14 },
  statValue: { color: colors.text, fontSize: 14, fontWeight: "600" },
});
