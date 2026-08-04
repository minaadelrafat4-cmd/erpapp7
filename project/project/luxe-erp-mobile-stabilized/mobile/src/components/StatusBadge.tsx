import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeStore } from '@store/themeStore';
import type { ThemeColors } from '@apptypes';

const STATUS_COLOR_MAP: Record<string, keyof ThemeColors> = {
  draft: 'textMuted',
  pending: 'textMuted',
  submitted: 'accent',
  processing: 'accent',
  in_progress: 'gold',
  in_transit: 'gold',
  ordered: 'gold',
  approved: 'gold',
  partial: 'warning',
  on_leave: 'warning',
  refunded: 'warning',
  received: 'success',
  delivered: 'success',
  completed: 'success',
  active: 'success',
  fulfilled: 'success',
  paid: 'success',
  cancelled: 'error',
  inactive: 'error',
  suspended: 'error',
  critical: 'error',
  out_of_stock: 'error',
  error: 'error',
};

function getStatusColor(status: string, colors: ThemeColors): string {
  const key = STATUS_COLOR_MAP[status.toLowerCase()];
  return key ? colors[key] : colors.textSecondary;
}

function formatLabel(status: string): string {
  return status.replace(/_/g, ' ');
}

interface StatusBadgeProps {
  status: string;
  capitalize?: boolean;
}

export const StatusBadge = React.memo(function StatusBadge({ status, capitalize = true }: StatusBadgeProps) {
  const { colors } = useThemeStore();
  const color = getStatusColor(status, colors);
  const label = capitalize ? formatLabel(status) : status;

  return (
    <View style={[styles.badge, { backgroundColor: color + '20' }]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
});

interface PriorityBadgeProps {
  priority: string;
}

export const PriorityBadge = React.memo(function PriorityBadge({ priority }: PriorityBadgeProps) {
  const { colors } = useThemeStore();
  const colorMap: Record<string, string> = {
    low: colors.textMuted,
    medium: colors.accent,
    high: colors.warning,
    urgent: colors.error,
  };
  const color = colorMap[priority] ?? colors.textMuted;
  return (
    <View style={[styles.badge, { backgroundColor: color + '20' }]}>
      <Text style={[styles.text, { color }]}>{priority}</Text>
    </View>
  );
});

interface PriorityDotProps {
  priority: string;
}

export const PriorityDot = React.memo(function PriorityDot({ priority }: PriorityDotProps) {
  const { colors } = useThemeStore();
  const colorMap: Record<string, string> = {
    low: colors.textMuted,
    medium: colors.accent,
    high: colors.warning,
    urgent: colors.error,
  };
  const color = colorMap[priority] ?? colors.textMuted;
  return <View style={[styles.dot, { backgroundColor: color }]} />;
});

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  text: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
