import { useEffect, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useAppStore } from '@store/appStore';
import { queryClient } from '@lib/queryClient';

export function useNetworkStatus() {
  const setOnline = useAppStore((s) => s.setOnline);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const isOnline = !!(state.isConnected && state.isInternetReachable);
      setOnline(isOnline);

      if (isOnline) {
        queryClient.resumePausedMutations();
        queryClient.invalidateQueries();
      }
    });

    unsubscribeRef.current = unsubscribe;

    return () => {
      unsubscribe();
    };
  }, [setOnline]);
}
