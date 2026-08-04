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
import { useTasks } from '@hooks/useERP';
import { useResponsive, getCardWidth } from '@hooks/useResponsive';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getIconName } from '@config/icons';
import { navMinRank } from '@constants';
import type { TaskListItem, TaskStatus, TaskPriority } from '@apptypes/erp';
import type { ThemeColors } from '@apptypes';

const DEBOUNCE_MS = 300;
const STATUS_OPTIONS = ['all', 'pending', 'in_progress', 'completed', 'cancelled'];
const PRIORITY_OPTIONS = ['all', 'low', 'medium', 'high', 'urgent'];

function StatusBadge({ status, colors }: { status: TaskStatus; colors: ThemeColors }) {
  const colorMap: Record<string, string> = {
    pending: colors.textMuted,
    in_progress: colors.gold,
    completed: colors.success,
    cancelled: colors.error,
  };
  const color = colorMap[status] ?? colors.textSecondary;
  return (
    <View style={[styles.statusBadge, { backgroundColor: color + '20' }]}>
      <Text style={[styles.statusText, { color }]}>{status.replace('_', ' ')}</Text>
    </View>
  );
}

function PriorityDot({ priority, colors }: { priority: TaskPriority; colors: ThemeColors }) {
  const colorMap: Record<string, string> = {
    low: colors.textMuted,
    medium: colors.accent,
    high: colors.warning,
    urgent: colors.error,
  };
  const color = colorMap[priority] ?? colors.textMuted;
  return (
    <View style={[styles.priorityDot, { backgroundColor: color }]} />
  );
}

function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return new Date(dueDate).getTime() < Date.now();
}

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

  const renderItem = ({ item }: { item: TaskListItem }) => {
    const overdue = isOverdue(item.due_date) && item.status !== 'completed' && item.status !== 'cancelled';
    return (
      <TouchableOpacity
        style={[styles.taskCard, { backgroundColor: colors.surface, borderColor: overdue ? colors.error + '40' : colors.border, width: cardWidth }]}
        activeOpacity={0.7}
        onPress={() => router.push({ pathname: '/(app)/tasks/[id]', params: { id: item.id } } as never)}
      >
        <View style={styles.cardTop}>
          <View style={styles.titleRow}>
            <PriorityDot priority={item.priority} colors={colors} />
            <Text style={[styles.taskTitle, { color: colors.textPrimary }]} numberOfLines={2}>{item.title}</Text>
          </View>
          <StatusBadge status={item.status} colors={colors} />
        </View>
        {item.description ? (
          <Text style={[styles.taskDesc, { color: colors.textSecondary }]} numberOfLines={2}>{item.description}</Text>
        ) : null}
        <View style={styles.cardBottom}>
          {item.assigned_employee_name ? (
            <View style={styles.assignedRow}>
              <MaterialCommunityIcons name="account-circle-outline" size={14} color={colors.textMuted} />
              <Text style={[styles.assignedText, { color: colors.textMuted }]} numberOfLines={1}>{item.assigned_employee_name}</Text>
            </View>
          ) : (
            <Text style={[styles.unassignedText, { color: colors.textMuted }]}>Unassigned</Text>
          )}
          {item.due_date ? (
            <Text style={[styles.dueText, { color: overdue ? colors.error : colors.textMuted }]}>
              {overdue ? 'Overdue: ' : 'Due: '}{new Date(item.due_date).toLocaleDateString()}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  const showLoading = tasksQuery.isLoading && !refreshing;
  const showError = tasksQuery.isError && !refreshing;

  return (
    <RoleGate minRank={navMinRank('tasks')}>
      <ScreenWrapper>
        <AppHeader title="Tasks" subtitle="Assigned and tracked tasks" showBack showMenu />
        <View style={[styles.content, { paddingHorizontal: layout.padding, maxWidth: layout.contentMaxWidth, alignSelf: layout.isTablet ? 'center' : 'stretch' }]}>
          <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MaterialCommunityIcons name="magnify" size={20} color={colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Search tasks…"
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

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
            {PRIORITY_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: priorityFilter === opt ? colors.gold : colors.surface,
                    borderColor: priorityFilter === opt ? colors.gold : colors.border,
                  },
                ]}
                onPress={() => setPriorityFilter(opt)}
              >
                <Text style={[styles.filterText, { color: priorityFilter === opt ? '#0c0f13' : colors.textSecondary }]}>
                  {opt === 'all' ? 'All Priorities' : opt.charAt(0).toUpperCase() + opt.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

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
  filterScroll: { marginBottom: 8, maxHeight: 40 },
  filterContent: { gap: 8, paddingHorizontal: 2 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  filterText: { fontSize: 13, fontWeight: '600' },
  list: { gap: 12, paddingBottom: 24 },
  taskCard: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 6 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  taskTitle: { fontSize: 14, fontWeight: '600', flex: 1 },
  taskDesc: { fontSize: 12, lineHeight: 16 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  assignedRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  assignedText: { fontSize: 12 },
  unassignedText: { fontSize: 12, fontStyle: 'italic' },
  dueText: { fontSize: 12 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  centerState: { flex: 1, minHeight: 300, justifyContent: 'center' },
  loadingText: { fontSize: 14, marginTop: 12, textAlign: 'center' },
  footerLoader: { paddingVertical: 16, alignItems: 'center' },
});
