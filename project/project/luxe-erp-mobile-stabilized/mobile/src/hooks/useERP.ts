import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { storage } from '@lib/storage';
import { queryClient } from '@lib/queryClient';
import { APP_CONFIG } from '@constants';
import {
  fetchDashboardSummary,
  fetchRecentNotifications,
  fetchProducts,
  fetchProductById,
  fetchCategoriesWithCounts,
  fetchCategoryById,
  fetchInventory,
  fetchBranches,
  fetchBranchById,
  fetchWarehouses,
  fetchWarehouseById,
  fetchCustomers,
  fetchCustomerById,
  fetchSuppliers,
  fetchSupplierById,
  fetchPurchaseOrders,
  fetchPurchaseOrderById,
  fetchSalesOrders,
  fetchSalesOrderById,
  fetchEmployees,
  fetchEmployeeById,
  fetchReports,
  fetchAnalyticsSummary,
  fetchReceivingList,
  fetchReceivingById,
  fetchTasks,
  fetchTaskById,
  fetchNotifications,
  fetchProductIdByBarcode,
  fetchStockTransfers,
  fetchStockTransferById,
  updateStockTransferStatus,
  fetchUserSettings,
  updateUserSettings,
  changePassword,
  fetchAuditLogs,
  logAuditEntry,
  fetchAttachments,
  deleteAttachment,
  type SortOrder,
  type PurchaseOrderListParams,
  type SalesOrderListParams,
  type ProductListResult,
  type InventoryFilter,
  type EmployeeListParams,
  type ReportListParams,
  type ReceivingListParams,
  type TaskListParams,
  type StockTransferListParams,
  type UserSettings,
  type AuditLogListParams,
  type AuditLogListResult,
} from '@services/erpService';
import type {
  DashboardSummary,
  ERPNotification,
  CategoryWithCount,
  InventoryItemWithStatus,
  Branch,
  BranchDetail,
  Warehouse,
  WarehouseDetail,
  ProductDetail,
  CustomerDetail,
  CustomerListResult,
  SupplierDetail,
  SupplierListResult,
  PurchaseOrderListItem,
  PurchaseOrderListResult,
  PurchaseOrderDetail,
  SalesOrderListItem,
  SalesOrderListResult,
  SalesOrderDetail,
  EmployeeListItem,
  EmployeeListResult,
  EmployeeDetail,
  ReportListItem,
  ReportListResult,
  AnalyticsSummary,
  ReceivingListItem,
  ReceivingListResult,
  ReceivingDetail,
  TaskListItem,
  TaskListResult,
  TaskDetail,
  TaskStatus,
  StockTransferListItem,
  StockTransferListResult,
  StockTransferDetail,
  StockTransferStatus,
  AuditLog,
  FileAttachment,
} from '@apptypes/erp';
import type { Profile } from '@apptypes';
import {
  fetchProfileWithBranch,
  updateProfile,
  uploadProfileAvatar,
  type ProfileUpdate,
  type ProfileWithBranch,
} from '@services/erpService';

// ============================================================
// Query Keys
// ============================================================

export const erpKeys = {
  dashboard: ['erp', 'dashboard'] as const,
  notifications: (limit: number) => ['erp', 'notifications', limit] as const,
  products: ['erp', 'products'] as const,
  productsList: (search: string, categoryId: string | null, sortBy?: string, sortOrder?: SortOrder) => ['erp', 'products', 'list', search, categoryId, sortBy ?? 'created_at', sortOrder ?? 'desc'] as const,
  product: (id: string) => ['erp', 'products', 'detail', id] as const,
  categories: ['erp', 'categories'] as const,
  category: (id: string) => ['erp', 'categories', 'detail', id] as const,
  inventory: (filters: InventoryFilter) => ['erp', 'inventory', filters] as const,
  branches: ['erp', 'branches'] as const,
  branch: (id: string) => ['erp', 'branches', 'detail', id] as const,
  warehouses: ['erp', 'warehouses'] as const,
  warehouse: (id: string) => ['erp', 'warehouses', 'detail', id] as const,
  notificationsAll: (userId: string) => ['erp', 'notifications', 'all', userId] as const,
  profileWithBranch: (userId: string) => ['erp', 'profile', userId] as const,
  customersList: (search: string) => ['erp', 'customers', 'list', search] as const,
  customer: (id: string) => ['erp', 'customers', 'detail', id] as const,
  suppliersList: (search: string) => ['erp', 'suppliers', 'list', search] as const,
  supplier: (id: string) => ['erp', 'suppliers', 'detail', id] as const,
  purchaseOrdersList: (search: string, status: string) => ['erp', 'purchase-orders', 'list', search, status] as const,
  purchaseOrder: (id: string) => ['erp', 'purchase-orders', 'detail', id] as const,
  salesOrdersList: (search: string, status: string) => ['erp', 'sales-orders', 'list', search, status] as const,
  salesOrder: (id: string) => ['erp', 'sales-orders', 'detail', id] as const,
  employeesList: (search: string) => ['erp', 'employees', 'list', search] as const,
  employee: (id: string) => ['erp', 'employees', 'detail', id] as const,
  reportsList: (search: string) => ['erp', 'reports', 'list', search] as const,
  analytics: ['erp', 'analytics'] as const,
  receivingList: (search: string, status: string) => ['erp', 'receiving', 'list', search, status] as const,
  receiving: (id: string) => ['erp', 'receiving', 'detail', id] as const,
  tasksList: (search: string, status: string, priority: string) => ['erp', 'tasks', 'list', search, status, priority] as const,
  task: (id: string) => ['erp', 'tasks', 'detail', id] as const,
  stockTransfersList: (search: string, status: string) => ['erp', 'stock-transfers', 'list', search, status] as const,
  stockTransfer: (id: string) => ['erp', 'stock-transfers', 'detail', id] as const,
};

// ============================================================
// Offline cache helpers
// ============================================================

async function cachedQuery<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  staleTime = 30_000,
): Promise<T> {
  try {
    const data = await fetcher();
    storage.set(cacheKey, data).catch(() => {});
    return data;
  } catch (err) {
    const cached = await storage.get<T>(cacheKey);
    if (cached !== null) return cached;
    throw err;
  }
}

// ============================================================
// Dashboard Hooks
// ============================================================

export function useDashboardSummary() {
  return useQuery<DashboardSummary>({
    queryKey: erpKeys.dashboard,
    queryFn: () => cachedQuery('dashboard', fetchDashboardSummary, 60_000),
    staleTime: 60_000,
  });
}

export function useRecentNotifications(userId: string | null | undefined, limit = 5) {
  return useQuery<ERPNotification[]>({
    queryKey: erpKeys.notifications(limit),
    queryFn: () => cachedQuery(`notifications_${limit}`, () => fetchRecentNotifications(userId!, limit), 30_000),
    enabled: !!userId,
    staleTime: 30_000,
  });
}

// ============================================================
// Product Hooks
// ============================================================

export function useProducts(search: string, categoryId: string | null, sortBy?: string, sortOrder?: SortOrder) {
  return useInfiniteQuery<ProductListResult>({
    queryKey: erpKeys.productsList(search, categoryId ?? 'all', sortBy ?? 'created_at', sortOrder ?? 'desc'),
    queryFn: ({ pageParam }) =>
      fetchProducts({
        search: search || undefined,
        categoryId: categoryId ?? undefined,
        cursor: (pageParam as string | null) ?? null,
        limit: APP_CONFIG.itemsPerPage,
        sortBy: sortBy ?? 'created_at',
        sortOrder: sortOrder ?? 'desc',
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 30_000,
  });
}

export function useProduct(id: string | null) {
  return useQuery<ProductDetail>({
    queryKey: erpKeys.product(id ?? ''),
    queryFn: () => cachedQuery(`product_${id}`, () => fetchProductById(id!), 60_000),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export type { ProductListItem, ProductListResult } from '@services/erpService';

// ============================================================
// Category Hooks
// ============================================================

export function useCategories(sortBy?: string, sortOrder?: SortOrder) {
  return useQuery<CategoryWithCount[]>({
    queryKey: [...erpKeys.categories, sortBy ?? 'sort_order', sortOrder ?? 'asc'] as const,
    queryFn: () => cachedQuery(`categories_${sortBy ?? 'sort_order'}_${sortOrder ?? 'asc'}`, () => fetchCategoriesWithCounts({ sortBy, sortOrder }), 5 * 60_000),
    staleTime: 5 * 60_000,
  });
}

export function useCategoryDetail(id: string | null) {
  return useQuery<CategoryWithCount>({
    queryKey: erpKeys.category(id ?? ''),
    queryFn: () => cachedQuery(`category_${id}`, () => fetchCategoryById(id!), 60_000),
    enabled: !!id,
    staleTime: 60_000,
  });
}

// ============================================================
// Inventory Hooks
// ============================================================

export function useInventory(filters: InventoryFilter = {}) {
  const filterKey = JSON.stringify(filters);
  return useQuery<InventoryItemWithStatus[]>({
    queryKey: erpKeys.inventory(filters),
    queryFn: () => cachedQuery(`inventory_${filterKey}`, () => fetchInventory(filters), 30_000),
    staleTime: 30_000,
  });
}

// ============================================================
// Branches & Warehouses Hooks
// ============================================================

export function useBranches(sortBy?: string, sortOrder?: SortOrder) {
  return useQuery<Branch[]>({
    queryKey: [...erpKeys.branches, sortBy ?? 'name', sortOrder ?? 'asc'] as const,
    queryFn: () => cachedQuery(`branches_${sortBy ?? 'name'}_${sortOrder ?? 'asc'}`, () => fetchBranches({ sortBy, sortOrder }), 5 * 60_000),
    staleTime: 5 * 60_000,
  });
}

export function useBranchDetail(id: string | null) {
  return useQuery<BranchDetail>({
    queryKey: erpKeys.branch(id ?? ''),
    queryFn: () => cachedQuery(`branch_${id}`, () => fetchBranchById(id!), 60_000),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useWarehouses(sortBy?: string, sortOrder?: SortOrder) {
  return useQuery<Warehouse[]>({
    queryKey: [...erpKeys.warehouses, sortBy ?? 'name', sortOrder ?? 'asc'] as const,
    queryFn: () => cachedQuery(`warehouses_${sortBy ?? 'name'}_${sortOrder ?? 'asc'}`, () => fetchWarehouses({ sortBy, sortOrder }), 5 * 60_000),
    staleTime: 5 * 60_000,
  });
}

export function useWarehouseDetail(id: string | null) {
  return useQuery<WarehouseDetail>({
    queryKey: erpKeys.warehouse(id ?? ''),
    queryFn: () => cachedQuery(`warehouse_${id}`, () => fetchWarehouseById(id!), 60_000),
    enabled: !!id,
    staleTime: 60_000,
  });
}

// ============================================================
// Refresh Helper
// ============================================================

export function useRefreshERP() {
  return async () => {
    await queryClient.invalidateQueries({ queryKey: ['erp'] });
  };
}

// ============================================================
// Notification Hooks
// ============================================================

export function useNotifications(userId: string | null) {
  return useQuery<ERPNotification[]>({
    queryKey: erpKeys.notificationsAll(userId ?? ''),
    queryFn: () => cachedQuery(`notifications_all_${userId}`, () => fetchNotifications(userId!), 30_000),
    enabled: !!userId,
    staleTime: 30_000,
  });
}

export function useMarkNotificationAsRead() {
  return async (id: string, userId: string) => {
    const { markNotificationAsRead } = await import('@services/erpService');
    await markNotificationAsRead(id);
    await queryClient.invalidateQueries({ queryKey: erpKeys.notificationsAll(userId) });
  };
}

export function useMarkAllNotificationsAsRead() {
  return async (userId: string) => {
    const { markAllNotificationsAsRead } = await import('@services/erpService');
    await markAllNotificationsAsRead(userId);
    await queryClient.invalidateQueries({ queryKey: erpKeys.notificationsAll(userId) });
  };
}

// ============================================================
// Profile Hooks
// ============================================================

export function useProfileWithBranch(userId: string | null) {
  return useQuery<ProfileWithBranch>({
    queryKey: erpKeys.profileWithBranch(userId ?? ''),
    queryFn: () => cachedQuery(`profile_${userId}`, () => fetchProfileWithBranch(userId!), 60_000),
    enabled: !!userId,
    staleTime: 60_000,
  });
}

export function useUpdateProfile() {
  return async (userId: string, updates: ProfileUpdate): Promise<Profile> => {
    const updated = await updateProfile(userId, updates);
    await queryClient.invalidateQueries({ queryKey: erpKeys.profileWithBranch(userId) });
    return updated;
  };
}

export function useUploadAvatar() {
  return async (userId: string, fileUri: string, mimeType: string): Promise<string> => {
    const publicUrl = await uploadProfileAvatar(userId, fileUri, mimeType);
    await queryClient.invalidateQueries({ queryKey: erpKeys.profileWithBranch(userId) });
    return publicUrl;
  };
}

// ============================================================
// Customer Hooks
// ============================================================

export function useCustomers(search: string, sortBy?: string, sortOrder?: SortOrder) {
  return useInfiniteQuery<CustomerListResult>({
    queryKey: [...erpKeys.customersList(search), sortBy ?? 'created_at', sortOrder ?? 'desc'] as const,
    queryFn: ({ pageParam }) =>
      fetchCustomers({
        search: search || undefined,
        cursor: (pageParam as string | null) ?? null,
        limit: APP_CONFIG.itemsPerPage,
        sortBy: sortBy ?? 'created_at',
        sortOrder: sortOrder ?? 'desc',
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 30_000,
  });
}

export function useCustomerDetail(id: string | null) {
  return useQuery<CustomerDetail>({
    queryKey: erpKeys.customer(id ?? ''),
    queryFn: () => cachedQuery(`customer_${id}`, () => fetchCustomerById(id!), 60_000),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export type { CustomerListItem, CustomerListResult } from '@services/erpService';

// ============================================================
// Supplier Hooks
// ============================================================

export function useSuppliers(search: string, sortBy?: string, sortOrder?: SortOrder) {
  return useInfiniteQuery<SupplierListResult>({
    queryKey: [...erpKeys.suppliersList(search), sortBy ?? 'created_at', sortOrder ?? 'desc'] as const,
    queryFn: ({ pageParam }) =>
      fetchSuppliers({
        search: search || undefined,
        cursor: (pageParam as string | null) ?? null,
        limit: APP_CONFIG.itemsPerPage,
        sortBy: sortBy ?? 'created_at',
        sortOrder: sortOrder ?? 'desc',
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 30_000,
  });
}

export function useSupplierDetail(id: string | null) {
  return useQuery<SupplierDetail>({
    queryKey: erpKeys.supplier(id ?? ''),
    queryFn: () => cachedQuery(`supplier_${id}`, () => fetchSupplierById(id!), 60_000),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export type { SupplierListItem, SupplierListResult } from '@services/erpService';

// ============================================================
// Purchase Order Hooks
// ============================================================

export function usePurchaseOrders(search: string, status: string, sortBy?: string, sortOrder?: SortOrder) {
  return useInfiniteQuery<PurchaseOrderListResult>({
    queryKey: [...erpKeys.purchaseOrdersList(search, status), sortBy ?? 'created_at', sortOrder ?? 'desc'] as const,
    queryFn: ({ pageParam }) =>
      fetchPurchaseOrders({
        search: search || undefined,
        status: status || undefined,
        cursor: (pageParam as string | null) ?? null,
        limit: APP_CONFIG.itemsPerPage,
        sortBy: sortBy ?? 'created_at',
        sortOrder: sortOrder ?? 'desc',
      } satisfies PurchaseOrderListParams),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 30_000,
  });
}

export function usePurchaseOrderDetail(id: string | null) {
  return useQuery<PurchaseOrderDetail>({
    queryKey: erpKeys.purchaseOrder(id ?? ''),
    queryFn: () => cachedQuery(`po_${id}`, () => fetchPurchaseOrderById(id!), 60_000),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export type { PurchaseOrderListItem, PurchaseOrderListResult };

// ============================================================
// Sales Order Hooks
// ============================================================

export function useSalesOrders(search: string, status: string, sortBy?: string, sortOrder?: SortOrder) {
  return useInfiniteQuery<SalesOrderListResult>({
    queryKey: [...erpKeys.salesOrdersList(search, status), sortBy ?? 'placed_at', sortOrder ?? 'desc'] as const,
    queryFn: ({ pageParam }) =>
      fetchSalesOrders({
        search: search || undefined,
        status: status || undefined,
        cursor: (pageParam as string | null) ?? null,
        limit: APP_CONFIG.itemsPerPage,
        sortBy: sortBy ?? 'placed_at',
        sortOrder: sortOrder ?? 'desc',
      } satisfies SalesOrderListParams),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 30_000,
  });
}

export function useSalesOrderDetail(id: string | null) {
  return useQuery<SalesOrderDetail>({
    queryKey: erpKeys.salesOrder(id ?? ''),
    queryFn: () => cachedQuery(`sales_order_${id}`, () => fetchSalesOrderById(id!), 60_000),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export type { SalesOrderListItem, SalesOrderListResult };

// ============================================================
// Employee Hooks
// ============================================================

export function useEmployees(search: string, sortBy?: string, sortOrder?: SortOrder) {
  return useInfiniteQuery<EmployeeListResult>({
    queryKey: [...erpKeys.employeesList(search), sortBy ?? 'created_at', sortOrder ?? 'desc'] as const,
    queryFn: ({ pageParam }) =>
      fetchEmployees({
        search: search || undefined,
        cursor: (pageParam as string | null) ?? null,
        limit: APP_CONFIG.itemsPerPage,
        sortBy: sortBy ?? 'created_at',
        sortOrder: sortOrder ?? 'desc',
      } satisfies EmployeeListParams),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 30_000,
  });
}

export function useEmployeeDetail(id: string | null) {
  return useQuery<EmployeeDetail>({
    queryKey: erpKeys.employee(id ?? ''),
    queryFn: () => cachedQuery(`employee_${id}`, () => fetchEmployeeById(id!), 60_000),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export type { EmployeeListItem, EmployeeListResult };

// ============================================================
// Report Hooks
// ============================================================

export function useReports(search: string, sortBy?: string, sortOrder?: SortOrder) {
  return useInfiniteQuery<ReportListResult>({
    queryKey: [...erpKeys.reportsList(search), sortBy ?? 'created_at', sortOrder ?? 'desc'] as const,
    queryFn: ({ pageParam }) =>
      fetchReports({
        search: search || undefined,
        cursor: (pageParam as string | null) ?? null,
        limit: APP_CONFIG.itemsPerPage,
        sortBy: sortBy ?? 'created_at',
        sortOrder: sortOrder ?? 'desc',
      } satisfies ReportListParams),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 60_000,
  });
}

export type { ReportListItem, ReportListResult };

// ============================================================
// Analytics Hooks
// ============================================================

export function useAnalyticsSummary() {
  return useQuery<AnalyticsSummary>({
    queryKey: erpKeys.analytics,
    queryFn: () => cachedQuery('analytics', fetchAnalyticsSummary, 60_000),
    staleTime: 60_000,
  });
}

// ============================================================
// Receiving Hooks
// ============================================================

export function useReceivingList(search: string, status: string, sortBy?: string, sortOrder?: SortOrder) {
  return useInfiniteQuery<ReceivingListResult>({
    queryKey: [...erpKeys.receivingList(search, status), sortBy ?? 'created_at', sortOrder ?? 'desc'] as const,
    queryFn: ({ pageParam }) =>
      fetchReceivingList({
        search: search || undefined,
        status: status || undefined,
        cursor: (pageParam as string | null) ?? null,
        limit: APP_CONFIG.itemsPerPage,
        sortBy: sortBy ?? 'created_at',
        sortOrder: sortOrder ?? 'desc',
      } satisfies ReceivingListParams),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 30_000,
  });
}

export function useReceivingDetail(id: string | null) {
  return useQuery<ReceivingDetail>({
    queryKey: erpKeys.receiving(id ?? ''),
    queryFn: () => cachedQuery(`receiving_${id}`, () => fetchReceivingById(id!), 30_000),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useUpdateReceivedQuantity() {
  return async (itemId: string, receivedQuantity: number, poId: string): Promise<void> => {
    const { updateReceivedQuantity } = await import('@services/erpService');
    await updateReceivedQuantity(itemId, receivedQuantity);
    await queryClient.invalidateQueries({ queryKey: erpKeys.receiving(poId) });
    await queryClient.invalidateQueries({ queryKey: ['erp', 'receiving'] });
  };
}

export function useCompleteReceiving() {
  return async (poId: string): Promise<void> => {
    const { completeReceiving } = await import('@services/erpService');
    await completeReceiving(poId);
    await queryClient.invalidateQueries({ queryKey: erpKeys.receiving(poId) });
    await queryClient.invalidateQueries({ queryKey: ['erp', 'receiving'] });
    await queryClient.invalidateQueries({ queryKey: ['erp', 'purchase-orders'] });
  };
}

// ============================================================
// Task Hooks
// ============================================================

export function useTasks(search: string, status: string, priority: string, sortBy?: string, sortOrder?: SortOrder) {
  return useInfiniteQuery<TaskListResult>({
    queryKey: [...erpKeys.tasksList(search, status, priority), sortBy ?? 'created_at', sortOrder ?? 'desc'] as const,
    queryFn: ({ pageParam }) =>
      fetchTasks({
        search: search || undefined,
        status: status || undefined,
        priority: priority || undefined,
        cursor: (pageParam as string | null) ?? null,
        limit: APP_CONFIG.itemsPerPage,
        sortBy: sortBy ?? 'created_at',
        sortOrder: sortOrder ?? 'desc',
      } satisfies TaskListParams),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 30_000,
  });
}

export function useTaskDetail(id: string | null) {
  return useQuery<TaskDetail>({
    queryKey: erpKeys.task(id ?? ''),
    queryFn: () => cachedQuery(`task_${id}`, () => fetchTaskById(id!), 30_000),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useUpdateTaskStatus() {
  return async (id: string, status: TaskStatus): Promise<void> => {
    const { updateTaskStatus } = await import('@services/erpService');
    await updateTaskStatus(id, status);
    await queryClient.invalidateQueries({ queryKey: erpKeys.task(id) });
    await queryClient.invalidateQueries({ queryKey: ['erp', 'tasks'] });
  };
}

// ============================================================
// Stock Transfer Hooks
// ============================================================

export function useStockTransfers(search: string, status: string, sortBy?: string, sortOrder?: SortOrder) {
  return useInfiniteQuery<StockTransferListResult>({
    queryKey: [...erpKeys.stockTransfersList(search, status), sortBy ?? 'created_at', sortOrder ?? 'desc'] as const,
    queryFn: ({ pageParam }) =>
      fetchStockTransfers({
        search: search || undefined,
        status: status || undefined,
        cursor: (pageParam as string | null) ?? null,
        limit: APP_CONFIG.itemsPerPage,
        sortBy: sortBy ?? 'created_at',
        sortOrder: sortOrder ?? 'desc',
      } satisfies StockTransferListParams),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 30_000,
  });
}

export function useStockTransferDetail(id: string | null) {
  return useQuery<StockTransferDetail>({
    queryKey: erpKeys.stockTransfer(id ?? ''),
    queryFn: () => cachedQuery(`stock_transfer_${id}`, () => fetchStockTransferById(id!), 30_000),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useUpdateStockTransferStatus() {
  return async (id: string, status: StockTransferStatus): Promise<void> => {
    await updateStockTransferStatus(id, status);
    await queryClient.invalidateQueries({ queryKey: erpKeys.stockTransfer(id) });
    await queryClient.invalidateQueries({ queryKey: ['erp', 'stock-transfers'] });
  };
}

export { fetchProductIdByBarcode, type SortOrder, type UserSettings };

// ============================================================
// User Settings Hooks
// ============================================================

export function useUserSettings(userId: string | null) {
  return useQuery<UserSettings | null>({
    queryKey: ['erp', 'user-settings', userId ?? ''] as const,
    queryFn: () => cachedQuery(`user_settings_${userId}`, () => fetchUserSettings(userId!), 60_000),
    enabled: !!userId,
    staleTime: 60_000,
  });
}

export function useUpdateUserSettings() {
  return async (userId: string, updates: Partial<UserSettings>): Promise<void> => {
    await updateUserSettings(userId, updates);
    await queryClient.invalidateQueries({ queryKey: ['erp', 'user-settings', userId] });
  };
}

export function useChangePassword() {
  return async (currentPassword: string, newPassword: string): Promise<void> => {
    await changePassword(currentPassword, newPassword);
  };
}

// ============================================================
// POS Checkout Hook
// ============================================================

export function useCreatePOSOrder() {
  return async (params: import('@services/erpService').POSCheckoutParams): Promise<{ orderId: string; orderNumber: string }> => {
    const { createPOSOrder } = await import('@services/erpService');
    const result = await createPOSOrder(params);
    await queryClient.invalidateQueries({ queryKey: ['erp'] });
    return result;
  };
}

export type { ReceivingListItem, ReceivingListResult, ReceivingDetail, TaskListItem, TaskListResult, TaskDetail, StockTransferListItem, StockTransferListResult, StockTransferDetail };

// ============================================================
// Audit Log Hooks
// ============================================================

export function useAuditLogs(search: string, module: string, action: string) {
  return useInfiniteQuery<AuditLogListResult>({
    queryKey: ['erp', 'audit-logs', search, module, action] as const,
    queryFn: ({ pageParam }) =>
      fetchAuditLogs({
        search: search || undefined,
        module: module || undefined,
        action: action || undefined,
        cursor: (pageParam as string | null) ?? null,
        limit: APP_CONFIG.itemsPerPage,
      } satisfies AuditLogListParams),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 30_000,
  });
}

export function useLogAuditEntry() {
  return async (entry: {
    action: string;
    module: string;
    entity_id?: string | null;
    entity_type?: string | null;
    before_values?: Record<string, unknown> | null;
    after_values?: Record<string, unknown> | null;
  }): Promise<void> => {
    await logAuditEntry(entry);
    await queryClient.invalidateQueries({ queryKey: ['erp', 'audit-logs'] });
  };
}

// ============================================================
// File Attachment Hooks
// ============================================================

export function useAttachments(entityType: string, entityId: string | null) {
  return useQuery<FileAttachment[]>({
    queryKey: ['erp', 'attachments', entityType, entityId ?? ''] as const,
    queryFn: () => cachedQuery(`attachments_${entityType}_${entityId}`, () => fetchAttachments(entityType, entityId!), 30_000),
    enabled: !!entityId,
    staleTime: 30_000,
  });
}

export function useDeleteAttachment() {
  return async (id: string, entityType: string, entityId: string): Promise<void> => {
    await deleteAttachment(id);
    await queryClient.invalidateQueries({ queryKey: ['erp', 'attachments', entityType, entityId] });
  };
}
