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
import { ProgressBar } from '@components/ProgressBar';
import { useThemeStore } from '@store/themeStore';
import { useWarehouseDetail } from '@hooks/useERP';
import { useResponsive } from '@hooks/useResponsive';
import { useLocalSearchParams } from 'expo-router';
import { navMinRank } from '@constants';

export default function WarehouseDetailScreen() {
  const { colors } = useThemeStore();
  const params = useLocalSearchParams<{ id: string }>();
  const layout = useResponsive();

  const warehouseId = params.id;
  const warehouseQuery = useWarehouseDetail(warehouseId);

  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await warehouseQuery.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [warehouseQuery]);

  if (warehouseQuery.isLoading) {
    return (
      <RoleGate minRank={navMinRank('warehouses')}>
        <ScreenWrapper>
          <AppHeader title="Warehouse Details" showBack showMenu />
          <LoadingState message="Loading warehouse…" />
        </ScreenWrapper>
      </RoleGate>
    );
  }

  if (warehouseQuery.isError || !warehouseQuery.data) {
    return (
      <RoleGate minRank={navMinRank('warehouses')}>
        <ScreenWrapper>
          <AppHeader title="Warehouse Details" showBack showMenu />
          <ErrorState
            title="Warehouse not found"
            message="This warehouse may have been removed or is unavailable."
            onRetry={() => warehouseQuery.refetch()}
          />
        </ScreenWrapper>
      </RoleGate>
    );
  }

  const wh = warehouseQuery.data;
  const utilColor = wh.utilization_pct >= 90 ? colors.error : wh.utilization_pct >= 70 ? colors.warning : colors.success;

  return (
    <RoleGate minRank={navMinRank('warehouses')}>
      <ScreenWrapper>
        <AppHeader title="Warehouse Details" showBack showMenu />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingHorizontal: layout.padding, gap: layout.cardGap, maxWidth: layout.contentMaxWidth, alignSelf: layout.isTablet ? 'center' : 'stretch' }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} colors={[colors.gold]} />}
        >
          <Card>
            <DetailHeader icon="warehouse" title={wh.name} subtitle={`Code: ${wh.code}`} />
          </Card>

          <Card>
            <CardSection title="Warehouse Information">
              <InfoGroup>
                <InfoRow label="Name" value={wh.name} icon="warehouse" />
                <InfoRow label="Code" value={wh.code} icon="tag" />
                <InfoRow label="City" value={wh.city} icon="map-pin" />
                {wh.state && <InfoRow label="State" value={wh.state} icon="map-pin" />}
                <InfoRow label="Country" value={wh.country} icon="globe" />
                {wh.manager && <InfoRow label="Manager" value={wh.manager} icon="user" />}
                {wh.phone && <InfoRow label="Phone" value={wh.phone} icon="phone" />}
                {wh.email && <InfoRow label="Email" value={wh.email} icon="mail" />}
                {wh.capacity != null && <InfoRow label="Capacity" value={String(wh.capacity)} icon="box" />}
                <InfoRow label="Active" value={wh.is_active ? 'Yes' : 'No'} icon="check" />
              </InfoGroup>
            </CardSection>
          </Card>

          <Card>
            <CardSection title="Inventory Summary">
              <SummaryGrid
                items={[
                  { label: 'Products', value: wh.product_count },
                  { label: 'Total Units', value: wh.total_units },
                  { label: 'Available', value: wh.total_available, highlight: true, highlightColor: colors.success },
                  { label: 'Low Stock', value: wh.low_stock_count, highlight: wh.low_stock_count > 0, highlightColor: colors.warning },
                ]}
              />

              {wh.capacity != null && wh.capacity > 0 && (
                <View style={styles.utilizationSection}>
                  <View style={styles.utilHeader}>
                    <Text style={[styles.utilLabel, { color: colors.textSecondary }]}>Utilization</Text>
                    <Text style={[styles.utilPct, { color: utilColor }]}>{wh.utilization_pct}%</Text>
                  </View>
                  <ProgressBar progress={wh.utilization_pct / 100} color={utilColor} />
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
  utilizationSection: { marginTop: 16, gap: 8 },
  utilHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  utilLabel: { fontSize: 14 },
  utilPct: { fontSize: 16, fontWeight: '700' },
});
