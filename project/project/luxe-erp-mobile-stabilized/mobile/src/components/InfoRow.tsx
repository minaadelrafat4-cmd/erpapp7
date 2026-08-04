import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeStore } from '@store/themeStore';
import type { IconName, ThemeColors } from '@apptypes';
import { getIconName } from '@config/icons';

interface InfoRowProps {
  label: string;
  value: string;
  icon: IconName;
  valueColor?: string;
}

export const InfoRow = React.memo(function InfoRow({ label, value, icon, valueColor }: InfoRowProps) {
  const { colors } = useThemeStore();
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <MaterialCommunityIcons name={getIconName(icon)} size={18} color={colors.textMuted} />
        <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      </View>
      <Text style={[styles.value, { color: valueColor ?? colors.textPrimary }]} numberOfLines={2}>{value}</Text>
    </View>
  );
});

export function InfoGroup({ children, spacing = 10 }: { children: React.ReactNode; spacing?: number }) {
  return <View style={{ gap: spacing }}>{children}</View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  left: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontSize: 14 },
  value: { fontSize: 14, fontWeight: '500', maxWidth: 180, textAlign: 'right' },
});
