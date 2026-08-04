import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { ScreenWrapper } from '@components/ScreenWrapper';
import { AppHeader } from '@components/AppHeader';
import { Card } from '@components/Card';
import { ErrorState } from '@components/ErrorState';
import { EmptyState } from '@components/EmptyState';
import { RoleGate } from '@components/RoleGate';
import { useThemeStore } from '@store/themeStore';
import { useAnalyticsSummary } from '@hooks/useERP';
import { useResponsive } from '@hooks/useResponsive';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getIconName } from '@config/icons';
import { formatCompactCurrency, formatNumber } from '@lib/format';
import { navMinRank } from '@constants';
import type { ThemeColors } from '@apptypes';
import type {
  SalesOverviewRow,
  InventoryOverviewRow,
  LowStockRow,
  BranchComparisonRow,
  ProductPerformanceRow,
} from '@apptypes/erp';

function SectionHeader({ title, icon, colors }: { title: string; icon: string; colors: ThemeColors }) {
  return (
    <View style={styles.sectionHeader}>
      <MaterialCommunityIcons name={getIconName(icon as never)} size={18} color={colors.gold} />
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{title}</Text>
    </View>
  );
}

function KpiCard({ label, value, sublabel, colors, highlight }: { label: string; value: string; sublabel?: string; colors: ThemeColors; highlight?: boolean }) {
  return (
    <View style={[styles.kpiCard, { backgroundColor: colors.surfaceElevated }]}>
      <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.kpiValue, { color: highlight ? colors.gold : colors.textPrimary }]}>{value}</Text>
      {sublabel && <Text style={[styles.kpiSublabel, { color: colors.textSecondary }]}>{sublabel}</Text>}
    </View>
  );
}

export default function AnalyticsScreen() {
  const { colors } = useThemeStore();
  const layout = useResponsive();

  const analyticsQuery = useAnalyticsSummary();

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await analyticsQuery.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [analyticsQuery]);

  const showLoading = analyticsQuery.isLoading && !refreshing;
  const showError = analyticsQuery.isError && !refreshing;
  const data = analyticsQuery.data;

  const totalRevenue = data?.salesOverview.reduce((sum: number, r: SalesOverviewRow) => sum + Number(r.total_revenue), 0) ?? 0;
  const totalOrders = data?.salesOverview.reduce((sum: number, r: SalesOverviewRow) => sum + r.order_count, 0) ?? 0;
  const totalItemsSold = data?.salesOverview.reduce((sum: number, r: SalesOverviewRow) => sum + r.items_sold, 0) ?? 0;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const totalInventoryValue = data?.inventoryValue.reduce((sum: number, r: InventoryOverviewRow) => sum + Number(r.total_retail_value), 0) ?? 0;
  const totalInventoryCost = data?.inventoryValue.reduce((sum: number, r: InventoryOverviewRow) => sum + Number(r.total_cost_value), 0) ?? 0;
  const totalPotentialProfit = data?.inventoryValue.reduce((sum: number, r: InventoryOverviewRow) => sum + Number(r.potential_profit), 0) ?? 0;

  const getSeverityColor = (severity: string): string => {
    if (severity === 'out_of_stock') return colors.error;
    if (severity === 'critical') return colors.warning;
    return colors.gold;
  };

  const getSeverityLabel = (severity: string): string => {
    if (severity === 'out_of_stock') return 'Out of Stock';
    if (severity === 'critical') return 'Critical';
    return 'Low';
  };

  return (
    <RoleGate minRank={navMinRank('analytics')}>
      <ScreenWrapper>
        <AppHeader title="Analytics" subtitle="Business insights" showBack showMenu />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingHorizontal: layout.padding, gap: layout.cardGap, maxWidth: layout.contentMaxWidth, alignSelf: layout.isTablet ? 'center' : 'stretch' }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} colors={[colors.gold]} />}
        >
          {showLoading && (
            <View style={styles.centerState}>
              <ActivityIndicator size="large" color={colors.gold} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading analytics…</Text>
            </View>
          )}

          {showError && (
            <View style={styles.centerState}>
              <ErrorState
                title="Failed to load analytics"
                message="We couldn't load the analytics data."
                onRetry={() => analyticsQuery.refetch()}
              />
            </View>
          )}

          {!showLoading && !showError && !data && (
            <View style={styles.centerState}>
              <EmptyState
                icon="analytics"
                title="No Data Available"
                message="Analytics data is not available yet."
              />
            </View>
          )}

          {!showLoading && !showError && data && (
            <>
              {/* Sales Overview */}
              <Card>
                <SectionHeader title="Sales Overview" icon="trending-up" colors={colors} />
                <View style={styles.kpiGrid}>
                  <KpiCard label="Total Revenue" value={formatCompactCurrency(totalRevenue)} colors={colors} highlight />
                  <KpiCard label="Total Orders" value={formatNumber(totalOrders)} colors={colors} />
                  <KpiCard label="Items Sold" value={formatNumber(totalItemsSold)} colors={colors} />
                  <KpiCard label="Avg Order Value" value={formatCompactCurrency(avgOrderValue)} colors={colors} />
                </View>

                {data.salesOverview.length > 0 && (
                  <View style={styles.dailyList}>
                    <Text style={[styles.subSectionTitle, { color: colors.textMuted }]}>Recent Daily Sales</Text>
                    {data.salesOverview.slice(0, 7).map((row: SalesOverviewRow, idx: number) => (
                      <View key={idx} style={[styles.dailyRow, { borderColor: colors.border }]}>
                        <Text style={[styles.dailyDate, { color: colors.textSecondary }]}>
                          {new Date(row.sale_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </Text>
                        <Text style={[styles.dailyRevenue, { color: colors.gold }]}>{formatCompactCurrency(Number(row.total_revenue))}</Text>
                        <Text style={[styles.dailyOrders, { color: colors.textMuted }]}>{row.order_count} orders</Text>
                      </View>
                    ))}
                  </View>
                )}
              </Card>

              {/* Inventory Overview */}
              <Card>
                <SectionHeader title="Inventory Overview" icon="box" colors={colors} />
                <View style={styles.kpiGrid}>
                  <KpiCard label="Retail Value" value={formatCompactCurrency(totalInventoryValue)} colors={colors} highlight />
                  <KpiCard label="Cost Value" value={formatCompactCurrency(totalInventoryCost)} colors={colors} />
                  <KpiCard label="Potential Profit" value={formatCompactCurrency(totalPotentialProfit)} colors={colors} />
                </View>

                {data.inventoryValue.length > 0 && (
                  <View style={styles.topList}>
                    <Text style={[styles.subSectionTitle, { color: colors.textMuted }]}>Top Inventory by Value</Text>
                    {data.inventoryValue.slice(0, 5).map((row: InventoryOverviewRow, idx: number) => (
                      <View key={idx} style={[styles.topRow, { borderColor: colors.border }]}>
                        <View style={styles.topInfo}>
                          <Text style={[styles.topName, { color: colors.textPrimary }]} numberOfLines={1}>{row.product_name}</Text>
                          {row.sku && <Text style={[styles.topSku, { color: colors.textMuted }]} numberOfLines={1}>{row.sku}</Text>}
                        </View>
                        <View style={styles.topValues}>
                          <Text style={[styles.topValue, { color: colors.gold }]}>{formatCompactCurrency(Number(row.total_retail_value))}</Text>
                          <Text style={[styles.topStock, { color: colors.textMuted }]}>{row.stock} units</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </Card>

              {/* Low Stock Summary */}
              <Card>
                <SectionHeader title="Low Stock Summary" icon="alert" colors={colors} />
                {data.lowStock.length > 0 ? (
                  <View style={styles.lowStockList}>
                    <View style={styles.kpiGrid}>
                      <KpiCard
                        label="Out of Stock"
                        value={formatNumber(data.lowStock.filter((r: LowStockRow) => r.severity === 'out_of_stock').length)}
                        colors={colors}
                      />
                      <KpiCard
                        label="Critical"
                        value={formatNumber(data.lowStock.filter((r: LowStockRow) => r.severity === 'critical').length)}
                        colors={colors}
                      />
                      <KpiCard
                        label="Low"
                        value={formatNumber(data.lowStock.filter((r: LowStockRow) => r.severity === 'low').length)}
                        colors={colors}
                      />
                    </View>
                    {data.lowStock.slice(0, 8).map((row: LowStockRow, idx: number) => {
                      const sevColor = getSeverityColor(row.severity);
                      return (
                        <View key={idx} style={[styles.lowStockRow, { borderColor: colors.border }]}>
                          <View style={styles.lowStockInfo}>
                            <Text style={[styles.lowStockName, { color: colors.textPrimary }]} numberOfLines={1}>{row.product_name}</Text>
                            {row.category_name && (
                              <Text style={[styles.lowStockCat, { color: colors.textMuted }]} numberOfLines={1}>{row.category_name}</Text>
                            )}
                          </View>
                          <View style={styles.lowStockRight}>
                            <Text style={[styles.lowStockQty, { color: sevColor }]}>{row.stock}</Text>
                            <View style={[styles.severityBadge, { backgroundColor: sevColor + '20' }]}>
                              <Text style={[styles.severityText, { color: sevColor }]}>{getSeverityLabel(row.severity)}</Text>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <View style={styles.allGoodBox}>
                    <MaterialCommunityIcons name={getIconName('check')} size={28} color={colors.success} />
                    <Text style={[styles.allGoodText, { color: colors.textSecondary }]}>All products are well stocked.</Text>
                  </View>
                )}
              </Card>

              {/* Branch Comparison */}
              {data.branchComparison.length > 0 && (
                <Card>
                  <SectionHeader title="Branch Comparison" icon="store" colors={colors} />
                  {data.branchComparison.map((row: BranchComparisonRow, idx: number) => (
                    <View key={idx} style={[styles.branchCompRow, { borderColor: colors.border }]}>
                      <View style={styles.branchCompInfo}>
                        <Text style={[styles.branchCompName, { color: colors.textPrimary }]} numberOfLines={1}>{row.branch_name}</Text>
                        {row.city && <Text style={[styles.branchCompCity, { color: colors.textMuted }]} numberOfLines={1}>{row.city}</Text>}
                      </View>
                      <View style={styles.branchCompStats}>
                        <Text style={[styles.branchCompRevenue, { color: colors.gold }]}>{formatCompactCurrency(Number(row.total_revenue))}</Text>
                        <Text style={[styles.branchCompOrders, { color: colors.textMuted }]}>{row.order_count} orders</Text>
                      </View>
                    </View>
                  ))}
                </Card>
              )}

              {/* Product Performance */}
              {data.productPerformance.length > 0 && (
                <Card>
                  <SectionHeader title="Product Performance" icon="bar-chart" colors={colors} />
                  {data.productPerformance.map((row: ProductPerformanceRow, idx: number) => (
                    <View key={idx} style={[styles.prodPerfRow, { borderColor: colors.border }]}>
                      <View style={styles.prodPerfRank}>
                        <Text style={[styles.prodPerfRankText, { color: colors.gold }]}>{idx + 1}</Text>
                      </View>
                      <View style={styles.prodPerfInfo}>
                        <Text style={[styles.prodPerfName, { color: colors.textPrimary }]} numberOfLines={1}>{row.product_name}</Text>
                        {row.category_name && (
                          <Text style={[styles.prodPerfCat, { color: colors.textMuted }]} numberOfLines={1}>{row.category_name}</Text>
                        )}
                      </View>
                      <View style={styles.prodPerfStats}>
                        <Text style={[styles.prodPerfRevenue, { color: colors.gold }]}>{formatCompactCurrency(Number(row.total_revenue))}</Text>
                        <Text style={[styles.prodPerfQty, { color: colors.textMuted }]}>{row.total_qty_sold} sold</Text>
                      </View>
                    </View>
                  ))}
                </Card>
              )}
            </>
          )}
        </ScrollView>
      </ScreenWrapper>
    </RoleGate>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingBottom: 24 },
  centerState: { flex: 1, minHeight: 300, justifyContent: 'center' },
  loadingText: { fontSize: 14, marginTop: 12, textAlign: 'center' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  subSectionTitle: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 16 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpiCard: { flex: 1, minWidth: '45%', borderRadius: 10, padding: 14, alignItems: 'center', gap: 4 },
  kpiLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  kpiValue: { fontSize: 20, fontWeight: '700' },
  kpiSublabel: { fontSize: 11 },
  dailyList: { marginTop: 4 },
  dailyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1 },
  dailyDate: { flex: 1, fontSize: 13 },
  dailyRevenue: { fontSize: 14, fontWeight: '600' },
  dailyOrders: { fontSize: 12 },
  topList: { marginTop: 4 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1 },
  topInfo: { flex: 1, gap: 2 },
  topName: { fontSize: 13, fontWeight: '500' },
  topSku: { fontSize: 11 },
  topValues: { alignItems: 'flex-end', gap: 2 },
  topValue: { fontSize: 14, fontWeight: '600' },
  topStock: { fontSize: 11 },
  lowStockList: { gap: 0 },
  lowStockRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1 },
  lowStockInfo: { flex: 1, gap: 2 },
  lowStockName: { fontSize: 13, fontWeight: '500' },
  lowStockCat: { fontSize: 11 },
  lowStockRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  lowStockQty: { fontSize: 16, fontWeight: '700' },
  severityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  severityText: { fontSize: 10, fontWeight: '600' },
  allGoodBox: { alignItems: 'center', gap: 8, paddingVertical: 20 },
  allGoodText: { fontSize: 14 },
  branchCompRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1 },
  branchCompInfo: { flex: 1, gap: 2 },
  branchCompName: { fontSize: 13, fontWeight: '500' },
  branchCompCity: { fontSize: 11 },
  branchCompStats: { alignItems: 'flex-end', gap: 2 },
  branchCompRevenue: { fontSize: 14, fontWeight: '600' },
  branchCompOrders: { fontSize: 11 },
  prodPerfRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: 1 },
  prodPerfRank: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(212,175,55,0.12)' },
  prodPerfRankText: { fontSize: 14, fontWeight: '700' },
  prodPerfInfo: { flex: 1, gap: 2 },
  prodPerfName: { fontSize: 13, fontWeight: '500' },
  prodPerfCat: { fontSize: 11 },
  prodPerfStats: { alignItems: 'flex-end', gap: 2 },
  prodPerfRevenue: { fontSize: 14, fontWeight: '600' },
  prodPerfQty: { fontSize: 11 },
});
