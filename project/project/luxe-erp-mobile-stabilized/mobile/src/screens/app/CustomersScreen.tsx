import React, { useCallback, useMemo, useState } from 'react';
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
import { ExportButton } from '@components/ExportButton';
import { useThemeStore } from '@store/themeStore';
import { useCustomers } from '@hooks/useERP';
import type { SortOrder } from '@services/erpService';
import { useResponsive, getCardWidth } from '@hooks/useResponsive';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getIconName } from '@config/icons';
import { navMinRank } from '@constants';
import type { CustomerListItem } from '@apptypes/erp';

const DEBOUNCE_MS = 300;
const DEFAULT_SORT_BY = 'created_at';
const DEFAULT_SORT_ORDER: SortOrder = 'desc';

const SORT_OPTIONS: SortOption[] = [
  { label: 'Name', value: 'first_name' },
  { label: 'Orders', value: 'order_count' },
  { label: 'Spent', value: 'total_spent' },
  { label: 'Newest', value: 'created_at' },
];

export default function CustomersScreen() {
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

  const customersQuery = useCustomers(debouncedSearch, sortBy, sortOrder);

  const allCustomers = useMemo(() => {
    return customersQuery.data?.pages.flatMap((page) => page.items) ?? [];
  }, [customersQuery.data]);

  const cardWidth = getCardWidth(layout, layout.columns);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await customersQuery.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [customersQuery]);

  const onLoadMore = useCallback(() => {
    if (customersQuery.hasNextPage && !customersQuery.isFetchingNextPage) {
      customersQuery.fetchNextPage();
    }
  }, [customersQuery]);

  const renderItem = useCallback(
    ({ item }: { item: CustomerListItem }) => {
      const fullName = [item.first_name, item.last_name].filter(Boolean).join(' ').trim() || 'Unknown';
      const initials = (item.first_name ?? item.email ?? 'U').charAt(0).toUpperCase();

      return (
        <TouchableOpacity
          style={[styles.customerCard, { backgroundColor: colors.surface, borderColor: colors.border, width: cardWidth }]}
          activeOpacity={0.7}
          onPress={() => router.push({ pathname: '/(app)/customers/[id]', params: { id: item.id } } as never)}
        >
          <View style={[styles.customerAvatar, { backgroundColor: colors.gold }]}>
            <Text style={styles.customerAvatarText}>{initials}</Text>
          </View>
          <View style={styles.customerInfo}>
            <Text style={[styles.customerName, { color: colors.textPrimary }]} numberOfLines={1}>{fullName}</Text>
            {item.email ? (
              <Text style={[styles.customerEmail, { color: colors.textMuted }]} numberOfLines={1}>{item.email}</Text>
            ) : null}
            <View style={styles.customerStats}>
              <View style={[styles.statBadge, { backgroundColor: colors.gold + '20' }]}>
                <Text style={[styles.statText, { color: colors.gold }]}>{item.loyalty_points} pts</Text>
              </View>
              <View style={[styles.statBadge, { backgroundColor: colors.accent + '20' }]}>
                <Text style={[styles.statText, { color: colors.accent }]}>{item.order_count} orders</Text>
              </View>
            </View>
          </View>
          <MaterialCommunityIcons name={getIconName('chevron-right')} size={20} color={colors.textMuted} />
        </TouchableOpacity>
      );
    },
    [cardWidth, colors, router],
  );

  const showLoading = customersQuery.isLoading && !refreshing;
  const showError = customersQuery.isError && !refreshing;

  return (
    <RoleGate minRank={navMinRank('customers')}>
      <ScreenWrapper>
        <AppHeader title="Customers" subtitle="Customer accounts" showBack showMenu />
        <View style={[styles.content, { paddingHorizontal: layout.padding, maxWidth: layout.contentMaxWidth, alignSelf: layout.isTablet ? 'center' : 'stretch' }]}>
          <SearchBar value={searchText} onChangeText={setSearchText} placeholder="Search by name or email…" />

          <SortControl
            options={SORT_OPTIONS}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onChange={(by, order) => { setSortBy(by); setSortOrder(order); }}
          />

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <ClearFiltersButton
              visible={debouncedSearch.trim() !== '' || sortBy !== DEFAULT_SORT_BY || sortOrder !== DEFAULT_SORT_ORDER}
              onClear={() => {
                setSearchText('');
                setDebouncedSearch('');
                setSortBy(DEFAULT_SORT_BY);
                setSortOrder(DEFAULT_SORT_ORDER);
              }}
            />
            <View style={{ flex: 1 }} />
            <ExportButton
              filename="customers"
              columns={[
                { header: 'First Name', accessor: (r: CustomerListItem) => r.first_name ?? '' },
                { header: 'Last Name', accessor: (r: CustomerListItem) => r.last_name ?? '' },
                { header: 'Email', accessor: (r: CustomerListItem) => r.email ?? '' },
                { header: 'Orders', accessor: (r: CustomerListItem) => r.order_count ?? 0 },
                { header: 'Total Spent', accessor: (r: CustomerListItem) => r.total_spent ?? 0 },
                { header: 'Loyalty Points', accessor: (r: CustomerListItem) => r.loyalty_points ?? 0 },
              ]}
              data={allCustomers}
              disabled={allCustomers.length === 0}
            />
          </View>

          {showLoading && (
            <View style={styles.centerState}>
              <ActivityIndicator size="large" color={colors.gold} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading customers…</Text>
            </View>
          )}

          {showError && (
            <View style={styles.centerState}>
              <ErrorState
                title="Failed to load customers"
                message="We couldn't load the customer list."
                onRetry={() => customersQuery.refetch()}
              />
            </View>
          )}

          {!showLoading && !showError && (
            <FlatList
              data={allCustomers}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              numColumns={layout.columns}
              key={layout.columns}
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
                    icon="customers"
                    title="No Customers Found"
                    message={debouncedSearch.trim() !== '' || sortBy !== DEFAULT_SORT_BY || sortOrder !== DEFAULT_SORT_ORDER ? 'No results match your filters. Try clearing them.' : 'No customers have registered yet.'}
                  />
                </View>
              }
              ListFooterComponent={
                customersQuery.isFetchingNextPage ? (
                  <View style={styles.footerLoader}>
                    <ActivityIndicator size="small" color={colors.gold} />
                  </View>
                ) : null
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
  customerCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  customerAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  customerAvatarText: { fontSize: 20, fontWeight: '800', color: '#0c0f13' },
  customerInfo: { flex: 1, gap: 3 },
  customerName: { fontSize: 15, fontWeight: '600', lineHeight: 19 },
  customerEmail: { fontSize: 12 },
  customerStats: { flexDirection: 'row', gap: 6, marginTop: 2 },
  statBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statText: { fontSize: 11, fontWeight: '600' },
  centerState: { flex: 1, minHeight: 300, justifyContent: 'center' },
  loadingText: { fontSize: 14, marginTop: 12, textAlign: 'center' },
  footerLoader: { paddingVertical: 16, alignItems: 'center' },
});
