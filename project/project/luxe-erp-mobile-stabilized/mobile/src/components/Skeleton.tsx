import React from 'react';
import { View, StyleSheet, type ViewStyle, type DimensionValue, Animated } from 'react-native';
import { useThemeStore } from '@store/themeStore';

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
  const { colors } = useThemeStore();
  const opacity = React.useRef(new Animated.Value(0.3)).current;

  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.6, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { width, height, borderRadius, backgroundColor: colors.surfaceElevated, opacity },
        style,
      ]}
    />
  );
}

export function SkeletonCard() {
  const { colors } = useThemeStore();
  return (
    <View style={[skeletonStyles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={skeletonStyles.row}>
        <Skeleton width={48} height={48} borderRadius={12} />
        <View style={skeletonStyles.content}>
          <Skeleton width="70%" height={16} />
          <Skeleton width="40%" height={12} style={{ marginTop: 6 }} />
        </View>
      </View>
      <Skeleton width="90%" height={12} style={{ marginTop: 12 }} />
      <View style={[skeletonStyles.row, { marginTop: 10 }]}>
        <Skeleton width={60} height={20} borderRadius={6} />
        <Skeleton width={60} height={20} borderRadius={6} />
      </View>
    </View>
  );
}

export function SkeletonList({ count = 6 }: { count?: number }) {
  return (
    <View style={skeletonStyles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}

export function SkeletonGrid({ count = 6, columns = 2 }: { count?: number; columns?: number }) {
  return (
    <View style={[skeletonStyles.grid, { gap: 12 }]}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={{ flex: 1 / columns, maxWidth: `${100 / columns}%` }}>
          <SkeletonCard />
        </View>
      ))}
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  content: {
    flex: 1,
    gap: 4,
  },
  list: {
    gap: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
