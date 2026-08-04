import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { ScreenWrapper } from '@components/ScreenWrapper';
import { AppHeader } from '@components/AppHeader';
import { Card } from '@components/Card';
import { Button } from '@components/Button';
import { ErrorState } from '@components/ErrorState';
import { LoadingState } from '@components/LoadingState';
import { RoleGate } from '@components/RoleGate';
import { useThemeStore } from '@store/themeStore';
import { useReceivingDetail, useUpdateReceivedQuantity, useCompleteReceiving } from '@hooks/useERP';
import { useResponsive } from '@hooks/useResponsive';
import { useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getIconName } from '@config/icons';
import { navMinRank } from '@constants';
import type { IconName, ThemeColors } from '@apptypes';
import type { ReceivingItem } from '@apptypes/erp';

function InfoRow({ label, value, icon, colors }: { label: string; value: string; icon: IconName; colors: ThemeColors }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoLeft}>
        <MaterialCommunityIcons name={getIconName(icon)} size={18} color={colors.textMuted} />
        <Text style={[styles.infoLabel, { color: colors.textMuted }]}>{label}</Text>
      </View>
      <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{value}</Text>
    </View>
  );
}

function ReceivingStatusBadge({ status, colors }: { status: string; colors: ThemeColors }) {
  const colorMap: Record<string, string> = {
    pending: colors.textMuted,
    partial: colors.warning,
    received: colors.success,
    cancelled: colors.error,
  };
  const color = colorMap[status] ?? colors.textSecondary;
  return (
    <View style={[styles.statusBadge, { backgroundColor: color + '20' }]}>
      <Text style={[styles.statusText, { color }]}>{status}</Text>
    </View>
  );
}

export default function ReceivingDetailScreen() {
  const { colors } = useThemeStore();
  const params = useLocalSearchParams<{ id: string }>();
  const layout = useResponsive();

  const receivingId = params.id;
  const receivingQuery = useReceivingDetail(receivingId);
  const updateReceived = useUpdateReceivedQuantity();
  const completeReceiving = useCompleteReceiving();

  const [refreshing, setRefreshing] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await receivingQuery.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [receivingQuery]);

  const handleStartEdit = (item: ReceivingItem) => {
    setEditingItem(item.id);
    setEditValue(String(item.received_quantity));
  };

  const handleSaveEdit = async (item: ReceivingItem) => {
    const qty = parseInt(editValue, 10);
    if (isNaN(qty) || qty < 0) {
      Alert.alert('Invalid Quantity', 'Please enter a valid non-negative number.');
      return;
    }
    if (qty > item.quantity) {
      Alert.alert('Exceeds Ordered', `Received quantity cannot exceed ordered quantity (${item.quantity}).`);
      return;
    }
    setSaving(true);
    try {
      await updateReceived(item.id, qty, receivingId);
      setEditingItem(null);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update received quantity.');
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteReceiving = () => {
    if (!receivingQuery.data) return;
    const allReceived = receivingQuery.data.items.every((i: ReceivingItem) => i.received_quantity >= i.quantity);
    if (!allReceived) {
      Alert.alert(
        'Incomplete Receiving',
        'Not all items have been fully received. Complete receiving anyway?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Complete', style: 'default', onPress: confirmComplete },
        ],
      );
    } else {
      confirmComplete();
    }
  };

  const confirmComplete = async () => {
    setCompleting(true);
    try {
      await completeReceiving(receivingId);
      Alert.alert('Success', 'Purchase order marked as received.');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to complete receiving.');
    } finally {
      setCompleting(false);
    }
  };

  if (receivingQuery.isLoading) {
    return (
      <RoleGate minRank={navMinRank('purchase-orders')}>
        <ScreenWrapper>
          <AppHeader title="Receiving Details" showBack showMenu />
          <LoadingState message="Loading receiving details…" />
        </ScreenWrapper>
      </RoleGate>
    );
  }

  if (receivingQuery.isError || !receivingQuery.data) {
    return (
      <RoleGate minRank={navMinRank('purchase-orders')}>
        <ScreenWrapper>
          <AppHeader title="Receiving Details" showBack showMenu />
          <ErrorState
            title="Receiving record not found"
            message="This purchase order may have been removed or is unavailable."
            onRetry={() => receivingQuery.refetch()}
          />
        </ScreenWrapper>
      </RoleGate>
    );
  }

  const receiving = receivingQuery.data;
  const progress = receiving.total_quantity > 0 ? receiving.received_quantity / receiving.total_quantity : 0;
  const isFullyReceived = receiving.receiving_status === 'received';

  return (
    <RoleGate minRank={navMinRank('purchase-orders')}>
      <ScreenWrapper>
        <AppHeader title="Receiving Details" showBack showMenu />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingHorizontal: layout.padding, gap: layout.cardGap, maxWidth: layout.contentMaxWidth, alignSelf: layout.isTablet ? 'center' : 'stretch' }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} colors={[colors.gold]} />}
        >
          <Card>
            <View style={styles.headerRow}>
              <View style={[styles.iconBox, { backgroundColor: colors.surfaceElevated }]}>
                <MaterialCommunityIcons name={getIconName('receiving')} size={28} color={colors.gold} />
              </View>
              <View style={styles.headerInfo}>
                <Text style={[styles.poNumber, { color: colors.textPrimary }]}>{receiving.po_number}</Text>
                <Text style={[styles.supplierName, { color: colors.textMuted }]}>{receiving.supplier_name}</Text>
              </View>
              <ReceivingStatusBadge status={receiving.receiving_status} colors={colors} />
            </View>
          </Card>

          <Card>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Purchase Order Reference</Text>
            <View style={styles.infoContainer}>
              <InfoRow label="PO Number" value={receiving.po_number} icon="clipboard" colors={colors} />
              <InfoRow label="Supplier" value={receiving.supplier_name} icon="truck" colors={colors} />
              <InfoRow label="PO Status" value={receiving.status} icon="tag" colors={colors} />
              {receiving.expected_at ? <InfoRow label="Expected" value={new Date(receiving.expected_at).toLocaleDateString()} icon="calendar" colors={colors} /> : null}
              {receiving.received_at ? <InfoRow label="Received Date" value={new Date(receiving.received_at).toLocaleDateString()} icon="package" colors={colors} /> : null}
            </View>
          </Card>

          {receiving.warehouse_name ? (
            <Card>
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Warehouse Information</Text>
              <View style={styles.infoContainer}>
                <InfoRow label="Warehouse" value={receiving.warehouse_name} icon="warehouse" colors={colors} />
                {receiving.warehouse_address ? <InfoRow label="Address" value={receiving.warehouse_address} icon="map-pin" colors={colors} /> : null}
                {receiving.warehouse_city ? <InfoRow label="City" value={receiving.warehouse_city} icon="map" colors={colors} /> : null}
              </View>
            </Card>
          ) : null}

          <Card>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Receiving Progress</Text>
            <View style={styles.progressSection}>
              <View style={[styles.progressBar, { backgroundColor: colors.surfaceElevated }]}>
                <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: progress >= 1 ? colors.success : colors.gold }]} />
              </View>
              <View style={styles.progressStats}>
                <Text style={[styles.progressStat, { color: colors.textPrimary }]}>
                  {receiving.received_quantity} / {receiving.total_quantity} units
                </Text>
                <Text style={[styles.progressStat, { color: colors.textMuted }]}>
                  {receiving.received_items} / {receiving.total_items} items
                </Text>
              </View>
            </View>
          </Card>

          <Card>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Received Quantities</Text>
            {receiving.items.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No items in this purchase order.</Text>
            ) : (
              <View style={styles.itemsList}>
                {receiving.items.map((item: ReceivingItem) => (
                  <View key={item.id} style={[styles.itemRow, { borderBottomColor: colors.border }]}>
                    <View style={styles.itemLeft}>
                      <Text style={[styles.itemName, { color: colors.textPrimary }]} numberOfLines={2}>{item.product_name}</Text>
                      {item.sku && <Text style={[styles.itemSku, { color: colors.textMuted }]} numberOfLines={1}>SKU: {item.sku}</Text>}
                      <Text style={[styles.itemQty, { color: colors.textSecondary }]}>
                        Ordered: {item.quantity} · Unit Cost: ${item.unit_cost.toFixed(2)}
                      </Text>
                      {editingItem === item.id ? (
                        <View style={styles.editRow}>
                          <TextInput
                            style={[styles.editInput, { backgroundColor: colors.surfaceElevated, color: colors.textPrimary, borderColor: colors.gold }]}
                            value={editValue}
                            onChangeText={setEditValue}
                            keyboardType="numeric"
                            autoFocus
                          />
                          <TouchableOpacity
                            style={[styles.editBtn, { backgroundColor: colors.gold }]}
                            onPress={() => handleSaveEdit(item)}
                            disabled={saving}
                          >
                            {saving ? <ActivityIndicator size="small" color="#0c0f13" /> : <MaterialCommunityIcons name="check" size={16} color="#0c0f13" />}
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.editBtn, { backgroundColor: colors.surfaceElevated }]}
                            onPress={() => setEditingItem(null)}
                            disabled={saving}
                          >
                            <MaterialCommunityIcons name="close" size={16} color={colors.textPrimary} />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <View style={styles.receivedRow}>
                          <Text style={[
                            styles.receivedText,
                            { color: item.received_quantity >= item.quantity ? colors.success : item.received_quantity > 0 ? colors.warning : colors.textMuted },
                          ]}>
                            Received: {item.received_quantity}/{item.quantity}
                          </Text>
                          {!isFullyReceived && (
                            <TouchableOpacity onPress={() => handleStartEdit(item)} style={[styles.editLinkBtn, { borderColor: colors.gold }]}>
                              <Text style={[styles.editLinkText, { color: colors.gold }]}>Update</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </Card>

          {!isFullyReceived && receiving.items.length > 0 && (
            <Button
              title={completing ? 'Completing…' : 'Complete Receiving'}
              onPress={handleCompleteReceiving}
              variant="primary"
              size="lg"
              loading={completing}
              disabled={completing}
            />
          )}
        </ScrollView>
      </ScreenWrapper>
    </RoleGate>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingBottom: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconBox: { width: 56, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  headerInfo: { flex: 1, gap: 2 },
  poNumber: { fontSize: 20, fontWeight: '700', fontFamily: 'monospace', lineHeight: 26 },
  supplierName: { fontSize: 14 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  sectionTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  infoContainer: { gap: 10 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoLabel: { fontSize: 14 },
  infoValue: { fontSize: 14, fontWeight: '500', maxWidth: 180, textAlign: 'right' },
  progressSection: { gap: 8 },
  progressBar: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  progressStats: { flexDirection: 'row', justifyContent: 'space-between' },
  progressStat: { fontSize: 13, fontWeight: '500' },
  emptyText: { fontSize: 14, fontStyle: 'italic' },
  itemsList: { gap: 0 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  itemLeft: { flex: 1, gap: 2 },
  itemName: { fontSize: 14, fontWeight: '600' },
  itemSku: { fontSize: 12 },
  itemQty: { fontSize: 12 },
  receivedRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  receivedText: { fontSize: 13, fontWeight: '500' },
  editLinkBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  editLinkText: { fontSize: 12, fontWeight: '600' },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  editInput: { flex: 1, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontSize: 14 },
  editBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});
