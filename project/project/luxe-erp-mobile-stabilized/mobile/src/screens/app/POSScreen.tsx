import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
} from 'react-native';
import { ScreenWrapper } from '@components/ScreenWrapper';
import { AppHeader } from '@components/AppHeader';
import { Card } from '@components/Card';
import { Button } from '@components/Button';
import { Input } from '@components/Input';
import { EmptyState } from '@components/EmptyState';
import { SkeletonList } from '@components/Skeleton';
import { CachedImage } from '@components/CachedImage';
import { useThemeStore } from '@store/themeStore';
import { useAuthStore } from '@store/authStore';
import { usePOSStore } from '@store/posStore';
import { useProducts, useCustomers, useCreatePOSOrder } from '@hooks/useERP';
import { useResponsive, getCardWidth } from '@hooks/useResponsive';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getIconName } from '@config/icons';
import type { ProductListItem } from '@hooks/useERP';
import type { CustomerListItem } from '@apptypes/erp';

const DEBOUNCE_MS = 300;

export default function POSScreen() {
  const { colors } = useThemeStore();
  const profile = useAuthStore((s) => s.profile);
  const layout = useResponsive();

  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [lastOrderNumber, setLastOrderNumber] = useState<string | null>(null);

  const posStore = usePOSStore();
  const createOrder = useCreatePOSOrder();

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchText), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchText]);

  const productsQuery = useProducts(debouncedSearch, null);
  const customersQuery = useCustomers(customerSearch);

  const allProducts = useMemo(() => {
    return productsQuery.data?.pages.flatMap((page) => page.items) ?? [];
  }, [productsQuery.data]);

  const allCustomers = useMemo(() => {
    return customersQuery.data?.pages.flatMap((page) => page.items) ?? [];
  }, [customersQuery.data]);

  const cardWidth = getCardWidth(layout, layout.columns);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await productsQuery.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [productsQuery]);

  const addToCart = (product: ProductListItem) => {
    posStore.addToCart({
      product_id: product.id,
      name: product.name,
      price: product.price,
      sku: product.sku ?? null,
      stock: product.stock,
      image_url: product.image_url ?? null,
    });
  };

  const renderProduct = ({ item }: { item: ProductListItem }) => {
    const stockColor = item.stock <= 0 ? colors.error : item.stock <= item.low_stock_threshold ? colors.warning : colors.success;
    return (
      <TouchableOpacity
        style={[styles.productCard, { backgroundColor: colors.surface, borderColor: colors.border, width: cardWidth }]}
        activeOpacity={0.7}
        onPress={() => {
          if (item.stock <= 0) {
            Alert.alert('Out of Stock', `${item.name} is currently out of stock.`);
            return;
          }
          addToCart(item);
        }}
      >
        <View style={[styles.productImageBox, { backgroundColor: colors.surfaceElevated }]}>
          {item.image_url ? (
            <CachedImage uri={item.image_url} style={styles.productImage} resizeMode="cover" />
          ) : (
            <MaterialCommunityIcons name="package-variant-closed" size={32} color={colors.textMuted} />
          )}
        </View>
        <View style={styles.productInfo}>
          <Text style={[styles.productName, { color: colors.textPrimary }]} numberOfLines={2}>{item.name}</Text>
          {item.sku && <Text style={[styles.productSku, { color: colors.textMuted }]} numberOfLines={1}>{item.sku}</Text>}
          <View style={styles.productBottom}>
            <Text style={[styles.productPrice, { color: colors.gold }]}>${item.price.toFixed(2)}</Text>
            <View style={[styles.stockBadge, { backgroundColor: stockColor + '20' }]}>
              <Text style={[styles.stockText, { color: stockColor }]}>{item.stock}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderCartItem = (item: ReturnType<typeof usePOSStore.getState>['cart'][0]) => (
    <View key={item.product_id} style={[styles.cartItem, { borderBottomColor: colors.border }]}>
      <View style={styles.cartItemInfo}>
        <Text style={[styles.cartItemName, { color: colors.textPrimary }]} numberOfLines={1}>{item.name}</Text>
        <Text style={[styles.cartItemPrice, { color: colors.textMuted }]}>${item.price.toFixed(2)} each</Text>
      </View>
      <View style={styles.cartItemControls}>
        <TouchableOpacity
          style={[styles.qtyBtn, { backgroundColor: colors.surfaceElevated }]}
          onPress={() => posStore.decrementQuantity(item.product_id)}
        >
          <MaterialCommunityIcons name="minus" size={16} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.qtyText, { color: colors.textPrimary }]}>{item.quantity}</Text>
        <TouchableOpacity
          style={[styles.qtyBtn, { backgroundColor: colors.surfaceElevated }]}
          onPress={() => posStore.incrementQuantity(item.product_id)}
          disabled={item.quantity >= item.stock}
        >
          <MaterialCommunityIcons name="plus" size={16} color={item.quantity >= item.stock ? colors.textMuted : colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.cartItemTotal, { color: colors.gold }]}>${(item.price * item.quantity).toFixed(2)}</Text>
        <TouchableOpacity onPress={() => posStore.removeFromCart(item.product_id)}>
          <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const subtotal = posStore.cartSubtotal();
  const taxRate = 0.08;
  const tax = subtotal * taxRate;
  const total = subtotal + tax;
  const cartCount = posStore.cartCount();

  const renderCustomer = ({ item }: { item: CustomerListItem }) => {
    const fullName = [item.first_name, item.last_name].filter(Boolean).join(' ').trim() || 'Unknown';
    return (
      <TouchableOpacity
        style={[styles.customerItem, { borderBottomColor: colors.border }]}
        onPress={() => {
          posStore.setCustomer({ id: item.id, name: fullName, email: item.email });
          setShowCustomerPicker(false);
        }}
      >
        <View style={[styles.customerAvatar, { backgroundColor: colors.gold }]}>
          <Text style={styles.customerAvatarText}>{fullName.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.customerInfo}>
          <Text style={[styles.customerName, { color: colors.textPrimary }]} numberOfLines={1}>{fullName}</Text>
          <Text style={[styles.customerEmail, { color: colors.textMuted }]} numberOfLines={1}>{item.email}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const showLoading = productsQuery.isLoading && !refreshing;

  return (
    <ScreenWrapper>
      <AppHeader
        title="POS"
        subtitle="Point of sale"
        showMenu
        rightIcon="shopping-cart"
        onRightPress={() => setShowCart(true)}
      />
      <View style={[styles.content, { paddingHorizontal: layout.padding, maxWidth: layout.contentMaxWidth, alignSelf: layout.isTablet ? 'center' : 'stretch' }]}>
        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <MaterialCommunityIcons name="magnify" size={20} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search products…"
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

        {showLoading && (
          <View style={styles.loadingContainer}>
            <SkeletonList count={6} />
          </View>
        )}

        {!showLoading && (
          <FlatList
            data={allProducts}
            keyExtractor={(item) => item.id}
            renderItem={renderProduct}
            numColumns={layout.columns}
            key={layout.columns}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} colors={[colors.gold]} />}
            onEndReached={() => {
              if (productsQuery.hasNextPage && !productsQuery.isFetchingNextPage) {
                productsQuery.fetchNextPage();
              }
            }}
            onEndReachedThreshold={0.5}
            ListEmptyComponent={
              <View style={styles.centerState}>
                <EmptyState
                  icon="package"
                  title="No Products"
                  message={debouncedSearch ? `No products match "${debouncedSearch}".` : 'No products available.'}
                />
              </View>
            }
            ListFooterComponent={
              productsQuery.isFetchingNextPage ? (
                <View style={styles.footerLoader}>
                  <ActivityIndicator size="small" color={colors.gold} />
                </View>
              ) : null
            }
          />
        )}
      </View>

      {/* Cart Modal */}
      <Modal visible={showCart} animationType="slide" transparent={false} onRequestClose={() => setShowCart(false)}>
        <ScreenWrapper edges={['top', 'bottom']}>
          <AppHeader
            title={`Cart (${cartCount})`}
            showBack
            onRightPress={() => setShowCart(false)}
            rightIcon="x"
          />
          <View style={[styles.cartContent, { paddingHorizontal: layout.padding }]}>
            {posStore.cart.length === 0 ? (
              <View style={styles.centerState}>
                <EmptyState icon="shopping-cart" title="Cart is Empty" message="Add products to start a sale." />
              </View>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.customerSelector, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => setShowCustomerPicker(true)}
                >
                  <MaterialCommunityIcons name="account-outline" size={20} color={colors.gold} />
                  <Text style={[styles.customerSelectorText, { color: posStore.customer ? colors.textPrimary : colors.textMuted }]}>
                    {posStore.customer ? posStore.customer.name : 'Select customer (optional)'}
                  </Text>
                  <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textMuted} />
                </TouchableOpacity>

                <FlatList
                  data={posStore.cart}
                  keyExtractor={(item) => item.product_id}
                  renderItem={({ item }) => renderCartItem(item)}
                  contentContainerStyle={styles.cartList}
                />

                <Card>
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Subtotal</Text>
                    <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>${subtotal.toFixed(2)}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Tax (8%)</Text>
                    <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>${tax.toFixed(2)}</Text>
                  </View>
                  <View style={[styles.summaryRow, { borderTopColor: colors.border }]}>
                    <Text style={[styles.totalLabel, { color: colors.textPrimary }]}>Total</Text>
                    <Text style={[styles.totalValue, { color: colors.gold }]}>${total.toFixed(2)}</Text>
                  </View>
                </Card>

                <View style={styles.cartActions}>
                  <Button title="Clear" onPress={() => posStore.clearCart()} variant="outline" style={{ flex: 1 }} />
                  {checkoutError && (
                    <Text style={[styles.checkoutError, { color: colors.error }]}>{checkoutError}</Text>
                  )}
                  {lastOrderNumber && !checkoutError && (
                    <Text style={[styles.checkoutSuccess, { color: colors.success }]}>Order {lastOrderNumber} created successfully!</Text>
                  )}
                  <Button
                    title={checkingOut ? 'Processing…' : 'Checkout'}
                    onPress={async () => {
                      setCheckoutError(null);
                      setCheckingOut(true);
                      try {
                        const result = await createOrder({
                          items: posStore.cart.map((c) => ({
                            product_id: c.product_id,
                            name: c.name,
                            sku: c.sku,
                            price: c.price,
                            quantity: c.quantity,
                          })),
                          customerId: posStore.customer?.id ?? null,
                          subtotal,
                          taxTotal: tax,
                          grandTotal: total,
                        });
                        setLastOrderNumber(result.orderNumber);
                        posStore.clearCart();
                        setTimeout(() => {
                          setShowCart(false);
                          setLastOrderNumber(null);
                        }, 2000);
                      } catch (err) {
                        setCheckoutError(err instanceof Error ? err.message : 'Checkout failed. Please try again.');
                      } finally {
                        setCheckingOut(false);
                      }
                    }}
                    disabled={checkingOut || posStore.cart.length === 0}
                    variant="primary"
                    style={{ flex: 1 }}
                  />
                </View>
              </>
            )}
          </View>
        </ScreenWrapper>
      </Modal>

      {/* Customer Picker Modal */}
      <Modal visible={showCustomerPicker} animationType="slide" transparent={false} onRequestClose={() => setShowCustomerPicker(false)}>
        <ScreenWrapper edges={['top', 'bottom']}>
          <AppHeader title="Select Customer" showBack onRightPress={() => setShowCustomerPicker(false)} rightIcon="x" />
          <View style={[styles.content, { paddingHorizontal: layout.padding }]}>
            <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <MaterialCommunityIcons name="magnify" size={20} color={colors.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: colors.textPrimary }]}
                value={customerSearch}
                onChangeText={setCustomerSearch}
                placeholder="Search customers…"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <FlatList
              data={allCustomers}
              keyExtractor={(item) => item.id}
              renderItem={renderCustomer}
              contentContainerStyle={styles.list}
              onEndReached={() => {
                if (customersQuery.hasNextPage && !customersQuery.isFetchingNextPage) {
                  customersQuery.fetchNextPage();
                }
              }}
              onEndReachedThreshold={0.5}
              ListEmptyComponent={
                <View style={styles.centerState}>
                  <EmptyState icon="users" title="No Customers" message="No customers found." />
                </View>
              }
            />
          </View>
        </ScreenWrapper>
      </Modal>
    </ScreenWrapper>
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
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 2 },
  list: { gap: 12, paddingBottom: 24 },
  productCard: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  productImageBox: { height: 100, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  productImage: { width: '100%', height: '100%' },
  productInfo: { padding: 12, gap: 4 },
  productName: { fontSize: 14, fontWeight: '600', lineHeight: 18 },
  productSku: { fontSize: 11 },
  productBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  productPrice: { fontSize: 16, fontWeight: '700' },
  stockBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  stockText: { fontSize: 10, fontWeight: '600' },
  loadingContainer: { flex: 1 },
  centerState: { flex: 1, minHeight: 300, justifyContent: 'center' },
  footerLoader: { paddingVertical: 16, alignItems: 'center' },
  cartContent: { flex: 1, gap: 12 },
  cartList: { gap: 0, paddingBottom: 12 },
  cartItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  cartItemInfo: { flex: 1, gap: 2 },
  cartItemName: { fontSize: 14, fontWeight: '600' },
  cartItemPrice: { fontSize: 12 },
  cartItemControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  qtyText: { fontSize: 14, fontWeight: '600', minWidth: 20, textAlign: 'center' },
  cartItemTotal: { fontSize: 14, fontWeight: '700', minWidth: 60, textAlign: 'right' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  summaryLabel: { fontSize: 14 },
  summaryValue: { fontSize: 14, fontWeight: '500' },
  totalLabel: { fontSize: 16, fontWeight: '700', paddingTop: 8, marginTop: 4, borderTopWidth: 1 },
  totalValue: { fontSize: 18, fontWeight: '700', paddingTop: 8, marginTop: 4, borderTopWidth: 1 },
  cartActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  checkoutError: { fontSize: 13, marginTop: 8, textAlign: 'center' },
  checkoutSuccess: { fontSize: 13, marginTop: 8, textAlign: 'center', fontWeight: '600' },
  customerSelector: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  customerSelectorText: { flex: 1, fontSize: 14, fontWeight: '500' },
  customerItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1 },
  customerAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  customerAvatarText: { fontSize: 16, fontWeight: '800', color: '#0c0f13' },
  customerInfo: { flex: 1, gap: 2 },
  customerName: { fontSize: 14, fontWeight: '600' },
  customerEmail: { fontSize: 12 },
});
