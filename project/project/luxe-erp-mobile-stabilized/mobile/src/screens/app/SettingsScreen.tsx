import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { ScreenWrapper } from '@components/ScreenWrapper';
import { AppHeader } from '@components/AppHeader';
import { Card } from '@components/Card';
import { Button } from '@components/Button';
import { useThemeStore } from '@store/themeStore';
import { useAuthStore } from '@store/authStore';
import { useSettingsStore, type Language } from '@store/settingsStore';
import { useUpdateUserSettings } from '@hooks/useERP';
import { roleLabel } from '@constants';
import { useResponsive } from '@hooks/useResponsive';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getIconName } from '@config/icons';
import type { IconName } from '@apptypes';
import Constants from 'expo-constants';
import { formatDateTime } from '@lib/format';

const LANGUAGES: { label: string; value: Language; flag: string }[] = [
  { label: 'English', value: 'en', flag: 'EN' },
  { label: 'Español', value: 'es', flag: 'ES' },
  { label: 'Français', value: 'fr', flag: 'FR' },
  { label: 'العربية', value: 'ar', flag: 'AR' },
  { label: '中文', value: 'zh', flag: 'ZH' },
];

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

export default function SettingsScreen() {
  const { colors, mode, setMode, toggle } = useThemeStore();
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);
  const layout = useResponsive();

  const { language, notificationPrefs, setLanguage, setNotificationPrefs } = useSettingsStore();
  const updateSettings = useUpdateUserSettings();

  const [saving, setSaving] = React.useState(false);
  const [languageModalVisible, setLanguageModalVisible] = React.useState(false);

  const handleThemeChange = async (newMode: 'light' | 'dark' | 'system') => {
    if (newMode === 'system') {
      setMode(mode === 'dark' ? 'light' : 'dark');
    } else {
      setMode(newMode);
    }
    if (profile) {
      try {
        await updateSettings(profile.id, { theme: newMode });
      } catch { /* local only */ }
    }
  };

  const handleNotifToggle = async (key: keyof typeof notificationPrefs) => {
    const newValue = !notificationPrefs[key];
    setNotificationPrefs({ [key]: newValue } as Partial<typeof notificationPrefs>);
    if (profile) {
      try {
        await updateSettings(profile.id, { [key]: newValue });
      } catch { /* local only */ }
    }
  };

  const handleLanguageChange = async (lang: Language) => {
    setLanguage(lang);
    setLanguageModalVisible(false);
    if (profile) {
      try {
        await updateSettings(profile.id, { language: lang });
      } catch { /* local only */ }
    }
  };

  const currentLang = LANGUAGES.find((l) => l.value === language);

  return (
    <ScreenWrapper edges={['top', 'bottom']}>
      <AppHeader title="Settings" subtitle="App preferences" showBack showMenu />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingHorizontal: layout.padding, gap: layout.cardGap, maxWidth: layout.contentMaxWidth, alignSelf: layout.isTablet ? 'center' : 'stretch' }]}
      >
        {/* Theme Selection */}
        <Card>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Appearance</Text>
          <Text style={[styles.sectionDesc, { color: colors.textMuted }]}>Choose how the app looks</Text>
          <View style={styles.themeOptions}>
            <TouchableOpacity
              style={[styles.themeOption, { backgroundColor: mode === 'light' ? colors.gold + '20' : colors.surfaceElevated, borderColor: mode === 'light' ? colors.gold : colors.border }]}
              onPress={() => handleThemeChange('light')}
            >
              <MaterialCommunityIcons name={getIconName('sun')} size={22} color={mode === 'light' ? colors.gold : colors.textSecondary} />
              <Text style={[styles.themeOptionLabel, { color: mode === 'light' ? colors.gold : colors.textSecondary }]}>Light</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.themeOption, { backgroundColor: mode === 'dark' ? colors.gold + '20' : colors.surfaceElevated, borderColor: mode === 'dark' ? colors.gold : colors.border }]}
              onPress={() => handleThemeChange('dark')}
            >
              <MaterialCommunityIcons name={getIconName('moon')} size={22} color={mode === 'dark' ? colors.gold : colors.textSecondary} />
              <Text style={[styles.themeOptionLabel, { color: mode === 'dark' ? colors.gold : colors.textSecondary }]}>Dark</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.themeOption, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
              onPress={() => handleThemeChange('system')}
            >
              <MaterialCommunityIcons name="theme-light-dark" size={22} color={colors.textSecondary} />
              <Text style={[styles.themeOptionLabel, { color: colors.textSecondary }]}>System</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Notification Preferences */}
        <Card>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Notifications</Text>
          <Text style={[styles.sectionDesc, { color: colors.textMuted }]}>Choose which alerts you receive</Text>
          <ToggleRow
            icon="bell"
            label="Push Notifications"
            value={notificationPrefs.push_notifications}
            onToggle={() => handleNotifToggle('push_notifications')}
            colors={colors}
          />
          <ToggleRow
            icon="mail"
            label="Email Notifications"
            value={notificationPrefs.email_notifications}
            onToggle={() => handleNotifToggle('email_notifications')}
            colors={colors}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <ToggleRow
            icon="alert"
            label="Low Stock Alerts"
            value={notificationPrefs.low_stock_alerts}
            onToggle={() => handleNotifToggle('low_stock_alerts')}
            colors={colors}
          />
          <ToggleRow
            icon="shopping-cart"
            label="Order Alerts"
            value={notificationPrefs.order_alerts}
            onToggle={() => handleNotifToggle('order_alerts')}
            colors={colors}
          />
          <ToggleRow
            icon="clipboard"
            label="Task Reminders"
            value={notificationPrefs.task_reminders}
            onToggle={() => handleNotifToggle('task_reminders')}
            colors={colors}
          />
          <ToggleRow
            icon="box"
            label="Transfer Alerts"
            value={notificationPrefs.transfer_alerts}
            onToggle={() => handleNotifToggle('transfer_alerts')}
            colors={colors}
          />
        </Card>

        {/* Language */}
        <Card>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Language</Text>
          <Text style={[styles.sectionDesc, { color: colors.textMuted }]}>App display language (coming soon)</Text>
          <TouchableOpacity
            style={[styles.languageRow, { borderColor: colors.border }]}
            onPress={() => setLanguageModalVisible(true)}
          >
            <Text style={[styles.languageFlag, { color: colors.gold }]}>{currentLang?.flag}</Text>
            <Text style={[styles.languageLabel, { color: colors.textPrimary }]}>{currentLang?.label}</Text>
            <MaterialCommunityIcons name={getIconName('chevron-right')} size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </Card>

        {/* Account Info */}
        {profile && (
          <Card>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Account</Text>
            <View style={styles.accountRow}>
              <Text style={[styles.accountLabel, { color: colors.textMuted }]}>Role</Text>
              <Text style={[styles.accountValue, { color: colors.gold }]}>{roleLabel(profile.role)}</Text>
            </View>
            <View style={styles.accountRow}>
              <Text style={[styles.accountLabel, { color: colors.textMuted }]}>Status</Text>
              <Text style={[styles.accountValue, { color: profile.status === 'active' ? colors.success : colors.error }]}>{profile.status}</Text>
            </View>
            <View style={styles.accountRow}>
              <Text style={[styles.accountLabel, { color: colors.textMuted }]}>Last Login</Text>
              <Text style={[styles.accountValue, { color: colors.textSecondary }]}>{formatDateTime(profile.last_login_at)}</Text>
            </View>
          </Card>
        )}

        {/* About */}
        <Card>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>About</Text>
          <View style={styles.aboutRow}>
            <Text style={[styles.aboutLabel, { color: colors.textMuted }]}>App Name</Text>
            <Text style={[styles.aboutValue, { color: colors.textPrimary }]}>LUXE ERP</Text>
          </View>
          <View style={styles.aboutRow}>
            <Text style={[styles.aboutLabel, { color: colors.textMuted }]}>Version</Text>
            <Text style={[styles.aboutValue, { color: colors.textPrimary }]}>{APP_VERSION}</Text>
          </View>
          <View style={styles.aboutRow}>
            <Text style={[styles.aboutLabel, { color: colors.textMuted }]}>Platform</Text>
            <Text style={[styles.aboutValue, { color: colors.textPrimary }]}>Expo / React Native</Text>
          </View>
          <TouchableOpacity
            style={[styles.linkRow, { borderColor: colors.border }]}
            onPress={() => Linking.openURL('https://bolt.new')}
          >
            <Text style={[styles.linkText, { color: colors.gold }]}>Privacy Policy</Text>
            <MaterialCommunityIcons name={getIconName('external-link')} size={16} color={colors.gold} />
          </TouchableOpacity>
        </Card>

        <Button title="Sign Out" onPress={() => signOut()} variant="danger" />
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Language Modal */}
      {languageModalVisible && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalOverlay} onPress={() => setLanguageModalVisible(false)} />
          <View style={[styles.languageModal, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Select Language</Text>
            {LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.value}
                style={[styles.langOption, lang.value === language && { backgroundColor: colors.gold + '15' }]}
                onPress={() => handleLanguageChange(lang.value)}
              >
                <Text style={[styles.langFlag, { color: colors.gold }]}>{lang.flag}</Text>
                <Text style={[styles.langLabel, { color: colors.textPrimary }]}>{lang.label}</Text>
                {lang.value === language && (
                  <MaterialCommunityIcons name="check" size={20} color={colors.gold} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </ScreenWrapper>
  );
}

interface ToggleRowProps {
  icon: IconName;
  label: string;
  value: boolean;
  onToggle: () => void;
  colors: {
    surfaceElevated: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    gold: string;
    border: string;
    ink: string;
  };
}

const ToggleRow = React.memo(function ToggleRow({ icon, label, value, onToggle, colors }: ToggleRowProps) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleLeft}>
        <MaterialCommunityIcons name={getIconName(icon)} size={18} color={colors.textMuted} />
        <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>{label}</Text>
      </View>
      <TouchableOpacity
        style={[styles.toggle, { backgroundColor: value ? colors.gold : colors.surfaceElevated, borderColor: value ? colors.gold : colors.border }]}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={[styles.toggleKnob, { backgroundColor: value ? colors.ink : colors.textMuted, transform: [{ translateX: value ? 22 : 0 }] }]} />
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  sectionDesc: { fontSize: 13, marginBottom: 14 },
  themeOptions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  themeOption: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 14, borderRadius: 12, borderWidth: 1 },
  themeOptionLabel: { fontSize: 13, fontWeight: '600' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  toggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  toggleLabel: { fontSize: 14 },
  toggle: { width: 50, height: 28, borderRadius: 14, borderWidth: 1, justifyContent: 'center', padding: 2 },
  toggleKnob: { width: 22, height: 22, borderRadius: 11 },
  divider: { height: 1, marginVertical: 4 },
  languageRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, marginTop: 8 },
  languageFlag: { fontSize: 16, fontWeight: '700' },
  languageLabel: { flex: 1, fontSize: 14 },
  accountRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  accountLabel: { fontSize: 14 },
  accountValue: { fontSize: 14, fontWeight: '500' },
  aboutRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  aboutLabel: { fontSize: 14 },
  aboutValue: { fontSize: 14, fontWeight: '500' },
  linkRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, marginTop: 8 },
  linkText: { fontSize: 14, fontWeight: '600' },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 24 },
  languageModal: { borderRadius: 16, padding: 20, width: '100%', maxWidth: 320 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  langOption: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 12, borderRadius: 10, marginBottom: 4 },
  langFlag: { fontSize: 16, fontWeight: '700', width: 30 },
  langLabel: { flex: 1, fontSize: 15 },
});
