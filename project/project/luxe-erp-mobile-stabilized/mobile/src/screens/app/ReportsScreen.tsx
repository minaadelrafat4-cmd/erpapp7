import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { ScreenWrapper } from '@components/ScreenWrapper';
import { AppHeader } from '@components/AppHeader';
import { SearchBar } from '@components/SearchBar';
import { ErrorState } from '@components/ErrorState';
import { EmptyState } from '@components/EmptyState';
import { RoleGate } from '@components/RoleGate';
import { ExportButton } from '@components/ExportButton';
import { useThemeStore } from '@store/themeStore';
import { useReports } from '@hooks/useERP';
import { useResponsive, getCardWidth } from '@hooks/useResponsive';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getIconName } from '@config/icons';
import { formatDate } from '@lib/format';
import { navMinRank } from '@constants';
import type { ReportListItem } from '@apptypes/erp';
import type { IconName } from '@apptypes';

const DEBOUNCE_MS = 300;

function getReportTypeIcon(type: string): string {
  const lower = type.toLowerCase();
  if (lower.includes('sales') || lower.includes('revenue')) return 'trending-up';
  if (lower.includes('inventory') || lower.includes('stock')) return 'box';
  if (lower.includes('expense') || lower.includes('finance')) return 'dollar';
  if (lower.includes('customer')) return 'users';
  if (lower.includes('employee') || lower.includes('payroll')) return 'employees';
  if (lower.includes('purchase')) return 'truck';
  return 'file';
}

export default function ReportsScreen() {
  const { colors } = useThemeStore();
  const layout = useResponsive();

  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchText), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchText]);

  const reportsQuery = useReports(debouncedSearch);

  const allItems: ReportListItem[] = reportsQuery.data
    ? reportsQuery.data.pages.flatMap((p) => p.items)
    : [];

  const cardWidth = getCardWidth(layout, layout.columns);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await reportsQuery.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [reportsQuery]);

  const renderItem = useCallback(({ item }: { item: ReportListItem }) => {
    const typeIcon = getReportTypeIcon(item.type) as IconName;

    return (
      <View style={[styles.reportCard, { backgroundColor: colors.surface, borderColor: colors.border, width: cardWidth }]}>
        <View style={styles.reportCardHeader}>
          <View style={[styles.reportIconBox, { backgroundColor: colors.surfaceElevated }]}>
            <MaterialCommunityIcons name={getIconName(typeIcon)} size={24} color={colors.gold} />
          </View>
          <View style={styles.reportInfo}>
            <Text style={[styles.reportName, { color: colors.textPrimary }]} numberOfLines={2}>{item.name}</Text>
            <Text style={[styles.reportType, { color: colors.textMuted }]}>{item.type}</Text>
          </View>
        </View>

        {item.description && (
          <Text style={[styles.reportDesc, { color: colors.textSecondary }]} numberOfLines={3}>{item.description}</Text>
        )}

        <View style={[styles.reportMetaRow, { borderColor: colors.border }]}>
          <View style={styles.metaItem}>
            <MaterialCommunityIcons name={getIconName('calendar')} size={14} color={colors.textMuted} />
            <Text style={[styles.metaText, { color: colors.textMuted }]}>Last run: {formatDate(item.last_run_at)}</Text>
          </View>
          {item.is_scheduled && (
            <View style={[styles.scheduledBadge, { backgroundColor: colors.gold + '20' }]}>
              <MaterialCommunityIcons name={getIconName('clock')} size={12} color={colors.gold} />
              <Text style={[styles.scheduledText, { color: colors.gold }]}>Scheduled</Text>
            </View>
          )}
        </View>
      </View>
    );
  }, [colors, cardWidth]);

  const showLoading = reportsQuery.isLoading && !refreshing;
  const showError = reportsQuery.isError && !refreshing;

  return (
    <RoleGate minRank={navMinRank('reports')}>
      <ScreenWrapper>
        <AppHeader title="Reports" subtitle="Business reports" showBack showMenu />
        <View style={[styles.content, { paddingHorizontal: layout.padding, maxWidth: layout.contentMaxWidth, alignSelf: layout.isTablet ? 'center' : 'stretch' }]}>
          <SearchBar value={searchText} onChangeText={setSearchText} placeholder="Search reports…" />

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <View style={{ flex: 1 }} />
            <ExportButton
              filename="reports"
              columns={[
                { header: 'Name', accessor: (r: ReportListItem) => r.name },
                { header: 'Type', accessor: (r: ReportListItem) => r.type },
                { header: 'Description', accessor: (r: ReportListItem) => r.description ?? '' },
                { header: 'Scheduled', accessor: (r: ReportListItem) => r.is_scheduled ? 'Yes' : 'No' },
                { header: 'Last Run', accessor: (r: ReportListItem) => r.last_run_at ?? '' },
              ]}
              data={allItems}
              disabled={allItems.length === 0}
            />
          </View>

          {showLoading && (
            <View style={styles.centerState}>
              <ActivityIndicator size="large" color={colors.gold} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading reports…</Text>
            </View>
          )}

          {showError && (
            <View style={styles.centerState}>
              <ErrorState
                title="Failed to load reports"
                message="We couldn't load the reports list."
                onRetry={() => reportsQuery.refetch()}
              />
            </View>
          )}

          {!showLoading && !showError && (
            <FlatList
              data={allItems}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              numColumns={layout.columns}
              key={layout.columns}
              contentContainerStyle={styles.list}
              removeClippedSubviews
              maxToRenderPerBatch={10}
              windowSize={10}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} colors={[colors.gold]} />}
              onEndReached={() => {
                if (reportsQuery.hasNextPage && !reportsQuery.isFetchingNextPage) {
                  reportsQuery.fetchNextPage();
                }
              }}
              onEndReachedThreshold={0.3}
              ListFooterComponent={
                reportsQuery.isFetchingNextPage ? (
                  <View style={styles.footerLoading}>
                    <ActivityIndicator size="small" color={colors.gold} />
                  </View>
                ) : null
              }
              ListEmptyComponent={
                <View style={styles.centerState}>
                  <EmptyState
                    icon="reports"
                    title="No Reports Found"
                    message={debouncedSearch ? `No reports match "${debouncedSearch}".` : 'No reports have been created yet.'}
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
  reportCard: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 10 },
  reportCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  reportIconBox: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  reportInfo: { flex: 1, gap: 2 },
  reportName: { fontSize: 14, fontWeight: '600', lineHeight: 18 },
  reportType: { fontSize: 11 },
  reportDesc: { fontSize: 12, lineHeight: 16 },
  reportMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, paddingTop: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  metaText: { fontSize: 11 },
  scheduledBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  scheduledText: { fontSize: 10, fontWeight: '600' },
  centerState: { flex: 1, minHeight: 300, justifyContent: 'center' },
  loadingText: { fontSize: 14, marginTop: 12, textAlign: 'center' },
  footerLoading: { paddingVertical: 16, alignItems: 'center' },
});
