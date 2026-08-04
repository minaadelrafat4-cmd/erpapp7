import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@lib/supabase';
import { useThemeStore } from '@store/themeStore';
import type { ThemeMode } from '@apptypes';

export type Language = 'en' | 'es' | 'fr' | 'ar' | 'zh';

export interface NotificationPrefs {
  push_notifications: boolean;
  email_notifications: boolean;
  low_stock_alerts: boolean;
  order_alerts: boolean;
  task_reminders: boolean;
  transfer_alerts: boolean;
}

interface SettingsState {
  language: Language;
  notificationPrefs: NotificationPrefs;
  loaded: boolean;

  setLanguage: (lang: Language) => void;
  setNotificationPrefs: (prefs: Partial<NotificationPrefs>) => void;
  loadFromStorage: () => void;
  syncFromDatabase: (userId: string) => Promise<void>;
}

const LANG_KEY = '@luxe_erp_language';
const NOTIF_KEY = '@luxe_erp_notif_prefs';

const defaultPrefs: NotificationPrefs = {
  push_notifications: true,
  email_notifications: true,
  low_stock_alerts: true,
  order_alerts: true,
  task_reminders: true,
  transfer_alerts: true,
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  language: 'en',
  notificationPrefs: defaultPrefs,
  loaded: false,

  setLanguage: (lang) => {
    set({ language: lang });
    AsyncStorage.setItem(LANG_KEY, lang).catch(() => {});
  },

  setNotificationPrefs: (prefs) => {
    const next = { ...get().notificationPrefs, ...prefs };
    set({ notificationPrefs: next });
    AsyncStorage.setItem(NOTIF_KEY, JSON.stringify(next)).catch(() => {});
  },

  loadFromStorage: () => {
    Promise.all([
      AsyncStorage.getItem(LANG_KEY),
      AsyncStorage.getItem(NOTIF_KEY),
    ]).then(([lang, prefs]) => {
      if (lang) set({ language: lang as Language });
      if (prefs) {
        try {
          set({ notificationPrefs: { ...defaultPrefs, ...JSON.parse(prefs) } });
        } catch { /* ignore */ }
      }
      set({ loaded: true });
    }).catch(() => set({ loaded: true }));
  },

  syncFromDatabase: async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error || !data) return;

      if (data.language) {
        set({ language: data.language as Language });
        AsyncStorage.setItem(LANG_KEY, data.language).catch(() => {});
      }

      const prefs: NotificationPrefs = {
        push_notifications: data.push_notifications,
        email_notifications: data.email_notifications,
        low_stock_alerts: data.low_stock_alerts,
        order_alerts: data.order_alerts,
        task_reminders: data.task_reminders,
        transfer_alerts: data.transfer_alerts,
      };
      set({ notificationPrefs: prefs });
      AsyncStorage.setItem(NOTIF_KEY, JSON.stringify(prefs)).catch(() => {});

      if (data.theme && data.theme !== 'system') {
        useThemeStore.getState().setMode(data.theme as ThemeMode);
      }
    } catch {
      // ignore — local settings still work
    }
  },
}));
