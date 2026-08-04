import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeStore } from '@store/themeStore';
import { getIconName } from '@config/icons';
import type { IconName } from '@apptypes';

interface SectionHeaderProps {
  title: string;
  icon?: IconName;
  right?: React.ReactNode;
}

export const SectionHeader = React.memo(function SectionHeader({
  title,
  icon,
  right,
}: SectionHeaderProps) {
  const { colors } = useThemeStore();
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        {icon && <MaterialCommunityIcons name={getIconName(icon)} size={18} color={colors.gold} />}
        <Text style={[styles.title, { color: colors.textMuted }]}>{title}</Text>
      </View>
      {right}
    </View>
  );
});

interface CardSectionProps {
  title: string;
  children: React.ReactNode;
}

export const CardSection = React.memo(function CardSection({ title, children }: CardSectionProps) {
  const { colors } = useThemeStore();
  return (
    <View>
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{title}</Text>
      {children}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  left: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
});
