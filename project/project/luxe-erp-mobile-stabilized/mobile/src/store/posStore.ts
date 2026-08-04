import { create } from 'zustand';
import type { POSCartItem, POSCustomer } from '@apptypes/erp';

interface POSState {
  cart: POSCartItem[];
  customer: POSCustomer | null;
  barcodeInput: string;

  addToCart: (item: Omit<POSCartItem, 'quantity'>) => void;
  removeFromCart: (productId: string) => void;
  incrementQuantity: (productId: string) => void;
  decrementQuantity: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  setCustomer: (customer: POSCustomer | null) => void;
  setBarcodeInput: (value: string) => void;
  cartCount: () => number;
  cartSubtotal: () => number;
}

export const usePOSStore = create<POSState>((set, get) => ({
  cart: [],
  customer: null,
  barcodeInput: '',

  addToCart: (item) => {
    const existing = get().cart.find((c) => c.product_id === item.product_id);
    if (existing) {
      if (existing.quantity < item.stock) {
        set({
          cart: get().cart.map((c) =>
            c.product_id === item.product_id ? { ...c, quantity: c.quantity + 1 } : c,
          ),
        });
      }
    } else {
      set({ cart: [...get().cart, { ...item, quantity: 1 }] });
    }
  },

  removeFromCart: (productId) => {
    set({ cart: get().cart.filter((c) => c.product_id !== productId) });
  },

  incrementQuantity: (productId) => {
    set({
      cart: get().cart.map((c) =>
        c.product_id === productId && c.quantity < c.stock
          ? { ...c, quantity: c.quantity + 1 }
          : c,
      ),
    });
  },

  decrementQuantity: (productId) => {
    const item = get().cart.find((c) => c.product_id === productId);
    if (!item) return;
    if (item.quantity <= 1) {
      set({ cart: get().cart.filter((c) => c.product_id !== productId) });
    } else {
      set({
        cart: get().cart.map((c) =>
          c.product_id === productId ? { ...c, quantity: c.quantity - 1 } : c,
        ),
      });
    }
  },

  setQuantity: (productId, quantity) => {
    const item = get().cart.find((c) => c.product_id === productId);
    if (!item) return;
    const clamped = Math.max(0, Math.min(quantity, item.stock));
    if (clamped === 0) {
      set({ cart: get().cart.filter((c) => c.product_id !== productId) });
    } else {
      set({
        cart: get().cart.map((c) =>
          c.product_id === productId ? { ...c, quantity: clamped } : c,
        ),
      });
    }
  },

  clearCart: () => {
    set({ cart: [], customer: null, barcodeInput: '' });
  },

  setCustomer: (customer) => {
    set({ customer });
  },

  setBarcodeInput: (value) => {
    set({ barcodeInput: value });
  },

  cartCount: () => {
    return get().cart.reduce((sum, item) => sum + item.quantity, 0);
  },

  cartSubtotal: () => {
    return get().cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  },
}));
