import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { ScreenWrapper } from '@components/ScreenWrapper';
import { AppHeader } from '@components/AppHeader';
import { Card } from '@components/Card';
import { ErrorState } from '@components/ErrorState';
import { LoadingState } from '@components/LoadingState';
import { RoleGate } from '@components/RoleGate';
import { useThemeStore } from '@store/themeStore';
import { useStockTransferDetail, useUpdateStockTransferStatus } from '@hooks/useERP';
import { useResponsive } from '@hooks/useResponsive';
import { useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getIconName } from '@config/icons';
import { navMinRank } from '@constants';
import type { IconName, ThemeColors } from '@apptypes';
import type { StockTransferItem, StockTransferStatus } from '@apptypes/erp';

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

function StatusBadge({ status, colors }: { status: StockTransferStatus; colors: ThemeColors }) {
  const colorMap: Record<string, string> = {
    draft: colors.textMuted,
    submitted: colors.accent,
    in_transit: colors.gold,
    received: colors.success,
    cancelled: colors.error,
  };
  const color = colorMap[status] ?? colors.textSecondary;
  return (
    <View style={[styles.statusBadge, { backgroundColor: color + '20' }]}>
      <Text style={[styles.statusText, { color }]}>{status.replace('_', ' ')}</Text>
    </View>
  );
}

export default function StockTransferDetailScreen() {
  const { colors } = useThemeStore();
  const params = useLocalSearchParams<{ id: string }>();
  const layout = useResponsive();

  const transferId = params.id;
  const transferQuery = useStockTransferDetail(transferId);
  const updateStatus = useUpdateStockTransferStatus();

  const [refreshing, setRefreshing] = React.useState(false);
  const [updating, setUpdating] = React.useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await transferQuery.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [transferQuery]);

  const handleStatusUpdate = React.useCallback(
    (newStatus: StockTransferStatus, label: string) => {
      if (!transferId) return;
      Alert.alert('Update Status', `Change transfer status to "${label}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: 'default',
          onPress: async () => {
            setUpdating(true);
            try {
              await updateStatus(transferId, newStatus);
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update status.');
            } finally {
              setUpdating(false);
            }
          },
        },
      ]);
    },
    [transferId, updateStatus],
  );

  if (transferQuery.isLoading) {
    return (
      <RoleGate minRank={navMinRank('inventory')}>
        <ScreenWrapper>
          <AppHeader title="Transfer Details" showBack showMenu />
          <LoadingState message="Loading transfer…" />
        </ScreenWrapper>
      </RoleGate>
    );
  }

  if (transferQuery.isError || !transferQuery.data) {
    return (
      <RoleGate minRank={navMinRank('inventory')}>
        <ScreenWrapper>
          <AppHeader title="Transfer Details" showBack showMenu />
          <ErrorState
            title="Transfer not found"
            message="This stock transfer may have been removed or is unavailable."
            onRetry={() => transferQuery.refetch()}
          />
        </ScreenWrapper>
      </RoleGate>
    );
  }

  const transfer = transferQuery.data;

  const renderStatusActions = () => {
    const actions: Array<{ status: StockTransferStatus; label: string; variant: 'primary' | 'outline' | 'danger' }> = [];
    if (transfer.status === 'draft') {
      actions.push({ status: 'submitted', label: 'Submit', variant: 'primary' });
      actions.push({ status: 'cancelled', label: 'Cancel', variant: 'danger' });
    } else if (transfer.status === 'submitted') {
      actions.push({ status: 'in_transit', label: 'Mark In Transit', variant: 'primary' });
      actions.push({ status: 'cancelled', label: 'Cancel', variant: 'danger' });
    } else if (transfer.status === 'in_transit') {
      actions.push({ status: 'received', label: 'Mark Received', variant: 'primary' });
      actions.push({ status: 'cancelled', label: 'Cancel', variant: 'danger' });
    }
    if (actions.length === 0) return null;

    return (
      <View style={styles.statusActions}>
        {actions.map((action) => (
          <TouchableOpacity
            key={action.status}
            style={[
              styles.statusActionBtn,
              {
                backgroundColor: action.variant === 'primary' ? colors.gold : action.variant === 'danger' ? colors.errorLight : colors.surface,
                borderColor: action.variant === 'outline' ? colors.gold : 'transparent',
                borderWidth: action.variant === 'outline' ? 1 : 0,
              },
            ]}
            onPress={() => handleStatusUpdate(action.status, action.label)}
            disabled={updating}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.statusActionText,
                {
                  color: action.variant === 'primary' ? colors.ink : action.variant === 'danger' ? colors.error : colors.gold,
                },
              ]}
            >
              {updating ? 'Updating…' : action.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <RoleGate minRank={navMinRank('inventory')}>
      <ScreenWrapper>
        <AppHeader title="Transfer Details" showBack showMenu />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingHorizontal: layout.padding, gap: layout.cardGap, maxWidth: layout.contentMaxWidth, alignSelf: layout.isTablet ? 'center' : 'stretch' }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} colors={[colors.gold]} />}
        >
          <Card>
            <View style={styles.headerRow}>
              <View style={[styles.iconBox, { backgroundColor: colors.surfaceElevated }]}>
                <MaterialCommunityIcons name={getIconName('box')} size={28} color={colors.gold} />
              </View>
              <View style={styles.headerInfo}>
                <Text style={[styles.transferNumber, { color: colors.textPrimary }]}>{transfer.transfer_number}</Text>
                <Text style={[styles.routeSummary, { color: colors.textMuted }]}>
                  {transfer.source_name} → {transfer.destination_name}
                </Text>
              </View>
              <StatusBadge status={transfer.status} colors={colors} />
            </View>
          </Card>

          <Card>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Transfer Information</Text>
            <View style={styles.infoContainer}>
              <InfoRow label="Transfer #" value={transfer.transfer_number} icon="tag" colors={colors} />
              <InfoRow
                label="Source"
                value={`${transfer.source_type === 'branch' ? 'Branch' : 'Warehouse'}: ${transfer.source_name}`}
                icon={transfer.source_type === 'branch' ? 'store' : 'warehouse'}
                colors={colors}
              />
              <InfoRow
                label="Destination"
                value={`${transfer.destination_type === 'branch' ? 'Branch' : 'Warehouse'}: ${transfer.destination_name}`}
                icon={transfer.destination_type === 'branch' ? 'store' : 'warehouse'}
                colors={colors}
              />
              <InfoRow label="Status" value={transfer.status.replace('_', ' ')} icon="clipboard" colors={colors} />
              <InfoRow label="Created" value={new Date(transfer.created_at).toLocaleDateString()} icon="calendar" colors={colors} />
              <InfoRow label="Updated" value={new Date(transfer.updated_at).toLocaleDateString()} icon="clock" colors={colors} />
            </View>
          </Card>

          {transfer.notes ? (
            <Card>
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Notes</Text>
              <Text style={[styles.notesText, { color: colors.textSecondary }]}>{transfer.notes}</Text>
            </Card>
          ) : null}

          <Card>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Summary</Text>
            <View style={styles.summaryGrid}>
              <View style={[styles.summaryItem, { backgroundColor: colors.surfaceElevated }]}>
                <Text style={[styles.summaryItemLabel, { color: colors.textMuted }]}>Total Items</Text>
                <Text style={[styles.summaryItemValue, { color: colors.textPrimary }]}>{transfer.total_items}</Text>
              </View>
              <View style={[styles.summaryItem, { backgroundColor: colors.surfaceElevated }]}>
                <Text style={[styles.summaryItemLabel, { color: colors.textMuted }]}>Total Quantity</Text>
                <Text style={[styles.summaryItemValue, { color: colors.gold }]}>{transfer.total_quantity}</Text>
              </View>
            </View>
          </Card>

          <Card>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Product List</Text>
            {transfer.items.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No items in this transfer.</Text>
            ) : (
              <View style={styles.itemsList}>
                {transfer.items.map((item: StockTransferItem) => (
                  <View key={item.id} style={styles.itemRow}>
                    <View style={styles.itemLeft}>
                      <Text style={[styles.itemName, { color: colors.textPrimary }]} numberOfLines={2}>{item.product_name}</Text>
                      {item.sku && <Text style={[styles.itemSku, { color: colors.textMuted }]} numberOfLines={1}>SKU: {item.sku}</Text>}
                      <Text style={[styles.itemQty, { color: colors.textSecondary }]}>
                        Qty: {item.quantity}
                        {item.received_quantity > 0 && (
                          <Text style={[{ color: item.received_quantity >= item.quantity ? colors.success : colors.warning }]}>
                            {' · '}Received: {item.received_quantity}/{item.quantity}
                          </Text>
                        )}
                      </Text>
                    </View>
                    <View style={[styles.qtyBadge, { backgroundColor: colors.gold + '20' }]}>
                      <Text style={[styles.qtyBadgeText, { color: colors.gold }]}>{item.quantity}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </Card>

          {renderStatusActions()}
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
  transferNumber: { fontSize: 20, fontWeight: '700', fontFamily: 'monospace', lineHeight: 26 },
  routeSummary: { fontSize: 13 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  sectionTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  infoContainer: { gap: 10 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoLabel: { fontSize: 14 },
  infoValue: { fontSize: 14, fontWeight: '500', maxWidth: 180, textAlign: 'right' },
  notesText: { fontSize: 14, lineHeight: 20 },
  summaryGrid: { flexDirection: 'row', gap: 10 },
  summaryItem: { flex: 1, borderRadius: 10, padding: 14, alignItems: 'center', gap: 4 },
  summaryItemLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryItemValue: { fontSize: 22, fontWeight: '700' },
  emptyText: { fontSize: 14, fontStyle: 'italic' },
  itemsList: { gap: 12 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.05)' },
  itemLeft: { flex: 1, gap: 2 },
  itemName: { fontSize: 14, fontWeight: '600' },
  itemSku: { fontSize: 12 },
  itemQty: { fontSize: 12 },
  qtyBadge: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  qtyBadgeText: { fontSize: 16, fontWeight: '700' },
  statusActions: { flexDirection: 'row', gap: 12 },
  statusActionBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statusActionText: { fontSize: 15, fontWeight: '600' },
});
