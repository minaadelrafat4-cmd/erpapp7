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
import { useThemeStore } from '@store/themeStore';
import { usePurchaseOrders } from '@hooks/useERP';
import { useResponsive, getCardWidth } from '@hooks/useResponsive';
import { useRouter } from 'expo-router';
import { formatDate } from '@lib/format';
import { navMinRank } from '@constants';
import type { PurchaseOrderListItem } from '@apptypes/erp';

const DEBOUNCE_MS = 300;
const STATUS_OPTIONS = ['all', 'draft', 'submitted', 'approved', 'ordered', 'partial', 'received', 'cancelled'];

export default function PurchaseOrdersScreen() {
  const { colors } = useThemeStore();
  const router = useRouter();
  const layout = useResponsive();

  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchText), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchText]);

  const ordersQuery = usePurchaseOrders(debouncedSearch, statusFilter);

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

  const renderItem = useCallback(({ item }: { item: PurchaseOrderListItem }) => (
    <TouchableOpacity
      style={[styles.orderCard, { backgroundColor: colors.surface, borderColor: colors.border, width: cardWidth }]}
      activeOpacity={0.7}
      onPress={() => router.push({ pathname: '/(app)/purchase-orders/[id]', params: { id: item.id } } as never)}
    >
      <View style={styles.cardTop}>
        <Text style={[styles.poNumber, { color: colors.gold }]} numberOfLines={1}>{item.po_number}</Text>
        <StatusBadge status={item.status} />
      </View>
      <Text style={[styles.supplierName, { color: colors.textPrimary }]} numberOfLines={1}>{item.supplier_name}</Text>
      {item.warehouse_name ? (
        <Text style={[styles.warehouseName, { color: colors.textMuted }]} numberOfLines={1}>{item.warehouse_name}</Text>
      ) : null}
      <View style={styles.cardBottom}>
        <Text style={[styles.totalText, { color: colors.textPrimary }]}>
          {item.currency === 'USD' ? '$' : ''}{item.grand_total.toFixed(2)}
        </Text>
        <Text style={[styles.dateText, { color: colors.textMuted }]}>
          {item.expected_at ? `Expected: ${formatDate(item.expected_at)}` : formatDate(item.created_at)}
        </Text>
      </View>
    </TouchableOpacity>
  ), [colors, cardWidth, router]);

  const showLoading = ordersQuery.isLoading && !refreshing;
  const showError = ordersQuery.isError && !refreshing;

  return (
    <RoleGate minRank={navMinRank('purchase-orders')}>
      <ScreenWrapper>
        <AppHeader title="Purchase Orders" subtitle="Procurement orders" showBack showMenu />
        <View style={[styles.content, { paddingHorizontal: layout.padding, maxWidth: layout.contentMaxWidth, alignSelf: layout.isTablet ? 'center' : 'stretch' }]}>
          <SearchBar value={searchText} onChangeText={setSearchText} placeholder="Search by PO number…" />

          <FilterChips
            options={STATUS_OPTIONS}
            selected={statusFilter}
            onSelect={setStatusFilter}
          />

          {showLoading && (
            <View style={styles.centerState}>
              <ActivityIndicator size="large" color={colors.gold} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading purchase orders…</Text>
            </View>
          )}

          {showError && (
            <View style={styles.centerState}>
              <ErrorState
                title="Failed to load purchase orders"
                message="We couldn't load the purchase order list."
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
                    icon="purchase-orders"
                    title="No Purchase Orders"
                    message={debouncedSearch || statusFilter !== 'all' ? 'No purchase orders match your filters.' : 'No purchase orders have been created yet.'}
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
  poNumber: { fontSize: 15, fontWeight: '700', fontFamily: 'monospace' },
  supplierName: { fontSize: 14, fontWeight: '600' },
  warehouseName: { fontSize: 12 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  totalText: { fontSize: 14, fontWeight: '700' },
  dateText: { fontSize: 12 },
  centerState: { flex: 1, minHeight: 300, justifyContent: 'center' },
  loadingText: { fontSize: 14, marginTop: 12, textAlign: 'center' },
  footerLoader: { paddingVertical: 16, alignItems: 'center' },
});
