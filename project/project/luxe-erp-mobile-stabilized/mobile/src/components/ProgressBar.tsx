import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useThemeStore } from '@store/themeStore';

interface ProgressBarProps {
  progress: number;
  color?: string;
  height?: number;
}

export const ProgressBar = React.memo(function ProgressBar({
  progress,
  color,
  height = 8,
}: ProgressBarProps) {
  const { colors } = useThemeStore();
  const clamped = Math.max(0, Math.min(1, progress));
  const fillColor = color ?? (clamped >= 1 ? colors.success : colors.gold);

  return (
    <View style={[styles.track, { backgroundColor: colors.surfaceElevated, height, borderRadius: height / 2 }]}>
      <View style={[styles.fill, { width: `${clamped * 100}%`, backgroundColor: fillColor, borderRadius: height / 2 }]} />
    </View>
  );
});

const styles = StyleSheet.create({
  track: { overflow: 'hidden' },
  fill: { height: '100%' },
});
