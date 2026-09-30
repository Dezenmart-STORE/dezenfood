import { createSlice, createSelector, type PayloadAction } from "@reduxjs/toolkit";
import type { Product } from "../../utils/types";
import type { FulfilmentMode } from "../../utils/food";

/**
 * Cart. Food is fulfilled by one vendor per order (one kitchen, one delivery,
 * one escrow), so a cart only ever holds items from a single vendor. Adding an
 * item from a different vendor is rejected until the caller confirms a replace.
 *
 * The cart holds a snapshot for display only. The backend recomputes every
 * price, fee and total from product ids when the order is placed.
 */

export interface CartItem {
  productId: string;
  name: string;
  image?: string;
  /** Unit price snapshot, in `currency` */
  price: number;
  currency: string;
  quantity: number;
  /** Selected option (variant) index, when the product has options */
  variantIndex?: number;
  variantLabel?: string;
  /** Max the buyer can add (stock or option quantity) */
  maxQuantity: number;
  minQuantity: number;
  /** Unit weight in kg, for the delivery quote */
  weight: number;
  /** Free-text instruction for the vendor, e.g. "no pepper" */
  note?: string;
  /** Ways this item can be received (missing = delivery) */
  fulfilment: FulfilmentMode[];
}

export interface CartVendor {
  id: string;
  name: string;
  /** Kitchen / store location: origin for delivery quotes */
  state: string;
  lga: string;
}

export interface CartState {
  vendor: CartVendor | null;
  items: CartItem[];
}

const STORAGE_KEY = "dezenfoods_cart_v1";

const empty: CartState = { vendor: null, items: [] };

export const loadCart = (): CartState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as CartState;
    if (!Array.isArray(parsed?.items)) return empty;
    return parsed;
  } catch {
    return empty;
  }
};

export const saveCart = (state: CartState): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable - cart just won't persist */
  }
};

/** Same product + same option = same line. */
export const lineKey = (i: Pick<CartItem, "productId" | "variantIndex">): string =>
  `${i.productId}:${i.variantIndex ?? "-"}`;

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), Math.max(min, max));

export interface AddToCartPayload {
  product: Product;
  quantity: number;
  variantIndex?: number;
  variantLabel?: string;
  maxQuantity: number;
  note?: string;
  /** Replace the cart when it holds another vendor's items */
  replace?: boolean;
}

/** True when adding `product` would mix vendors. */
export const conflictsWithCart = (cart: CartState, product: Product): boolean =>
  !!cart.vendor && cart.items.length > 0 && cart.vendor.id !== product.seller?._id;

const cartSlice = createSlice({
  name: "cart",
  initialState: loadCart(),
  reducers: {
    addToCart(state, action: PayloadAction<AddToCartPayload>) {
      const { product, quantity, variantIndex, variantLabel, maxQuantity, note, replace } = action.payload;
      if (!product.seller?._id) return;

      if (replace || (state.vendor && state.vendor.id !== product.seller._id)) {
        if (!replace) return; // caller must confirm first (see conflictsWithCart)
        state.items = [];
      }
      state.vendor = {
        id: product.seller._id,
        name: product.seller.name,
        state: product.state,
        lga: product.lga,
      };

      const minQuantity = Math.max(1, product.minOrderQty ?? 1);
      const item: CartItem = {
        productId: product._id,
        name: product.name,
        image: product.images?.[0],
        price: product.price,
        currency: product.currency ?? "NGN",
        quantity: clamp(quantity, minQuantity, maxQuantity),
        variantIndex,
        variantLabel,
        maxQuantity,
        minQuantity,
        weight: product.weight || 0,
        note,
        fulfilment: product.fulfilment?.length ? product.fulfilment : ["delivery"],
      };
      const existing = state.items.find((i) => lineKey(i) === lineKey(item));
      if (existing) {
        existing.quantity = clamp(existing.quantity + item.quantity, minQuantity, maxQuantity);
        existing.price = item.price;
        existing.maxQuantity = maxQuantity;
        if (note) existing.note = note;
      } else {
        state.items.push(item);
      }
    },
    setQuantity(state, action: PayloadAction<{ key: string; quantity: number }>) {
      const item = state.items.find((i) => lineKey(i) === action.payload.key);
      if (item) item.quantity = clamp(action.payload.quantity, item.minQuantity, item.maxQuantity);
    },
    setNote(state, action: PayloadAction<{ key: string; note: string }>) {
      const item = state.items.find((i) => lineKey(i) === action.payload.key);
      if (item) item.note = action.payload.note.slice(0, 200);
    },
    removeFromCart(state, action: PayloadAction<string>) {
      state.items = state.items.filter((i) => lineKey(i) !== action.payload);
      if (state.items.length === 0) state.vendor = null;
    },
    clearCart() {
      return empty;
    },
  },
});

export const { addToCart, setQuantity, setNote, removeFromCart, clearCart } = cartSlice.actions;
export default cartSlice.reducer;

// ── Selectors ────────────────────────────────────────────────────────────────
type WithCart = { cart: CartState };

export const selectCart = (s: WithCart) => s.cart;
export const selectCartCount = (s: WithCart) => s.cart.items.reduce((n, i) => n + i.quantity, 0);
export const selectCartSubtotal = createSelector(
  (s: WithCart) => s.cart.items,
  (items) => items.reduce((sum, i) => sum + i.price * i.quantity, 0)
);
export const selectCartWeight = createSelector(
  (s: WithCart) => s.cart.items,
  (items) => items.reduce((sum, i) => sum + i.weight * i.quantity, 0)
);
