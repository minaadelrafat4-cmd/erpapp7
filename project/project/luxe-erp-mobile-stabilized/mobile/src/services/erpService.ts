import { supabase } from '@lib/supabase';
import { ApiError, toApiError } from '@lib/errors';
import type {
  Product,
  ProductDetail,
  ProductImage,
  Branch,
  Warehouse,
  ERPNotification,
  Category,
  DashboardSummary,
  InventoryItem,
  InventoryItemWithStatus,
  InventorySummary,
  CategoryWithCount,
  BranchDetail,
  WarehouseDetail,
  Customer,
  CustomerSummary,
  CustomerListItem,
  CustomerListResult,
  CustomerOrderSummary,
  CustomerAddress,
  CustomerDetail,
  Supplier,
  SupplierListItem,
  SupplierListResult,
  PurchaseOrderSummary,
  SupplierDetail,
  PurchaseOrderListItem,
  PurchaseOrderListResult,
  PurchaseOrderItem,
  PurchaseOrderDetail,
  SalesOrderListItem,
  SalesOrderListResult,
  SalesOrderItem,
  SalesOrderDetail,
  EmployeeListItem,
  EmployeeListResult,
  EmployeeDetail,
  EmployeeRole,
  EmployeePerformance,
  ReportListItem,
  ReportListResult,
  AnalyticsSummary,
  SalesOverviewRow,
  InventoryOverviewRow,
  LowStockRow,
  BranchComparisonRow,
  ProductPerformanceRow,
  ReceivingListItem,
  ReceivingListResult,
  ReceivingDetail,
  ReceivingItem,
  ReceivingStatus,
  TaskListItem,
  TaskListResult,
  TaskDetail,
  TaskStatus,
  TaskPriority,
  StockTransferListItem,
  StockTransferListResult,
  StockTransferDetail,
  StockTransferItem,
  StockTransferStatus,
} from '@apptypes/erp';
import { APP_CONFIG } from '@constants';
import type { Profile } from '@apptypes';

// ============================================================
// Dashboard Service — reuses v_dashboard_summary view
// ============================================================

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  // Reuse the existing BI view for low_stock_count (per-product threshold)
  const [summaryRes, productsRes, branchesRes, warehousesRes] = await Promise.all([
    supabase.from('v_dashboard_summary').select('low_stock_count').limit(1).maybeSingle(),
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('branches').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('warehouses').select('id', { count: 'exact', head: true }).eq('is_active', true),
  ]);

  const errors = [summaryRes, productsRes, branchesRes, warehousesRes].filter((r) => r.error);
  if (errors.length > 0) throw toApiError(errors[0]!.error);

  // Out-of-stock: stock <= 0
  const outStockRes = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)
    .lte('stock', 0);
  if (outStockRes.error) throw toApiError(outStockRes.error);

  const summaryRow = summaryRes.data as { low_stock_count: number } | null;

  return {
    total_products: productsRes.count ?? 0,
    low_stock_count: summaryRow?.low_stock_count ?? 0,
    out_of_stock_count: outStockRes.count ?? 0,
    total_branches: branchesRes.count ?? 0,
    total_warehouses: warehousesRes.count ?? 0,
  };
}

export async function fetchRecentNotifications(userId: string, limit = 5): Promise<ERPNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .or(`user_id.eq.${userId},user_id.is.null`)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw toApiError(error);
  return (data ?? []) as ERPNotification[];
}

// ============================================================
// Products Service
// ============================================================

const PRODUCT_SELECT = `
  *,
  categories!inner(name, slug),
  brands(name, slug),
  product_images(id, url, alt, sort_order)
`;

export interface ProductListItem extends Product {
  category_name: string | null;
  category_slug: string | null;
  brand_name: string | null;
  brand_slug: string | null;
  image_url: string | null;
}

export type { CustomerListItem, CustomerListResult, SupplierListItem, SupplierListResult } from '@apptypes/erp';

export interface ProductListResult {
  items: ProductListItem[];
  nextCursor: string | null;
}

export async function fetchProducts(opts: {
  search?: string;
  categoryId?: string;
  cursor?: string | null;
  limit?: number;
  sortBy?: string;
  sortOrder?: SortOrder;
}): Promise<ProductListResult> {
  const limit = opts.limit ?? APP_CONFIG.itemsPerPage;
  const sortBy = opts.sortBy ?? 'created_at';
  const sortOrder = opts.sortOrder ?? 'desc';
  let query = supabase.from('products').select(PRODUCT_SELECT, { count: 'exact' }).eq('is_active', true);

  if (opts.search) {
    query = query.or(`name.ilike.%${opts.search}%,sku.ilike.%${opts.search}%,barcode.ilike.%${opts.search}%`);
  }
  if (opts.categoryId) {
    query = query.eq('category_id', opts.categoryId);
  }
  if (opts.cursor) {
    query = query.lt('created_at', opts.cursor);
  }

  query = query.order(sortBy, { ascending: sortOrder === 'asc' }).limit(limit + 1);

  const { data, error } = await query;
  if (error) throw toApiError(error);

  const rows = (data ?? []) as unknown as Array<Product & {
    categories: { name: string; slug: string } | null;
    brands: { name: string; slug: string } | null;
    product_images: ProductImage[];
  }>;

  const items: ProductListItem[] = rows.slice(0, limit).map((row) => {
    const sortedImages = [...(row.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order);
    return {
      ...row,
      category_name: row.categories?.name ?? null,
      category_slug: row.categories?.slug ?? null,
      brand_name: row.brands?.name ?? null,
      brand_slug: row.brands?.slug ?? null,
      image_url: sortedImages[0]?.url ?? null,
    };
  });

  const nextCursor = rows.length > limit ? rows[limit - 1]!.created_at : null;

  return { items, nextCursor };
}

export async function fetchProductById(id: string): Promise<ProductDetail> {
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('id', id)
    .maybeSingle();

  if (error) throw toApiError(error);
  if (!data) throw new ApiError('Product not found.');

  const row = data as unknown as Product & {
    categories: { name: string; slug: string } | null;
    brands: { name: string; slug: string } | null;
    product_images: ProductImage[];
  };

  const images: ProductImage[] = [...(row.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order);

  return {
    ...row,
    category_name: row.categories?.name ?? null,
    category_slug: row.categories?.slug ?? null,
    brand_name: row.brands?.name ?? null,
    brand_slug: row.brands?.slug ?? null,
    images,
  };
}

// ============================================================
// Categories Service
// ============================================================

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) throw toApiError(error);
  return (data ?? []) as Category[];
}

export async function fetchCategoriesWithCounts(opts?: { sortBy?: string; sortOrder?: SortOrder }): Promise<CategoryWithCount[]> {
  const sortBy = opts?.sortBy ?? 'sort_order';
  const sortOrder = opts?.sortOrder ?? 'asc';
  const { data: categories, error: catError } = await supabase
    .from('categories')
    .select('*')
    .order(sortBy, { ascending: sortOrder === 'asc' });

  if (catError) throw toApiError(catError);

  const { data: counts, error: countError } = await supabase
    .from('products')
    .select('category_id')
    .not('category_id', 'is', null);

  if (countError) throw toApiError(countError);

  const countMap = new Map<string, number>();
  for (const row of counts ?? []) {
    const cid = row.category_id as string;
    countMap.set(cid, (countMap.get(cid) ?? 0) + 1);
  }

  return (categories ?? []).map((cat: Category) => ({
    ...cat,
    product_count: countMap.get(cat.id) ?? 0,
  }));
}

// ============================================================
// Branches & Warehouses Service
// ============================================================

export async function fetchBranches(opts?: { sortBy?: string; sortOrder?: SortOrder }): Promise<Branch[]> {
  const sortBy = opts?.sortBy ?? 'name';
  const sortOrder = opts?.sortOrder ?? 'asc';
  const { data, error } = await supabase
    .from('branches')
    .select('*')
    .eq('is_active', true)
    .order(sortBy, { ascending: sortOrder === 'asc' });

  if (error) throw toApiError(error);
  return (data ?? []) as Branch[];
}

export async function fetchWarehouses(opts?: { sortBy?: string; sortOrder?: SortOrder }): Promise<Warehouse[]> {
  const sortBy = opts?.sortBy ?? 'name';
  const sortOrder = opts?.sortOrder ?? 'asc';
  const { data, error } = await supabase
    .from('warehouses')
    .select('*')
    .eq('is_active', true)
    .order(sortBy, { ascending: sortOrder === 'asc' });

  if (error) throw toApiError(error);
  return (data ?? []) as Warehouse[];
}

// ============================================================
// Inventory Service
// ============================================================

const INVENTORY_SELECT = `
  id,
  product_id,
  branch_id,
  warehouse_id,
  quantity_on_hand,
  quantity_reserved,
  reorder_point,
  min_stock,
  max_stock,
  batch_number,
  expiry_date,
  last_stocked_at,
  created_at,
  updated_at,
  products!inner (
    name,
    slug,
    sku,
    categories!left (
      name
    )
  ),
  branches!left (
    name
  ),
  warehouses!left (
    name
  )
`;

export interface InventoryFilter {
  branchId?: string;
  warehouseId?: string;
  categoryId?: string;
  sortBy?: string;
  sortOrder?: SortOrder;
}

export async function fetchInventory(opts: InventoryFilter = {}): Promise<InventoryItemWithStatus[]> {
  const sortBy = opts.sortBy ?? 'updated_at';
  const sortOrder = opts.sortOrder ?? 'desc';
  let query = supabase
    .from('inventory')
    .select(INVENTORY_SELECT)
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .limit(200);

  if (opts.branchId) query = query.eq('branch_id', opts.branchId);
  if (opts.warehouseId) query = query.eq('warehouse_id', opts.warehouseId);
  if (opts.categoryId) query = query.eq('products.category_id', opts.categoryId);

  const { data, error } = await query;
  if (error) throw toApiError(error);

  const items: InventoryItemWithStatus[] = (data ?? []).map((row: Record<string, unknown>) => {
    const productData = row.products as { name: string; slug: string; sku: string | null; categories: { name: string } | null } | null;
    const branchData = row.branches as { name: string } | null;
    const warehouseData = row.warehouses as { name: string } | null;

    const base: InventoryItem = {
      id: row.id as string,
      product_id: row.product_id as string,
      product_name: productData?.name ?? 'Unknown Product',
      product_slug: productData?.slug ?? '',
      sku: productData?.sku ?? null,
      category_name: productData?.categories?.name ?? null,
      branch_id: row.branch_id as string | null,
      branch_name: branchData?.name ?? null,
      warehouse_id: row.warehouse_id as string | null,
      warehouse_name: warehouseData?.name ?? null,
      quantity_on_hand: row.quantity_on_hand as number,
      quantity_reserved: row.quantity_reserved as number,
      reorder_point: row.reorder_point as number,
      min_stock: row.min_stock as number,
      max_stock: row.max_stock as number,
      batch_number: row.batch_number as string | null,
      expiry_date: row.expiry_date as string | null,
      last_stocked_at: row.last_stocked_at as string | null,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
    };

    const available = base.quantity_on_hand - base.quantity_reserved;
    const isOut = base.quantity_on_hand <= 0;
    const isLow = !isOut && available <= base.reorder_point;

    return {
      ...base,
      available_stock: available,
      is_low_stock: isLow,
      is_out_of_stock: isOut,
      stock_status: isOut ? 'out' : isLow ? 'low' : 'ok',
    };
  });

  return items;
}

// ============================================================
// Category Detail Service
// ============================================================

export async function fetchCategoryById(id: string): Promise<CategoryWithCount> {
  const { data: categoryData, error: categoryError } = await supabase
    .from('categories')
    .select('*')
    .eq('id', id)
    .single();

  if (categoryError) throw toApiError(categoryError);
  if (!categoryData) throw new ApiError('Category not found.', '404', 404);

  const { count, error: countError } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('category_id', id);

  if (countError) throw toApiError(countError);

  return { ...(categoryData as Category), product_count: count ?? 0 };
}

// ============================================================
// Warehouse Detail Service
// ============================================================

export async function fetchWarehouseById(id: string): Promise<WarehouseDetail> {
  const { data: whData, error: whError } = await supabase
    .from('warehouses')
    .select('*')
    .eq('id', id)
    .single();

  if (whError) throw toApiError(whError);
  if (!whData) throw new ApiError('Warehouse not found.', '404', 404);

  const wh = whData as Warehouse;

  const { data: invData, error: invError } = await supabase
    .from('inventory')
    .select('quantity_on_hand, quantity_reserved, reorder_point')
    .eq('warehouse_id', id);

  if (invError) throw toApiError(invError);

  const rows = invData ?? [];
  const totalUnits = rows.reduce((sum: number, r: { quantity_on_hand: number }) => sum + (r.quantity_on_hand ?? 0), 0);
  const totalReserved = rows.reduce((sum: number, r: { quantity_reserved: number }) => sum + (r.quantity_reserved ?? 0), 0);
  const totalAvailable = totalUnits - totalReserved;
  const lowStockCount = rows.filter((r: { quantity_on_hand: number; quantity_reserved: number; reorder_point: number }) => {
    const avail = (r.quantity_on_hand ?? 0) - (r.quantity_reserved ?? 0);
    return (r.quantity_on_hand ?? 0) > 0 && avail <= (r.reorder_point ?? 0);
  }).length;
  const productCount = rows.length;
  const utilizationPct = wh.capacity && wh.capacity > 0 ? Math.min(100, Math.round((totalUnits / wh.capacity) * 100)) : 0;

  return {
    ...wh,
    product_count: productCount,
    total_units: totalUnits,
    total_available: totalAvailable,
    low_stock_count: lowStockCount,
    utilization_pct: utilizationPct,
  };
}

// ============================================================
// Branch Detail Service
// ============================================================

export async function fetchBranchById(id: string): Promise<BranchDetail> {
  const { data: branchData, error: branchError } = await supabase
    .from('branches')
    .select('*')
    .eq('id', id)
    .single();

  if (branchError) throw toApiError(branchError);
  if (!branchData) throw new ApiError('Branch not found.', '404', 404);

  const branch = branchData as Branch;

  const { data: invData, error: invError } = await supabase
    .from('inventory')
    .select(`
      quantity_on_hand,
      warehouse_id,
      warehouses!left (
        name
      )
    `)
    .eq('branch_id', id);

  if (invError) throw toApiError(invError);

  const rows = invData ?? [];
  const totalStock = rows.reduce((sum: number, r: { quantity_on_hand: number }) => sum + (r.quantity_on_hand ?? 0), 0);
  const productCount = rows.length;

  const whRows = rows.filter((r: { warehouse_id: string | null }) => r.warehouse_id != null);
  let warehouseId: string | null = null;
  let warehouseName: string | null = null;
  if (whRows.length > 0) {
    const firstWh = whRows[0] as { warehouse_id: string; warehouses: { name: string }[] | null };
    const whName = Array.isArray(firstWh.warehouses) ? (firstWh.warehouses[0]?.name ?? null) : null;
    warehouseId = firstWh.warehouse_id;
    warehouseName = whName;
  }

  return {
    ...branch,
    product_count: productCount,
    total_stock: totalStock,
    warehouse_id: warehouseId,
    warehouse_name: warehouseName,
  };
}

// ============================================================
// Notification Service
// ============================================================

export async function fetchNotifications(userId: string, limit = 50): Promise<ERPNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .or(`user_id.eq.${userId},user_id.is.null`)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw toApiError(error);
  return (data ?? []) as ERPNotification[];
}

export async function markNotificationAsRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id);

  if (error) throw toApiError(error);
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .or(`user_id.eq.${userId},user_id.is.null`)
    .eq('is_read', false);

  if (error) throw toApiError(error);
}

// ============================================================
// Profile Service
// ============================================================

export interface ProfileUpdate {
  full_name?: string;
  phone?: string;
  avatar_url?: string;
}

export interface ProfileWithBranch extends Profile {
  branch_id: string | null;
  branch_name: string | null;
  position: string | null;
}

export async function fetchProfileWithBranch(userId: string): Promise<ProfileWithBranch> {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (profileError) throw toApiError(profileError);
  if (!profile) throw new ApiError('Profile not found.', '404', 404);

  const { data: employee } = await supabase
    .from('employees')
    .select('branch_id, position, branches!left(name)')
    .eq('user_id', userId)
    .maybeSingle();

  const empData = employee as { branch_id: string | null; position: string | null; branches: { name: string } | null } | null;

  return {
    ...(profile as Profile),
    branch_id: empData?.branch_id ?? null,
    branch_name: empData?.branches?.name ?? null,
    position: empData?.position ?? null,
  };
}

export async function updateProfile(userId: string, updates: ProfileUpdate): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select('*')
    .single();

  if (error) throw toApiError(error);
  return data as Profile;
}

export async function uploadProfileAvatar(userId: string, fileUri: string, mimeType: string): Promise<string> {
  const ext = mimeType.split('/')[1] ?? 'jpg';
  const path = `${userId}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, { uri: fileUri, type: mimeType } as unknown as Blob, {
      upsert: true,
      contentType: mimeType,
    });

  if (uploadError) throw toApiError(uploadError);

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return data.publicUrl;
}

// ============================================================
// Sort Type (shared)
// ============================================================

export type SortOrder = 'asc' | 'desc';

// ============================================================
// Customer Service
// ============================================================

export interface CustomerListParams {
  search?: string;
  cursor?: string | null;
  limit?: number;
  sortBy?: string;
  sortOrder?: SortOrder;
}

export async function fetchCustomers(opts: CustomerListParams = {}): Promise<CustomerListResult> {
  const limit = opts.limit ?? APP_CONFIG.itemsPerPage;
  const sortBy = opts.sortBy ?? 'created_at';
  const sortOrder = opts.sortOrder ?? 'desc';
  let query = supabase
    .from('v_customer_summary')
    .select('id, user_id, first_name, last_name, email, loyalty_points, created_at, order_count, total_spent, last_order_at');

  if (opts.search) {
    const s = opts.search.trim();
    query = query.or(`first_name.ilike.%${s}%,last_name.ilike.%${s}%,email.ilike.%${s}%`);
  }

  if (opts.cursor) {
    query = query.lt('created_at', opts.cursor);
  }

  query = query.order(sortBy, { ascending: sortOrder === 'asc' }).limit(limit + 1);

  const { data, error } = await query;
  if (error) throw toApiError(error);

  const rows = (data ?? []) as CustomerSummary[];
  const items: CustomerListItem[] = rows.slice(0, limit).map((row) => ({
    id: row.id,
    user_id: row.user_id,
    first_name: row.first_name,
    last_name: row.last_name,
    email: row.email,
    loyalty_points: row.loyalty_points,
    created_at: row.created_at,
    order_count: row.order_count,
    total_spent: row.total_spent,
    last_order_at: row.last_order_at,
  }));

  const nextCursor = rows.length > limit ? rows[limit - 1]!.created_at : null;

  return { items, nextCursor };
}

export async function fetchCustomerById(id: string): Promise<CustomerDetail> {
  const { data: summaryData, error: summaryError } = await supabase
    .from('v_customer_summary')
    .select('id, user_id, first_name, last_name, email, loyalty_points, created_at, order_count, total_spent, last_order_at')
    .eq('id', id)
    .maybeSingle();

  if (summaryError) throw toApiError(summaryError);
  if (!summaryData) throw new ApiError('Customer not found.', '404', 404);

  const summary = summaryData as CustomerSummary;

  const { data: profileData } = await supabase
    .from('profiles')
    .select('email, phone, status, avatar_url, full_name')
    .eq('id', summary.user_id)
    .maybeSingle();

  const { data: addressRows, error: addressError } = await supabase
    .from('addresses')
    .select('id, customer_id, label, line1, line2, city, state, postal_code, country, phone, is_default, created_at')
    .eq('customer_id', id)
    .order('is_default', { ascending: false });

  if (addressError) throw toApiError(addressError);

  const { data: orderRows, error: orderError } = await supabase
    .from('v_order_summary')
    .select('id, order_number, status, payment_status, grand_total, currency, placed_at, created_at, item_count')
    .eq('customer_id', id)
    .order('placed_at', { ascending: false })
    .limit(5);

  if (orderError) throw toApiError(orderError);

  const profile = profileData as { email: string | null; phone: string | null; status: string | null; avatar_url: string | null; full_name: string | null } | null;

  return {
    id: summary.id,
    user_id: summary.user_id,
    first_name: summary.first_name,
    last_name: summary.last_name,
    phone: profile?.phone ?? null,
    email: profile?.email ?? summary.email,
    date_of_birth: null,
    marketing_opt_in: false,
    loyalty_points: summary.loyalty_points,
    created_at: summary.created_at,
    updated_at: summary.created_at,
    order_count: summary.order_count,
    total_spent: summary.total_spent,
    last_order_at: summary.last_order_at,
    addresses: (addressRows ?? []) as CustomerAddress[],
    recent_orders: (orderRows ?? []) as CustomerOrderSummary[],
  };
}

// ============================================================
// Supplier Service
// ============================================================

export interface SupplierListParams {
  search?: string;
  cursor?: string | null;
  limit?: number;
  sortBy?: string;
  sortOrder?: SortOrder;
}

export async function fetchSuppliers(opts: SupplierListParams = {}): Promise<SupplierListResult> {
  const limit = opts.limit ?? APP_CONFIG.itemsPerPage;
  const sortBy = opts.sortBy ?? 'created_at';
  const sortOrder = opts.sortOrder ?? 'desc';
  let query = supabase
    .from('suppliers')
    .select('id, name, contact_name, email, phone, address, city, country, payment_terms, is_active, created_at, updated_at');

  if (opts.search) {
    const s = opts.search.trim();
    query = query.or(`name.ilike.%${s}%,contact_name.ilike.%${s}%,email.ilike.%${s}%`);
  }

  if (opts.cursor) {
    query = query.lt('created_at', opts.cursor);
  }

  query = query.order(sortBy, { ascending: sortOrder === 'asc' }).limit(limit + 1);

  const { data, error } = await query;
  if (error) throw toApiError(error);

  const rows = (data ?? []) as Supplier[];
  const items: SupplierListItem[] = rows.slice(0, limit).map((row) => ({
    id: row.id,
    name: row.name,
    contact_name: row.contact_name,
    email: row.email,
    phone: row.phone,
    address: row.address,
    city: row.city,
    country: row.country,
    payment_terms: row.payment_terms,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));

  const nextCursor = rows.length > limit ? rows[limit - 1]!.created_at : null;

  return { items, nextCursor };
}

export async function fetchSupplierById(id: string): Promise<SupplierDetail> {
  const { data: supplierData, error: supplierError } = await supabase
    .from('suppliers')
    .select('id, name, contact_name, email, phone, address, city, country, payment_terms, is_active, created_at, updated_at')
    .eq('id', id)
    .maybeSingle();

  if (supplierError) throw toApiError(supplierError);
  if (!supplierData) throw new ApiError('Supplier not found.', '404', 404);

  const supplier = supplierData as Supplier;

  const { data: poRows, error: poError } = await supabase
    .from('purchase_orders')
    .select('id, po_number, supplier_id, warehouse_id, status, grand_total, currency, expected_at, received_at, created_at')
    .eq('supplier_id', id)
    .order('created_at', { ascending: false })
    .limit(10);

  if (poError) throw toApiError(poError);

  return {
    ...supplier,
    purchase_orders: (poRows ?? []) as PurchaseOrderSummary[],
  };
}

// ============================================================
// Purchase Orders
// ============================================================

export interface PurchaseOrderListParams {
  search?: string;
  status?: string;
  cursor?: string | null;
  limit?: number;
  sortBy?: string;
  sortOrder?: SortOrder;
}

export async function fetchPurchaseOrders(params: PurchaseOrderListParams): Promise<PurchaseOrderListResult> {
  const { search, status, cursor, limit = 20, sortBy = 'created_at', sortOrder = 'desc' } = params;
  let query = supabase
    .from('purchase_orders')
    .select('id, po_number, supplier_id, supplier:suppliers(name), warehouse_id, warehouse:warehouses(name), status, grand_total, currency, expected_at, received_at, created_at')
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .limit(limit + 1);

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }
  if (search) {
    query = query.or(`po_number.ilike.%${search}%`);
  }
  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data, error } = await query;
  if (error) throw toApiError(error);

  const rows = (data ?? []) as unknown as Array<{
    id: string;
    po_number: string;
    supplier_id: string;
    supplier: { name: string } | null;
    warehouse_id: string | null;
    warehouse: { name: string } | null;
    status: string;
    grand_total: number;
    currency: string;
    expected_at: string | null;
    received_at: string | null;
    created_at: string;
  }>;

  const items: PurchaseOrderListItem[] = rows.slice(0, limit).map((r) => ({
    id: r.id,
    po_number: r.po_number,
    supplier_id: r.supplier_id,
    supplier_name: r.supplier?.name ?? 'Unknown',
    warehouse_id: r.warehouse_id,
    warehouse_name: r.warehouse?.name ?? null,
    status: r.status,
    grand_total: Number(r.grand_total),
    currency: r.currency,
    expected_at: r.expected_at,
    received_at: r.received_at,
    created_at: r.created_at,
  }));

  const nextCursor = rows.length > limit ? items[items.length - 1].created_at : null;

  return { items, nextCursor };
}

export async function fetchPurchaseOrderById(id: string): Promise<PurchaseOrderDetail> {
  const { data: poRow, error: poError } = await supabase
    .from('purchase_orders')
    .select('id, po_number, supplier_id, supplier:suppliers(name), warehouse_id, warehouse:warehouses(name), status, subtotal, tax_total, shipping_total, grand_total, currency, expected_at, received_at, notes, created_at, updated_at')
    .eq('id', id)
    .maybeSingle();

  if (poError) throw toApiError(poError);
  if (!poRow) throw new ApiError('Purchase order not found.', '404', 404);

  const po = poRow as unknown as {
    id: string;
    po_number: string;
    supplier_id: string;
    supplier: { name: string } | null;
    warehouse_id: string | null;
    warehouse: { name: string } | null;
    status: string;
    subtotal: number;
    tax_total: number;
    shipping_total: number;
    grand_total: number;
    currency: string;
    expected_at: string | null;
    received_at: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
  };

  const { data: itemRows, error: itemError } = await supabase
    .from('purchase_order_items')
    .select('id, purchase_order_id, product_id, product:products(name), quantity, unit_cost, line_total, received_quantity')
    .eq('purchase_order_id', id)
    .order('created_at', { ascending: true });

  if (itemError) throw toApiError(itemError);

  const items: PurchaseOrderItem[] = ((itemRows ?? []) as unknown as Array<{
    id: string;
    purchase_order_id: string;
    product_id: string;
    product: { name: string } | null;
    quantity: number;
    unit_cost: number;
    line_total: number;
    received_quantity: number;
  }>).map((r) => ({
    id: r.id,
    purchase_order_id: r.purchase_order_id,
    product_id: r.product_id,
    product_name: r.product?.name ?? 'Unknown Product',
    quantity: r.quantity,
    unit_cost: Number(r.unit_cost),
    line_total: Number(r.line_total),
    received_quantity: r.received_quantity,
  }));

  return {
    id: po.id,
    po_number: po.po_number,
    supplier_id: po.supplier_id,
    supplier_name: po.supplier?.name ?? 'Unknown',
    warehouse_id: po.warehouse_id,
    warehouse_name: po.warehouse?.name ?? null,
    status: po.status,
    subtotal: Number(po.subtotal),
    tax_total: Number(po.tax_total),
    shipping_total: Number(po.shipping_total),
    grand_total: Number(po.grand_total),
    currency: po.currency,
    expected_at: po.expected_at,
    received_at: po.received_at,
    notes: po.notes,
    created_at: po.created_at,
    updated_at: po.updated_at,
    items,
  };
}

// ============================================================
// Sales Orders
// ============================================================

export interface SalesOrderListParams {
  search?: string;
  status?: string;
  cursor?: string | null;
  limit?: number;
  sortBy?: string;
  sortOrder?: SortOrder;
}

export async function fetchSalesOrders(params: SalesOrderListParams): Promise<SalesOrderListResult> {
  const { search, status, cursor, limit = 20, sortBy = 'placed_at', sortOrder = 'desc' } = params;
  let query = supabase
    .from('orders')
    .select('id, order_number, customer_id, customer:customers(first_name,last_name), status, payment_status, fulfillment_status, grand_total, currency, placed_at, created_at')
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .limit(limit + 1);

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }
  if (search) {
    query = query.or(`order_number.ilike.%${search}%`);
  }
  if (cursor) {
    query = query.lt('placed_at', cursor);
  }

  const { data, error } = await query;
  if (error) throw toApiError(error);

  const rows = (data ?? []) as unknown as Array<{
    id: string;
    order_number: string;
    customer_id: string | null;
    customer: { first_name: string; last_name: string } | null;
    status: string;
    payment_status: string;
    fulfillment_status: string;
    grand_total: number;
    currency: string;
    placed_at: string;
    created_at: string;
  }>;

  const items: SalesOrderListItem[] = rows.slice(0, limit).map((r) => {
    const name = r.customer
      ? [r.customer.first_name, r.customer.last_name].filter(Boolean).join(' ').trim() || 'Unknown'
      : 'Guest Customer';
    return {
      id: r.id,
      order_number: r.order_number,
      customer_id: r.customer_id,
      customer_name: name,
      status: r.status,
      payment_status: r.payment_status,
      fulfillment_status: r.fulfillment_status,
      grand_total: Number(r.grand_total),
      currency: r.currency,
      placed_at: r.placed_at,
      created_at: r.created_at,
    };
  });

  const nextCursor = rows.length > limit ? items[items.length - 1].placed_at : null;

  return { items, nextCursor };
}

export async function fetchSalesOrderById(id: string): Promise<SalesOrderDetail> {
  const { data: orderRow, error: orderError } = await supabase
    .from('orders')
    .select('id, order_number, customer_id, customer:customers(first_name,last_name), status, payment_status, fulfillment_status, subtotal, discount_total, shipping_total, tax_total, grand_total, currency, tracking_number, carrier, notes, placed_at, created_at, updated_at')
    .eq('id', id)
    .maybeSingle();

  if (orderError) throw toApiError(orderError);
  if (!orderRow) throw new ApiError('Sales order not found.', '404', 404);

  const o = orderRow as unknown as {
    id: string;
    order_number: string;
    customer_id: string | null;
    customer: { first_name: string; last_name: string } | null;
    status: string;
    payment_status: string;
    fulfillment_status: string;
    subtotal: number;
    discount_total: number;
    shipping_total: number;
    tax_total: number;
    grand_total: number;
    currency: string;
    tracking_number: string | null;
    carrier: string | null;
    notes: string | null;
    placed_at: string;
    created_at: string;
    updated_at: string;
  };

  const { data: itemRows, error: itemError } = await supabase
    .from('order_items')
    .select('id, order_id, product_id, product_name, variant_name, sku, price, quantity, line_total')
    .eq('order_id', id)
    .order('created_at', { ascending: true });

  if (itemError) throw toApiError(itemError);

  const items: SalesOrderItem[] = ((itemRows ?? []) as unknown as Array<{
    id: string;
    order_id: string;
    product_id: string | null;
    product_name: string;
    variant_name: string | null;
    sku: string | null;
    price: number;
    quantity: number;
    line_total: number;
  }>).map((r) => ({
    id: r.id,
    order_id: r.order_id,
    product_id: r.product_id,
    product_name: r.product_name,
    variant_name: r.variant_name,
    sku: r.sku,
    price: Number(r.price),
    quantity: r.quantity,
    line_total: Number(r.line_total),
  }));

  const customerName = o.customer
    ? [o.customer.first_name, o.customer.last_name].filter(Boolean).join(' ').trim() || 'Unknown'
    : 'Guest Customer';

  return {
    id: o.id,
    order_number: o.order_number,
    customer_id: o.customer_id,
    customer_name: customerName,
    status: o.status,
    payment_status: o.payment_status,
    fulfillment_status: o.fulfillment_status,
    subtotal: Number(o.subtotal),
    discount_total: Number(o.discount_total),
    shipping_total: Number(o.shipping_total),
    tax_total: Number(o.tax_total),
    grand_total: Number(o.grand_total),
    currency: o.currency,
    tracking_number: o.tracking_number,
    carrier: o.carrier,
    notes: o.notes,
    placed_at: o.placed_at,
    created_at: o.created_at,
    updated_at: o.updated_at,
    items,
  };
}

// ============================================================
// Employee Services
// ============================================================

export interface EmployeeListParams {
  search?: string;
  cursor?: string | null;
  limit?: number;
  sortBy?: string;
  sortOrder?: SortOrder;
}

export async function fetchEmployees(params: EmployeeListParams = {}): Promise<EmployeeListResult> {
  const { search, cursor, limit = APP_CONFIG.itemsPerPage, sortBy = 'created_at', sortOrder = 'desc' } = params;
  let query = supabase
    .from('employees')
    .select('id, first_name, last_name, email, phone, position, status, hire_date, branch_id, branch:branches(name), created_at, updated_at')
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .limit(limit + 1);

  if (cursor) query = query.lt('created_at', cursor);
  if (search) {
    query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,position.ilike.%${search}%`);
  }

  const { data: rows, error } = await query;
  if (error) throw toApiError(error);

  const employeeRows = (rows ?? []) as unknown as Array<{
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    position: string | null;
    status: string;
    hire_date: string | null;
    branch_id: string | null;
    branch: { name: string } | null;
    created_at: string;
    updated_at: string;
  }>;

  const employeeIds = employeeRows.map((r) => r.id);

  let roleMap: Record<string, string[]> = {};
  if (employeeIds.length > 0) {
    const { data: erRows, error: erError } = await supabase
      .from('employee_roles')
      .select('employee_id, role:roles(name)')
      .in('employee_id', employeeIds);

    if (erError) throw toApiError(erError);

    roleMap = ((erRows ?? []) as unknown as Array<{
      employee_id: string;
      role: { name: string } | null;
    }>).reduce<Record<string, string[]>>((acc, r) => {
      if (r.role?.name) {
        (acc[r.employee_id] ??= []).push(r.role.name);
      }
      return acc;
    }, {});
  }

  const items: EmployeeListItem[] = employeeRows.slice(0, limit).map((r) => ({
    id: r.id,
    first_name: r.first_name,
    last_name: r.last_name,
    email: r.email,
    phone: r.phone,
    position: r.position,
    status: r.status,
    hire_date: r.hire_date,
    branch_id: r.branch_id,
    branch_name: r.branch?.name ?? null,
    role_names: roleMap[r.id] ?? [],
  }));

  const nextCursor = employeeRows.length > limit ? employeeRows[limit - 1].created_at : null;

  return { items, nextCursor };
}

export async function fetchEmployeeById(id: string): Promise<EmployeeDetail> {
  const { data: empRow, error: empError } = await supabase
    .from('employees')
    .select('id, first_name, last_name, email, phone, position, status, hire_date, branch_id, branch:branches(name, code), created_at, updated_at')
    .eq('id', id)
    .maybeSingle();

  if (empError) throw toApiError(empError);
  if (!empRow) throw new ApiError('Employee not found.', '404', 404);

  const e = empRow as unknown as {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    position: string | null;
    status: string;
    hire_date: string | null;
    branch_id: string | null;
    branch: { name: string; code: string } | null;
    created_at: string;
    updated_at: string;
  };

  const { data: erRows, error: erError } = await supabase
    .from('employee_roles')
    .select('role_id, role:roles(id, name, description)')
    .eq('employee_id', id);

  if (erError) throw toApiError(erError);

  const roles: EmployeeRole[] = ((erRows ?? []) as unknown as Array<{
    role_id: string;
    role: { id: string; name: string; description: string | null } | null;
  }>)
    .filter((r) => r.role)
    .map((r) => ({
      id: r.role!.id,
      name: r.role!.name,
      description: r.role!.description,
    }));

  let performance: EmployeePerformance | null = null;
  const { data: perfRow, error: perfError } = await supabase
    .from('v_bi_employee_performance')
    .select('total_sales, order_count, avg_sale_value, last_sale_at')
    .eq('employee_id', id)
    .maybeSingle();

  if (!perfError && perfRow) {
    const p = perfRow as unknown as {
      total_sales: number;
      order_count: number;
      avg_sale_value: number;
      last_sale_at: string | null;
    };
    performance = {
      total_sales: Number(p.total_sales),
      order_count: p.order_count,
      avg_sale_value: Number(p.avg_sale_value),
      last_sale_at: p.last_sale_at,
    };
  }

  return {
    id: e.id,
    first_name: e.first_name,
    last_name: e.last_name,
    email: e.email,
    phone: e.phone,
    position: e.position,
    status: e.status,
    hire_date: e.hire_date,
    branch_id: e.branch_id,
    branch_name: e.branch?.name ?? null,
    branch_code: e.branch?.code ?? null,
    roles,
    performance,
    created_at: e.created_at,
    updated_at: e.updated_at,
  };
}

// ============================================================
// Report Services
// ============================================================

export interface ReportListParams {
  search?: string;
  cursor?: string | null;
  limit?: number;
  sortBy?: string;
  sortOrder?: SortOrder;
}

export async function fetchReports(params: ReportListParams = {}): Promise<ReportListResult> {
  const { search, cursor, limit = APP_CONFIG.itemsPerPage, sortBy = 'created_at', sortOrder = 'desc' } = params;
  let query = supabase
    .from('reports')
    .select('id, name, description, type, is_scheduled, schedule_cron, last_run_at, created_at, updated_at')
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .limit(limit + 1);

  if (cursor) query = query.lt('created_at', cursor);
  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,type.ilike.%${search}%`);
  }

  const { data: rows, error } = await query;
  if (error) throw toApiError(error);

  const reportRows = (rows ?? []) as unknown as Array<{
    id: string;
    name: string;
    description: string | null;
    type: string;
    is_scheduled: boolean;
    schedule_cron: string | null;
    last_run_at: string | null;
    created_at: string;
    updated_at: string;
  }>;

  const items: ReportListItem[] = reportRows.slice(0, limit).map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    type: r.type,
    is_scheduled: r.is_scheduled,
    schedule_cron: r.schedule_cron,
    last_run_at: r.last_run_at,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));

  const nextCursor = reportRows.length > limit ? reportRows[limit - 1].created_at : null;

  return { items, nextCursor };
}

// ============================================================
// Analytics Services
// ============================================================

export async function fetchAnalyticsSummary(): Promise<AnalyticsSummary> {
  const [salesRes, inventoryRes, lowStockRes, branchRes, productRes] = await Promise.all([
    supabase.from('v_bi_sales_daily').select('*').order('sale_date', { ascending: false }).limit(30),
    supabase.from('v_bi_inventory_value').select('*').order('total_retail_value', { ascending: false }).limit(10),
    supabase.from('v_bi_low_stock').select('*').limit(20),
    supabase.from('v_bi_branch_sales').select('*').order('total_revenue', { ascending: false }),
    supabase.from('v_bi_product_sales').select('*').order('total_revenue', { ascending: false }).limit(10),
  ]);

  const salesError = salesRes.error;
  const inventoryError = inventoryRes.error;
  const lowStockError = lowStockRes.error;
  const branchError = branchRes.error;
  const productError = productRes.error;

  if (salesError) throw toApiError(salesError);
  if (inventoryError) throw toApiError(inventoryError);
  if (lowStockError) throw toApiError(lowStockError);
  if (branchError) throw toApiError(branchError);
  if (productError) throw toApiError(productError);

  const salesOverview = (salesRes.data ?? []) as unknown as SalesOverviewRow[];
  const inventoryValue = (inventoryRes.data ?? []) as unknown as InventoryOverviewRow[];
  const lowStock = (lowStockRes.data ?? []) as unknown as LowStockRow[];
  const branchComparison = (branchRes.data ?? []) as unknown as BranchComparisonRow[];
  const productPerformance = (productRes.data ?? []) as unknown as ProductPerformanceRow[];

  return { salesOverview, inventoryValue, lowStock, branchComparison, productPerformance };
}

// ============================================================
// Receiving Service (Purchase Order Receiving)
// ============================================================

export interface ReceivingListParams {
  search?: string;
  status?: string;
  cursor?: string | null;
  limit?: number;
  sortBy?: string;
  sortOrder?: SortOrder;
}

const RECEIVING_STATUSES = ['ordered', 'partial', 'received'];

function computeReceivingStatus(poStatus: string, totalQty: number, receivedQty: number): ReceivingStatus {
  if (poStatus === 'received') return 'received';
  if (poStatus === 'cancelled') return 'cancelled';
  if (receivedQty <= 0) return 'pending';
  if (receivedQty >= totalQty && totalQty > 0) return 'received';
  return 'partial';
}

export async function fetchReceivingList(params: ReceivingListParams): Promise<ReceivingListResult> {
  const { search, status, cursor, limit = APP_CONFIG.itemsPerPage, sortBy = 'created_at', sortOrder = 'desc' } = params;
  let query = supabase
    .from('purchase_orders')
    .select('id, po_number, supplier:suppliers(name), warehouse_id, warehouse:warehouses(name), status, expected_at, received_at, created_at')
    .in('status', RECEIVING_STATUSES)
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .limit(limit + 1);

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }
  if (search) {
    query = query.or(`po_number.ilike.%${search}%`);
  }
  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data, error } = await query;
  if (error) throw toApiError(error);

  const rows = (data ?? []) as unknown as Array<{
    id: string;
    po_number: string;
    supplier: { name: string } | null;
    warehouse_id: string | null;
    warehouse: { name: string } | null;
    status: string;
    expected_at: string | null;
    received_at: string | null;
    created_at: string;
  }>;

  if (rows.length === 0) return { items: [], nextCursor: null };

  const poIds = rows.map((r) => r.id);
  const { data: itemRows, error: itemError } = await supabase
    .from('purchase_order_items')
    .select('purchase_order_id, quantity, received_quantity')
    .in('purchase_order_id', poIds);

  if (itemError) throw toApiError(itemError);

  const statsMap = new Map<string, { total_items: number; received_items: number; total_quantity: number; received_quantity: number }>();
  for (const item of (itemRows ?? []) as unknown as Array<{ purchase_order_id: string; quantity: number; received_quantity: number }>) {
    const existing = statsMap.get(item.purchase_order_id) ?? { total_items: 0, received_items: 0, total_quantity: 0, received_quantity: 0 };
    existing.total_items += 1;
    existing.total_quantity += item.quantity;
    existing.received_quantity += item.received_quantity;
    if (item.received_quantity > 0) existing.received_items += 1;
    statsMap.set(item.purchase_order_id, existing);
  }

  const items: ReceivingListItem[] = rows.slice(0, limit).map((r) => {
    const stats = statsMap.get(r.id) ?? { total_items: 0, received_items: 0, total_quantity: 0, received_quantity: 0 };
    return {
      id: r.id,
      po_number: r.po_number,
      supplier_name: r.supplier?.name ?? 'Unknown',
      warehouse_id: r.warehouse_id,
      warehouse_name: r.warehouse?.name ?? null,
      status: r.status,
      receiving_status: computeReceivingStatus(r.status, stats.total_quantity, stats.received_quantity),
      total_items: stats.total_items,
      received_items: stats.received_items,
      total_quantity: stats.total_quantity,
      received_quantity: stats.received_quantity,
      expected_at: r.expected_at,
      received_at: r.received_at,
      created_at: r.created_at,
    };
  });

  const nextCursor = rows.length > limit ? rows[limit - 1]!.created_at : null;
  return { items, nextCursor };
}

export async function fetchReceivingById(id: string): Promise<ReceivingDetail> {
  const { data: poRow, error: poError } = await supabase
    .from('purchase_orders')
    .select('id, po_number, supplier:suppliers(name), warehouse_id, warehouse:warehouses(name, address, city), status, grand_total, currency, expected_at, received_at, notes, created_at, updated_at')
    .eq('id', id)
    .maybeSingle();

  if (poError) throw toApiError(poError);
  if (!poRow) throw new ApiError('Purchase order not found.', '404', 404);

  const po = poRow as unknown as {
    id: string;
    po_number: string;
    supplier: { name: string } | null;
    warehouse_id: string | null;
    warehouse: { name: string; address: string | null; city: string | null } | null;
    status: string;
    grand_total: number;
    currency: string;
    expected_at: string | null;
    received_at: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
  };

  const { data: itemRows, error: itemError } = await supabase
    .from('purchase_order_items')
    .select('id, purchase_order_id, product_id, product:products(name, sku), quantity, unit_cost, line_total, received_quantity')
    .eq('purchase_order_id', id)
    .order('created_at', { ascending: true });

  if (itemError) throw toApiError(itemError);

  const rawItems = (itemRows ?? []) as unknown as Array<{
    id: string;
    purchase_order_id: string;
    product_id: string;
    product: { name: string; sku: string | null } | null;
    quantity: number;
    unit_cost: number;
    line_total: number;
    received_quantity: number;
  }>;

  const items: ReceivingItem[] = rawItems.map((r) => ({
    id: r.id,
    purchase_order_id: r.purchase_order_id,
    product_id: r.product_id,
    product_name: r.product?.name ?? 'Unknown Product',
    sku: r.product?.sku ?? null,
    quantity: r.quantity,
    unit_cost: Number(r.unit_cost),
    line_total: Number(r.line_total),
    received_quantity: r.received_quantity,
  }));

  const totalItems = items.length;
  const receivedItems = items.filter((i) => i.received_quantity > 0).length;
  const totalQuantity = items.reduce((s, i) => s + i.quantity, 0);
  const receivedQuantity = items.reduce((s, i) => s + i.received_quantity, 0);

  return {
    id: po.id,
    po_number: po.po_number,
    supplier_name: po.supplier?.name ?? 'Unknown',
    warehouse_id: po.warehouse_id,
    warehouse_name: po.warehouse?.name ?? null,
    warehouse_address: po.warehouse?.address ?? null,
    warehouse_city: po.warehouse?.city ?? null,
    status: po.status,
    receiving_status: computeReceivingStatus(po.status, totalQuantity, receivedQuantity),
    total_items: totalItems,
    received_items: receivedItems,
    total_quantity: totalQuantity,
    received_quantity: receivedQuantity,
    grand_total: Number(po.grand_total),
    currency: po.currency,
    expected_at: po.expected_at,
    received_at: po.received_at,
    notes: po.notes,
    created_at: po.created_at,
    updated_at: po.updated_at,
    items,
  };
}

export async function updateReceivedQuantity(itemId: string, receivedQuantity: number): Promise<void> {
  const { error } = await supabase
    .from('purchase_order_items')
    .update({ received_quantity: receivedQuantity })
    .eq('id', itemId);

  if (error) throw toApiError(error);
}

export async function completeReceiving(poId: string): Promise<void> {
  const { error } = await supabase
    .from('purchase_orders')
    .update({ status: 'received', received_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', poId);

  if (error) throw toApiError(error);
}

// ============================================================
// Task Service
// ============================================================

export interface TaskListParams {
  search?: string;
  status?: string;
  priority?: string;
  cursor?: string | null;
  limit?: number;
  sortBy?: string;
  sortOrder?: SortOrder;
}

export async function fetchTasks(params: TaskListParams = {}): Promise<TaskListResult> {
  const { search, status, priority, cursor, limit = APP_CONFIG.itemsPerPage, sortBy = 'created_at', sortOrder = 'desc' } = params;
  let query = supabase
    .from('tasks')
    .select('id, title, description, status, priority, due_date, assigned_to, created_at, updated_at')
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .limit(limit + 1);

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }
  if (priority && priority !== 'all') {
    query = query.eq('priority', priority);
  }
  if (search) {
    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
  }
  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data, error } = await query;
  if (error) throw toApiError(error);

  const rows = (data ?? []) as unknown as Array<{
    id: string;
    title: string;
    description: string | null;
    status: TaskStatus;
    priority: TaskPriority;
    due_date: string | null;
    assigned_to: string | null;
    created_at: string;
    updated_at: string;
  }>;

  const employeeIds = [...new Set(rows.map((r) => r.assigned_to).filter(Boolean) as string[])];
  let empMap = new Map<string, string>();
  if (employeeIds.length > 0) {
    const { data: empRows, error: empError } = await supabase
      .from('employees')
      .select('id, first_name, last_name')
      .in('id', employeeIds);
    if (!empError && empRows) {
      empMap = new Map((empRows as unknown as Array<{ id: string; first_name: string; last_name: string }>).map((e) => [e.id, [e.first_name, e.last_name].filter(Boolean).join(' ')]));
    }
  }

  const items: TaskListItem[] = rows.slice(0, limit).map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    status: r.status,
    priority: r.priority,
    due_date: r.due_date,
    assigned_to: r.assigned_to,
    assigned_employee_name: r.assigned_to ? empMap.get(r.assigned_to) ?? null : null,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));

  const nextCursor = rows.length > limit ? rows[limit - 1]!.created_at : null;
  return { items, nextCursor };
}

export async function fetchTaskById(id: string): Promise<TaskDetail> {
  const { data: taskRow, error: taskError } = await supabase
    .from('tasks')
    .select('id, title, description, status, priority, due_date, assigned_to, created_by, created_at, updated_at')
    .eq('id', id)
    .maybeSingle();

  if (taskError) throw toApiError(taskError);
  if (!taskRow) throw new ApiError('Task not found.', '404', 404);

  const t = taskRow as unknown as {
    id: string;
    title: string;
    description: string | null;
    status: TaskStatus;
    priority: TaskPriority;
    due_date: string | null;
    assigned_to: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
  };

  let empName: string | null = null;
  let empEmail: string | null = null;
  if (t.assigned_to) {
    const { data: empRow } = await supabase
      .from('employees')
      .select('first_name, last_name, email')
      .eq('id', t.assigned_to)
      .maybeSingle();
    if (empRow) {
      const e = empRow as unknown as { first_name: string; last_name: string; email: string };
      empName = [e.first_name, e.last_name].filter(Boolean).join(' ') || null;
      empEmail = e.email;
    }
  }

  return {
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    due_date: t.due_date,
    assigned_to: t.assigned_to,
    assigned_employee_name: empName,
    assigned_employee_email: empEmail,
    created_by: t.created_by,
    created_at: t.created_at,
    updated_at: t.updated_at,
  };
}

export async function updateTaskStatus(id: string, status: TaskStatus): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw toApiError(error);
}

export async function fetchProductIdByBarcode(barcode: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('products')
    .select('id')
    .eq('barcode', barcode)
    .maybeSingle();

  if (error) throw toApiError(error);
  return (data as { id: string } | null)?.id ?? null;
}

// ============================================================
// Stock Transfer Service
// ============================================================

export interface StockTransferListParams {
  search?: string;
  status?: string;
  cursor?: string | null;
  limit?: number;
  sortBy?: string;
  sortOrder?: SortOrder;
}

export async function fetchStockTransfers(params: StockTransferListParams = {}): Promise<StockTransferListResult> {
  const { search, status, cursor, limit = APP_CONFIG.itemsPerPage, sortBy = 'created_at', sortOrder = 'desc' } = params;
  let query = supabase
    .from('stock_transfers')
    .select('id, transfer_number, status, source_type, source_id, destination_type, destination_id, notes, created_by, created_at, updated_at')
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .limit(limit + 1);

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }
  if (search) {
    query = query.or(`transfer_number.ilike.%${search}%`);
  }
  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data, error } = await query;
  if (error) throw toApiError(error);

  const rows = (data ?? []) as unknown as Array<{
    id: string;
    transfer_number: string;
    status: string;
    source_type: string;
    source_id: string;
    destination_type: string;
    destination_id: string;
    notes: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
  }>;

  if (rows.length === 0) return { items: [], nextCursor: null };

  const sourceBranchIds = rows.filter((r) => r.source_type === 'branch').map((r) => r.source_id);
  const destBranchIds = rows.filter((r) => r.destination_type === 'branch').map((r) => r.destination_id);
  const sourceWhIds = rows.filter((r) => r.source_type === 'warehouse').map((r) => r.source_id);
  const destWhIds = rows.filter((r) => r.destination_type === 'warehouse').map((r) => r.destination_id);

  const branchIds = [...new Set([...sourceBranchIds, ...destBranchIds])];
  const whIds = [...new Set([...sourceWhIds, ...destWhIds])];

  let branchMap = new Map<string, string>();
  let whMap = new Map<string, string>();

  if (branchIds.length > 0) {
    const { data: branchRows } = await supabase.from('branches').select('id, name').in('id', branchIds);
    if (branchRows) {
      branchMap = new Map((branchRows as unknown as Array<{ id: string; name: string }>).map((b) => [b.id, b.name]));
    }
  }
  if (whIds.length > 0) {
    const { data: whRows } = await supabase.from('warehouses').select('id, name').in('id', whIds);
    if (whRows) {
      whMap = new Map((whRows as unknown as Array<{ id: string; name: string }>).map((w) => [w.id, w.name]));
    }
  }

  const transferIds = rows.slice(0, limit).map((r) => r.id);
  let itemStatsMap = new Map<string, { total_items: number; total_quantity: number }>();
  if (transferIds.length > 0) {
    const { data: itemRows } = await supabase
      .from('stock_transfer_items')
      .select('transfer_id, quantity')
      .in('transfer_id', transferIds);
    if (itemRows) {
      for (const item of (itemRows as unknown as Array<{ transfer_id: string; quantity: number }>)) {
        const existing = itemStatsMap.get(item.transfer_id) ?? { total_items: 0, total_quantity: 0 };
        existing.total_items += 1;
        existing.total_quantity += item.quantity;
        itemStatsMap.set(item.transfer_id, existing);
      }
    }
  }

  const items: StockTransferListItem[] = rows.slice(0, limit).map((r) => {
    const stats = itemStatsMap.get(r.id) ?? { total_items: 0, total_quantity: 0 };
    const source_name = r.source_type === 'branch' ? (branchMap.get(r.source_id) ?? 'Unknown') : (whMap.get(r.source_id) ?? 'Unknown');
    const destination_name = r.destination_type === 'branch' ? (branchMap.get(r.destination_id) ?? 'Unknown') : (whMap.get(r.destination_id) ?? 'Unknown');
    return {
      id: r.id,
      transfer_number: r.transfer_number,
      status: r.status as StockTransferStatus,
      source_type: r.source_type as 'branch' | 'warehouse',
      source_id: r.source_id,
      source_name,
      destination_type: r.destination_type as 'branch' | 'warehouse',
      destination_id: r.destination_id,
      destination_name,
      total_items: stats.total_items,
      total_quantity: stats.total_quantity,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  });

  const nextCursor = rows.length > limit ? rows[limit - 1]!.created_at : null;
  return { items, nextCursor };
}

export async function fetchStockTransferById(id: string): Promise<StockTransferDetail> {
  const { data: transferRow, error: transferError } = await supabase
    .from('stock_transfers')
    .select('id, transfer_number, status, source_type, source_id, destination_type, destination_id, notes, created_by, created_at, updated_at')
    .eq('id', id)
    .maybeSingle();

  if (transferError) throw toApiError(transferError);
  if (!transferRow) throw new ApiError('Stock transfer not found.', '404', 404);

  const t = transferRow as unknown as {
    id: string;
    transfer_number: string;
    status: string;
    source_type: string;
    source_id: string;
    destination_type: string;
    destination_id: string;
    notes: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
  };

  let source_name = 'Unknown';
  let destination_name = 'Unknown';

  if (t.source_type === 'branch') {
    const { data } = await supabase.from('branches').select('name').eq('id', t.source_id).maybeSingle();
    source_name = (data as { name: string } | null)?.name ?? 'Unknown';
  } else {
    const { data } = await supabase.from('warehouses').select('name').eq('id', t.source_id).maybeSingle();
    source_name = (data as { name: string } | null)?.name ?? 'Unknown';
  }
  if (t.destination_type === 'branch') {
    const { data } = await supabase.from('branches').select('name').eq('id', t.destination_id).maybeSingle();
    destination_name = (data as { name: string } | null)?.name ?? 'Unknown';
  } else {
    const { data } = await supabase.from('warehouses').select('name').eq('id', t.destination_id).maybeSingle();
    destination_name = (data as { name: string } | null)?.name ?? 'Unknown';
  }

  const { data: itemRows, error: itemError } = await supabase
    .from('stock_transfer_items')
    .select('id, transfer_id, product_id, product:products(name, sku), quantity, received_quantity, created_at')
    .eq('transfer_id', id)
    .order('created_at', { ascending: true });

  if (itemError) throw toApiError(itemError);

  const rawItems = (itemRows ?? []) as unknown as Array<{
    id: string;
    transfer_id: string;
    product_id: string;
    product: { name: string; sku: string | null } | null;
    quantity: number;
    received_quantity: number;
    created_at: string;
  }>;

  const items: StockTransferItem[] = rawItems.map((r) => ({
    id: r.id,
    transfer_id: r.transfer_id,
    product_id: r.product_id,
    product_name: r.product?.name ?? 'Unknown Product',
    sku: r.product?.sku ?? null,
    quantity: r.quantity,
    received_quantity: r.received_quantity,
    created_at: r.created_at,
  }));

  const total_items = items.length;
  const total_quantity = items.reduce((s, i) => s + i.quantity, 0);

  return {
    id: t.id,
    transfer_number: t.transfer_number,
    status: t.status as StockTransferStatus,
    source_type: t.source_type as 'branch' | 'warehouse',
    source_id: t.source_id,
    source_name,
    destination_type: t.destination_type as 'branch' | 'warehouse',
    destination_id: t.destination_id,
    destination_name,
    notes: t.notes,
    created_by: t.created_by,
    total_items,
    total_quantity,
    created_at: t.created_at,
    updated_at: t.updated_at,
    items,
  };
}

export async function updateStockTransferStatus(id: string, status: StockTransferStatus): Promise<void> {
  const { error } = await supabase
    .from('stock_transfers')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw toApiError(error);
}

// ============================================================
// POS Checkout Service
// ============================================================

export interface POSCheckoutItem {
  product_id: string;
  name: string;
  sku: string | null;
  price: number;
  quantity: number;
}

export interface POSCheckoutParams {
  items: POSCheckoutItem[];
  customerId: string | null;
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
}

export async function createPOSOrder(params: POSCheckoutParams): Promise<{ orderId: string; orderNumber: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new ApiError('You must be signed in to complete a sale.', '401', 401);

  const orderNumber = `SO-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

  const { data: orderRow, error: orderError } = await supabase
    .from('orders')
    .insert({
      order_number: orderNumber,
      customer_id: params.customerId,
      status: 'fulfilled',
      payment_status: 'paid',
      fulfillment_status: 'fulfilled',
      subtotal: params.subtotal,
      discount_total: 0,
      shipping_total: 0,
      tax_total: params.taxTotal,
      grand_total: params.grandTotal,
      currency: 'USD',
      placed_at: new Date().toISOString(),
    })
    .select('id, order_number')
    .single();

  if (orderError) throw toApiError(orderError);

  const order = orderRow as { id: string; order_number: string };

  const orderItems = params.items.map((item) => ({
    order_id: order.id,
    product_id: item.product_id,
    product_name: item.name,
    sku: item.sku,
    price: item.price,
    quantity: item.quantity,
    line_total: item.price * item.quantity,
  }));

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItems);

  if (itemsError) throw toApiError(itemsError);

  for (const item of params.items) {
    await supabase.rpc('decrement_product_stock', { p_product_id: item.product_id, p_quantity: item.quantity });
  }

  return { orderId: order.id, orderNumber: order.order_number };
}

// ============================================================
// User Settings Service
// ============================================================

export interface UserSettings {
  id: string;
  theme: string;
  language: string;
  push_notifications: boolean;
  email_notifications: boolean;
  low_stock_alerts: boolean;
  order_alerts: boolean;
  task_reminders: boolean;
  transfer_alerts: boolean;
  created_at: string;
  updated_at: string;
}

export async function fetchUserSettings(userId: string): Promise<UserSettings> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw toApiError(error);
  if (!data) {
    const { data: created, error: createError } = await supabase
      .from('user_settings')
      .insert({ id: userId })
      .select('*')
      .single();
    if (createError) throw toApiError(createError);
    return created as UserSettings;
  }
  return data as UserSettings;
}

export async function updateUserSettings(
  userId: string,
  updates: Partial<Omit<UserSettings, 'id' | 'created_at' | 'updated_at'>>
): Promise<UserSettings> {
  const { data, error } = await supabase
    .from('user_settings')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select('*')
    .single();

  if (error) throw toApiError(error);
  return data as UserSettings;
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.email) throw new ApiError('Not signed in.', '401', 401);

  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: session.user.email,
    password: currentPassword,
  });
  if (reauthError) throw new ApiError('Current password is incorrect.', 'AUTH_INVALID', 401);

  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });
  if (updateError) throw new ApiError(updateError.message, 'AUTH_UPDATE', 400);
}
