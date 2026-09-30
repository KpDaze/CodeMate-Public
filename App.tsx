import { useEffect } from "react";
import { StatusBar } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { fontAssets } from "./src/editor/fonts";
import { EditorShell } from "./src/editor/EditorShell";

void SplashScreen.preventAutoHideAsync();
export default function App() {
  const [loaded, error] = useFonts(fontAssets);
  useEffect(() => {
    if (loaded || error) void SplashScreen.hideAsync();
  }, [loaded, error]);
  if (error) throw error;
  if (!loaded) return null;
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView
        edges={["top", "bottom", "left", "right"]}
        style={{ flex: 1, backgroundColor: "#fff" }}
      >
        <EditorShell />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
