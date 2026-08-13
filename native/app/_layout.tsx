import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import * as SplashScreen from "expo-splash-screen";
import { useFonts, Inter_400Regular, Inter_700Bold } from "@expo-google-fonts/inter";
import { JetBrainsMono_500Medium } from "@expo-google-fonts/jetbrains-mono";
import { MagellanProvider } from "../src/state/MagellanProvider";
import { colors } from "../src/ui/theme";

SplashScreen.preventAutoHideAsync().catch(() => {});

const HEADER_STYLE = {
  headerStyle: { backgroundColor: colors.surfaceContainerLow },
  headerTintColor: colors.text,
  headerTitleStyle: { color: colors.text, fontFamily: "Inter_700Bold" },
} as const;

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_700Bold,
    JetBrainsMono_500Medium,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <MagellanProvider>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="history" options={{ headerShown: true, title: "History", ...HEADER_STYLE }} />
            <Stack.Screen name="groups" options={{ headerShown: true, title: "Groups", ...HEADER_STYLE }} />
            <Stack.Screen name="share" options={{ headerShown: true, title: "Share Location", ...HEADER_STYLE }} />
            <Stack.Screen name="receive" options={{ headerShown: true, title: "Receive Location", ...HEADER_STYLE }} />
            <Stack.Screen name="marine" options={{ headerShown: true, title: "Marine Conditions", ...HEADER_STYLE }} />
            <Stack.Screen name="settings" options={{ headerShown: true, title: "Settings", ...HEADER_STYLE }} />
            <Stack.Screen name="map-picker" options={{ headerShown: true, title: "Select From Map", ...HEADER_STYLE }} />
            <Stack.Screen name="navigate/[id]" options={{ headerShown: true, title: "Navigate", ...HEADER_STYLE }} />
            <Stack.Screen name="menu" options={{ headerShown: true, title: "Menu", presentation: "modal", ...HEADER_STYLE }} />
          </Stack>
        </MagellanProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
