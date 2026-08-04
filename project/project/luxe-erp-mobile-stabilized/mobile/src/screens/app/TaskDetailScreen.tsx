import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { ScreenWrapper } from '@components/ScreenWrapper';
import { AppHeader } from '@components/AppHeader';
import { Card } from '@components/Card';
import { ErrorState } from '@components/ErrorState';
import { LoadingState } from '@components/LoadingState';
import { RoleGate } from '@components/RoleGate';
import { InfoRow, InfoGroup } from '@components/InfoRow';
import { StatusBadge, PriorityBadge } from '@components/StatusBadge';
import { DetailHeader } from '@components/DetailHeader';
import { CardSection } from '@components/SectionHeader';
import { useThemeStore } from '@store/themeStore';
import { useTaskDetail, useUpdateTaskStatus } from '@hooks/useERP';
import { useResponsive } from '@hooks/useResponsive';
import { useLocalSearchParams } from 'expo-router';
import { formatDate, isOverdue } from '@lib/format';
import { navMinRank } from '@constants';
import type { TaskStatus } from '@apptypes/erp';

export default function TaskDetailScreen() {
  const { colors } = useThemeStore();
  const params = useLocalSearchParams<{ id: string }>();
  const layout = useResponsive();

  const taskId = params.id;
  const taskQuery = useTaskDetail(taskId);
  const updateStatus = useUpdateTaskStatus();

  const [refreshing, setRefreshing] = React.useState(false);
  const [updating, setUpdating] = React.useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await taskQuery.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [taskQuery]);

  const handleStatusUpdate = (newStatus: TaskStatus, label: string) => {
    Alert.alert('Update Status', `Change task status to "${label}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        style: 'default',
        onPress: async () => {
          setUpdating(true);
          try {
            await updateStatus(taskId, newStatus);
          } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update status.');
          } finally {
            setUpdating(false);
          }
        },
      },
    ]);
  };

  if (taskQuery.isLoading) {
    return (
      <RoleGate minRank={navMinRank('tasks')}>
        <ScreenWrapper>
          <AppHeader title="Task Details" showBack showMenu />
          <LoadingState message="Loading task…" />
        </ScreenWrapper>
      </RoleGate>
    );
  }

  if (taskQuery.isError || !taskQuery.data) {
    return (
      <RoleGate minRank={navMinRank('tasks')}>
        <ScreenWrapper>
          <AppHeader title="Task Details" showBack showMenu />
          <ErrorState
            title="Task not found"
            message="This task may have been removed or is unavailable."
            onRetry={() => taskQuery.refetch()}
          />
        </ScreenWrapper>
      </RoleGate>
    );
  }

  const task = taskQuery.data;
  const overdue = isOverdue(task.due_date, task.status);

  const statusActions: Array<{ status: TaskStatus; label: string }> = [];
  if (task.status === 'pending') {
    statusActions.push({ status: 'in_progress', label: 'Start' });
    statusActions.push({ status: 'completed', label: 'Complete' });
    statusActions.push({ status: 'cancelled', label: 'Cancel' });
  } else if (task.status === 'in_progress') {
    statusActions.push({ status: 'completed', label: 'Complete' });
    statusActions.push({ status: 'cancelled', label: 'Cancel' });
  }

  return (
    <RoleGate minRank={navMinRank('tasks')}>
      <ScreenWrapper>
        <AppHeader title="Task Details" showBack showMenu />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingHorizontal: layout.padding, gap: layout.cardGap, maxWidth: layout.contentMaxWidth, alignSelf: layout.isTablet ? 'center' : 'stretch' }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} colors={[colors.gold]} />}
        >
          <Card>
            <DetailHeader
              icon="tasks"
              title={task.title}
              right={
                <View style={styles.badgeRow}>
                  <StatusBadge status={task.status} />
                  <PriorityBadge priority={task.priority} />
                </View>
              }
            />
          </Card>

          {task.description ? (
            <Card>
              <CardSection title="Description">
                <Text style={[styles.descText, { color: colors.textSecondary }]}>{task.description}</Text>
              </CardSection>
            </Card>
          ) : null}

          <Card>
            <CardSection title="Task Information">
              <InfoGroup>
                <InfoRow label="Status" value={task.status.replace('_', ' ')} icon="clipboard" />
                <InfoRow label="Priority" value={task.priority} icon="flag" />
                {task.due_date ? (
                  <InfoRow label="Due Date" value={formatDate(task.due_date)} icon="calendar" />
                ) : null}
                <InfoRow label="Created" value={formatDate(task.created_at)} icon="calendar" />
                <InfoRow label="Updated" value={formatDate(task.updated_at)} icon="clock" />
              </InfoGroup>
            </CardSection>
          </Card>

          <Card>
            <CardSection title="Assignment">
              <InfoGroup>
                {task.assigned_employee_name ? (
                  <>
                    <InfoRow label="Assigned To" value={task.assigned_employee_name} icon="account" />
                    {task.assigned_employee_email ? (
                      <InfoRow label="Email" value={task.assigned_employee_email} icon="email" />
                    ) : null}
                  </>
                ) : (
                  <View style={styles.unassignedRow}>
                    <Text style={[styles.unassignedText, { color: colors.textMuted }]}>No employee assigned</Text>
                  </View>
                )}
              </InfoGroup>
            </CardSection>
          </Card>

          {overdue ? (
            <View style={[styles.overdueBanner, { backgroundColor: colors.error + '15' }]}>
              <Text style={[styles.overdueText, { color: colors.error }]}>This task is overdue</Text>
            </View>
          ) : null}

          {statusActions.length > 0 && (
            <View style={styles.statusActions}>
              {statusActions.map((action) => (
                <TouchableOpacity
                  key={action.status}
                  style={[
                    styles.statusActionBtn,
                    {
                      backgroundColor: action.status === 'completed' ? colors.success : action.status === 'cancelled' ? colors.errorLight : colors.gold,
                    },
                  ]}
                  onPress={() => handleStatusUpdate(action.status, action.label)}
                  disabled={updating}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.statusActionText,
                      { color: action.status === 'cancelled' ? colors.error : '#0c0f13' },
                    ]}
                  >
                    {updating ? 'Updating…' : action.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </ScreenWrapper>
    </RoleGate>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingBottom: 24 },
  badgeRow: { flexDirection: 'row', gap: 8 },
  descText: { fontSize: 14, lineHeight: 20 },
  unassignedRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  unassignedText: { fontSize: 14, fontStyle: 'italic' },
  overdueBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10 },
  overdueText: { fontSize: 14, fontWeight: '600' },
  statusActions: { flexDirection: 'row', gap: 12 },
  statusActionBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statusActionText: { fontSize: 15, fontWeight: '600' },
});
