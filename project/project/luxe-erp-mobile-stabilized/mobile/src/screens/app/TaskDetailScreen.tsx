import React, { useCallback, useState } from 'react';
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
import { useThemeStore } from '@store/themeStore';
import { useTaskDetail, useUpdateTaskStatus } from '@hooks/useERP';
import { useResponsive } from '@hooks/useResponsive';
import { useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getIconName } from '@config/icons';
import { navMinRank } from '@constants';
import type { IconName, ThemeColors } from '@apptypes';
import type { TaskStatus, TaskPriority } from '@apptypes/erp';

function InfoRow({ label, value, icon, colors }: { label: string; value: string; icon: IconName; colors: ThemeColors }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoLeft}>
        <MaterialCommunityIcons name={getIconName(icon)} size={18} color={colors.textMuted} />
        <Text style={[styles.infoLabel, { color: colors.textMuted }]}>{label}</Text>
      </View>
      <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{value}</Text>
    </View>
  );
}

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

function PriorityBadge({ priority, colors }: { priority: TaskPriority; colors: ThemeColors }) {
  const colorMap: Record<string, string> = {
    low: colors.textMuted,
    medium: colors.accent,
    high: colors.warning,
    urgent: colors.error,
  };
  const color = colorMap[priority] ?? colors.textMuted;
  return (
    <View style={[styles.priorityBadge, { backgroundColor: color + '20' }]}>
      <Text style={[styles.priorityText, { color }]}>{priority}</Text>
    </View>
  );
}

export default function TaskDetailScreen() {
  const { colors } = useThemeStore();
  const params = useLocalSearchParams<{ id: string }>();
  const layout = useResponsive();

  const taskId = params.id;
  const taskQuery = useTaskDetail(taskId);
  const updateStatus = useUpdateTaskStatus();

  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState(false);

  const onRefresh = useCallback(async () => {
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
  const overdue = task.due_date && new Date(task.due_date).getTime() < Date.now() && task.status !== 'completed' && task.status !== 'cancelled';

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
            <View style={styles.headerRow}>
              <View style={[styles.iconBox, { backgroundColor: colors.surfaceElevated }]}>
                <MaterialCommunityIcons name={getIconName('tasks')} size={28} color={colors.gold} />
              </View>
              <View style={styles.headerInfo}>
                <Text style={[styles.taskTitle, { color: colors.textPrimary }]}>{task.title}</Text>
                <View style={styles.badgeRow}>
                  <StatusBadge status={task.status} colors={colors} />
                  <PriorityBadge priority={task.priority} colors={colors} />
                </View>
              </View>
            </View>
          </Card>

          {task.description ? (
            <Card>
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Description</Text>
              <Text style={[styles.descText, { color: colors.textSecondary }]}>{task.description}</Text>
            </Card>
          ) : null}

          <Card>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Task Information</Text>
            <View style={styles.infoContainer}>
              <InfoRow label="Status" value={task.status.replace('_', ' ')} icon="clipboard" colors={colors} />
              <InfoRow label="Priority" value={task.priority} icon="flag" colors={colors} />
              {task.due_date ? (
                <InfoRow
                  label="Due Date"
                  value={new Date(task.due_date).toLocaleDateString()}
                  icon="calendar"
                  colors={colors}
                />
              ) : null}
              <InfoRow label="Created" value={new Date(task.created_at).toLocaleDateString()} icon="calendar" colors={colors} />
              <InfoRow label="Updated" value={new Date(task.updated_at).toLocaleDateString()} icon="clock" colors={colors} />
            </View>
          </Card>

          <Card>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Assignment</Text>
            <View style={styles.infoContainer}>
              {task.assigned_employee_name ? (
                <>
                  <InfoRow label="Assigned To" value={task.assigned_employee_name} icon="account" colors={colors} />
                  {task.assigned_employee_email ? (
                    <InfoRow label="Email" value={task.assigned_employee_email} icon="email" colors={colors} />
                  ) : null}
                </>
              ) : (
                <View style={styles.unassignedRow}>
                  <MaterialCommunityIcons name="account-off-outline" size={18} color={colors.textMuted} />
                  <Text style={[styles.unassignedText, { color: colors.textMuted }]}>No employee assigned</Text>
                </View>
              )}
            </View>
          </Card>

          {overdue ? (
            <View style={[styles.overdueBanner, { backgroundColor: colors.error + '15' }]}>
              <MaterialCommunityIcons name="alert-circle" size={20} color={colors.error} />
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
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  iconBox: { width: 56, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  headerInfo: { flex: 1, gap: 6 },
  taskTitle: { fontSize: 20, fontWeight: '700', lineHeight: 26 },
  badgeRow: { flexDirection: 'row', gap: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  priorityBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  priorityText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  sectionTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  descText: { fontSize: 14, lineHeight: 20 },
  infoContainer: { gap: 10 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoLabel: { fontSize: 14 },
  infoValue: { fontSize: 14, fontWeight: '500', maxWidth: 180, textAlign: 'right' },
  unassignedRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  unassignedText: { fontSize: 14, fontStyle: 'italic' },
  overdueBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10 },
  overdueText: { fontSize: 14, fontWeight: '600' },
  statusActions: { flexDirection: 'row', gap: 12 },
  statusActionBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statusActionText: { fontSize: 15, fontWeight: '600' },
});
