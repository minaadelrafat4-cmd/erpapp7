import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { ScreenWrapper } from '@components/ScreenWrapper';
import { AppHeader } from '@components/AppHeader';
import { Card } from '@components/Card';
import { ErrorState } from '@components/ErrorState';
import { LoadingState } from '@components/LoadingState';
import { RoleGate } from '@components/RoleGate';
import { InfoRow, InfoGroup } from '@components/InfoRow';
import { DetailHeader } from '@components/DetailHeader';
import { CardSection } from '@components/SectionHeader';
import { useThemeStore } from '@store/themeStore';
import { useCategoryDetail } from '@hooks/useERP';
import { useResponsive } from '@hooks/useResponsive';
import { useLocalSearchParams } from 'expo-router';
import { navMinRank } from '@constants';

export default function CategoryDetailScreen() {
  const { colors } = useThemeStore();
  const params = useLocalSearchParams<{ id: string }>();
  const layout = useResponsive();

  const categoryId = params.id;
  const categoryQuery = useCategoryDetail(categoryId);

  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await categoryQuery.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [categoryQuery]);

  if (categoryQuery.isLoading) {
    return (
      <RoleGate minRank={navMinRank('categories')}>
        <ScreenWrapper>
          <AppHeader title="Category Details" showBack showMenu />
          <LoadingState message="Loading category…" />
        </ScreenWrapper>
      </RoleGate>
    );
  }

  if (categoryQuery.isError || !categoryQuery.data) {
    return (
      <RoleGate minRank={navMinRank('categories')}>
        <ScreenWrapper>
          <AppHeader title="Category Details" showBack showMenu />
          <ErrorState
            title="Category not found"
            message="This category may have been removed or is unavailable."
            onRetry={() => categoryQuery.refetch()}
          />
        </ScreenWrapper>
      </RoleGate>
    );
  }

  const category = categoryQuery.data;

  return (
    <RoleGate minRank={navMinRank('categories')}>
      <ScreenWrapper>
        <AppHeader title="Category Details" showBack showMenu />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingHorizontal: layout.padding, gap: layout.cardGap, maxWidth: layout.contentMaxWidth, alignSelf: layout.isTablet ? 'center' : 'stretch' }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} colors={[colors.gold]} />}
        >
          <Card>
            <DetailHeader
              icon="categories"
              title={category.name}
              subtitle={`/${category.slug}`}
            />
            {category.description && (
              <Text style={[styles.description, { color: colors.textSecondary }]}>{category.description}</Text>
            )}
          </Card>

          <Card>
            <CardSection title="Category Information">
              <InfoGroup>
                <InfoRow label="Name" value={category.name} icon="tag" />
                <InfoRow label="Slug" value={category.slug} icon="categories" />
                <InfoRow label="Featured" value={category.is_featured ? 'Yes' : 'No'} icon="star" />
                <InfoRow label="Sort Order" value={String(category.sort_order)} icon="sort" />
                {category.parent_id && (
                  <InfoRow label="Parent Category" value={category.parent_id} icon="folder" />
                )}
              </InfoGroup>
            </CardSection>
          </Card>

          <Card>
            <CardSection title="Product Count">
              <View style={styles.countContainer}>
                <View style={[styles.countItem, { backgroundColor: colors.surfaceElevated }]}>
                  <Text style={[styles.countLabel, { color: colors.textMuted }]}>Total Products</Text>
                  <Text style={[styles.countValue, { color: colors.gold }]}>{category.product_count}</Text>
                </View>
              </View>
            </CardSection>
          </Card>
        </ScrollView>
      </ScreenWrapper>
    </RoleGate>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingBottom: 24 },
  description: { fontSize: 14, lineHeight: 22, marginTop: 12 },
  countContainer: { gap: 10 },
  countItem: { borderRadius: 10, padding: 16, alignItems: 'center', gap: 4 },
  countLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  countValue: { fontSize: 28, fontWeight: '700' },
});
