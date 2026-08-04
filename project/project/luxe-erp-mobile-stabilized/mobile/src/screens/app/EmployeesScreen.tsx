import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { ScreenWrapper } from '@components/ScreenWrapper';
import { AppHeader } from '@components/AppHeader';
import { SearchBar } from '@components/SearchBar';
import { ErrorState } from '@components/ErrorState';
import { EmptyState } from '@components/EmptyState';
import { SortControl, ClearFiltersButton, type SortOption } from '@components/SortControl';
import { RoleGate } from '@components/RoleGate';
import { useThemeStore } from '@store/themeStore';
import { useEmployees } from '@hooks/useERP';
import type { SortOrder } from '@services/erpService';
import { useResponsive, getCardWidth } from '@hooks/useResponsive';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getIconName } from '@config/icons';
import { navMinRank } from '@constants';
import type { EmployeeListItem } from '@apptypes/erp';

const DEBOUNCE_MS = 300;
const DEFAULT_SORT_BY = 'created_at';
const DEFAULT_SORT_ORDER: SortOrder = 'desc';

const SORT_OPTIONS: SortOption[] = [
  { label: 'Name', value: 'first_name' },
  { label: 'Position', value: 'position' },
  { label: 'Status', value: 'status' },
  { label: 'Newest', value: 'created_at' },
];

export default function EmployeesScreen() {
  const { colors } = useThemeStore();
  const router = useRouter();
  const layout = useResponsive();

  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState(DEFAULT_SORT_BY);
  const [sortOrder, setSortOrder] = useState<SortOrder>(DEFAULT_SORT_ORDER);
  const [refreshing, setRefreshing] = useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchText), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchText]);

  const employeesQuery = useEmployees(debouncedSearch, sortBy, sortOrder);

  const allItems: EmployeeListItem[] = employeesQuery.data
    ? employeesQuery.data.pages.flatMap((p) => p.items)
    : [];

  const cardWidth = getCardWidth(layout, layout.columns);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await employeesQuery.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [employeesQuery]);

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

  const renderItem = useCallback(
    ({ item }: { item: EmployeeListItem }) => {
      const fullName = `${item.first_name} ${item.last_name}`;
      const statusColor = getStatusColor(item.status);
      const initials = `${item.first_name.charAt(0)}${item.last_name.charAt(0)}`.toUpperCase();

      return (
        <TouchableOpacity
          style={[styles.empCard, { backgroundColor: colors.surface, borderColor: colors.border, width: cardWidth }]}
          activeOpacity={0.7}
          onPress={() => router.push({ pathname: '/(app)/employees/[id]', params: { id: item.id } } as never)}
        >
          <View style={styles.empCardHeader}>
            <View style={[styles.avatar, { backgroundColor: colors.surfaceElevated }]}>
              <Text style={[styles.avatarText, { color: colors.gold }]}>{initials}</Text>
            </View>
            <View style={styles.empInfo}>
              <Text style={[styles.empName, { color: colors.textPrimary }]} numberOfLines={1}>{fullName}</Text>
              {item.position && (
                <Text style={[styles.empPosition, { color: colors.textSecondary }]} numberOfLines={1}>{item.position}</Text>
              )}
              <Text style={[styles.empEmail, { color: colors.textMuted }]} numberOfLines={1}>{item.email}</Text>
            </View>
          </View>

          <View style={styles.empMetaRow}>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>{getStatusLabel(item.status)}</Text>
            </View>
            {item.branch_name && (
              <View style={[styles.branchChip, { backgroundColor: colors.surfaceElevated }]}>
                <MaterialCommunityIcons name={getIconName('store')} size={12} color={colors.textMuted} />
                <Text style={[styles.branchText, { color: colors.textSecondary }]} numberOfLines={1}>{item.branch_name}</Text>
              </View>
            )}
          </View>

          {item.role_names.length > 0 && (
            <View style={styles.roleRow}>
              {item.role_names.slice(0, 2).map((role, idx) => (
                <View key={idx} style={[styles.roleChip, { backgroundColor: colors.gold + '15', borderColor: colors.gold + '30' }]}>
                  <Text style={[styles.roleText, { color: colors.gold }]} numberOfLines={1}>{role}</Text>
                </View>
              ))}
              {item.role_names.length > 2 && (
                <Text style={[styles.roleMore, { color: colors.textMuted }]}>+{item.role_names.length - 2}</Text>
              )}
            </View>
          )}
        </TouchableOpacity>
      );
    },
    [cardWidth, colors, router],
  );

  const showLoading = employeesQuery.isLoading && !refreshing;
  const showError = employeesQuery.isError && !refreshing;

  return (
    <RoleGate minRank={navMinRank('employees')}>
      <ScreenWrapper>
        <AppHeader title="Employees" subtitle="Staff management" showBack showMenu />
        <View style={[styles.content, { paddingHorizontal: layout.padding, maxWidth: layout.contentMaxWidth, alignSelf: layout.isTablet ? 'center' : 'stretch' }]}>
          <SearchBar value={searchText} onChangeText={setSearchText} placeholder="Search by name, email, position…" />

          <SortControl
            options={SORT_OPTIONS}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onChange={(by, order) => { setSortBy(by); setSortOrder(order); }}
          />

          <ClearFiltersButton
            visible={debouncedSearch.trim() !== '' || sortBy !== DEFAULT_SORT_BY || sortOrder !== DEFAULT_SORT_ORDER}
            onClear={() => {
              setSearchText('');
              setDebouncedSearch('');
              setSortBy(DEFAULT_SORT_BY);
              setSortOrder(DEFAULT_SORT_ORDER);
            }}
          />

          {showLoading && (
            <View style={styles.centerState}>
              <ActivityIndicator size="large" color={colors.gold} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading employees…</Text>
            </View>
          )}

          {showError && (
            <View style={styles.centerState}>
              <ErrorState
                title="Failed to load employees"
                message="We couldn't load the employee list."
                onRetry={() => employeesQuery.refetch()}
              />
            </View>
          )}

          {!showLoading && !showError && (
            <FlatList
              data={allItems}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              numColumns={layout.columns}
              key={layout.columns}
              removeClippedSubviews
              maxToRenderPerBatch={10}
              windowSize={10}
              contentContainerStyle={styles.list}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} colors={[colors.gold]} />}
              onEndReached={() => {
                if (employeesQuery.hasNextPage && !employeesQuery.isFetchingNextPage) {
                  employeesQuery.fetchNextPage();
                }
              }}
              onEndReachedThreshold={0.3}
              ListFooterComponent={
                employeesQuery.isFetchingNextPage ? (
                  <View style={styles.footerLoading}>
                    <ActivityIndicator size="small" color={colors.gold} />
                  </View>
                ) : null
              }
              ListEmptyComponent={
                <View style={styles.centerState}>
                  <EmptyState
                    icon="employees"
                    title="No Employees Found"
                    message={debouncedSearch.trim() !== '' || sortBy !== DEFAULT_SORT_BY || sortOrder !== DEFAULT_SORT_ORDER ? 'No results match your filters. Try clearing them.' : 'No employees have been added yet.'}
                  />
                </View>
              }
            />
          )}
        </View>
      </ScreenWrapper>
    </RoleGate>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1 },
  list: { gap: 12, paddingBottom: 24 },
  empCard: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 10 },
  empCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '700' },
  empInfo: { flex: 1, gap: 2 },
  empName: { fontSize: 15, fontWeight: '600' },
  empPosition: { fontSize: 12 },
  empEmail: { fontSize: 11 },
  empMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '600' },
  branchChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  branchText: { fontSize: 11 },
  roleRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', alignItems: 'center' },
  roleChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  roleText: { fontSize: 10, fontWeight: '600' },
  roleMore: { fontSize: 11, fontWeight: '500' },
  centerState: { flex: 1, minHeight: 300, justifyContent: 'center' },
  loadingText: { fontSize: 14, marginTop: 12, textAlign: 'center' },
  footerLoading: { paddingVertical: 16, alignItems: 'center' },
});
