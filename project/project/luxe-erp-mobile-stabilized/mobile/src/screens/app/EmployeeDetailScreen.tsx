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
import { useEmployeeDetail } from '@hooks/useERP';
import { useResponsive } from '@hooks/useResponsive';
import { useLocalSearchParams } from 'expo-router';
import { formatCurrency, formatDate } from '@lib/format';
import { navMinRank } from '@constants';
import type { EmployeeRole } from '@apptypes/erp';

export default function EmployeeDetailScreen() {
  const { colors } = useThemeStore();
  const params = useLocalSearchParams<{ id: string }>();
  const layout = useResponsive();

  const employeeId = params.id;
  const employeeQuery = useEmployeeDetail(employeeId);

  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await employeeQuery.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [employeeQuery]);

  if (employeeQuery.isLoading) {
    return (
      <RoleGate minRank={navMinRank('employees')}>
        <ScreenWrapper>
          <AppHeader title="Employee Profile" showBack showMenu />
          <LoadingState message="Loading employee…" />
        </ScreenWrapper>
      </RoleGate>
    );
  }

  if (employeeQuery.isError || !employeeQuery.data) {
    return (
      <RoleGate minRank={navMinRank('employees')}>
        <ScreenWrapper>
          <AppHeader title="Employee Profile" showBack showMenu />
          <ErrorState
            title="Employee not found"
            message="This employee may have been removed or is unavailable."
            onRetry={() => employeeQuery.refetch()}
          />
        </ScreenWrapper>
      </RoleGate>
    );
  }

  const emp = employeeQuery.data;
  const fullName = `${emp.first_name} ${emp.last_name}`;
  const initials = `${emp.first_name.charAt(0)}${emp.last_name.charAt(0)}`.toUpperCase();

  const getStatusColor = (status: string): string => {
    if (status === 'active') return colors.success;
    if (status === 'on_leave' || status === 'suspended') return colors.warning;
    return colors.error;
  };

  const getStatusLabel = (status: string): string => {
    if (status === 'active') return 'Active';
    if (status === 'on_leave') return 'On Leave';
    if (status === 'suspended') return 'Suspended';
    if (status === 'inactive') return 'Inactive';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const statusColor = getStatusColor(emp.status);

  return (
    <RoleGate minRank={navMinRank('employees')}>
      <ScreenWrapper>
        <AppHeader title="Employee Profile" showBack showMenu />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingHorizontal: layout.padding, gap: layout.cardGap, maxWidth: layout.contentMaxWidth, alignSelf: layout.isTablet ? 'center' : 'stretch' }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} colors={[colors.gold]} />}
        >
          <Card>
            <DetailHeader
              icon="employees"
              title={fullName}
              subtitle={emp.position ?? undefined}
              right={
                <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                  <Text style={[styles.statusText, { color: statusColor }]}>{getStatusLabel(emp.status)}</Text>
                </View>
              }
            />
          </Card>

          <Card>
            <CardSection title="Contact Information">
              <InfoGroup>
                <InfoRow label="Email" value={emp.email} icon="mail" />
                {emp.phone && <InfoRow label="Phone" value={emp.phone} icon="phone" />}
                <InfoRow label="Hire Date" value={formatDate(emp.hire_date)} icon="calendar" />
              </InfoGroup>
            </CardSection>
          </Card>

          <Card>
            <CardSection title="Branch Assignment">
              <InfoGroup>
                <InfoRow label="Branch" value={emp.branch_name ?? 'Not assigned'} icon="store" />
                {emp.branch_code && <InfoRow label="Branch Code" value={emp.branch_code} icon="building" />}
              </InfoGroup>
            </CardSection>
          </Card>

          <Card>
            <CardSection title="Roles & Permissions">
              {emp.roles.length > 0 ? (
                <View style={styles.roleList}>
                  {emp.roles.map((role: EmployeeRole) => (
                    <View key={role.id} style={[styles.roleItem, { backgroundColor: colors.surfaceElevated }]}>
                      <View style={styles.roleInfo}>
                        <Text style={[styles.roleName, { color: colors.textPrimary }]}>{role.name}</Text>
                        {role.description && (
                          <Text style={[styles.roleDesc, { color: colors.textMuted }]} numberOfLines={2}>{role.description}</Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>No roles assigned.</Text>
              )}
            </CardSection>
          </Card>

          {emp.performance && (
            <Card>
              <CardSection title="Sales Performance">
                <SummaryGrid
                  items={[
                    { label: 'Total Sales', value: formatCurrency(emp.performance.total_sales), highlight: true, highlightColor: colors.gold },
                    { label: 'Orders', value: emp.performance.order_count },
                    { label: 'Avg Sale', value: formatCurrency(emp.performance.avg_sale_value) },
                  ]}
                />
                {emp.performance.last_sale_at && (
                  <View style={styles.lastSaleRow}>
                    <Text style={[styles.lastSaleText, { color: colors.textMuted }]}>
                      Last sale: {formatDate(emp.performance.last_sale_at)}
                    </Text>
                  </View>
                )}
              </CardSection>
            </Card>
          )}
        </ScrollView>
      </ScreenWrapper>
    </RoleGate>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingBottom: 24 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '600' },
  roleList: { gap: 10 },
  roleItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 },
  roleInfo: { flex: 1, gap: 2 },
  roleName: { fontSize: 14, fontWeight: '600' },
  roleDesc: { fontSize: 12 },
  emptyText: { fontSize: 14 },
  lastSaleRow: { marginTop: 12 },
  lastSaleText: { fontSize: 12 },
});
