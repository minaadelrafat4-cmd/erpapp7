import { useEffect } from 'react';
import { notificationService } from '@services/notificationService';
import { useAuthStore } from '@store/authStore';

export function usePushNotifications() {
  const profile = useAuthStore((s) => s.profile);

  useEffect(() => {
    if (!profile) return;

    let mounted = true;

    (async () => {
      const perm = await notificationService.getPermissionState();
      if (perm.granted || perm.canAskAgain) {
        const token = await notificationService.registerForPushNotifications();
        if (token && mounted) {
          // Token registered and synced to server
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [profile?.id]);
}
