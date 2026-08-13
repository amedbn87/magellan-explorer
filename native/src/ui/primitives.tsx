import React from "react";
import { ScrollView, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius, spacing, fontFamily, type } from "./theme";
import type { FixQuality } from "../data/types";

export { colors, radius, spacing, fontFamily, type };

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
      style={[styles.screen, { paddingTop: insets.top + spacing.gutter }, style]}
      contentContainerStyle={scroll ? styles.scrollContent : undefined}
    >
      {children}
    </Container>
  );
}

export function Title({ children }: { children: React.ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function LabelCaps({ children, style }: { children: React.ReactNode; style?: object }) {
  return <Text style={[styles.labelCaps, style]}>{children}</Text>;
}

export function DataMono({ children, style }: { children: React.ReactNode; style?: object }) {
  return <Text style={[styles.dataMono, style]}>{children}</Text>;
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statRow}>
      <LabelCaps style={styles.statLabel}>{label}</LabelCaps>
      <DataMono style={styles.statValue}>{value}</DataMono>
    </View>
  );
}

const FIX_LABEL: Record<FixQuality, string> = {
  NO_FIX: "NO FIX",
  ACQUIRING: "ACQUIRING",
  "2D": "2D FIX",
  "3D": "3D FIX",
  DGNSS: "DGNSS FIX",
};

const FIX_COLOR: Record<FixQuality, string> = {
  NO_FIX: colors.danger,
  ACQUIRING: colors.warn,
  "2D": colors.warn,
  "3D": colors.good,
  DGNSS: colors.good,
};

/** The small "3D FIX" pill seen on every screen's header in the Stitch
 * reference. Always reflects the real GnssSnapshot.fixQuality — never a
 * decorative/randomized indicator. */
export function FixPill({ fixQuality }: { fixQuality: FixQuality }) {
  return (
    <View style={styles.fixPill}>
      <View style={[styles.fixDot, { backgroundColor: FIX_COLOR[fixQuality] }]} />
      <LabelCaps style={{ color: FIX_COLOR[fixQuality] }}>{FIX_LABEL[fixQuality]}</LabelCaps>
    </View>
  );
}

/** The Stitch reference always shows a fix-quality badge; the network/data
 * connection is a separate, independently-tracked concern (deliberately —
 * GNSS can be FIXED while the network is OFFLINE, and that's fine). This
 * renders both side by side from real state, never conflating the two. */
export function NetworkPill({ online }: { online: boolean | null }) {
  const label = online === null ? "NETWORK: …" : online ? "NETWORK: ONLINE" : "NETWORK: OFFLINE";
  const color = online === null ? colors.subtext : online ? colors.good : colors.warn;
  return (
    <View style={styles.fixPill}>
      <View style={[styles.fixDot, { backgroundColor: color }]} />
      <LabelCaps style={{ color }}>{label}</LabelCaps>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.marginMobile },
  scrollContent: { paddingBottom: 40 },
  title: {
    color: colors.text,
    fontFamily: fontFamily.bodyBold,
    ...type.instrumentMobile,
    marginBottom: spacing.gutter,
  },
  labelCaps: {
    color: colors.subtext,
    fontFamily: fontFamily.labelCaps,
    textTransform: "uppercase",
    ...type.labelCaps,
  },
  dataMono: {
    color: colors.text,
    fontFamily: fontFamily.dataMono,
    ...type.dataMonoMd,
  },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.gutter,
    marginBottom: spacing.unit * 3,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.unit * 1.5,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  statLabel: { fontSize: 11 },
  statValue: { fontSize: 14 },
  fixPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.unit,
    backgroundColor: colors.surfaceVariant,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.DEFAULT,
    paddingHorizontal: spacing.unit * 2,
    paddingVertical: spacing.unit,
  },
  fixDot: { width: 8, height: 8, borderRadius: 4 },
});
