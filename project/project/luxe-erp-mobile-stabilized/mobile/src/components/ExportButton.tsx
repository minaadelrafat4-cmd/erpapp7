import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Pressable, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeStore } from '@store/themeStore';
import { getIconName } from '@config/icons';
import { exportData, type ExportFormat, type ExportColumn } from '@lib/exportUtils';

interface ExportButtonProps<T> {
  filename: string;
  columns: ExportColumn<T>[];
  data: T[];
  disabled?: boolean;
}

export function ExportButton<T>({ filename, columns, data, disabled }: ExportButtonProps<T>) {
  const { colors } = useThemeStore();
  const [modalVisible, setModalVisible] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);

  const handleExport = async (format: ExportFormat) => {
    setModalVisible(false);
    if (data.length === 0) {
      Alert.alert('No Data', 'There is no data to export.');
      return;
    }
    setExporting(true);
    try {
      await exportData({ filename, columns, data, format });
    } catch (err) {
      Alert.alert('Export Failed', err instanceof Error ? err.message : 'Could not export data.');
    } finally {
      setExporting(false);
    }
  };

  const formats: { format: ExportFormat; label: string; icon: 'file-csv' | 'file-excel' | 'file-pdf' }[] = [
    { format: 'csv', label: 'CSV', icon: 'file-csv' },
    { format: 'xlsx', label: 'Excel', icon: 'file-excel' },
    { format: 'pdf', label: 'PDF', icon: 'file-pdf' },
  ];

  return (
    <>
      <TouchableOpacity
        style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }, disabled && styles.disabled]}
        onPress={() => setModalVisible(true)}
        disabled={disabled || exporting}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons
          name={exporting ? 'loading' : getIconName('file-export')}
          size={16}
          color={disabled || exporting ? colors.textMuted : colors.gold}
        />
        <Text style={[styles.label, { color: disabled || exporting ? colors.textMuted : colors.gold }]}>
          {exporting ? 'Exporting…' : 'Export'}
        </Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <Pressable style={styles.overlay} onPress={() => setModalVisible(false)}>
          <View style={[styles.modal, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Export Format</Text>
            <Text style={[styles.modalDesc, { color: colors.textMuted }]}>
              Choose a format for the {data.length} record{data.length !== 1 ? 's' : ''}.
            </Text>
            <ScrollView style={styles.optionList}>
              {formats.map(({ format, label, icon }) => (
                <TouchableOpacity
                  key={format}
                  style={[styles.option, { borderColor: colors.border }]}
                  onPress={() => handleExport(format)}
                >
                  <MaterialCommunityIcons name={getIconName(icon)} size={24} color={colors.gold} />
                  <View style={styles.optionText}>
                    <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>{label}</Text>
                    <Text style={[styles.optionDesc, { color: colors.textMuted }]}>
                      {format === 'csv' ? 'Comma-separated values' : format === 'xlsx' ? 'Excel spreadsheet' : 'Printable document'}
                    </Text>
                  </View>
                  <MaterialCommunityIcons name={getIconName('chevron-right')} size={20} color={colors.textMuted} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

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
  disabled: { opacity: 0.4 },
  label: { fontSize: 13, fontWeight: '600' },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 24 },
  modal: { borderRadius: 16, padding: 20, width: '100%', maxWidth: 320 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  modalDesc: { fontSize: 13, marginBottom: 16 },
  optionList: { maxHeight: 300 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 12, borderRadius: 10, marginBottom: 4, borderWidth: 1 },
  optionText: { flex: 1 },
  optionLabel: { fontSize: 15, fontWeight: '600' },
  optionDesc: { fontSize: 12 },
});
