import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeStore } from '@store/themeStore';

interface SummaryItemProps {
  label: string;
  value: string | number;
  highlight?: boolean;
  highlightColor?: string;
}

export const SummaryItem = React.memo(function SummaryItem({
  label,
  value,
  highlight = false,
  highlightColor,
}: SummaryItemProps) {
  const { colors } = useThemeStore();
  return (
    <View style={[styles.item, { backgroundColor: colors.surfaceElevated }]}>
      <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.value, { color: highlight ? (highlightColor ?? colors.gold) : colors.textPrimary }]}>
        {value}
      </Text>
    </View>
  );
});

interface SummaryGridProps {
  items: SummaryItemProps[];
}

export const SummaryGrid = React.memo(function SummaryGrid({ items }: SummaryGridProps) {
  return (
    <View style={styles.grid}>
      {items.map((item, idx) => (
        <SummaryItem key={idx} {...item} />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  item: { flex: 1, minWidth: '45%', borderRadius: 10, padding: 14, alignItems: 'center', gap: 4 },
  label: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { fontSize: 22, fontWeight: '700' },
});
