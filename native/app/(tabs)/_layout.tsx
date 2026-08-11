import { Tabs } from "expo-router";

const TAB_ICONS: Record<string, string> = {
  index: "🧭",
  waypoints: "📍",
  groups: "🗂️",
  satellites: "🛰️",
  share: "📤",
  receive: "📥",
  marine: "🌊",
  settings: "⚙️",
};

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#3AA7FF",
        tabBarInactiveTintColor: "#7A8699",
        tabBarStyle: { backgroundColor: "#0B1220", borderTopColor: "#1B2536" },
        tabBarIcon: () => null,
        tabBarLabel: TAB_ICONS[route.name]
          ? `${TAB_ICONS[route.name]} ${route.name === "index" ? "Home" : route.name}`
          : route.name,
      })}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="waypoints" options={{ title: "Waypoints" }} />
      <Tabs.Screen name="groups" options={{ title: "Groups" }} />
      <Tabs.Screen name="satellites" options={{ title: "Satellites" }} />
      <Tabs.Screen name="share" options={{ title: "Share" }} />
      <Tabs.Screen name="receive" options={{ title: "Receive" }} />
      <Tabs.Screen name="marine" options={{ title: "Marine" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
    </Tabs>
  );
}
