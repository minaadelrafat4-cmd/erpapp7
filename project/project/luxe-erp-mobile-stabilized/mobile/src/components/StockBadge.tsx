import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeStore } from '@store/themeStore';

export type StockStatus = 'out' | 'low' | 'ok';

interface StockBadgeProps {
  status: StockStatus;
  label?: string;
  quantity?: number;
}

export const StockBadge = React.memo(function StockBadge({ status, label, quantity }: StockBadgeProps) {
  const { colors } = useThemeStore();
  const color = status === 'out' ? colors.error : status === 'low' ? colors.warning : colors.success;
  const text = label ?? (status === 'out' ? 'Out of Stock' : status === 'low' ? 'Low Stock' : 'In Stock');

  return (
    <View style={[styles.badge, { backgroundColor: color + '20' }]}>
      <Text style={[styles.text, { color }]}>
        {text}{quantity !== undefined ? ` · ${quantity} units` : ''}
      </Text>
    </View>
  );
});

export function getStockStatus(stock: number, threshold: number): StockStatus {
  if (stock <= 0) return 'out';
  if (stock <= threshold) return 'low';
  return 'ok';
}

export function getStockColor(status: StockStatus): string {
  const { colors } = useThemeStore.getState();
  return status === 'out' ? colors.error : status === 'low' ? colors.warning : colors.success;
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  text: { fontSize: 10, fontWeight: '600' },
});
