import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@lib/queryClient';
import { useAuthStore } from '@store/authStore';
import { useThemeStore } from '@store/themeStore';
import { useSettingsStore } from '@store/settingsStore';
import { LoadingScreen } from '@components/LoadingScreen';
import { ErrorBoundary } from '@components/ErrorBoundary';
import { ConnectionIndicator } from '@components/ConnectionIndicator';
import { useNetworkStatus } from '@hooks/useNetworkStatus';
import { usePushNotifications } from '@hooks/usePushNotifications';

function AppContent() {
  const { initialized, initialize, profile } = useAuthStore();
  const { mode, loadMode } = useThemeStore();
  const { loadFromStorage, syncFromDatabase } = useSettingsStore();

  useNetworkStatus();
  usePushNotifications();

  React.useEffect(() => {
    loadMode();
    loadFromStorage();
    if (!initialized) initialize();
  }, [initialized, initialize, loadMode, loadFromStorage]);

  React.useEffect(() => {
    if (profile?.id) syncFromDatabase(profile.id);
  }, [profile?.id, syncFromDatabase]);

  if (!initialized) return <LoadingScreen message="Starting LUXE ERP…" />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <ConnectionIndicator />
          <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
          <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(app)" />
            <Stack.Screen name="splash" />
            <Stack.Screen name="unauthorized" />
            <Stack.Screen name="not-found" />
          </Stack>
        </ErrorBoundary>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return <AppContent />;
}
