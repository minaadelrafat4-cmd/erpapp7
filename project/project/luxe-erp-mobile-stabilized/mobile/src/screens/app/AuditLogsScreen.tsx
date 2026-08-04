import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  ScrollView,
  Pressable,
} from 'react-native';
import { ScreenWrapper } from '@components/ScreenWrapper';
import { AppHeader } from '@components/AppHeader';
import { SearchBar } from '@components/SearchBar';
import { ErrorState } from '@components/ErrorState';
import { EmptyState } from '@components/EmptyState';
import { FilterChips } from '@components/FilterChips';
import { ClearFiltersButton } from '@components/SortControl';
import { ExportButton } from '@components/ExportButton';
import { RoleGate } from '@components/RoleGate';
import { StatusBadge } from '@components/StatusBadge';
import { useThemeStore } from '@store/themeStore';
import { useAuditLogs } from '@hooks/useERP';
import { useResponsive } from '@hooks/useResponsive';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getIconName } from '@config/icons';
import { formatDateTime } from '@lib/format';
import { navMinRank } from '@constants';
import type { AuditLog } from '@apptypes/erp';
import type { IconName } from '@apptypes';

const DEBOUNCE_MS = 300;

const MODULE_OPTIONS = [
  'all', 'auth', 'products', 'customers', 'suppliers',
  'purchase_orders', 'sales_orders', 'inventory', 'employees',
  'stock_transfers', 'tasks', 'reports', 'settings',
];

const ACTION_OPTIONS = [
  'all', 'create', 'update', 'delete', 'login', 'logout', 'export',
];

const ACTION_COLORS: Record<string, string> = {
  create: 'success',
  update: 'gold',
  delete: 'error',
  login: 'accent',
  logout: 'textMuted',
  export: 'gold',
};

function getModuleIcon(module: string): IconName {
  const map: Record<string, IconName> = {
    auth: 'shield-check',
    products: 'package',
    customers: 'users',
    suppliers: 'truck',
    purchase_orders: 'truck',
    sales_orders: 'shopping-cart',
    inventory: 'inventory',
    employees: 'employees',
    stock_transfers: 'box',
    tasks: 'clipboard',
    reports: 'reports',
    settings: 'gear',
  };
  return map[module] ?? 'info';
}

export default function AuditLogsScreen() {
  const { colors } = useThemeStore();
  const layout = useResponsive();

  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [detailLog, setDetailLog] = useState<AuditLog | null>(null);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchText), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchText]);

  const auditQuery = useAuditLogs(debouncedSearch, moduleFilter, actionFilter);

  const allItems: AuditLog[] = auditQuery.data
    ? auditQuery.data.pages.flatMap((p) => p.items)
    : [];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await auditQuery.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [auditQuery]);

  const onLoadMore = useCallback(() => {
    if (auditQuery.hasNextPage && !auditQuery.isFetchingNextPage) {
      auditQuery.fetchNextPage();
    }
  }, [auditQuery]);

  const hasActiveFilters =
    debouncedSearch.trim() !== '' || moduleFilter !== 'all' || actionFilter !== 'all';

  const clearFilters = () => {
    setSearchText('');
    setDebouncedSearch('');
    setModuleFilter('all');
    setActionFilter('all');
  };

  const renderItem = useCallback(
    ({ item }: { item: AuditLog }) => {
      const moduleIcon = getModuleIcon(item.module);
      return (
        <TouchableOpacity
          style={[styles.logCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          activeOpacity={0.7}
          onPress={() => setDetailLog(item)}
        >
          <View style={styles.logHeader}>
            <View style={[styles.moduleIcon, { backgroundColor: colors.surfaceElevated }]}>
              <MaterialCommunityIcons name={getIconName(moduleIcon)} size={18} color={colors.gold} />
            </View>
            <View style={styles.logInfo}>
              <Text style={[styles.logUser, { color: colors.textPrimary }]} numberOfLines={1}>
                {item.user_email ?? 'System'}
              </Text>
              <Text style={[styles.logModule, { color: colors.textMuted }]} numberOfLines={1}>
                {item.module.replace(/_/g, ' ')}
              </Text>
            </View>
            <StatusBadge status={item.action} />
          </View>
          <View style={styles.logMeta}>
            <MaterialCommunityIcons name={getIconName('clock')} size={12} color={colors.textMuted} />
            <Text style={[styles.logTime, { color: colors.textMuted }]}>
              {formatDateTime(item.created_at)}
            </Text>
          </View>
        </TouchableOpacity>
      );
    },
    [colors],
  );

  const showLoading = auditQuery.isLoading && !refreshing;
  const showError = auditQuery.isError && !refreshing;

  return (
    <RoleGate minRank={navMinRank('audit-logs')}>
      <ScreenWrapper>
        <AppHeader title="Audit Logs" subtitle="System activity" showBack showMenu />
        <View style={[styles.content, { paddingHorizontal: layout.padding, maxWidth: layout.contentMaxWidth, alignSelf: layout.isTablet ? 'center' : 'stretch' }]}>
          <SearchBar value={searchText} onChangeText={setSearchText} placeholder="Search by user, action, or module…" />

          <FilterChips
            options={MODULE_OPTIONS}
            selected={moduleFilter}
            onSelect={setModuleFilter}
          />

          {actionFilter !== 'all' || moduleFilter !== 'all' ? (
            <FilterChips
              options={ACTION_OPTIONS}
              selected={actionFilter}
              onSelect={setActionFilter}
            />
          ) : null}

          <View style={styles.toolbar}>
            <ClearFiltersButton visible={hasActiveFilters} onClear={clearFilters} />
            <View style={{ flex: 1 }} />
            <ExportButton
              filename="audit_logs"
              columns={[
                { header: 'User', accessor: (r: AuditLog) => r.user_email ?? 'System' },
                { header: 'Action', accessor: (r: AuditLog) => r.action },
                { header: 'Module', accessor: (r: AuditLog) => r.module },
                { header: 'Entity ID', accessor: (r: AuditLog) => r.entity_id ?? '' },
                { header: 'Date/Time', accessor: (r: AuditLog) => formatDateTime(r.created_at) },
              ]}
              data={allItems}
              disabled={allItems.length === 0}
            />
          </View>

          {showLoading && (
            <View style={styles.centerState}>
              <ActivityIndicator size="large" color={colors.gold} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading audit logs…</Text>
            </View>
          )}

          {showError && (
            <View style={styles.centerState}>
              <ErrorState
                title="Failed to load audit logs"
                message="We couldn't load the audit log data."
                onRetry={() => auditQuery.refetch()}
              />
            </View>
          )}

          {!showLoading && !showError && (
            <FlatList
              data={allItems}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              removeClippedSubviews
              maxToRenderPerBatch={10}
              windowSize={10}
              contentContainerStyle={styles.list}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} colors={[colors.gold]} />}
              onEndReached={onLoadMore}
              onEndReachedThreshold={0.5}
              ListEmptyComponent={
                <View style={styles.centerState}>
                  <EmptyState
                    icon="history"
                    title="No Audit Logs Found"
                    message={hasActiveFilters ? 'No results match your filters. Try clearing them.' : 'No audit log entries have been recorded yet.'}
                  />
                </View>
              }
              ListFooterComponent={
                auditQuery.isFetchingNextPage ? (
                  <View style={styles.footerLoading}>
                    <ActivityIndicator size="small" color={colors.gold} />
                  </View>
                ) : null
              }
            />
          )}
        </View>

        {/* Detail Modal */}
        <Modal visible={detailLog !== null} transparent animationType="fade" onRequestClose={() => setDetailLog(null)}>
          <Pressable style={styles.overlay} onPress={() => setDetailLog(null)}>
            <View style={[styles.detailModal, { backgroundColor: colors.surface }]}>
              <View style={styles.detailHeader}>
                <Text style={[styles.detailTitle, { color: colors.textPrimary }]}>Audit Log Detail</Text>
                <TouchableOpacity onPress={() => setDetailLog(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <MaterialCommunityIcons name="close" size={24} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
              {detailLog && (
                <ScrollView style={styles.detailScroll} contentContainerStyle={styles.detailContent}>
                  <DetailRow label="User" value={detailLog.user_email ?? 'System'} colors={colors} />
                  <DetailRow label="Action" value={detailLog.action} colors={colors} />
                  <DetailRow label="Module" value={detailLog.module.replace(/_/g, ' ')} colors={colors} />
                  <DetailRow label="Entity Type" value={detailLog.entity_type ?? '—'} colors={colors} />
                  <DetailRow label="Entity ID" value={detailLog.entity_id ?? '—'} colors={colors} />
                  <DetailRow label="Date/Time" value={formatDateTime(detailLog.created_at)} colors={colors} />
                  {detailLog.ip_address && (
                    <DetailRow label="IP Address" value={detailLog.ip_address} colors={colors} />
                  )}
                  {detailLog.before_values && (
                    <View style={styles.jsonSection}>
                      <Text style={[styles.jsonLabel, { color: colors.textMuted }]}>BEFORE VALUES</Text>
                      <View style={[styles.jsonBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                        <Text style={[styles.jsonText, { color: colors.textSecondary }]}>
                          {JSON.stringify(detailLog.before_values, null, 2)}
                        </Text>
                      </View>
                    </View>
                  )}
                  {detailLog.after_values && (
                    <View style={styles.jsonSection}>
                      <Text style={[styles.jsonLabel, { color: colors.textMuted }]}>AFTER VALUES</Text>
                      <View style={[styles.jsonBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                        <Text style={[styles.jsonText, { color: colors.textSecondary }]}>
                          {JSON.stringify(detailLog.after_values, null, 2)}
                        </Text>
                      </View>
                    </View>
                  )}
                </ScrollView>
              )}
            </View>
          </Pressable>
        </Modal>
      </ScreenWrapper>
    </RoleGate>
  );
}

function DetailRow({ label, value, colors }: { label: string; value: string; colors: { textMuted: string; textPrimary: string } }) {
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1 },
  list: { gap: 10, paddingBottom: 24 },
  logCard: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 10 },
  logHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  moduleIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  logInfo: { flex: 1, gap: 2 },
  logUser: { fontSize: 14, fontWeight: '600' },
  logModule: { fontSize: 12, textTransform: 'capitalize' },
  logMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  logTime: { fontSize: 11 },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  centerState: { flex: 1, minHeight: 300, justifyContent: 'center' },
  loadingText: { fontSize: 14, marginTop: 12, textAlign: 'center' },
  footerLoading: { paddingVertical: 16, alignItems: 'center' },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 24 },
  detailModal: { borderRadius: 16, padding: 20, width: '100%', maxWidth: 380, maxHeight: '80%' },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  detailTitle: { fontSize: 18, fontWeight: '700' },
  detailScroll: { maxHeight: 400 },
  detailContent: { gap: 10 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailLabel: { fontSize: 14 },
  detailValue: { fontSize: 14, fontWeight: '500', maxWidth: 200, textAlign: 'right' },
  jsonSection: { gap: 6, marginTop: 8 },
  jsonLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  jsonBox: { padding: 12, borderRadius: 10, borderWidth: 1 },
  jsonText: { fontSize: 12, fontFamily: 'monospace', lineHeight: 18 },
});
