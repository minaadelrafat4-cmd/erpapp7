import React from 'react';
import {
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
import { useBranchDetail } from '@hooks/useERP';
import { useResponsive } from '@hooks/useResponsive';
import { useLocalSearchParams } from 'expo-router';
import { navMinRank } from '@constants';

export default function BranchDetailScreen() {
  const { colors } = useThemeStore();
  const params = useLocalSearchParams<{ id: string }>();
  const layout = useResponsive();

  const branchId = params.id;
  const branchQuery = useBranchDetail(branchId);

  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await branchQuery.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [branchQuery]);

  if (branchQuery.isLoading) {
    return (
      <RoleGate minRank={navMinRank('branches')}>
        <ScreenWrapper>
          <AppHeader title="Branch Details" showBack showMenu />
          <LoadingState message="Loading branch…" />
        </ScreenWrapper>
      </RoleGate>
    );
  }

  if (branchQuery.isError || !branchQuery.data) {
    return (
      <RoleGate minRank={navMinRank('branches')}>
        <ScreenWrapper>
          <AppHeader title="Branch Details" showBack showMenu />
          <ErrorState
            title="Branch not found"
            message="This branch may have been removed or is unavailable."
            onRetry={() => branchQuery.refetch()}
          />
        </ScreenWrapper>
      </RoleGate>
    );
  }

  const branch = branchQuery.data;

  return (
    <RoleGate minRank={navMinRank('branches')}>
      <ScreenWrapper>
        <AppHeader title="Branch Details" showBack showMenu />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingHorizontal: layout.padding, gap: layout.cardGap, maxWidth: layout.contentMaxWidth, alignSelf: layout.isTablet ? 'center' : 'stretch' }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} colors={[colors.gold]} />}
        >
          <Card>
            <DetailHeader icon="store" title={branch.name} subtitle={`Code: ${branch.code}`} />
          </Card>

          <Card>
            <CardSection title="Contact Information">
              <InfoGroup>
                <InfoRow label="Address" value={branch.address} icon="map-pin" />
                <InfoRow label="City" value={branch.city} icon="map-pin" />
                {branch.state && <InfoRow label="State" value={branch.state} icon="map-pin" />}
                {branch.postal_code && <InfoRow label="Postal Code" value={branch.postal_code} icon="map-pin" />}
                <InfoRow label="Country" value={branch.country} icon="globe" />
                {branch.phone && <InfoRow label="Phone" value={branch.phone} icon="phone" />}
                {branch.email && <InfoRow label="Email" value={branch.email} icon="mail" />}
                {branch.manager && <InfoRow label="Manager" value={branch.manager} icon="user" />}
              </InfoGroup>
            </CardSection>
          </Card>

          <Card>
            <CardSection title="Assigned Warehouse">
              <InfoGroup>
                <InfoRow
                  label="Warehouse"
                  value={branch.warehouse_name ?? 'Not assigned'}
                  icon="warehouse"
                />
              </InfoGroup>
            </CardSection>
          </Card>

          <Card>
            <CardSection title="Inventory Overview">
              <SummaryGrid
                items={[
                  { label: 'Products', value: branch.product_count },
                  { label: 'Total Stock', value: branch.total_stock, highlight: true, highlightColor: colors.gold },
                ]}
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
});
