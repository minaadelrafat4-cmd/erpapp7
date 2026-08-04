import React from 'react';
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
import { InfoRow, InfoGroup } from '@components/InfoRow';
import { StatusBadge } from '@components/StatusBadge';
import { DetailHeader } from '@components/DetailHeader';
import { CardSection } from '@components/SectionHeader';
import { ProgressBar } from '@components/ProgressBar';
import { useThemeStore } from '@store/themeStore';
import { useReceivingDetail, useUpdateReceivedQuantity, useCompleteReceiving } from '@hooks/useERP';
import { useResponsive } from '@hooks/useResponsive';
import { useLocalSearchParams } from 'expo-router';
import { formatDate } from '@lib/format';
import { navMinRank } from '@constants';
import type { ReceivingItem } from '@apptypes/erp';

export default function ReceivingDetailScreen() {
  const { colors } = useThemeStore();
  const params = useLocalSearchParams<{ id: string }>();
  const layout = useResponsive();

  const receivingId = params.id;
  const receivingQuery = useReceivingDetail(receivingId);
  const updateReceived = useUpdateReceivedQuantity();
  const completeReceiving = useCompleteReceiving();

  const [refreshing, setRefreshing] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<string | null>(null);
  const [editValue, setEditValue] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [completing, setCompleting] = React.useState(false);

  const onRefresh = React.useCallback(async () => {
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
            <DetailHeader
              icon="receiving"
              title={receiving.po_number}
              subtitle={receiving.supplier_name}
              right={<StatusBadge status={receiving.receiving_status} />}
            />
          </Card>

          <Card>
            <CardSection title="Purchase Order Reference">
              <InfoGroup>
                <InfoRow label="PO Number" value={receiving.po_number} icon="clipboard" />
                <InfoRow label="Supplier" value={receiving.supplier_name} icon="truck" />
                <InfoRow label="PO Status" value={receiving.status} icon="tag" />
                {receiving.expected_at ? <InfoRow label="Expected" value={formatDate(receiving.expected_at)} icon="calendar" /> : null}
                {receiving.received_at ? <InfoRow label="Received Date" value={formatDate(receiving.received_at)} icon="package" /> : null}
              </InfoGroup>
            </CardSection>
          </Card>

          {receiving.warehouse_name ? (
            <Card>
              <CardSection title="Warehouse Information">
                <InfoGroup>
                  <InfoRow label="Warehouse" value={receiving.warehouse_name} icon="warehouse" />
                  {receiving.warehouse_address ? <InfoRow label="Address" value={receiving.warehouse_address} icon="map-pin" /> : null}
                  {receiving.warehouse_city ? <InfoRow label="City" value={receiving.warehouse_city} icon="map" /> : null}
                </InfoGroup>
              </CardSection>
            </Card>
          ) : null}

          <Card>
            <CardSection title="Receiving Progress">
              <View style={styles.progressSection}>
                <ProgressBar progress={progress} />
                <View style={styles.progressStats}>
                  <Text style={[styles.progressStat, { color: colors.textPrimary }]}>
                    {receiving.received_quantity} / {receiving.total_quantity} units
                  </Text>
                  <Text style={[styles.progressStat, { color: colors.textMuted }]}>
                    {receiving.received_items} / {receiving.total_items} items
                  </Text>
                </View>
              </View>
            </CardSection>
          </Card>

          <Card>
            <CardSection title="Received Quantities">
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
                              {saving ? <ActivityIndicator size="small" color="#0c0f13" /> : <Text style={styles.checkIcon}>✓</Text>}
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.editBtn, { backgroundColor: colors.surfaceElevated }]}
                              onPress={() => setEditingItem(null)}
                              disabled={saving}
                            >
                              <Text style={[styles.closeIcon, { color: colors.textPrimary }]}>✕</Text>
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
            </CardSection>
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
  progressSection: { gap: 8 },
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
  checkIcon: { fontSize: 16, color: '#0c0f13', fontWeight: '700' },
  closeIcon: { fontSize: 14 },
});
