import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useThemeStore } from '@store/themeStore';

interface FilterChipsProps {
  options: string[];
  selected: string;
  onSelect: (option: string) => void;
  allLabel?: string;
  formatLabel?: (option: string) => string;
}

export const FilterChips = React.memo(function FilterChips({
  options,
  selected,
  onSelect,
  formatLabel,
}: FilterChipsProps) {
  const { colors } = useThemeStore();

  const getLabel = (opt: string): string => {
    if (formatLabel) return formatLabel(opt);
    if (opt === 'all') return 'All';
    return opt.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      style={styles.scroll}
    >
      {options.map((opt) => {
        const isActive = selected === opt;
        return (
          <TouchableOpacity
            key={opt}
            style={[
              styles.chip,
              {
                backgroundColor: isActive ? colors.gold : colors.surface,
                borderColor: isActive ? colors.gold : colors.border,
              },
            ]}
            onPress={() => onSelect(opt)}
          >
            <Text style={[styles.text, { color: isActive ? colors.ink : colors.textSecondary }]}>
              {getLabel(opt)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  scroll: { marginBottom: 12, maxHeight: 40 },
  content: { gap: 8, paddingHorizontal: 2 },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  text: { fontSize: 13, fontWeight: '600' },
});
