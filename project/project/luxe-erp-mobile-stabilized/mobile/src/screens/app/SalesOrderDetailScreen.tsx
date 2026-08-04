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
import { useSalesOrderDetail } from '@hooks/useERP';
import { useResponsive } from '@hooks/useResponsive';
import { useLocalSearchParams } from 'expo-router';
import { formatCurrency, formatDate } from '@lib/format';
import { navMinRank } from '@constants';
import type { SalesOrderItem } from '@apptypes/erp';

export default function SalesOrderDetailScreen() {
  const { colors } = useThemeStore();
  const params = useLocalSearchParams<{ id: string }>();
  const layout = useResponsive();

  const orderId = params.id;
  const orderQuery = useSalesOrderDetail(orderId);

  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await orderQuery.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [orderQuery]);

  if (orderQuery.isLoading) {
    return (
      <RoleGate minRank={navMinRank('sales-orders')}>
        <ScreenWrapper>
          <AppHeader title="Order Details" showBack showMenu />
          <LoadingState message="Loading order…" />
        </ScreenWrapper>
      </RoleGate>
    );
  }

  if (orderQuery.isError || !orderQuery.data) {
    return (
      <RoleGate minRank={navMinRank('sales-orders')}>
        <ScreenWrapper>
          <AppHeader title="Order Details" showBack showMenu />
          <ErrorState
            title="Order not found"
            message="This order may have been removed or is unavailable."
            onRetry={() => orderQuery.refetch()}
          />
        </ScreenWrapper>
      </RoleGate>
    );
  }

  const order = orderQuery.data;

  return (
    <RoleGate minRank={navMinRank('sales-orders')}>
      <ScreenWrapper>
        <AppHeader title="Order Details" showBack showMenu />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingHorizontal: layout.padding, gap: layout.cardGap, maxWidth: layout.contentMaxWidth, alignSelf: layout.isTablet ? 'center' : 'stretch' }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} colors={[colors.gold]} />}
        >
          <Card>
            <DetailHeader
              icon="sales-orders"
              title={order.order_number}
              subtitle={order.customer_name}
              right={<StatusBadge status={order.status} />}
            />
          </Card>

          <Card>
            <CardSection title="Order Information">
              <InfoGroup>
                <InfoRow label="Customer" value={order.customer_name} icon="users" />
                <InfoRow label="Status" value={order.status} icon="shopping-cart" />
                <InfoRow label="Payment" value={order.payment_status} icon="credit-card" />
                <InfoRow label="Fulfillment" value={order.fulfillment_status} icon="package" />
                <InfoRow label="Placed" value={formatDate(order.placed_at)} icon="calendar" />
                {order.tracking_number ? <InfoRow label="Tracking" value={order.tracking_number} icon="truck" /> : null}
                {order.carrier ? <InfoRow label="Carrier" value={order.carrier} icon="truck" /> : null}
              </InfoGroup>
            </CardSection>
          </Card>

          {order.notes ? (
            <Card>
              <CardSection title="Notes">
                <Text style={[styles.notesText, { color: colors.textSecondary }]}>{order.notes}</Text>
              </CardSection>
            </Card>
          ) : null}

          <Card>
            <CardSection title="Order Items">
              {order.items.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>No items in this order.</Text>
              ) : (
                <View style={styles.itemsList}>
                  {order.items.map((item: SalesOrderItem) => (
                    <View key={item.id} style={styles.itemRow}>
                      <View style={styles.itemLeft}>
                        <Text style={[styles.itemName, { color: colors.textPrimary }]} numberOfLines={2}>{item.product_name}</Text>
                        {item.variant_name ? (
                          <Text style={[styles.itemDetail, { color: colors.textMuted }]}>{item.variant_name}</Text>
                        ) : null}
                        <Text style={[styles.itemDetail, { color: colors.textMuted }]}>
                          {item.quantity} × {formatCurrency(item.price, order.currency)}
                        </Text>
                      </View>
                      <Text style={[styles.itemTotal, { color: colors.textPrimary }]}>
                        {formatCurrency(item.line_total, order.currency)}
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
                  <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{formatCurrency(order.subtotal, order.currency)}</Text>
                </View>
                {order.discount_total > 0 ? (
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Discount</Text>
                    <Text style={[styles.summaryValue, { color: colors.error }]}>{formatCurrency(order.discount_total, order.currency)}</Text>
                  </View>
                ) : null}
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Shipping</Text>
                  <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{formatCurrency(order.shipping_total, order.currency)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Tax</Text>
                  <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{formatCurrency(order.tax_total, order.currency)}</Text>
                </View>
                <View style={[styles.summaryRow, styles.summaryTotalRow]}>
                  <Text style={[styles.summaryTotalLabel, { color: colors.textPrimary }]}>Grand Total</Text>
                  <Text style={[styles.summaryTotalValue, { color: colors.gold }]}>{formatCurrency(order.grand_total, order.currency)}</Text>
                </View>
              </View>
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
