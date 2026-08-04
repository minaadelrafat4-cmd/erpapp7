import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Image,
  Share,
} from 'react-native';
import { ScreenWrapper } from '@components/ScreenWrapper';
import { AppHeader } from '@components/AppHeader';
import { Card } from '@components/Card';
import { ErrorState } from '@components/ErrorState';
import { LoadingState } from '@components/LoadingState';
import { InfoRow, InfoGroup } from '@components/InfoRow';
import { CardSection } from '@components/SectionHeader';
import { SummaryGrid } from '@components/SummaryGrid';
import { StockBadge, getStockStatus } from '@components/StockBadge';
import { useThemeStore } from '@store/themeStore';
import { useProduct } from '@hooks/useERP';
import { useResponsive } from '@hooks/useResponsive';
import { useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function ProductDetailScreen() {
  const { colors } = useThemeStore();
  const params = useLocalSearchParams<{ id: string }>();
  const layout = useResponsive();

  const productId = params.id;
  const productQuery = useProduct(productId);

  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await productQuery.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [productQuery]);

  if (productQuery.isLoading) {
    return (
      <ScreenWrapper>
        <AppHeader title="Product Details" showBack showMenu />
        <LoadingState message="Loading product…" />
      </ScreenWrapper>
    );
  }

  if (productQuery.isError || !productQuery.data) {
    return (
      <ScreenWrapper>
        <AppHeader title="Product Details" showBack showMenu />
        <ErrorState
          title="Product not found"
          message="This product may have been removed or is unavailable."
          onRetry={() => productQuery.refetch()}
        />
      </ScreenWrapper>
    );
  }

  const product = productQuery.data;
  const stockStatus = getStockStatus(product.stock, product.low_stock_threshold);

  const handleShare = async () => {
    try {
      await Share.share({ message: `${product.name} — $${product.price.toFixed(2)} (SKU: ${product.sku ?? 'N/A'})` });
    } catch {
      // user cancelled share
    }
  };

  return (
    <ScreenWrapper>
      <AppHeader
        title="Product Details"
        showBack
        showMenu
        rightIcon="external-link"
        onRightPress={handleShare}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingHorizontal: layout.padding, gap: layout.cardGap, maxWidth: layout.contentMaxWidth, alignSelf: layout.isTablet ? 'center' : 'stretch' }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} colors={[colors.gold]} />}
      >
        <Card padding={0} elevated>
          <View style={[styles.imageContainer, { backgroundColor: colors.surfaceElevated }]}>
            {product.images.length > 0 ? (
              <Image source={{ uri: product.images[0]!.url }} style={styles.productImage} resizeMode="contain" />
            ) : (
              <View style={styles.placeholderImage}>
                <MaterialCommunityIcons name="package-variant-closed" size={64} color={colors.textMuted} />
              </View>
            )}
          </View>
        </Card>

        <Card>
          <Text style={[styles.productName, { color: colors.textPrimary }]}>{product.name}</Text>
          {product.short_description && (
            <Text style={[styles.shortDesc, { color: colors.textSecondary }]}>{product.short_description}</Text>
          )}
          <View style={styles.priceRow}>
            <Text style={[styles.price, { color: colors.gold }]}>${product.price.toFixed(2)}</Text>
            {product.compare_at_price && product.compare_at_price > product.price && (
              <Text style={[styles.comparePrice, { color: colors.textMuted }]}>
                ${product.compare_at_price.toFixed(2)}
              </Text>
            )}
          </View>
          <View style={styles.stockBadgeContainer}>
            <StockBadge status={stockStatus} quantity={product.stock} />
          </View>
        </Card>

        <Card>
          <CardSection title="Product Information">
            <InfoGroup>
              <InfoRow label="SKU" value={product.sku ?? '—'} icon="tag" />
              <InfoRow label="Barcode" value={product.barcode ?? '—'} icon="barcode" />
              <InfoRow label="Category" value={product.category_name ?? '—'} icon="categories" />
              <InfoRow label="Brand" value={product.brand_name ?? '—'} icon="box" />
              <InfoRow label="Reorder Level" value={String(product.reorder_level)} icon="refresh" />
              <InfoRow label="Min Stock" value={String(product.min_stock)} icon="alert" />
              <InfoRow label="Max Stock" value={String(product.max_stock)} icon="box" />
              {product.product_type && (
                <InfoRow label="Product Type" value={product.product_type} icon="package" />
              )}
              {product.flavor && (
                <InfoRow label="Flavor" value={product.flavor} icon="star" />
              )}
              {product.nicotine_strength && (
                <InfoRow label="Nicotine Strength" value={product.nicotine_strength} icon="alert" />
              )}
              {product.puff_count != null && (
                <InfoRow label="Puff Count" value={String(product.puff_count)} icon="clock" />
              )}
              {product.weight != null && (
                <InfoRow label="Weight" value={`${product.weight}g`} icon="box" />
              )}
              <InfoRow label="Age Restricted" value={product.is_age_restricted ? 'Yes' : 'No'} icon="shield" />
              <InfoRow label="Rating" value={`${product.rating.toFixed(1)} (${product.review_count} reviews)`} icon="star" />
            </InfoGroup>
          </CardSection>
        </Card>

        <Card>
          <CardSection title="Stock Summary">
            <SummaryGrid
              items={[
                { label: 'On Hand', value: product.stock },
                { label: 'Threshold', value: product.low_stock_threshold },
                { label: 'Reorder At', value: product.reorder_level },
              ]}
            />
          </CardSection>
        </Card>

        {product.description && (
          <Card>
            <CardSection title="Description">
              <Text style={[styles.description, { color: colors.textSecondary }]}>{product.description}</Text>
            </CardSection>
          </Card>
        )}

        {product.tags.length > 0 && (
          <Card>
            <CardSection title="Tags">
              <View style={styles.tagContainer}>
                {product.tags.map((tag: string) => (
                  <View key={tag} style={[styles.tag, { backgroundColor: colors.surfaceElevated }]}>
                    <Text style={[styles.tagText, { color: colors.textSecondary }]}>{tag}</Text>
                  </View>
                ))}
              </View>
            </CardSection>
          </Card>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingBottom: 24 },
  imageContainer: { height: 220, borderRadius: 16, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  productImage: { width: '100%', height: '100%' },
  placeholderImage: { alignItems: 'center', justifyContent: 'center' },
  productName: { fontSize: 20, fontWeight: '700', lineHeight: 26 },
  shortDesc: { fontSize: 14, lineHeight: 20, marginTop: 6 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 12 },
  price: { fontSize: 28, fontWeight: '700' },
  comparePrice: { fontSize: 16, textDecorationLine: 'line-through' },
  stockBadgeContainer: { marginTop: 10 },
  description: { fontSize: 14, lineHeight: 22 },
  tagContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  tagText: { fontSize: 12, fontWeight: '500' },
});
