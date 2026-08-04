import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { ScreenWrapper } from '@components/ScreenWrapper';
import { AppHeader } from '@components/AppHeader';
import { Card } from '@components/Card';
import { SearchBar } from '@components/SearchBar';
import { ErrorState } from '@components/ErrorState';
import { EmptyState } from '@components/EmptyState';
import { SortControl, ClearFiltersButton, type SortOption } from '@components/SortControl';
import { ExportButton } from '@components/ExportButton';
import { useThemeStore } from '@store/themeStore';
import { useProducts, useCategories } from '@hooks/useERP';
import type { SortOrder } from '@services/erpService';
import { useResponsive, getCardWidth } from '@hooks/useResponsive';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getIconName } from '@config/icons';
import type { ProductListItem } from '@hooks/useERP';

const DEBOUNCE_MS = 300;
const DEFAULT_SORT_BY = 'created_at';
const DEFAULT_SORT_ORDER: SortOrder = 'desc';

const SORT_OPTIONS: SortOption[] = [
  { label: 'Name', value: 'name' },
  { label: 'Price', value: 'price' },
  { label: 'Stock', value: 'stock' },
  { label: 'Newest', value: 'created_at' },
];

export default function ProductsScreen() {
  const { colors } = useThemeStore();
  const router = useRouter();
  const layout = useResponsive();

  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState(DEFAULT_SORT_BY);
  const [sortOrder, setSortOrder] = useState<SortOrder>(DEFAULT_SORT_ORDER);
  const [refreshing, setRefreshing] = useState(false);

  // Debounce search input
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchText), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchText]);

  const productsQuery = useProducts(debouncedSearch, selectedCategory, sortBy, sortOrder);
  const categoriesQuery = useCategories();

  const allProducts = useMemo(() => {
    return productsQuery.data?.pages.flatMap((page) => page.items) ?? [];
  }, [productsQuery.data]);

  const cardWidth = getCardWidth(layout, layout.columns);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await productsQuery.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [productsQuery]);

  const onLoadMore = useCallback(() => {
    if (productsQuery.hasNextPage && !productsQuery.isFetchingNextPage) {
      productsQuery.fetchNextPage();
    }
  }, [productsQuery]);

  const getStockColor = (stock: number, threshold: number) => {
    if (stock <= 0) return colors.error;
    if (stock <= threshold) return colors.warning;
    return colors.success;
  };

  const renderItem = useCallback(
    ({ item }: { item: ProductListItem }) => {
      const stockColor = getStockColor(item.stock, item.low_stock_threshold);
      const stockLabel = item.stock <= 0 ? 'Out of stock' : item.stock <= item.low_stock_threshold ? `Low: ${item.stock}` : `${item.stock} in stock`;

      return (
        <TouchableOpacity
          style={[styles.productCard, { backgroundColor: colors.surface, borderColor: colors.border, width: cardWidth }]}
          activeOpacity={0.7}
          onPress={() => router.push({ pathname: '/(app)/products/[id]', params: { id: item.id } } as never)}
        >
          <View style={[styles.productImageBox, { backgroundColor: colors.surfaceElevated }]}>
            {item.image_url ? (
              <Image source={{ uri: item.image_url }} style={styles.productImage} resizeMode="cover" />
            ) : item.barcode ? (
              <MaterialCommunityIcons name="barcode-scan" size={36} color={colors.textMuted} />
            ) : (
              <MaterialCommunityIcons name="package-variant-closed" size={36} color={colors.textMuted} />
            )}
          </View>
          <View style={styles.productInfo}>
            <Text style={[styles.productName, { color: colors.textPrimary }]} numberOfLines={2}>{item.name}</Text>
            {item.category_name && (
              <Text style={[styles.productCategory, { color: colors.textMuted }]} numberOfLines={1}>{item.category_name}</Text>
            )}
            {item.sku && (
              <Text style={[styles.productSku, { color: colors.textSecondary }]} numberOfLines={1}>SKU: {item.sku}</Text>
            )}
            <View style={styles.productBottom}>
              <Text style={[styles.productPrice, { color: colors.gold }]}>
                ${item.price.toFixed(2)}
              </Text>
              <View style={[styles.stockBadge, { backgroundColor: stockColor + '20' }]}>
                <Text style={[styles.stockText, { color: stockColor }]}>{stockLabel}</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [cardWidth, colors, router],
  );

  const showLoading = productsQuery.isLoading && !refreshing;
  const showError = productsQuery.isError && !refreshing;

  return (
    <ScreenWrapper>
      <AppHeader title="Products" subtitle="Product catalog" showBack showMenu />
      <View style={[styles.content, { paddingHorizontal: layout.padding, maxWidth: layout.contentMaxWidth, alignSelf: layout.isTablet ? 'center' : 'stretch' }]}>
        {/* Search Bar */}
        <SearchBar value={searchText} onChangeText={setSearchText} placeholder="Search by name, SKU, or barcode…" />

        {/* Category Filter */}
        {categoriesQuery.data && categoriesQuery.data.length > 0 && (
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={[{ id: 'all', name: 'All Categories' }, ...categoriesQuery.data]}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const isActive = item.id === 'all' ? selectedCategory === null : selectedCategory === item.id;
              return (
                <TouchableOpacity
                  style={[styles.categoryChip, {
                    backgroundColor: isActive ? colors.gold : colors.surface,
                    borderColor: isActive ? colors.gold : colors.border,
                  }]}
                  onPress={() => setSelectedCategory(item.id === 'all' ? null : item.id)}
                >
                  <Text style={[styles.categoryChipText, { color: isActive ? colors.ink : colors.textSecondary }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              );
            }}
            contentContainerStyle={styles.categoryList}
          />
        )}

        <SortControl
          options={SORT_OPTIONS}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onChange={(by, order) => { setSortBy(by); setSortOrder(order); }}
        />

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <ClearFiltersButton
            visible={debouncedSearch.trim() !== '' || selectedCategory !== null || sortBy !== DEFAULT_SORT_BY || sortOrder !== DEFAULT_SORT_ORDER}
            onClear={() => {
              setSearchText('');
              setDebouncedSearch('');
              setSelectedCategory(null);
              setSortBy(DEFAULT_SORT_BY);
              setSortOrder(DEFAULT_SORT_ORDER);
            }}
          />
          <View style={{ flex: 1 }} />
          <ExportButton
            filename="products"
            columns={[
              { header: 'Name', accessor: (r: ProductListItem) => r.name },
              { header: 'SKU', accessor: (r: ProductListItem) => r.sku ?? '' },
              { header: 'Price', accessor: (r: ProductListItem) => r.price },
              { header: 'Stock', accessor: (r: ProductListItem) => r.stock },
              { header: 'Category', accessor: (r: ProductListItem) => r.category_name ?? '' },
              { header: 'Active', accessor: (r: ProductListItem) => r.is_active ? 'Yes' : 'No' },
            ]}
            data={allProducts}
            disabled={allProducts.length === 0}
          />
        </View>

        {/* Product List */}
        {showLoading && (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={colors.gold} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading products…</Text>
          </View>
        )}

        {showError && (
          <View style={styles.centerState}>
            <ErrorState
              title="Failed to load products"
              message="We couldn't load the product catalog."
              onRetry={() => productsQuery.refetch()}
            />
          </View>
        )}

        {!showLoading && !showError && (
          <FlatList
            data={allProducts}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            numColumns={layout.columns}
            key={layout.columns}
            removeClippedSubviews
            maxToRenderPerBatch={10}
            windowSize={10}
            contentContainerStyle={styles.productList}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} colors={[colors.gold]} />}
            onEndReached={onLoadMore}
            onEndReachedThreshold={0.5}
            ListEmptyComponent={
              <View style={styles.centerState}>
                <EmptyState
                  icon="package"
                  title="No Products Found"
                  message={debouncedSearch.trim() !== '' || selectedCategory !== null || sortBy !== DEFAULT_SORT_BY || sortOrder !== DEFAULT_SORT_ORDER ? 'No results match your filters. Try clearing them.' : 'No products in the catalog yet.'}
                />
              </View>
            }
            ListFooterComponent={
              productsQuery.isFetchingNextPage ? (
                <View style={styles.footerLoader}>
                  <ActivityIndicator size="small" color={colors.gold} />
                </View>
              ) : null
            }
          />
        )}
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1 },
  categoryList: { gap: 8, paddingBottom: 4, marginBottom: 8 },
  categoryChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  categoryChipText: { fontSize: 13, fontWeight: '500' },
  productList: { gap: 12, paddingBottom: 24 },
  productCard: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  productImageBox: { height: 100, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  productImage: { width: '100%', height: '100%' },
  productInfo: { padding: 12, gap: 4 },
  productName: { fontSize: 14, fontWeight: '600', lineHeight: 18 },
  productCategory: { fontSize: 12 },
  productSku: { fontSize: 11 },
  productBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  productPrice: { fontSize: 16, fontWeight: '700' },
  stockBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  stockText: { fontSize: 10, fontWeight: '600' },
  centerState: { flex: 1, minHeight: 300, justifyContent: 'center' },
  loadingText: { fontSize: 14, marginTop: 12, textAlign: 'center' },
  footerLoader: { paddingVertical: 16, alignItems: 'center' },
});
