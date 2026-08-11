import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { MagellanProvider } from "../src/state/MagellanProvider";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <MagellanProvider>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false }} />
        </MagellanProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
