import { QueryClient } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: (failureCount, error: unknown) => {
        if (error && typeof error === 'object' && 'code' in error) {
          const code = (error as { code: string | null }).code;
          if (code === 'network-request-failed') return false;
        }
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
      networkMode: 'offlineFirst',
    },
    mutations: {
      retry: 0,
      networkMode: 'offlineFirst',
    },
  },
});

export async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return !!(state.isConnected && state.isInternetReachable);
}
