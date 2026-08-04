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
import { ErrorState } from '@components/ErrorState';
import { EmptyState } from '@components/EmptyState';
import { RoleGate } from '@components/RoleGate';
import { SearchBar } from '@components/SearchBar';
import { FilterChips } from '@components/FilterChips';
import { StatusBadge } from '@components/StatusBadge';
import { SortControl, ClearFiltersButton, type SortOption } from '@components/SortControl';
import { useThemeStore } from '@store/themeStore';
import { useSalesOrders } from '@hooks/useERP';
import type { SortOrder } from '@services/erpService';
import { useResponsive, getCardWidth } from '@hooks/useResponsive';
import { useRouter } from 'expo-router';
import { formatDate } from '@lib/format';
import { navMinRank } from '@constants';
import type { SalesOrderListItem } from '@apptypes/erp';

const DEBOUNCE_MS = 300;
const STATUS_OPTIONS = ['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
const DEFAULT_SORT_BY = 'placed_at';
const DEFAULT_SORT_ORDER: SortOrder = 'desc';

const SORT_OPTIONS: SortOption[] = [
  { label: 'Order #', value: 'order_number' },
  { label: 'Status', value: 'status' },
  { label: 'Total', value: 'grand_total' },
  { label: 'Date', value: 'placed_at' },
];

export default function SalesOrdersScreen() {
  const { colors } = useThemeStore();
  const router = useRouter();
  const layout = useResponsive();

  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState(DEFAULT_SORT_BY);
  const [sortOrder, setSortOrder] = useState<SortOrder>(DEFAULT_SORT_ORDER);
  const [refreshing, setRefreshing] = useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchText), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchText]);

  const ordersQuery = useSalesOrders(debouncedSearch, statusFilter, sortBy, sortOrder);

  const allOrders = useMemo(() => {
    return ordersQuery.data?.pages.flatMap((page) => page.items) ?? [];
  }, [ordersQuery.data]);

  const cardWidth = getCardWidth(layout, layout.columns);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await ordersQuery.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [ordersQuery]);

  const onLoadMore = useCallback(() => {
    if (ordersQuery.hasNextPage && !ordersQuery.isFetchingNextPage) {
      ordersQuery.fetchNextPage();
    }
  }, [ordersQuery]);

  const renderItem = useCallback(({ item }: { item: SalesOrderListItem }) => (
    <TouchableOpacity
      style={[styles.orderCard, { backgroundColor: colors.surface, borderColor: colors.border, width: cardWidth }]}
      activeOpacity={0.7}
      onPress={() => router.push({ pathname: '/(app)/sales-orders/[id]', params: { id: item.id } } as never)}
    >
      <View style={styles.cardTop}>
        <Text style={[styles.orderNumber, { color: colors.gold }]} numberOfLines={1}>{item.order_number}</Text>
        <StatusBadge status={item.status} />
      </View>
      <Text style={[styles.customerName, { color: colors.textPrimary }]} numberOfLines={1}>{item.customer_name}</Text>
      <View style={styles.cardBottom}>
        <Text style={[styles.totalText, { color: colors.textPrimary }]}>
          {item.currency === 'USD' ? '$' : ''}{item.grand_total.toFixed(2)}
        </Text>
        <Text style={[styles.dateText, { color: colors.textMuted }]}>
          {formatDate(item.placed_at)}
        </Text>
      </View>
      <View style={styles.badgeRow}>
        <View style={[styles.miniBadge, { backgroundColor: colors.accent + '20' }]}>
          <Text style={[styles.miniBadgeText, { color: colors.accent }]}>{item.payment_status}</Text>
        </View>
        <View style={[styles.miniBadge, { backgroundColor: colors.gold + '20' }]}>
          <Text style={[styles.miniBadgeText, { color: colors.gold }]}>{item.fulfillment_status}</Text>
        </View>
      </View>
    </TouchableOpacity>
  ), [colors, cardWidth, router]);

  const showLoading = ordersQuery.isLoading && !refreshing;
  const showError = ordersQuery.isError && !refreshing;

  return (
    <RoleGate minRank={navMinRank('sales-orders')}>
      <ScreenWrapper>
        <AppHeader title="Sales Orders" subtitle="Customer orders" showBack showMenu />
        <View style={[styles.content, { paddingHorizontal: layout.padding, maxWidth: layout.contentMaxWidth, alignSelf: layout.isTablet ? 'center' : 'stretch' }]}>
          <SearchBar value={searchText} onChangeText={setSearchText} placeholder="Search by order number…" />

          <FilterChips
            options={STATUS_OPTIONS}
            selected={statusFilter}
            onSelect={setStatusFilter}
          />

          <SortControl
            options={SORT_OPTIONS}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onChange={(by, order) => { setSortBy(by); setSortOrder(order); }}
          />

          <ClearFiltersButton
            visible={debouncedSearch.trim() !== '' || statusFilter !== 'all' || sortBy !== DEFAULT_SORT_BY || sortOrder !== DEFAULT_SORT_ORDER}
            onClear={() => {
              setSearchText('');
              setDebouncedSearch('');
              setStatusFilter('all');
              setSortBy(DEFAULT_SORT_BY);
              setSortOrder(DEFAULT_SORT_ORDER);
            }}
          />

          {showLoading && (
            <View style={styles.centerState}>
              <ActivityIndicator size="large" color={colors.gold} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading sales orders…</Text>
            </View>
          )}

          {showError && (
            <View style={styles.centerState}>
              <ErrorState
                title="Failed to load sales orders"
                message="We couldn't load the sales order list."
                onRetry={() => ordersQuery.refetch()}
              />
            </View>
          )}

          {!showLoading && !showError && (
            <FlatList
              data={allOrders}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              numColumns={layout.columns}
              key={layout.columns}
              contentContainerStyle={styles.list}
              removeClippedSubviews
              maxToRenderPerBatch={10}
              windowSize={10}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} colors={[colors.gold]} />}
              onEndReached={onLoadMore}
              onEndReachedThreshold={0.5}
              ListEmptyComponent={
                <View style={styles.centerState}>
                  <EmptyState
                    icon="sales-orders"
                    title="No Sales Orders"
                    message={debouncedSearch.trim() !== '' || statusFilter !== 'all' || sortBy !== DEFAULT_SORT_BY || sortOrder !== DEFAULT_SORT_ORDER ? 'No results match your filters. Try clearing them.' : 'No sales orders have been placed yet.'}
                  />
                </View>
              }
              ListFooterComponent={
                ordersQuery.isFetchingNextPage ? (
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
  orderCard: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 6 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderNumber: { fontSize: 15, fontWeight: '700', fontFamily: 'monospace' },
  customerName: { fontSize: 14, fontWeight: '600' },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalText: { fontSize: 14, fontWeight: '700' },
  dateText: { fontSize: 12 },
  badgeRow: { flexDirection: 'row', gap: 6, marginTop: 2 },
  miniBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  miniBadgeText: { fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },
  centerState: { flex: 1, minHeight: 300, justifyContent: 'center' },
  loadingText: { fontSize: 14, marginTop: 12, textAlign: 'center' },
  footerLoader: { paddingVertical: 16, alignItems: 'center' },
});
