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
import { ProgressBar } from '@components/ProgressBar';
import { useThemeStore } from '@store/themeStore';
import { useReceivingList } from '@hooks/useERP';
import { useResponsive, getCardWidth } from '@hooks/useResponsive';
import { useRouter } from 'expo-router';
import { formatDate } from '@lib/format';
import { navMinRank } from '@constants';
import type { ReceivingListItem, ReceivingStatus } from '@apptypes/erp';

const DEBOUNCE_MS = 300;
const STATUS_OPTIONS = ['all', 'pending', 'partial', 'received'];

export default function ReceivingScreen() {
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

  const receivingQuery = useReceivingList(debouncedSearch, statusFilter);

  const allItems = useMemo(() => {
    return receivingQuery.data?.pages.flatMap((page) => page.items) ?? [];
  }, [receivingQuery.data]);

  const cardWidth = getCardWidth(layout, layout.columns);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await receivingQuery.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [receivingQuery]);

  const onLoadMore = useCallback(() => {
    if (receivingQuery.hasNextPage && !receivingQuery.isFetchingNextPage) {
      receivingQuery.fetchNextPage();
    }
  }, [receivingQuery]);

  const filteredItems = useMemo(() => {
    if (statusFilter === 'all') return allItems;
    return allItems.filter((item) => item.receiving_status === statusFilter);
  }, [allItems, statusFilter]);

  const renderItem = useCallback(({ item }: { item: ReceivingListItem }) => {
    const progress = item.total_quantity > 0 ? item.received_quantity / item.total_quantity : 0;
    return (
      <TouchableOpacity
        style={[styles.receivingCard, { backgroundColor: colors.surface, borderColor: colors.border, width: cardWidth }]}
        activeOpacity={0.7}
        onPress={() => router.push({ pathname: '/(app)/receiving/[id]', params: { id: item.id } } as never)}
      >
        <View style={styles.cardTop}>
          <Text style={[styles.poNumber, { color: colors.gold }]} numberOfLines={1}>{item.po_number}</Text>
          <StatusBadge status={item.receiving_status} />
        </View>
        <Text style={[styles.supplierName, { color: colors.textPrimary }]} numberOfLines={1}>{item.supplier_name}</Text>
        {item.warehouse_name ? (
          <Text style={[styles.warehouseName, { color: colors.textMuted }]} numberOfLines={1}>{item.warehouse_name}</Text>
        ) : null}
        <View style={styles.progressContainer}>
          <ProgressBar progress={progress} height={6} />
          <Text style={[styles.progressText, { color: colors.textMuted }]}>
            {item.received_quantity}/{item.total_quantity} units
          </Text>
        </View>
        <View style={styles.cardBottom}>
          <Text style={[styles.metaText, { color: colors.textMuted }]}>
            {item.received_items}/{item.total_items} items
          </Text>
          <Text style={[styles.dateText, { color: colors.textMuted }]}>
            {item.expected_at ? `Expected: ${formatDate(item.expected_at)}` : formatDate(item.created_at)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }, [colors, cardWidth, router]);

  const showLoading = receivingQuery.isLoading && !refreshing;
  const showError = receivingQuery.isError && !refreshing;

  return (
    <RoleGate minRank={navMinRank('purchase-orders')}>
      <ScreenWrapper>
        <AppHeader title="Receiving" subtitle="Purchase order receiving" showBack showMenu />
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
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading receiving list…</Text>
            </View>
          )}

          {showError && (
            <View style={styles.centerState}>
              <ErrorState
                title="Failed to load receiving list"
                message="We couldn't load the purchase order receiving data."
                onRetry={() => receivingQuery.refetch()}
              />
            </View>
          )}

          {!showLoading && !showError && (
            <FlatList
              data={filteredItems}
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
                    icon="receiving"
                    title="No Receiving Records"
                    message={debouncedSearch || statusFilter !== 'all' ? 'No purchase orders match your filters.' : 'No purchase orders are pending receiving.'}
                  />
                </View>
              }
              ListFooterComponent={
                receivingQuery.isFetchingNextPage ? (
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
  receivingCard: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 6 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  poNumber: { fontSize: 15, fontWeight: '700', fontFamily: 'monospace' },
  supplierName: { fontSize: 14, fontWeight: '600' },
  warehouseName: { fontSize: 12 },
  progressContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  progressText: { fontSize: 11 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaText: { fontSize: 12 },
  dateText: { fontSize: 12 },
  centerState: { flex: 1, minHeight: 300, justifyContent: 'center' },
  loadingText: { fontSize: 14, marginTop: 12, textAlign: 'center' },
  footerLoader: { paddingVertical: 16, alignItems: 'center' },
});
