import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { ScreenWrapper } from '@components/ScreenWrapper';
import { AppHeader } from '@components/AppHeader';
import { Card } from '@components/Card';
import { ErrorState } from '@components/ErrorState';
import { LoadingState } from '@components/LoadingState';
import { RoleGate } from '@components/RoleGate';
import { InfoRow, InfoGroup } from '@components/InfoRow';
import { StatusBadge } from '@components/StatusBadge';
import { DetailHeader } from '@components/DetailHeader';
import { CardSection } from '@components/SectionHeader';
import { useThemeStore } from '@store/themeStore';
import { usePurchaseOrderDetail, useAttachments } from '@hooks/useERP';
import { AttachmentManager } from '@components/AttachmentManager';
import { useResponsive } from '@hooks/useResponsive';
import { useLocalSearchParams } from 'expo-router';
import { formatCurrency, formatDate } from '@lib/format';
import { navMinRank } from '@constants';
import type { PurchaseOrderItem } from '@apptypes/erp';

export default function PurchaseOrderDetailScreen() {
  const { colors } = useThemeStore();
  const params = useLocalSearchParams<{ id: string }>();
  const layout = useResponsive();

  const poId = params.id;
  const poQuery = usePurchaseOrderDetail(poId);

  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await poQuery.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [poQuery]);

  if (poQuery.isLoading) {
    return (
      <RoleGate minRank={navMinRank('purchase-orders')}>
        <ScreenWrapper>
          <AppHeader title="Purchase Order Details" showBack showMenu />
          <LoadingState message="Loading purchase order…" />
        </ScreenWrapper>
      </RoleGate>
    );
  }

  if (poQuery.isError || !poQuery.data) {
    return (
      <RoleGate minRank={navMinRank('purchase-orders')}>
        <ScreenWrapper>
          <AppHeader title="Purchase Order Details" showBack showMenu />
          <ErrorState
            title="Purchase order not found"
            message="This purchase order may have been removed or is unavailable."
            onRetry={() => poQuery.refetch()}
          />
        </ScreenWrapper>
      </RoleGate>
    );
  }

  const po = poQuery.data;

  const attachmentsQuery = useAttachments('purchase_order', po.id);
  const onRefreshAttachments = React.useCallback(() => {
    attachmentsQuery.refetch();
  }, [attachmentsQuery]);

  return (
    <RoleGate minRank={navMinRank('purchase-orders')}>
      <ScreenWrapper>
        <AppHeader title="Purchase Order Details" showBack showMenu />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingHorizontal: layout.padding, gap: layout.cardGap, maxWidth: layout.contentMaxWidth, alignSelf: layout.isTablet ? 'center' : 'stretch' }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} colors={[colors.gold]} />}
        >
          <Card>
            <DetailHeader
              icon="purchase-orders"
              title={po.po_number}
              subtitle={po.supplier_name}
              right={<StatusBadge status={po.status} />}
            />
          </Card>

          <Card>
            <CardSection title="Order Information">
              <InfoGroup>
                <InfoRow label="Supplier" value={po.supplier_name} icon="truck" />
                {po.warehouse_name ? <InfoRow label="Warehouse" value={po.warehouse_name} icon="warehouse" /> : null}
                <InfoRow label="Status" value={po.status} icon="clipboard" />
                <InfoRow label="Created" value={formatDate(po.created_at)} icon="calendar" />
                {po.expected_at ? <InfoRow label="Expected" value={formatDate(po.expected_at)} icon="calendar" /> : null}
                {po.received_at ? <InfoRow label="Received" value={formatDate(po.received_at)} icon="package" /> : null}
              </InfoGroup>
            </CardSection>
          </Card>

          {po.notes ? (
            <Card>
              <CardSection title="Notes">
                <Text style={[styles.notesText, { color: colors.textSecondary }]}>{po.notes}</Text>
              </CardSection>
            </Card>
          ) : null}

          <Card>
            <CardSection title="Order Items">
              {po.items.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>No items in this purchase order.</Text>
              ) : (
                <View style={styles.itemsList}>
                  {po.items.map((item: PurchaseOrderItem) => (
                    <View key={item.id} style={styles.itemRow}>
                      <View style={styles.itemLeft}>
                        <Text style={[styles.itemName, { color: colors.textPrimary }]} numberOfLines={2}>{item.product_name}</Text>
                        <Text style={[styles.itemDetail, { color: colors.textMuted }]}>
                          {item.quantity} × {formatCurrency(item.unit_cost, po.currency)}
                        </Text>
                        {item.received_quantity > 0 && item.received_quantity < item.quantity ? (
                          <Text style={[styles.itemDetail, { color: colors.warning }]}>
                            Received: {item.received_quantity}/{item.quantity}
                          </Text>
                        ) : item.received_quantity >= item.quantity && item.quantity > 0 ? (
                          <Text style={[styles.itemDetail, { color: colors.success }]}>Fully received</Text>
                        ) : null}
                      </View>
                      <Text style={[styles.itemTotal, { color: colors.textPrimary }]}>
                        {formatCurrency(item.line_total, po.currency)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </CardSection>
          </Card>

          <Card>
            <CardSection title="Summary">
              <View style={styles.summaryContainer}>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Subtotal</Text>
                  <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{formatCurrency(po.subtotal, po.currency)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Tax</Text>
                  <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{formatCurrency(po.tax_total, po.currency)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Shipping</Text>
                  <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{formatCurrency(po.shipping_total, po.currency)}</Text>
                </View>
                <View style={[styles.summaryRow, styles.summaryTotalRow]}>
                  <Text style={[styles.summaryTotalLabel, { color: colors.textPrimary }]}>Grand Total</Text>
                  <Text style={[styles.summaryTotalValue, { color: colors.gold }]}>{formatCurrency(po.grand_total, po.currency)}</Text>
                </View>
              </View>
            </CardSection>
          </Card>

          <Card>
            <CardSection title="Attachments">
              <AttachmentManager
                entityType="purchase_order"
                entityId={po.id}
                attachments={attachmentsQuery.data ?? []}
                onRefresh={onRefreshAttachments}
              />
            </CardSection>
          </Card>
        </ScrollView>
      </ScreenWrapper>
    </RoleGate>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingBottom: 24 },
  notesText: { fontSize: 14, lineHeight: 20 },
  emptyText: { fontSize: 14, fontStyle: 'italic' },
  itemsList: { gap: 12 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.05)' },
  itemLeft: { flex: 1, gap: 2 },
  itemName: { fontSize: 14, fontWeight: '600' },
  itemDetail: { fontSize: 12 },
  itemTotal: { fontSize: 14, fontWeight: '700' },
  summaryContainer: { gap: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 14 },
  summaryValue: { fontSize: 14, fontWeight: '500' },
  summaryTotalRow: { paddingTop: 8, marginTop: 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.1)' },
  summaryTotalLabel: { fontSize: 16, fontWeight: '700' },
  summaryTotalValue: { fontSize: 18, fontWeight: '700' },
});
