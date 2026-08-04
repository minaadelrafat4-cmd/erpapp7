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
import { useStockTransfers } from '@hooks/useERP';
import { useResponsive, getCardWidth } from '@hooks/useResponsive';
import { useRouter } from 'expo-router';
import { formatDate } from '@lib/format';
import { navMinRank } from '@constants';
import type { StockTransferListItem } from '@apptypes/erp';

const DEBOUNCE_MS = 300;
const STATUS_OPTIONS = ['all', 'draft', 'submitted', 'in_transit', 'received', 'cancelled'];

export default function StockTransfersScreen() {
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

  const transfersQuery = useStockTransfers(debouncedSearch, statusFilter);

  const allTransfers = useMemo(() => {
    return transfersQuery.data?.pages.flatMap((page) => page.items) ?? [];
  }, [transfersQuery.data]);

  const cardWidth = getCardWidth(layout, layout.columns);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await transfersQuery.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [transfersQuery]);

  const onLoadMore = useCallback(() => {
    if (transfersQuery.hasNextPage && !transfersQuery.isFetchingNextPage) {
      transfersQuery.fetchNextPage();
    }
  }, [transfersQuery]);

  const renderItem = useCallback(({ item }: { item: StockTransferListItem }) => (
    <TouchableOpacity
      style={[styles.transferCard, { backgroundColor: colors.surface, borderColor: colors.border, width: cardWidth }]}
      activeOpacity={0.7}
      onPress={() => router.push({ pathname: '/(app)/stock-transfers/[id]', params: { id: item.id } } as never)}
    >
      <View style={styles.cardTop}>
        <Text style={[styles.transferNumber, { color: colors.gold }]} numberOfLines={1}>{item.transfer_number}</Text>
        <StatusBadge status={item.status} />
      </View>
      <View style={styles.routeRow}>
        <Text style={[styles.routeText, { color: colors.textSecondary }]} numberOfLines={1}>{item.source_name}</Text>
        <Text style={[styles.routeArrow, { color: colors.textMuted }]}> → </Text>
        <Text style={[styles.routeText, { color: colors.textSecondary }]} numberOfLines={1}>{item.destination_name}</Text>
      </View>
      <View style={styles.cardBottom}>
        <Text style={[styles.metaText, { color: colors.textMuted }]}>
          {item.total_items} {item.total_items === 1 ? 'item' : 'items'} · {item.total_quantity} units
        </Text>
        <Text style={[styles.dateText, { color: colors.textMuted }]}>
          {formatDate(item.created_at)}
        </Text>
      </View>
    </TouchableOpacity>
  ), [colors, cardWidth, router]);

  const showLoading = transfersQuery.isLoading && !refreshing;
  const showError = transfersQuery.isError && !refreshing;

  return (
    <RoleGate minRank={navMinRank('inventory')}>
      <ScreenWrapper>
        <AppHeader title="Stock Transfers" subtitle="Inter-location transfers" showBack showMenu />
        <View style={[styles.content, { paddingHorizontal: layout.padding, maxWidth: layout.contentMaxWidth, alignSelf: layout.isTablet ? 'center' : 'stretch' }]}>
          <SearchBar value={searchText} onChangeText={setSearchText} placeholder="Search by transfer number…" />

          <FilterChips
            options={STATUS_OPTIONS}
            selected={statusFilter}
            onSelect={setStatusFilter}
          />

          {showLoading && (
            <View style={styles.centerState}>
              <ActivityIndicator size="large" color={colors.gold} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading transfers…</Text>
            </View>
          )}

          {showError && (
            <View style={styles.centerState}>
              <ErrorState
                title="Failed to load transfers"
                message="We couldn't load the stock transfer list."
                onRetry={() => transfersQuery.refetch()}
              />
            </View>
          )}

          {!showLoading && !showError && (
            <FlatList
              data={allTransfers}
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
                    icon="box"
                    title="No Transfers Found"
                    message={debouncedSearch || statusFilter !== 'all' ? 'No stock transfers match your filters.' : 'No stock transfers have been created yet.'}
                  />
                </View>
              }
              ListFooterComponent={
                transfersQuery.isFetchingNextPage ? (
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
  transferCard: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 8 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  transferNumber: { fontSize: 15, fontWeight: '700', fontFamily: 'monospace' },
  routeRow: { flexDirection: 'row', alignItems: 'center' },
  routeText: { fontSize: 12, flex: 1 },
  routeArrow: { fontSize: 12 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaText: { fontSize: 12 },
  dateText: { fontSize: 12 },
  centerState: { flex: 1, minHeight: 300, justifyContent: 'center' },
  loadingText: { fontSize: 14, marginTop: 12, textAlign: 'center' },
  footerLoader: { paddingVertical: 16, alignItems: 'center' },
});
