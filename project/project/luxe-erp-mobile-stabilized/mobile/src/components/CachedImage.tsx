import React from 'react';
import { Image, View, StyleSheet, type ImageStyle } from 'react-native';
import { useThemeStore } from '@store/themeStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface CachedImageProps {
  uri: string;
  style?: ImageStyle;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  placeholderIcon?: string;
  placeholderSize?: number;
}

export const CachedImage = React.memo(function CachedImage({
  uri,
  style,
  resizeMode = 'cover',
  placeholderIcon = 'package-variant-closed',
  placeholderSize = 36,
}: CachedImageProps) {
  const { colors } = useThemeStore();
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    setError(false);
  }, [uri]);

  if (!uri || error) {
    return (
      <View style={[styles.placeholder, style, { backgroundColor: colors.surfaceElevated }]}>
        <MaterialCommunityIcons name={placeholderIcon as never} size={placeholderSize} color={colors.textMuted} />
      </View>
    );
  }

  return (
    <Image
      source={{ uri, cache: 'force-cache' }}
      style={style}
      resizeMode={resizeMode}
      onError={() => setError(true)}
    />
  );
});

const styles = StyleSheet.create({
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
