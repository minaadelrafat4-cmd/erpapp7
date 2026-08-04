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
import { DetailHeader } from '@components/DetailHeader';
import { CardSection } from '@components/SectionHeader';
import { SummaryGrid } from '@components/SummaryGrid';
import { useThemeStore } from '@store/themeStore';
import { useCustomerDetail } from '@hooks/useERP';
import { useResponsive } from '@hooks/useResponsive';
import { useLocalSearchParams } from 'expo-router';
import { formatDate } from '@lib/format';
import { navMinRank } from '@constants';
import type { CustomerAddress, CustomerOrderSummary } from '@apptypes/erp';

export default function CustomerDetailScreen() {
  const { colors } = useThemeStore();
  const params = useLocalSearchParams<{ id: string }>();
  const layout = useResponsive();

  const customerId = params.id;
  const customerQuery = useCustomerDetail(customerId);

  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await customerQuery.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [customerQuery]);

  if (customerQuery.isLoading) {
    return (
      <RoleGate minRank={navMinRank('customers')}>
        <ScreenWrapper>
          <AppHeader title="Customer Details" showBack showMenu />
          <LoadingState message="Loading customer…" />
        </ScreenWrapper>
      </RoleGate>
    );
  }

  if (customerQuery.isError || !customerQuery.data) {
    return (
      <RoleGate minRank={navMinRank('customers')}>
        <ScreenWrapper>
          <AppHeader title="Customer Details" showBack showMenu />
          <ErrorState
            title="Customer not found"
            message="This customer may have been removed or is unavailable."
            onRetry={() => customerQuery.refetch()}
          />
        </ScreenWrapper>
      </RoleGate>
    );
  }

  const customer = customerQuery.data;
  const fullName = [customer.first_name, customer.last_name].filter(Boolean).join(' ').trim() || 'Unknown';
  const initials = (customer.first_name ?? customer.email ?? 'U').charAt(0).toUpperCase();

  return (
    <RoleGate minRank={navMinRank('customers')}>
      <ScreenWrapper>
        <AppHeader title="Customer Details" showBack showMenu />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingHorizontal: layout.padding, gap: layout.cardGap, maxWidth: layout.contentMaxWidth, alignSelf: layout.isTablet ? 'center' : 'stretch' }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} colors={[colors.gold]} />}
        >
          <Card>
            <DetailHeader
              icon="users"
              title={fullName}
              subtitle={customer.email ?? undefined}
            />
          </Card>

          <Card>
            <CardSection title="Contact Information">
              <InfoGroup>
                <InfoRow label="Email" value={customer.email ?? '—'} icon="mail" />
                <InfoRow label="Phone" value={customer.phone ?? '—'} icon="phone" />
              </InfoGroup>
            </CardSection>
          </Card>

          <Card>
            <CardSection title="Account Summary">
              <SummaryGrid
                items={[
                  { label: 'Orders', value: customer.order_count },
                  { label: 'Total Spent', value: customer.total_spent ? `$${customer.total_spent.toFixed(2)}` : '—', highlight: true, highlightColor: colors.gold },
                  { label: 'Loyalty Points', value: customer.loyalty_points, highlight: true, highlightColor: colors.accent },
                ]}
              />
            </CardSection>
          </Card>

          {customer.addresses.length > 0 && (
            <Card>
              <CardSection title="Saved Addresses">
                <View style={styles.addressContainer}>
                  {customer.addresses.map((addr: CustomerAddress) => (
                    <View key={addr.id} style={styles.addressBlock}>
                      {addr.is_default && (
                        <View style={[styles.defaultBadge, { backgroundColor: colors.gold + '20' }]}>
                          <Text style={[styles.defaultBadgeText, { color: colors.gold }]}>Default</Text>
                        </View>
                      )}
                      <Text style={[styles.addressLine, { color: colors.textPrimary }]}>{addr.line1}</Text>
                      {addr.line2 ? <Text style={[styles.addressLine, { color: colors.textSecondary }]}>{addr.line2}</Text> : null}
                      <Text style={[styles.addressLine, { color: colors.textSecondary }]}>
                        {addr.city}{addr.state ? `, ${addr.state}` : ''} {addr.postal_code ?? ''}
                      </Text>
                      <Text style={[styles.addressLine, { color: colors.textSecondary }]}>{addr.country}</Text>
                      {addr.phone ? <Text style={[styles.addressLine, { color: colors.textMuted }]}>Phone: {addr.phone}</Text> : null}
                    </View>
                  ))}
                </View>
              </CardSection>
            </Card>
          )}

          <Card>
            <CardSection title="Recent Orders">
              {customer.recent_orders.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>No orders yet.</Text>
              ) : (
                <View style={styles.ordersList}>
                  {customer.recent_orders.map((order: CustomerOrderSummary) => (
                    <View key={order.id} style={styles.orderItem}>
                      <View style={styles.orderLeft}>
                        <Text style={[styles.orderNumber, { color: colors.gold }]}>{order.order_number}</Text>
                        <Text style={[styles.orderDate, { color: colors.textMuted }]}>
                          {formatDate(order.placed_at)}
                        </Text>
                      </View>
                      <View style={styles.orderRight}>
                        <Text style={[styles.orderTotal, { color: colors.textPrimary }]}>
                          {order.currency === 'USD' ? '$' : ''}{order.grand_total.toFixed(2)}
                        </Text>
                        <Text style={[styles.orderStatus, { color: colors.textSecondary }]}>{order.status}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
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
  addressContainer: { gap: 10 },
  addressBlock: { gap: 2, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.05)' },
  defaultBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginBottom: 4 },
  defaultBadgeText: { fontSize: 11, fontWeight: '600' },
  addressLine: { fontSize: 13, lineHeight: 18 },
  emptyText: { fontSize: 14, fontStyle: 'italic' },
  ordersList: { gap: 10 },
  orderItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.05)' },
  orderLeft: { flex: 1, gap: 2 },
  orderNumber: { fontSize: 14, fontWeight: '600', fontFamily: 'monospace' },
  orderDate: { fontSize: 12 },
  orderRight: { alignItems: 'flex-end', gap: 2 },
  orderTotal: { fontSize: 14, fontWeight: '700' },
  orderStatus: { fontSize: 11, textTransform: 'capitalize' },
});
