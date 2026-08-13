import React from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { router } from "expo-router";
import { colors, radius, spacing, fontFamily } from "../src/ui/theme";

interface MenuItem {
  icon: string;
  label: string;
  href: Parameters<typeof router.push>[0];
}

// Every entry here is a real, working screen — no placeholder/"coming soon"
// destinations. The Stitch reference also lists Sensor Calibration,
// Coordinate Systems, and Offline Maps management; those capabilities
// aren't implemented yet (coordinate FORMAT is real and lives in Settings),
// so they're deliberately omitted rather than wired to dead buttons.
// See MASTER UI/ENGINEERING INTEGRATION TASK section 6.
const ITEMS: MenuItem[] = [
  { icon: "🗂️", label: "Groups", href: "/groups" },
  { icon: "📤", label: "Share Location", href: "/share" },
  { icon: "📥", label: "Receive Location", href: "/receive" },
  { icon: "🌊", label: "Marine Conditions", href: "/marine" },
  { icon: "🕘", label: "History", href: "/history" },
  { icon: "⚙️", label: "Settings", href: "/settings" },
];

export default function MenuScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {ITEMS.map((item) => (
        <Pressable
          key={item.href.toString()}
          style={styles.row}
          onPress={() => {
            router.back();
            router.push(item.href);
          }}
        >
          <Text style={styles.icon}>{item.icon}</Text>
          <Text style={styles.label}>{item.label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.gutter },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.gutter,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingVertical: 14,
    paddingHorizontal: spacing.gutter,
    marginBottom: spacing.unit * 2,
    minHeight: spacing.touchTargetMin,
  },
  icon: { fontSize: 20 },
  label: { color: colors.text, fontFamily: fontFamily.bodyBold, fontSize: 15 },
});
