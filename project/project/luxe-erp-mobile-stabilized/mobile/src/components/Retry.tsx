import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useThemeStore } from '@store/themeStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface RetryProps {
  message?: string;
  onRetry: () => void;
}

export function Retry({ message = 'Failed to load. Tap to retry.', onRetry }: RetryProps) {
  const { colors } = useThemeStore();
  return (
    <TouchableOpacity style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={onRetry} activeOpacity={0.7}>
      <MaterialCommunityIcons name="refresh" size={28} color={colors.gold} />
      <Text style={[styles.text, { color: colors.textSecondary }]}>{message}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 32,
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 200,
  },
  text: {
    fontSize: 14,
    textAlign: 'center',
  },
});
