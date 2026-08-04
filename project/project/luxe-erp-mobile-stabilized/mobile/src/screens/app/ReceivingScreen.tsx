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
import { useReceivingList } from '@hooks/useERP';
import { useResponsive, getCardWidth } from '@hooks/useResponsive';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getIconName } from '@config/icons';
import { navMinRank } from '@constants';
import type { ReceivingListItem, ReceivingStatus } from '@apptypes/erp';
import type { ThemeColors } from '@apptypes';

const DEBOUNCE_MS = 300;
const STATUS_OPTIONS = ['all', 'pending', 'partial', 'received'];

function ReceivingStatusBadge({ status, colors }: { status: ReceivingStatus; colors: ThemeColors }) {
  const colorMap: Record<string, string> = {
    pending: colors.textMuted,
    partial: colors.warning,
    received: colors.success,
    cancelled: colors.error,
  };
  const color = colorMap[status] ?? colors.textSecondary;
  return (
    <View style={[styles.statusBadge, { backgroundColor: color + '20' }]}>
      <Text style={[styles.statusText, { color }]}>{status}</Text>
    </View>
  );
}

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

  const renderItem = ({ item }: { item: ReceivingListItem }) => {
    const progress = item.total_quantity > 0 ? item.received_quantity / item.total_quantity : 0;
    return (
      <TouchableOpacity
        style={[styles.receivingCard, { backgroundColor: colors.surface, borderColor: colors.border, width: cardWidth }]}
        activeOpacity={0.7}
        onPress={() => router.push({ pathname: '/(app)/receiving/[id]', params: { id: item.id } } as never)}
      >
        <View style={styles.cardTop}>
          <Text style={[styles.poNumber, { color: colors.gold }]} numberOfLines={1}>{item.po_number}</Text>
          <ReceivingStatusBadge status={item.receiving_status} colors={colors} />
        </View>
        <Text style={[styles.supplierName, { color: colors.textPrimary }]} numberOfLines={1}>{item.supplier_name}</Text>
        {item.warehouse_name ? (
          <View style={styles.warehouseRow}>
            <MaterialCommunityIcons name={getIconName('warehouse')} size={12} color={colors.textMuted} />
            <Text style={[styles.warehouseName, { color: colors.textMuted }]} numberOfLines={1}>{item.warehouse_name}</Text>
          </View>
        ) : null}
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { backgroundColor: colors.surfaceElevated }]}>
            <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: progress >= 1 ? colors.success : colors.gold }]} />
          </View>
          <Text style={[styles.progressText, { color: colors.textMuted }]}>
            {item.received_quantity}/{item.total_quantity} units
          </Text>
        </View>
        <View style={styles.cardBottom}>
          <Text style={[styles.metaText, { color: colors.textMuted }]}>
            {item.received_items}/{item.total_items} items
          </Text>
          {item.expected_at ? (
            <Text style={[styles.dateText, { color: colors.textMuted }]}>
              Expected: {new Date(item.expected_at).toLocaleDateString()}
            </Text>
          ) : (
            <Text style={[styles.dateText, { color: colors.textMuted }]}>
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const showLoading = receivingQuery.isLoading && !refreshing;
  const showError = receivingQuery.isError && !refreshing;

  return (
    <RoleGate minRank={navMinRank('purchase-orders')}>
      <ScreenWrapper>
        <AppHeader title="Receiving" subtitle="Purchase order receiving" showBack showMenu />
        <View style={[styles.content, { paddingHorizontal: layout.padding, maxWidth: layout.contentMaxWidth, alignSelf: layout.isTablet ? 'center' : 'stretch' }]}>
          <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MaterialCommunityIcons name="magnify" size={20} color={colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Search by PO number…"
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
                  {opt === 'all' ? 'All' : opt.charAt(0).toUpperCase() + opt.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

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
  filterText: { fontSize: 13, fontWeight: '600', textTransform: 'capitalize' },
  list: { gap: 12, paddingBottom: 24 },
  receivingCard: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 6 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  poNumber: { fontSize: 15, fontWeight: '700', fontFamily: 'monospace' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  supplierName: { fontSize: 14, fontWeight: '600' },
  warehouseRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  warehouseName: { fontSize: 12 },
  progressContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  progressBar: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressText: { fontSize: 11 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaText: { fontSize: 12 },
  dateText: { fontSize: 12 },
  centerState: { flex: 1, minHeight: 300, justifyContent: 'center' },
  loadingText: { fontSize: 14, marginTop: 12, textAlign: 'center' },
  footerLoader: { paddingVertical: 16, alignItems: 'center' },
});
