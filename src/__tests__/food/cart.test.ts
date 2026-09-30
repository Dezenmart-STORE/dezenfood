import { describe, it, expect, beforeEach } from 'vitest';
import reducer, {
  addToCart,
  clearCart,
  conflictsWithCart,
  lineKey,
  removeFromCart,
  setQuantity,
  selectCartSubtotal,
  type CartState,
} from '../../store/slices/cartSlice';
import type { Product } from '../../utils/types';

const product = ({ id, seller, ...over }: Omit<Partial<Product>, 'seller'> & { id?: string; seller?: string } = {}): Product =>
  ({
    _id: id ?? 'p1',
    name: 'Small chops platter',
    price: 5000,
    currency: 'NGN',
    images: ['a.png'],
    seller: { _id: seller ?? 'v1', name: 'Mama Put', rating: 5, profileImage: '' },
    state: 'Lagos',
    lga: 'Ikeja',
    weight: 1,
    minOrderQty: 1,
    ...over,
  }) as Product;

const empty: CartState = { vendor: null, items: [] };
const add = (s: CartState, p: Product, quantity = 1, extra = {}) =>
  reducer(s, addToCart({ product: p, quantity, maxQuantity: 10, ...extra }));

describe('cartSlice', () => {
  beforeEach(() => localStorage.clear());

  it('adds an item and records the vendor', () => {
    const s = add(empty, product());
    expect(s.vendor?.id).toBe('v1');
    expect(s.items).toHaveLength(1);
    expect(s.items[0].quantity).toBe(1);
  });

  it('merges the same product + option into one line', () => {
    let s = add(empty, product(), 2);
    s = add(s, product(), 3);
    expect(s.items).toHaveLength(1);
    expect(s.items[0].quantity).toBe(5);
  });

  it('keeps different options of one product as separate lines', () => {
    let s = add(empty, product(), 1, { variantIndex: 0 });
    s = add(s, product(), 1, { variantIndex: 1 });
    expect(s.items).toHaveLength(2);
  });

  it('refuses another vendor unless replace is confirmed', () => {
    const s = add(empty, product());
    const other = product({ id: 'p2', seller: 'v2' });
    expect(conflictsWithCart(s, other)).toBe(true);
    expect(add(s, other).items.map((i) => i.productId)).toEqual(['p1']);
    const replaced = add(s, other, 1, { replace: true });
    expect(replaced.vendor?.id).toBe('v2');
    expect(replaced.items.map((i) => i.productId)).toEqual(['p2']);
  });

  it('clamps quantity to min order and stock', () => {
    let s = add(empty, product({ minOrderQty: 3 }), 1);
    expect(s.items[0].quantity).toBe(3);
    s = reducer(s, setQuantity({ key: lineKey(s.items[0]), quantity: 99 }));
    expect(s.items[0].quantity).toBe(10);
    s = reducer(s, setQuantity({ key: lineKey(s.items[0]), quantity: 0 }));
    expect(s.items[0].quantity).toBe(3);
  });

  it('clears the vendor when the last item is removed', () => {
    let s = add(empty, product());
    s = reducer(s, removeFromCart(lineKey(s.items[0])));
    expect(s).toEqual(empty);
    expect(reducer(add(empty, product()), clearCart())).toEqual(empty);
  });

  it('computes the subtotal', () => {
    let s = add(empty, product({ price: 1500 }), 2);
    s = add(s, product({ id: 'p2', price: 500 }), 3);
    expect(selectCartSubtotal({ cart: s })).toBe(4500);
  });

  it('does not add a product that has no vendor', () => {
    const p = product();
    (p as unknown as { seller: unknown }).seller = undefined;
    expect(add(empty, p)).toEqual(empty);
  });
});
