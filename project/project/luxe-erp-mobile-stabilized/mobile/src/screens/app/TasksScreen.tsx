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
import { StatusBadge, PriorityDot } from '@components/StatusBadge';
import { useThemeStore } from '@store/themeStore';
import { useTasks } from '@hooks/useERP';
import { useResponsive, getCardWidth } from '@hooks/useResponsive';
import { useRouter } from 'expo-router';
import { formatDate, isOverdue } from '@lib/format';
import { navMinRank } from '@constants';
import type { TaskListItem } from '@apptypes/erp';

const DEBOUNCE_MS = 300;
const STATUS_OPTIONS = ['all', 'pending', 'in_progress', 'completed', 'cancelled'];
const PRIORITY_OPTIONS = ['all', 'low', 'medium', 'high', 'urgent'];

export default function TasksScreen() {
  const { colors } = useThemeStore();
  const router = useRouter();
  const layout = useResponsive();

  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchText), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchText]);

  const tasksQuery = useTasks(debouncedSearch, statusFilter, priorityFilter);

  const allTasks = useMemo(() => {
    return tasksQuery.data?.pages.flatMap((page) => page.items) ?? [];
  }, [tasksQuery.data]);

  const cardWidth = getCardWidth(layout, layout.columns);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await tasksQuery.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [tasksQuery]);

  const onLoadMore = useCallback(() => {
    if (tasksQuery.hasNextPage && !tasksQuery.isFetchingNextPage) {
      tasksQuery.fetchNextPage();
    }
  }, [tasksQuery]);

  const renderItem = useCallback(({ item }: { item: TaskListItem }) => {
    const overdue = isOverdue(item.due_date, item.status);
    return (
      <TouchableOpacity
        style={[styles.taskCard, { backgroundColor: colors.surface, borderColor: overdue ? colors.error + '40' : colors.border, width: cardWidth }]}
        activeOpacity={0.7}
        onPress={() => router.push({ pathname: '/(app)/tasks/[id]', params: { id: item.id } } as never)}
      >
        <View style={styles.cardTop}>
          <View style={styles.titleRow}>
            <PriorityDot priority={item.priority} />
            <Text style={[styles.taskTitle, { color: colors.textPrimary }]} numberOfLines={2}>{item.title}</Text>
          </View>
          <StatusBadge status={item.status} />
        </View>
        {item.description ? (
          <Text style={[styles.taskDesc, { color: colors.textSecondary }]} numberOfLines={2}>{item.description}</Text>
        ) : null}
        <View style={styles.cardBottom}>
          {item.assigned_employee_name ? (
            <Text style={[styles.assignedText, { color: colors.textMuted }]} numberOfLines={1}>{item.assigned_employee_name}</Text>
          ) : (
            <Text style={[styles.unassignedText, { color: colors.textMuted }]}>Unassigned</Text>
          )}
          {item.due_date ? (
            <Text style={[styles.dueText, { color: overdue ? colors.error : colors.textMuted }]}>
              {overdue ? 'Overdue: ' : 'Due: '}{formatDate(item.due_date)}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  }, [colors, cardWidth, router]);

  const showLoading = tasksQuery.isLoading && !refreshing;
  const showError = tasksQuery.isError && !refreshing;

  return (
    <RoleGate minRank={navMinRank('tasks')}>
      <ScreenWrapper>
        <AppHeader title="Tasks" subtitle="Assigned and tracked tasks" showBack showMenu />
        <View style={[styles.content, { paddingHorizontal: layout.padding, maxWidth: layout.contentMaxWidth, alignSelf: layout.isTablet ? 'center' : 'stretch' }]}>
          <SearchBar value={searchText} onChangeText={setSearchText} placeholder="Search tasks…" />

          <FilterChips
            options={STATUS_OPTIONS}
            selected={statusFilter}
            onSelect={setStatusFilter}
          />

          <FilterChips
            options={PRIORITY_OPTIONS}
            selected={priorityFilter}
            onSelect={setPriorityFilter}
            formatLabel={(opt) => opt === 'all' ? 'All Priorities' : opt.charAt(0).toUpperCase() + opt.slice(1)}
          />

          {showLoading && (
            <View style={styles.centerState}>
              <ActivityIndicator size="large" color={colors.gold} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading tasks…</Text>
            </View>
          )}

          {showError && (
            <View style={styles.centerState}>
              <ErrorState
                title="Failed to load tasks"
                message="We couldn't load the task list."
                onRetry={() => tasksQuery.refetch()}
              />
            </View>
          )}

          {!showLoading && !showError && (
            <FlatList
              data={allTasks}
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
                    icon="tasks"
                    title="No Tasks"
                    message={debouncedSearch || statusFilter !== 'all' || priorityFilter !== 'all' ? 'No tasks match your filters.' : 'No tasks have been created yet.'}
                  />
                </View>
              }
              ListFooterComponent={
                tasksQuery.isFetchingNextPage ? (
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
  taskCard: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 6 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  taskTitle: { fontSize: 14, fontWeight: '600', flex: 1 },
  taskDesc: { fontSize: 12, lineHeight: 16 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  assignedText: { fontSize: 12, flex: 1 },
  unassignedText: { fontSize: 12, fontStyle: 'italic' },
  dueText: { fontSize: 12 },
  centerState: { flex: 1, minHeight: 300, justifyContent: 'center' },
  loadingText: { fontSize: 14, marginTop: 12, textAlign: 'center' },
  footerLoader: { paddingVertical: 16, alignItems: 'center' },
});
