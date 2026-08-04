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
import { useThemeStore } from '@store/themeStore';
import { useSupplierDetail } from '@hooks/useERP';
import { useResponsive } from '@hooks/useResponsive';
import { useLocalSearchParams } from 'expo-router';
import { formatDate } from '@lib/format';
import { navMinRank } from '@constants';
import type { PurchaseOrderSummary } from '@apptypes/erp';

export default function SupplierDetailScreen() {
  const { colors } = useThemeStore();
  const params = useLocalSearchParams<{ id: string }>();
  const layout = useResponsive();

  const supplierId = params.id;
  const supplierQuery = useSupplierDetail(supplierId);

  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await supplierQuery.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [supplierQuery]);

  if (supplierQuery.isLoading) {
    return (
      <RoleGate minRank={navMinRank('suppliers')}>
        <ScreenWrapper>
          <AppHeader title="Supplier Details" showBack showMenu />
          <LoadingState message="Loading supplier…" />
        </ScreenWrapper>
      </RoleGate>
    );
  }

  if (supplierQuery.isError || !supplierQuery.data) {
    return (
      <RoleGate minRank={navMinRank('suppliers')}>
        <ScreenWrapper>
          <AppHeader title="Supplier Details" showBack showMenu />
          <ErrorState
            title="Supplier not found"
            message="This supplier may have been removed or is unavailable."
            onRetry={() => supplierQuery.refetch()}
          />
        </ScreenWrapper>
      </RoleGate>
    );
  }

  const supplier = supplierQuery.data;

  return (
    <RoleGate minRank={navMinRank('suppliers')}>
      <ScreenWrapper>
        <AppHeader title="Supplier Details" showBack showMenu />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingHorizontal: layout.padding, gap: layout.cardGap, maxWidth: layout.contentMaxWidth, alignSelf: layout.isTablet ? 'center' : 'stretch' }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} colors={[colors.gold]} />}
        >
          <Card>
            <DetailHeader
              icon="truck"
              title={supplier.name}
              subtitle={supplier.contact_name ? `Contact: ${supplier.contact_name}` : undefined}
              right={
                <View style={[styles.statusBadge, { backgroundColor: supplier.is_active ? colors.success + '20' : colors.error + '20' }]}>
                  <Text style={[styles.statusText, { color: supplier.is_active ? colors.success : colors.error }]}>
                    {supplier.is_active ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              }
            />
          </Card>

          <Card>
            <CardSection title="Contact Information">
              <InfoGroup>
                <InfoRow label="Email" value={supplier.email ?? '—'} icon="mail" />
                <InfoRow label="Phone" value={supplier.phone ?? '—'} icon="phone" />
                <InfoRow label="Address" value={supplier.address ?? '—'} icon="map-pin" />
                <InfoRow label="City" value={supplier.city ?? '—'} icon="map-pin" />
                <InfoRow label="Country" value={supplier.country ?? '—'} icon="globe" />
                <InfoRow label="Payment Terms" value={supplier.payment_terms ?? '—'} icon="dollar" />
              </InfoGroup>
            </CardSection>
          </Card>

          <Card>
            <CardSection title="Purchase Orders">
              {supplier.purchase_orders.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>No purchase orders linked to this supplier.</Text>
              ) : (
                <View style={styles.poList}>
                  {supplier.purchase_orders.map((po: PurchaseOrderSummary) => (
                    <View key={po.id} style={styles.poItem}>
                      <View style={styles.poLeft}>
                        <Text style={[styles.poNumber, { color: colors.gold }]}>{po.po_number}</Text>
                        <Text style={[styles.poDate, { color: colors.textMuted }]}>
                          {formatDate(po.created_at)}
                        </Text>
                      </View>
                      <View style={styles.poRight}>
                        <Text style={[styles.poTotal, { color: colors.textPrimary }]}>
                          {po.currency === 'USD' ? '$' : ''}{po.grand_total.toFixed(2)}
                        </Text>
                        <Text style={[styles.poStatus, { color: colors.textSecondary }]}>{po.status}</Text>
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
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '600' },
  emptyText: { fontSize: 14, fontStyle: 'italic' },
  poList: { gap: 10 },
  poItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.05)' },
  poLeft: { flex: 1, gap: 2 },
  poNumber: { fontSize: 14, fontWeight: '600', fontFamily: 'monospace' },
  poDate: { fontSize: 12 },
  poRight: { alignItems: 'flex-end', gap: 2 },
  poTotal: { fontSize: 14, fontWeight: '700' },
  poStatus: { fontSize: 11, textTransform: 'capitalize' },
});
