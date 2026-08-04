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
import { useThemeStore } from '@store/themeStore';
import { useInventory, useBranches, useWarehouses, useCategories } from '@hooks/useERP';
import type { SortOrder } from '@services/erpService';
import { useResponsive, getCardWidth } from '@hooks/useResponsive';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getIconName } from '@config/icons';
import { navMinRank } from '@constants';
import type { InventoryItemWithStatus } from '@apptypes/erp';
import type { ThemeColors } from '@apptypes';

const DEBOUNCE_MS = 300;
const DEFAULT_SORT_BY = 'updated_at';
const DEFAULT_SORT_ORDER: SortOrder = 'desc';

const SORT_OPTIONS: SortOption[] = [
  { label: 'Product', value: 'product_name' },
  { label: 'Stock', value: 'quantity_on_hand' },
  { label: 'Updated', value: 'updated_at' },
];

type FilterType = 'branch' | 'warehouse' | 'category';

export default function InventoryScreen() {
  const { colors } = useThemeStore();
  const layout = useResponsive();

  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState(DEFAULT_SORT_BY);
  const [sortOrder, setSortOrder] = useState<SortOrder>(DEFAULT_SORT_ORDER);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchText), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchText]);

  const inventoryQuery = useInventory({
    branchId: selectedBranch ?? undefined,
    warehouseId: selectedWarehouse ?? undefined,
    categoryId: selectedCategory ?? undefined,
    sortBy,
    sortOrder,
  });
  const branchesQuery = useBranches();
  const warehousesQuery = useWarehouses();
  const categoriesQuery = useCategories();

  const filteredItems = useMemo(() => {
    const all = inventoryQuery.data ?? [];
    if (!debouncedSearch.trim()) return all;
    const q = debouncedSearch.toLowerCase();
    return all.filter(
      (item: InventoryItemWithStatus) =>
        item.product_name.toLowerCase().includes(q) ||
        (item.sku ?? '').toLowerCase().includes(q),
    );
  }, [inventoryQuery.data, debouncedSearch]);

  const cardWidth = getCardWidth(layout, layout.columns);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        inventoryQuery.refetch(),
        branchesQuery.refetch(),
        warehousesQuery.refetch(),
        categoriesQuery.refetch(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [inventoryQuery, branchesQuery, warehousesQuery, categoriesQuery]);

  const getStockColor = (status: 'out' | 'low' | 'ok'): string => {
    if (status === 'out') return colors.error;
    if (status === 'low') return colors.warning;
    return colors.success;
  };

  const renderFilterChips = (
    items: { id: string; name: string }[],
    selected: string | null,
    onSelect: (id: string | null) => void,
    allLabel: string,
  ) => (
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      data={[{ id: 'all', name: allLabel }, ...items]}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => {
        const isActive = item.id === 'all' ? selected === null : selected === item.id;
        return (
          <TouchableOpacity
            style={[styles.chip, {
              backgroundColor: isActive ? colors.gold : colors.surface,
              borderColor: isActive ? colors.gold : colors.border,
            }]}
            onPress={() => onSelect(item.id === 'all' ? null : item.id)}
          >
            <Text style={[styles.chipText, { color: isActive ? colors.ink : colors.textSecondary }]} numberOfLines={1}>
              {item.name}
            </Text>
          </TouchableOpacity>
        );
      }}
      contentContainerStyle={styles.chipList}
    />
  );

  const renderItem = useCallback(
    ({ item }: { item: InventoryItemWithStatus }) => {
      const stockColor = getStockColor(item.stock_status);
      const statusLabel = item.stock_status === 'out' ? 'Out of Stock' : item.stock_status === 'low' ? 'Low Stock' : 'In Stock';

      return (
        <View style={[styles.invCard, { backgroundColor: colors.surface, borderColor: colors.border, width: cardWidth }]}>
          <View style={styles.invCardHeader}>
            <Text style={[styles.invProductName, { color: colors.textPrimary }]} numberOfLines={2}>{item.product_name}</Text>
            <View style={[styles.statusBadge, { backgroundColor: stockColor + '20' }]}>
              <Text style={[styles.statusText, { color: stockColor }]}>{statusLabel}</Text>
            </View>
          </View>

          {item.sku && (
            <Text style={[styles.invSku, { color: colors.textMuted }]} numberOfLines={1}>SKU: {item.sku}</Text>
          )}
          {item.category_name && (
            <Text style={[styles.invCategory, { color: colors.textSecondary }]} numberOfLines={1}>{item.category_name}</Text>
          )}

          <View style={[styles.stockGrid, { borderColor: colors.border }]}>
            <StockCell label="On Hand" value={item.quantity_on_hand} colors={colors} />
            <StockCell label="Reserved" value={item.quantity_reserved} colors={colors} />
            <StockCell label="Available" value={item.available_stock} colors={colors} highlight={stockColor} />
            <StockCell label="Min" value={item.min_stock} colors={colors} />
          </View>

          <View style={styles.invLocationRow}>
            {item.branch_name && (
              <View style={[styles.locationChip, { backgroundColor: colors.surfaceElevated }]}>
                <MaterialCommunityIcons name={getIconName('store')} size={12} color={colors.textMuted} />
                <Text style={[styles.locationText, { color: colors.textSecondary }]} numberOfLines={1}>{item.branch_name}</Text>
              </View>
            )}
            {item.warehouse_name && (
              <View style={[styles.locationChip, { backgroundColor: colors.surfaceElevated }]}>
                <MaterialCommunityIcons name={getIconName('warehouse')} size={12} color={colors.textMuted} />
                <Text style={[styles.locationText, { color: colors.textSecondary }]} numberOfLines={1}>{item.warehouse_name}</Text>
              </View>
            )}
          </View>
        </View>
      );
    },
    [cardWidth, colors],
  );

  const showLoading = inventoryQuery.isLoading && !refreshing;
  const showError = inventoryQuery.isError && !refreshing;

  return (
    <RoleGate minRank={navMinRank('inventory')}>
      <ScreenWrapper>
        <AppHeader title="Inventory" subtitle="Stock levels" showBack showMenu />
        <View style={[styles.content, { paddingHorizontal: layout.padding, maxWidth: layout.contentMaxWidth, alignSelf: layout.isTablet ? 'center' : 'stretch' }]}>
          {/* Search */}
          <SearchBar value={searchText} onChangeText={setSearchText} placeholder="Search by product or SKU…" />

          {/* Branch Filter */}
          {branchesQuery.data && branchesQuery.data.length > 0 && (
            renderFilterChips(branchesQuery.data, selectedBranch, setSelectedBranch, 'All Branches')
          )}

          {/* Warehouse Filter */}
          {warehousesQuery.data && warehousesQuery.data.length > 0 && (
            renderFilterChips(warehousesQuery.data, selectedWarehouse, setSelectedWarehouse, 'All Warehouses')
          )}

          {/* Category Filter */}
          {categoriesQuery.data && categoriesQuery.data.length > 0 && (
            renderFilterChips(categoriesQuery.data, selectedCategory, setSelectedCategory, 'All Categories')
          )}

          <SortControl
            options={SORT_OPTIONS}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onChange={(by, order) => { setSortBy(by); setSortOrder(order); }}
          />

          <ClearFiltersButton
            visible={debouncedSearch.trim() !== '' || selectedBranch !== null || selectedWarehouse !== null || selectedCategory !== null || sortBy !== DEFAULT_SORT_BY || sortOrder !== DEFAULT_SORT_ORDER}
            onClear={() => {
              setSearchText('');
              setDebouncedSearch('');
              setSelectedBranch(null);
              setSelectedWarehouse(null);
              setSelectedCategory(null);
              setSortBy(DEFAULT_SORT_BY);
              setSortOrder(DEFAULT_SORT_ORDER);
            }}
          />

          {showLoading && (
            <View style={styles.centerState}>
              <ActivityIndicator size="large" color={colors.gold} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading inventory…</Text>
            </View>
          )}

          {showError && (
            <View style={styles.centerState}>
              <ErrorState
                title="Failed to load inventory"
                message="We couldn't load the inventory data."
                onRetry={() => inventoryQuery.refetch()}
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
              removeClippedSubviews
              maxToRenderPerBatch={10}
              windowSize={10}
              contentContainerStyle={styles.list}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} colors={[colors.gold]} />}
              ListEmptyComponent={
                <View style={styles.centerState}>
                  <EmptyState
                    icon="inventory"
                    title="No Inventory Found"
                    message={debouncedSearch.trim() !== '' || selectedBranch !== null || selectedWarehouse !== null || selectedCategory !== null || sortBy !== DEFAULT_SORT_BY || sortOrder !== DEFAULT_SORT_ORDER ? 'No results match your filters. Try clearing them.' : 'No inventory records found for the selected filters.'}
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

function StockCell({ label, value, colors, highlight }: { label: string; value: number; colors: ThemeColors; highlight?: string }) {
  return (
    <View style={styles.stockCell}>
      <Text style={[styles.stockCellLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.stockCellValue, { color: highlight ?? colors.textPrimary }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1 },
  chipList: { gap: 8, paddingBottom: 4, marginBottom: 6 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: '500' },
  list: { gap: 12, paddingBottom: 24 },
  invCard: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 8 },
  invCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  invProductName: { flex: 1, fontSize: 14, fontWeight: '600', lineHeight: 18 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '600' },
  invSku: { fontSize: 11 },
  invCategory: { fontSize: 12 },
  stockGrid: { flexDirection: 'row', borderTopWidth: 1, paddingTop: 10, gap: 8 },
  stockCell: { flex: 1, alignItems: 'center', gap: 2 },
  stockCellLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  stockCellValue: { fontSize: 16, fontWeight: '700' },
  invLocationRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  locationChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  locationText: { fontSize: 11 },
  centerState: { flex: 1, minHeight: 300, justifyContent: 'center' },
  loadingText: { fontSize: 14, marginTop: 12, textAlign: 'center' },
});
