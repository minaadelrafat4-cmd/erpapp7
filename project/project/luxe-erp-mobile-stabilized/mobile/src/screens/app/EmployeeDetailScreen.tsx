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
import { useThemeStore } from '@store/themeStore';
import { useEmployeeDetail } from '@hooks/useERP';
import { useResponsive } from '@hooks/useResponsive';
import { useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getIconName } from '@config/icons';
import { navMinRank } from '@constants';
import type { IconName, ThemeColors } from '@apptypes';
import type { EmployeeRole } from '@apptypes/erp';

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

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

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
            <View style={styles.headerRow}>
              <View style={[styles.avatar, { backgroundColor: colors.surfaceElevated }]}>
                <Text style={[styles.avatarText, { color: colors.gold }]}>{initials}</Text>
              </View>
              <View style={styles.headerInfo}>
                <Text style={[styles.empName, { color: colors.textPrimary }]}>{fullName}</Text>
                {emp.position && (
                  <Text style={[styles.empPosition, { color: colors.textSecondary }]}>{emp.position}</Text>
                )}
                <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                  <Text style={[styles.statusText, { color: statusColor }]}>{getStatusLabel(emp.status)}</Text>
                </View>
              </View>
            </View>
          </Card>

          <Card>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Contact Information</Text>
            <View style={styles.infoContainer}>
              <InfoRow label="Email" value={emp.email} icon="mail" colors={colors} />
              {emp.phone && <InfoRow label="Phone" value={emp.phone} icon="phone" colors={colors} />}
              <InfoRow label="Hire Date" value={formatDate(emp.hire_date)} icon="calendar" colors={colors} />
            </View>
          </Card>

          <Card>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Branch Assignment</Text>
            <View style={styles.infoContainer}>
              <InfoRow
                label="Branch"
                value={emp.branch_name ?? 'Not assigned'}
                icon="store"
                colors={colors}
              />
              {emp.branch_code && (
                <InfoRow label="Branch Code" value={emp.branch_code} icon="building" colors={colors} />
              )}
            </View>
          </Card>

          <Card>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Roles & Permissions</Text>
            {emp.roles.length > 0 ? (
              <View style={styles.roleList}>
                {emp.roles.map((role: EmployeeRole) => (
                  <View key={role.id} style={[styles.roleItem, { backgroundColor: colors.surfaceElevated }]}>
                    <MaterialCommunityIcons name={getIconName('shield')} size={16} color={colors.gold} />
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
          </Card>

          {emp.performance && (
            <Card>
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Sales Performance</Text>
              <View style={styles.summaryGrid}>
                <View style={[styles.summaryItem, { backgroundColor: colors.surfaceElevated }]}>
                  <Text style={[styles.summaryItemLabel, { color: colors.textMuted }]}>Total Sales</Text>
                  <Text style={[styles.summaryItemValue, { color: colors.gold }]}>{formatCurrency(emp.performance.total_sales)}</Text>
                </View>
                <View style={[styles.summaryItem, { backgroundColor: colors.surfaceElevated }]}>
                  <Text style={[styles.summaryItemLabel, { color: colors.textMuted }]}>Orders</Text>
                  <Text style={[styles.summaryItemValue, { color: colors.textPrimary }]}>{emp.performance.order_count}</Text>
                </View>
                <View style={[styles.summaryItem, { backgroundColor: colors.surfaceElevated }]}>
                  <Text style={[styles.summaryItemLabel, { color: colors.textMuted }]}>Avg Sale</Text>
                  <Text style={[styles.summaryItemValue, { color: colors.textPrimary }]}>{formatCurrency(emp.performance.avg_sale_value)}</Text>
                </View>
              </View>
              {emp.performance.last_sale_at && (
                <View style={styles.lastSaleRow}>
                  <MaterialCommunityIcons name={getIconName('clock')} size={14} color={colors.textMuted} />
                  <Text style={[styles.lastSaleText, { color: colors.textMuted }]}>
                    Last sale: {formatDate(emp.performance.last_sale_at)}
                  </Text>
                </View>
              )}
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
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 24, fontWeight: '700' },
  headerInfo: { flex: 1, gap: 4 },
  empName: { fontSize: 20, fontWeight: '700', lineHeight: 26 },
  empPosition: { fontSize: 14 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 2 },
  statusText: { fontSize: 11, fontWeight: '600' },
  sectionTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  infoContainer: { gap: 10 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoLabel: { fontSize: 14 },
  infoValue: { fontSize: 14, fontWeight: '500', maxWidth: 180, textAlign: 'right' },
  roleList: { gap: 10 },
  roleItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 },
  roleInfo: { flex: 1, gap: 2 },
  roleName: { fontSize: 14, fontWeight: '600' },
  roleDesc: { fontSize: 12 },
  emptyText: { fontSize: 14 },
  summaryGrid: { flexDirection: 'row', gap: 10 },
  summaryItem: { flex: 1, borderRadius: 10, padding: 14, alignItems: 'center', gap: 4 },
  summaryItemLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryItemValue: { fontSize: 18, fontWeight: '700' },
  lastSaleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  lastSaleText: { fontSize: 12 },
});
