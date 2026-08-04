import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@lib/queryClient';
import { useAuthStore } from '@store/authStore';
import { useThemeStore } from '@store/themeStore';
import { LoadingScreen } from '@components/LoadingScreen';
import { ErrorBoundary } from '@components/ErrorBoundary';
import { ConnectionIndicator } from '@components/ConnectionIndicator';
import { useNetworkStatus } from '@hooks/useNetworkStatus';
import { usePushNotifications } from '@hooks/usePushNotifications';

function AppContent() {
  const { initialized, initialize } = useAuthStore();
  const { mode, loadMode } = useThemeStore();

  useNetworkStatus();
  usePushNotifications();

  React.useEffect(() => {
    loadMode();
    if (!initialized) initialize();
  }, [initialized, initialize, loadMode]);

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
