import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState, useCallback } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import LaunchScreen from "@/components/LaunchScreen";
import Colors from "@/constants/colors";
import { queryClient } from "@/lib/query-client";
import { AppProvider, useApp } from "@/lib/AppContext";
import { StatusBar } from "expo-status-bar";
import {
  useFonts,
  Nunito_400Regular,
  Nunito_500Medium,
  Nunito_600SemiBold,
  Nunito_700Bold,
} from "@expo-google-fonts/nunito";
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
} from "@expo-google-fonts/dm-sans";

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="day-detail"
        options={{
          presentation: "modal",
          headerShown: true,
          headerTitle: "",
          headerStyle: { backgroundColor: Colors.surface },
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

function AppContent() {
  const [showLaunch, setShowLaunch] = useState(true);
  const [launchKey, setLaunchKey] = useState(0);
  const { setOnResetCallback } = useApp();

  const triggerLaunch = useCallback(() => {
    setLaunchKey(k => k + 1);
    setShowLaunch(true);
  }, []);

  useEffect(() => {
    setOnResetCallback(() => triggerLaunch);
    return () => setOnResetCallback(null);
  }, [triggerLaunch, setOnResetCallback]);

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <RootLayoutNav />
      {showLaunch && (
        <LaunchScreen key={launchKey} onComplete={() => setShowLaunch(false)} />
      )}
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <KeyboardProvider>
            <AppProvider>
              <AppContent />
            </AppProvider>
          </KeyboardProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
