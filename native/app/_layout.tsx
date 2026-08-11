import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { MagellanProvider } from "../src/state/MagellanProvider";

const HEADER_STYLE = {
  headerStyle: { backgroundColor: "#0B1220" },
  headerTintColor: "#E7ECF3",
  headerTitleStyle: { color: "#E7ECF3" },
} as const;

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <MagellanProvider>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="history" options={{ headerShown: true, title: "History", ...HEADER_STYLE }} />
            <Stack.Screen name="map-picker" options={{ headerShown: true, title: "Select From Map", ...HEADER_STYLE }} />
            <Stack.Screen name="navigate/[id]" options={{ headerShown: true, title: "Navigate", ...HEADER_STYLE }} />
          </Stack>
        </MagellanProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
