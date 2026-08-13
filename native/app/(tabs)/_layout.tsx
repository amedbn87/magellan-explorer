import { Tabs } from "expo-router";
import { Text } from "react-native";
import { colors, spacing, fontFamily } from "../../src/ui/theme";

const TAB_ICON: Record<string, string> = {
  index: "🗺️",
  waypoints: "📍",
  navigate: "🧭",
  status: "📊",
};

const TAB_LABEL: Record<string, string> = {
  index: "Map",
  waypoints: "Waypoints",
  navigate: "Navigate",
  status: "Status",
};

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: colors.surfaceContainerHighest,
          borderTopColor: colors.border,
          height: spacing.touchTargetMin + 16,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontFamily: fontFamily.labelCaps, fontSize: 11, textTransform: "uppercase" },
        tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>{TAB_ICON[route.name] ?? "•"}</Text>,
        tabBarLabel: TAB_LABEL[route.name] ?? route.name,
      })}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="waypoints" />
      <Tabs.Screen name="navigate" />
      <Tabs.Screen name="status" />
    </Tabs>
  );
}
