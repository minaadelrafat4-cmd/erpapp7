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
import { useCategories } from '@hooks/useERP';
import type { SortOrder } from '@services/erpService';
import { useResponsive, getCardWidth } from '@hooks/useResponsive';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getIconName } from '@config/icons';
import { navMinRank } from '@constants';
import type { CategoryWithCount } from '@apptypes/erp';

const DEBOUNCE_MS = 300;
const DEFAULT_SORT_BY = 'sort_order';
const DEFAULT_SORT_ORDER: SortOrder = 'asc';

const SORT_OPTIONS: SortOption[] = [
  { label: 'Name', value: 'name' },
  { label: 'Featured', value: 'is_featured' },
  { label: 'Sort Order', value: 'sort_order' },
  { label: 'Newest', value: 'created_at' },
];

export default function CategoriesScreen() {
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

  const categoriesQuery = useCategories(sortBy, sortOrder);

  const filteredCategories = useMemo(() => {
    const all = categoriesQuery.data ?? [];
    if (!debouncedSearch.trim()) return all;
    const q = debouncedSearch.toLowerCase();
    return all.filter(
      (c: CategoryWithCount) => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q),
    );
  }, [categoriesQuery.data, debouncedSearch]);

  const cardWidth = getCardWidth(layout, layout.columns);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await categoriesQuery.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [categoriesQuery]);

  const renderItem = useCallback(
    ({ item }: { item: CategoryWithCount }) => (
      <TouchableOpacity
        style={[styles.categoryCard, { backgroundColor: colors.surface, borderColor: colors.border, width: cardWidth }]}
        activeOpacity={0.7}
        onPress={() => router.push({ pathname: '/(app)/categories/[id]', params: { id: item.id } } as never)}
      >
        <View style={[styles.iconBox, { backgroundColor: colors.surfaceElevated }]}>
          <MaterialCommunityIcons name={getIconName('categories')} size={32} color={colors.gold} />
        </View>
        <View style={styles.categoryInfo}>
          <Text style={[styles.categoryName, { color: colors.textPrimary }]} numberOfLines={2}>{item.name}</Text>
          {item.description && (
            <Text style={[styles.categoryDesc, { color: colors.textMuted }]} numberOfLines={2}>{item.description}</Text>
          )}
          <View style={[styles.countBadge, { backgroundColor: colors.gold + '20' }]}>
            <Text style={[styles.countText, { color: colors.gold }]}>
              {item.product_count} {item.product_count === 1 ? 'product' : 'products'}
            </Text>
          </View>
        </View>
        <MaterialCommunityIcons name={getIconName('chevron-right')} size={20} color={colors.textMuted} />
      </TouchableOpacity>
    ),
    [cardWidth, colors, router],
  );

  const showLoading = categoriesQuery.isLoading && !refreshing;
  const showError = categoriesQuery.isError && !refreshing;

  return (
    <RoleGate minRank={navMinRank('categories')}>
      <ScreenWrapper>
        <AppHeader title="Categories" subtitle="Product categories" showBack showMenu />
        <View style={[styles.content, { paddingHorizontal: layout.padding, maxWidth: layout.contentMaxWidth, alignSelf: layout.isTablet ? 'center' : 'stretch' }]}>
          <SearchBar value={searchText} onChangeText={setSearchText} placeholder="Search categories…" />

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
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading categories…</Text>
            </View>
          )}

          {showError && (
            <View style={styles.centerState}>
              <ErrorState
                title="Failed to load categories"
                message="We couldn't load the category list."
                onRetry={() => categoriesQuery.refetch()}
              />
            </View>
          )}

          {!showLoading && !showError && (
            <FlatList
              data={filteredCategories}
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
                    icon="categories"
                    title="No Categories Found"
                    message={debouncedSearch.trim() !== '' || sortBy !== DEFAULT_SORT_BY || sortOrder !== DEFAULT_SORT_ORDER ? 'No results match your filters. Try clearing them.' : 'No categories have been created yet.'}
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
  categoryCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: { width: 52, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  categoryInfo: { flex: 1, gap: 4 },
  categoryName: { fontSize: 15, fontWeight: '600', lineHeight: 19 },
  categoryDesc: { fontSize: 12, lineHeight: 16 },
  countBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 2 },
  countText: { fontSize: 11, fontWeight: '600' },
  centerState: { flex: 1, minHeight: 300, justifyContent: 'center' },
  loadingText: { fontSize: 14, marginTop: 12, textAlign: 'center' },
});
