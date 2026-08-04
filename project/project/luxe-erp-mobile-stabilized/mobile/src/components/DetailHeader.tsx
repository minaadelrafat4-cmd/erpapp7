import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeStore } from '@store/themeStore';
import { getIconName } from '@config/icons';
import type { IconName } from '@apptypes';

interface DetailHeaderProps {
  icon: IconName;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}

export const DetailHeader = React.memo(function DetailHeader({
  icon,
  title,
  subtitle,
  right,
}: DetailHeaderProps) {
  const { colors } = useThemeStore();
  return (
    <View style={styles.row}>
      <View style={[styles.iconBox, { backgroundColor: colors.surfaceElevated }]}>
        <MaterialCommunityIcons name={getIconName(icon)} size={28} color={colors.gold} />
      </View>
      <View style={styles.info}>
        <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>{title}</Text>
        {subtitle && <Text style={[styles.subtitle, { color: colors.textMuted }]} numberOfLines={1}>{subtitle}</Text>}
      </View>
      {right}
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconBox: { width: 56, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, gap: 2 },
  title: { fontSize: 20, fontWeight: '700', lineHeight: 26 },
  subtitle: { fontSize: 14 },
});
