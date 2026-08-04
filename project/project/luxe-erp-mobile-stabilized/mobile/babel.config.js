module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      'babel-preset-expo',
    ],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './src',
            '@lib': './src/lib',
            '@apptypes': './src/types',
            '@constants': './src/constants',
            '@store': './src/store',
            '@hooks': './src/hooks',
            '@services': './src/services',
            '@components': './src/components',
            '@screens': './src/screens',
            '@config': './src/config',
          },
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
