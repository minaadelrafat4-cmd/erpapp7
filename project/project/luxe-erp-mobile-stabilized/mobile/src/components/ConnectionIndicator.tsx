import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppStore } from '@store/appStore';
import { useThemeStore } from '@store/themeStore';

export function ConnectionIndicator() {
  const isOnline = useAppStore((s) => s.isOnline);
  const { colors } = useThemeStore();

  if (isOnline) return null;

  return (
    <View style={[styles.banner, { backgroundColor: colors.warning }]}>
      <Text style={styles.text}>You're offline — showing cached data</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0c0f13',
  },
});
