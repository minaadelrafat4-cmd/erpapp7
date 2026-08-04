import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { ScreenWrapper } from '@components/ScreenWrapper';
import { AppHeader } from '@components/AppHeader';
import { ErrorState } from '@components/ErrorState';
import { EmptyState } from '@components/EmptyState';
import { RoleGate } from '@components/RoleGate';
import { useThemeStore } from '@store/themeStore';
import { useStockTransfers } from '@hooks/useERP';
import { useResponsive, getCardWidth } from '@hooks/useResponsive';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getIconName } from '@config/icons';
import { navMinRank } from '@constants';
import type { StockTransferListItem } from '@apptypes/erp';
import type { ThemeColors } from '@apptypes';

const DEBOUNCE_MS = 300;
const STATUS_OPTIONS = ['all', 'draft', 'submitted', 'in_transit', 'received', 'cancelled'];

function StatusBadge({ status, colors }: { status: string; colors: ThemeColors }) {
  const colorMap: Record<string, string> = {
    draft: colors.textMuted,
    submitted: colors.accent,
    in_transit: colors.gold,
    received: colors.success,
    cancelled: colors.error,
  };
  const color = colorMap[status] ?? colors.textSecondary;
  return (
    <View style={[styles.statusBadge, { backgroundColor: color + '20' }]}>
      <Text style={[styles.statusText, { color }]}>{status.replace('_', ' ')}</Text>
    </View>
  );
}

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

  const renderItem = ({ item }: { item: StockTransferListItem }) => (
    <TouchableOpacity
      style={[styles.transferCard, { backgroundColor: colors.surface, borderColor: colors.border, width: cardWidth }]}
      activeOpacity={0.7}
      onPress={() => router.push({ pathname: '/(app)/stock-transfers/[id]', params: { id: item.id } } as never)}
    >
      <View style={styles.cardTop}>
        <Text style={[styles.transferNumber, { color: colors.gold }]} numberOfLines={1}>{item.transfer_number}</Text>
        <StatusBadge status={item.status} colors={colors} />
      </View>
      <View style={styles.routeRow}>
        <View style={styles.routePoint}>
          <MaterialCommunityIcons
            name={item.source_type === 'branch' ? getIconName('store') : getIconName('warehouse')}
            size={14}
            color={colors.textMuted}
          />
          <Text style={[styles.routeText, { color: colors.textSecondary }]} numberOfLines={1}>{item.source_name}</Text>
        </View>
        <MaterialCommunityIcons name="arrow-right" size={14} color={colors.textMuted} />
        <View style={styles.routePoint}>
          <MaterialCommunityIcons
            name={item.destination_type === 'branch' ? getIconName('store') : getIconName('warehouse')}
            size={14}
            color={colors.textMuted}
          />
          <Text style={[styles.routeText, { color: colors.textSecondary }]} numberOfLines={1}>{item.destination_name}</Text>
        </View>
      </View>
      <View style={styles.cardBottom}>
        <Text style={[styles.metaText, { color: colors.textMuted }]}>
          {item.total_items} {item.total_items === 1 ? 'item' : 'items'} · {item.total_quantity} units
        </Text>
        <Text style={[styles.dateText, { color: colors.textMuted }]}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const showLoading = transfersQuery.isLoading && !refreshing;
  const showError = transfersQuery.isError && !refreshing;

  return (
    <RoleGate minRank={navMinRank('inventory')}>
      <ScreenWrapper>
        <AppHeader title="Stock Transfers" subtitle="Inter-location transfers" showBack showMenu />
        <View style={[styles.content, { paddingHorizontal: layout.padding, maxWidth: layout.contentMaxWidth, alignSelf: layout.isTablet ? 'center' : 'stretch' }]}>
          <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MaterialCommunityIcons name="magnify" size={20} color={colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Search by transfer number…"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText('')}>
                <MaterialCommunityIcons name="close" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
            {STATUS_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: statusFilter === opt ? colors.gold : colors.surface,
                    borderColor: statusFilter === opt ? colors.gold : colors.border,
                  },
                ]}
                onPress={() => setStatusFilter(opt)}
              >
                <Text style={[styles.filterText, { color: statusFilter === opt ? '#0c0f13' : colors.textSecondary }]}>
                  {opt === 'all' ? 'All' : opt.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 2 },
  filterScroll: { marginBottom: 12, maxHeight: 40 },
  filterContent: { gap: 8, paddingHorizontal: 2 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  filterText: { fontSize: 13, fontWeight: '600' },
  list: { gap: 12, paddingBottom: 24 },
  transferCard: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 8 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  transferNumber: { fontSize: 15, fontWeight: '700', fontFamily: 'monospace' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  routePoint: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  routeText: { fontSize: 12, flex: 1 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaText: { fontSize: 12 },
  dateText: { fontSize: 12 },
  centerState: { flex: 1, minHeight: 300, justifyContent: 'center' },
  loadingText: { fontSize: 14, marginTop: 12, textAlign: 'center' },
  footerLoader: { paddingVertical: 16, alignItems: 'center' },
});
