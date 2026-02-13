import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { View, Platform, AppState, AppStateStatus } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import LaunchScreen from "@/components/LaunchScreen";
import Colors from "@/constants/colors";
import { queryClient } from "@/lib/query-client";
import { AppProvider, useApp } from "@/lib/AppContext";
import { StatusBar } from "expo-status-bar";
import { endSession } from "@/lib/analytics";
import { logError, captureException } from "@/lib/errorReporting";
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
  const appState = useRef(AppState.currentState);

  const triggerLaunch = useCallback(() => {
    setLaunchKey(k => k + 1);
    setShowLaunch(true);
  }, []);

  useEffect(() => {
    setOnResetCallback(() => triggerLaunch);
    return () => setOnResetCallback(null);
  }, [triggerLaunch, setOnResetCallback]);

  // Track app state changes for session management
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appState.current.match(/active/) && nextAppState.match(/inactive|background/)) {
        // App going to background - end session
        endSession();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

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

// Global error handler for unhandled errors and promise rejections
function setupGlobalErrorHandlers() {
  try {
    // Handle unhandled errors (React Native)
    const originalHandler = ErrorUtils.getGlobalHandler();

    ErrorUtils.setGlobalHandler((error, isFatal) => {
      // Log to our error reporting system
      try {
        const errorObj = error instanceof Error ? error : new Error(String(error));
        logError(errorObj, isFatal ? 'fatal' : 'error', {
          component: 'GlobalErrorHandler',
          action: 'unhandledError',
          metadata: { isFatal },
        });
      } catch {
        // Last resort: at least try console
        console.error('Global error caught:', error, 'Fatal:', isFatal);
      }

      // Call original handler with try-catch to prevent crashes
      try {
        originalHandler?.(error, isFatal);
      } catch (handlerError) {
        console.error('Original error handler failed:', handlerError);
      }
    });
  } catch (setupError) {
    console.error('Failed to set up global error handler:', setupError);
  }

  // For web platform
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.addEventListener('unhandledrejection', (event) => {
      try {
        const error = event.reason instanceof Error
          ? event.reason
          : new Error(String(event.reason));
        captureException(error, {
          component: 'GlobalErrorHandler',
          action: 'unhandledRejection',
        });
      } catch {
        console.error('Unhandled Promise Rejection:', event.reason);
      }
    });
  }
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

  // Set up global error handlers on mount
  useEffect(() => {
    setupGlobalErrorHandlers();
  }, []);

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
