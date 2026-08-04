import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeStore } from '@store/themeStore';
import { getIconName } from '@config/icons';
import type { SortOrder } from '@services/erpService';

export interface SortOption {
  label: string;
  value: string;
}

interface SortControlProps {
  options: SortOption[];
  sortBy: string;
  sortOrder: SortOrder;
  onChange: (sortBy: string, sortOrder: SortOrder) => void;
}

export const SortControl = React.memo(function SortControl({
  options,
  sortBy,
  sortOrder,
  onChange,
}: SortControlProps) {
  const { colors } = useThemeStore();
  const [modalVisible, setModalVisible] = React.useState(false);

  const currentLabel = options.find((o) => o.value === sortBy)?.label ?? 'Sort';

  const handleSelect = (value: string) => {
    if (value === sortBy) {
      onChange(value, sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      onChange(value, 'asc');
    }
    setModalVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons name={getIconName('sort')} size={16} color={colors.textSecondary} />
        <Text style={[styles.label, { color: colors.textSecondary }]} numberOfLines={1}>
          {currentLabel}
        </Text>
        <MaterialCommunityIcons
          name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'}
          size={14}
          color={colors.gold}
        />
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setModalVisible(false)}>
          <View style={[styles.modal, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Sort By</Text>
            <ScrollView style={styles.optionList}>
              {options.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.option,
                    option.value === sortBy && { backgroundColor: colors.gold + '15' },
                  ]}
                  onPress={() => handleSelect(option.value)}
                >
                  <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>
                    {option.label}
                  </Text>
                  {option.value === sortBy && (
                    <MaterialCommunityIcons
                      name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'}
                      size={18}
                      color={colors.gold}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
});

interface ClearFiltersButtonProps {
  onClear: () => void;
  visible: boolean;
}

export const ClearFiltersButton = React.memo(function ClearFiltersButton({
  onClear,
  visible,
}: ClearFiltersButtonProps) {
  const { colors } = useThemeStore();
  if (!visible) return null;
  return (
    <TouchableOpacity
      style={[styles.clearBtn, { borderColor: colors.gold }]}
      onPress={onClear}
      activeOpacity={0.7}
    >
      <MaterialCommunityIcons name="close" size={14} color={colors.gold} />
      <Text style={[styles.clearText, { color: colors.gold }]}>Clear Filters</Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  label: { fontSize: 13, fontWeight: '600' },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 24 },
  modal: { borderRadius: 16, padding: 20, width: '100%', maxWidth: 360, maxHeight: 400 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  optionList: { maxHeight: 300 },
  option: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12, borderRadius: 10, marginBottom: 4 },
  optionLabel: { fontSize: 15 },
  clearBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1, alignSelf: 'flex-start' },
  clearText: { fontSize: 12, fontWeight: '600' },
});
