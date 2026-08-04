import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from '@lib/supabase';
import { storage } from '@lib/storage';

const TOKEN_KEY = '@luxe_erp_push_token';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationPermissionState {
  granted: boolean;
  canAskAgain: boolean;
  status: Notifications.PermissionStatus;
}

class NotificationService {
  async requestPermission(): Promise<NotificationPermissionState> {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) {
      return { granted: true, canAskAgain: current.canAskAgain, status: current.status };
    }
    if (!current.canAskAgain) {
      return { granted: false, canAskAgain: false, status: current.status };
    }
    const result = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
    return { granted: result.granted, canAskAgain: result.canAskAgain, status: result.status };
  }

  async getPermissionState(): Promise<NotificationPermissionState> {
    const current = await Notifications.getPermissionsAsync();
    return { granted: current.granted, canAskAgain: current.canAskAgain, status: current.status };
  }

  async registerForPushNotifications(): Promise<string | null> {
    const permission = await this.requestPermission();
    if (!permission.granted) return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'LUXE ERP Notifications',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#d4a649',
      });
    }

    const token = (await Notifications.getExpoPushTokenAsync({
      projectId: 'luxe-erp-mobile',
    })).data;

    await storage.set(TOKEN_KEY, token);
    await this.syncTokenToServer(token);
    return token;
  }

  async syncTokenToServer(token: string): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      await supabase.from('push_tokens').upsert({
        user_id: session.user.id,
        token,
        platform: Platform.OS,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'token' });
    } catch {
      // best-effort sync
    }
  }

  async getStoredToken(): Promise<string | null> {
    return storage.get<string>(TOKEN_KEY);
  }

  async unregisterToken(): Promise<void> {
    const token = await this.getStoredToken();
    if (token) {
      try {
        await supabase.from('push_tokens').delete().eq('token', token);
      } catch {
        // best-effort
      }
    }
    await storage.remove(TOKEN_KEY);
  }
}

export const notificationService = new NotificationService();
