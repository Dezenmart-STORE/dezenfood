import crypto from 'crypto';
import fs from 'fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import {
  adminApi,
  baseApi,
  ordersApi,
  paymentsApi,
  productsApi,
  userApi,
  vendorsApi,
} from '../../store/api';

const env = JSON.parse(fs.readFileSync(process.env.E2E_FILE as string, 'utf8')) as {
  api: string;
  control: string;
  webhookSecret: string;
  users: Record<'vendor' | 'buyer' | 'admin' | 'stranger', { id: string; token: string }>;
};

// A fresh store per run; every call is made by the real app code.
const store = configureStore({
  reducer: { [baseApi.reducerPath]: baseApi.reducer },
  middleware: (gdm) => gdm().concat(baseApi.middleware),
});

const as = (who: keyof typeof env.users | null) =>
  who ? localStorage.setItem('auth_token', env.users[who].token) : localStorage.removeItem('auth_token');

/** Run a mutation endpoint as `who`, unwrapped like the UI does. */
const mutate = async <T>(who: keyof typeof env.users, thunk: unknown): Promise<T> => {
  as(who);
  try {
    return await (store.dispatch as (a: unknown) => { unwrap: () => Promise<T> })(thunk).unwrap();
  } catch (e) {
    // Keep the HTTP error shape (tests assert on .status) but make it readable.
    const err = e as { status?: number; data?: unknown };
    throw Object.assign(new Error(`HTTP ${err.status}: ${JSON.stringify(err.data)}`), err);
  }
};
/** Run a query as `who`, never from cache. */
const query = async <T>(who: keyof typeof env.users | null, thunk: unknown): Promise<T> => {
  as(who);
  const res = (await (store.dispatch as (a: unknown) => Promise<{ data?: T; error?: unknown }>)(thunk)) as {
    data?: T;
    error?: unknown;
  };
  if (res.error) throw res.error;
  return res.data as T;
};
const fresh = { forceRefetch: true, subscribe: false };
const failure = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (e) {
    return e as { status?: number; data?: { message?: string } };
  }
  throw new Error('expected the request to fail');
};

const control = (path: string, body?: unknown) =>
  fetch(env.control + path, { method: body ? 'POST' : 'GET', body: body ? JSON.stringify(body) : undefined }).then((r) => r.json());
const payouts = async () => ((await control('/calls')) as { path: string; body: any }[]).filter((c) => c.path === '/wallet/payout');

const deposit = async (reference: string, amount: number) => {
  const payload = { event: 'wallet.deposit.success', data: { reference, amount, currency: 'NGN' }, timestamp: Math.floor(Date.now() / 1000) };
  const signature = crypto.createHmac('sha256', env.webhookSecret).update(JSON.stringify(payload)).digest('hex');
  const res = await fetch(`${env.api}/payments/pandascrow/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-PANDASCROW-SIGNATURE': signature },
    body: JSON.stringify(payload),
  });
  return res.status;
};

let productId = '';
let vendorId = '';

const placeAndPay = async (fulfilment: 'pickup' = 'pickup', quantity = 2) => {
  const order: any = await mutate('buyer', ordersApi.endpoints.createFoodOrder.initiate({
    vertical: 'food', items: [{ product: productId, quantity }], fulfilment,
  }));
  const pay: any = await mutate('buyer', paymentsApi.endpoints.initializeFiatPayment.initiate({
    orderId: order._id, provider: 'pandascrow', email: 'buyer@e2e.test', returnUrl: 'http://localhost:5199/payment/callback',
  }));
  expect(await deposit(pay.reference, pay.amount)).toBe(200);
  return { order, pay };
};

describe('DezenFoods frontend ↔ real backend', () => {
  beforeAll(async () => {
    await control('/reset', {});
  });

  it('vendor onboarding: banks, account lookup, apply, admin approval, role', async () => {
    const banks = await query<any[]>('vendor', vendorsApi.endpoints.getBanks.initiate(undefined, fresh));
    expect(banks).toEqual(expect.arrayContaining([{ code: '044', name: 'Access Bank' }]));

    const resolved = await mutate<any>('vendor', vendorsApi.endpoints.resolveBankAccount.initiate({ bankCode: '044', accountNumber: '0123456789' }));
    expect(resolved).toEqual({ accountName: 'E2E ACCOUNT HOLDER' });

    // 404 until they apply: the UI relies on it to show the application form.
    const before: any = await store.dispatch(vendorsApi.endpoints.getMyVendor.initiate(undefined, fresh));
    as('vendor');
    const none: any = await store.dispatch(vendorsApi.endpoints.getMyVendor.initiate(undefined, fresh));
    expect(none.error?.status ?? before.error?.status).toBe(404);

    const applied: any = await mutate('vendor', vendorsApi.endpoints.applyAsVendor.initiate({
      businessName: 'E2E Kitchen', description: 'Cooked fresh for the e2e suite',
      categories: ['Rice & Rice Meals'], phone: '08012345678', state: 'Lagos', lga: 'Ikeja', address: '1 Allen Avenue',
      openingHours: { days: ['Mon', 'Tue'], open: '08:00', close: '20:00' },
      payout: { bankCode: '044', accountNumber: '0123456789' },
    }));
    vendorId = applied._id;
    expect(applied).toMatchObject({ status: 'pending', businessName: 'E2E Kitchen' });
    expect(applied.payoutAccount).toMatchObject({ accountName: 'E2E ACCOUNT HOLDER', accountNumberMasked: '******6789' });
    expect(JSON.stringify(applied)).not.toContain('0123456789');

    const pending = await query<any[]>('admin', adminApi.endpoints.getAdminVendors.initiate({ status: 'pending' }, fresh));
    expect(pending.map((v) => v._id)).toContain(vendorId);

    // Vendors cannot approve themselves.
    const denied = await failure(mutate('vendor', adminApi.endpoints.reviewVendor.initiate({ id: vendorId, status: 'approved' })));
    expect(denied.status).toBe(403);

    const reviewed: any = await mutate('admin', adminApi.endpoints.reviewVendor.initiate({ id: vendorId, status: 'approved' }));
    expect(reviewed.status).toBe('approved');

    const me: any = await query('vendor', vendorsApi.endpoints.getMyVendor.initiate(undefined, fresh));
    expect(me.status).toBe('approved');
    const profile: any = await query('vendor', userApi.endpoints.getUserProfile.initiate(undefined, fresh));
    expect(profile.role).toBe('vendor');
    const adminProfile: any = await query('admin', userApi.endpoints.getUserProfile.initiate(undefined, fresh));
    expect(adminProfile.role).toBe('admin');
    const buyerProfile: any = await query('buyer', userApi.endpoints.getUserProfile.initiate(undefined, fresh));
    expect(buyerProfile.role).toBe('user');
  });

  it('public storefront: vendor page and its listings, no login needed', async () => {
    const seeded = await control('/seed-product', {
      name: 'E2E Party Jollof', description: 'Smoky party jollof, serves four people', category: 'Rice & Rice Meals',
      price: 5000, stock: 20, prepTimeMinutes: 40, minOrderQty: 1, seller: env.users.vendor.id, vendor: vendorId,
    });
    productId = seeded.id;

    const page: any = await query(null, vendorsApi.endpoints.getVendorById.initiate(vendorId, fresh));
    expect(page).toMatchObject({ businessName: 'E2E Kitchen', status: 'approved' });
    expect(page.payoutAccount).toBeUndefined();

    const listing = await query<any[]>(null, vendorsApi.endpoints.getVendorProducts.initiate(vendorId, fresh));
    expect(listing.map((p) => p._id)).toEqual([productId]);

    const products = await query<any[]>(null, productsApi.endpoints.getProducts.initiate(undefined, fresh));
    expect(products.map((p) => p._id)).toContain(productId);
  });

  it('payment methods only offer the live rail', async () => {
    const methods = await query<any[]>('buyer', paymentsApi.endpoints.getPaymentMethods.initiate(undefined, fresh));
    const enabled = methods.filter((m) => m.enabled).map((m) => m.provider);
    expect(enabled).toEqual(['pandascrow']);
  });

  it('happy path: order, pay by transfer, vendor works it, buyer confirms, vendor is paid', async () => {
    await control('/reset', {});
    const order: any = await mutate('buyer', ordersApi.endpoints.createFoodOrder.initiate({
      vertical: 'food', items: [{ product: productId, quantity: 2, note: 'Less pepper' }], fulfilment: 'pickup', buyerNote: 'Thanks',
    }));
    expect(order).toMatchObject({ status: 'awaiting_payment', currency: 'NGN' });
    expect(order.totals).toEqual({ subtotal: 10000, deliveryFee: 0, serviceFee: 500, total: 10500 });
    expect(order.items[0]).toMatchObject({ name: 'E2E Party Jollof', quantity: 2, unitPrice: 5000, note: 'Less pepper' });

    const pay: any = await mutate('buyer', paymentsApi.endpoints.initializeFiatPayment.initiate({
      orderId: order._id, provider: 'pandascrow', email: 'buyer@e2e.test', returnUrl: 'http://localhost:5199/payment/callback',
    }));
    expect(pay).toMatchObject({ provider: 'pandascrow', amount: 10500, currency: 'NGN' });
    expect(pay.virtualAccount).toMatchObject({ bankName: '9PSB' });
    expect(pay.virtualAccount.accountNumber).toMatch(/^\d{10}$/);

    // Not paid until the provider says so.
    let status: any = await query('buyer', paymentsApi.endpoints.getPaymentStatus.initiate(pay.reference, fresh));
    expect(status).toMatchObject({ status: 'pending', orderStatus: 'awaiting_payment' });
    // A stranger can't read someone else's payment.
    expect((await failure(query('stranger', paymentsApi.endpoints.getPaymentStatus.initiate(pay.reference, fresh)))).status).toBe(404);

    expect(await deposit(pay.reference, pay.amount)).toBe(200);
    status = await query('buyer', paymentsApi.endpoints.getPaymentStatus.initiate(pay.reference, fresh));
    expect(status).toMatchObject({ status: 'success', orderStatus: 'paid', orderId: order._id });

    const queue = await query<any[]>('vendor', ordersApi.endpoints.getUserOrders.initiate({ type: 'seller' }, fresh));
    const mine = queue.find((o) => o._id === order._id);
    expect(mine).toMatchObject({ status: 'paid', buyerNote: 'Thanks' });

    expect((await mutate<any>('vendor', ordersApi.endpoints.advanceFoodOrder.initiate({ orderId: order._id, action: 'preparing', prepTimeMinutes: 25 }))).status).toBe('preparing');
    expect((await mutate<any>('vendor', ordersApi.endpoints.advanceFoodOrder.initiate({ orderId: order._id, action: 'ready' }))).status).toBe('ready');
    expect((await mutate<any>('vendor', ordersApi.endpoints.advanceFoodOrder.initiate({ orderId: order._id, action: 'delivered' }))).status).toBe('delivered');
    expect(await payouts()).toHaveLength(0);

    const detail: any = await query('buyer', ordersApi.endpoints.getOrderById.initiate(order._id, fresh));
    expect(detail).toMatchObject({ status: 'delivered', releaseOtpRequired: false, paymentRail: 'pandascrow' });
    expect(detail.vendor.address).toBe('1 Allen Avenue');

    const done: any = await mutate('buyer', ordersApi.endpoints.confirmFiatDelivery.initiate({ orderId: order._id }));
    expect(done.status).toBe('completed');
    const paid = await payouts();
    expect(paid).toHaveLength(1);
    expect(paid[0].body).toMatchObject({ amount: '9000', currency: 'NGN', method: 'bank_transfer', destination: { account_number: '0123456789' } });
  });

  it('order access: strangers see nothing, the marketplace site never sees food orders', async () => {
    const { order } = await placeAndPay();
    expect((await failure(query('stranger', ordersApi.endpoints.getOrderById.initiate(order._id, fresh)))).status).toBe(404);
    expect((await failure(mutate('buyer', ordersApi.endpoints.updateOrderStatus.initiate({ orderId: order._id, details: { status: 'completed' } })))).status).toBe(403);
    // Same request without the vertical header, as the DezenMart app would send it.
    const res = await fetch(`${env.api}/orders?type=buyer`, { headers: { Authorization: `Bearer ${env.users.buyer.token}` } });
    expect((await res.json()).data.orders).toEqual([]);
    const marketplace = await fetch(`${env.api}/products`);
    expect(await marketplace.json()).toEqual([]);
  });

  it('server-side prices: client-supplied totals are ignored, stock cannot be oversold', async () => {
    const order: any = await mutate('buyer', ordersApi.endpoints.createFoodOrder.initiate({
      vertical: 'food', items: [{ product: productId, quantity: 1, price: 1 }], fulfilment: 'pickup', totals: { total: 1 },
    } as never));
    expect(order.totals.subtotal).toBe(5000);
    const tooMany = await failure(mutate('buyer', ordersApi.endpoints.createFoodOrder.initiate({
      vertical: 'food', items: [{ product: productId, quantity: 100 }], fulfilment: 'pickup',
    })));
    expect(tooMany.status).toBe(409);
  });

  it('decline: vendor rejects a paid order, buyer supplies a bank account, refund is paid', async () => {
    await control('/reset', {});
    const { order } = await placeAndPay();
    const rejected: any = await mutate('vendor', ordersApi.endpoints.advanceFoodOrder.initiate({ orderId: order._id, action: 'reject', reason: 'Out of rice' }));
    expect(rejected).toMatchObject({ status: 'rejected', refund: { status: 'awaiting_account', amount: 10500 } });

    const banks = await query<any[]>('buyer', vendorsApi.endpoints.getBanks.initiate(undefined, fresh));
    const resolved: any = await mutate('buyer', vendorsApi.endpoints.resolveBankAccount.initiate({ bankCode: banks[1].code, accountNumber: '0987654321' }));
    expect(resolved.accountName).toBe('E2E ACCOUNT HOLDER');
    const after: any = await mutate('buyer', ordersApi.endpoints.submitRefundAccount.initiate({ orderId: order._id, bankCode: '058', accountNumber: '0987654321' }));
    expect(after.refund.status).toBe('sent');
    const sent = await payouts();
    expect(sent).toHaveLength(1);
    expect(sent[0].body).toMatchObject({ amount: '10500', destination: { bank_code: '058', account_number: '0987654321' } });
  });

  it('buyer cancel: allowed before preparation, refused after', async () => {
    const early = await placeAndPay();
    const cancelled: any = await mutate('buyer', ordersApi.endpoints.cancelOrder.initiate({ orderId: early.order._id, reason: 'Changed my mind' }));
    expect(cancelled).toMatchObject({ status: 'cancelled', refund: { status: 'awaiting_account' } });

    const late = await placeAndPay();
    await mutate('vendor', ordersApi.endpoints.advanceFoodOrder.initiate({ orderId: late.order._id, action: 'preparing' }));
    expect((await failure(mutate('buyer', ordersApi.endpoints.cancelOrder.initiate({ orderId: late.order._id })))).status).toBe(409);
  });

  it('dispute: buyer raises it, admin sees it and rules for the buyer', async () => {
    await control('/reset', {});
    const { order } = await placeAndPay();
    await mutate('vendor', ordersApi.endpoints.advanceFoodOrder.initiate({ orderId: order._id, action: 'preparing' }));
    await mutate('vendor', ordersApi.endpoints.advanceFoodOrder.initiate({ orderId: order._id, action: 'ready' }));
    await mutate('vendor', ordersApi.endpoints.advanceFoodOrder.initiate({ orderId: order._id, action: 'delivered' }));

    const disputed: any = await mutate('buyer', ordersApi.endpoints.raiseDispute.initiate({ orderId: order._id, reason: 'Food arrived cold and spoiled' }));
    expect(disputed.status).toBe('disputed');
    // Payment is frozen while disputed.
    expect((await failure(mutate('buyer', ordersApi.endpoints.confirmFiatDelivery.initiate({ orderId: order._id })))).status).toBe(409);

    const queue = await query<any[]>('admin', adminApi.endpoints.getAdminDisputes.initiate(undefined, fresh));
    expect(queue.map((o) => o._id)).toContain(order._id);
    expect((await failure(mutate('buyer', adminApi.endpoints.resolveDispute.initiate({ orderId: order._id, resolution: 'refund_buyer' })))).status).toBe(403);

    const resolved: any = await mutate('admin', adminApi.endpoints.resolveDispute.initiate({ orderId: order._id, resolution: 'refund_buyer', note: 'Photo evidence' }));
    expect(resolved).toMatchObject({ status: 'refunded', refund: { status: 'awaiting_account' } });
    expect(await payouts()).toHaveLength(0);

    const all = await query<any[]>('admin', adminApi.endpoints.getAdminOrders.initiate({ status: 'refunded' }, fresh));
    expect(all.map((o) => o._id)).toContain(order._id);
  });

  it('unpaid orders expire and give the stock back', async () => {
    const before: any = await query(null, productsApi.endpoints.getProductById.initiate(productId, fresh));
    const order: any = await mutate('buyer', ordersApi.endpoints.createFoodOrder.initiate({
      vertical: 'food', items: [{ product: productId, quantity: 3 }], fulfilment: 'pickup',
    }));
    const reserved: any = await query(null, productsApi.endpoints.getProductById.initiate(productId, fresh));
    expect(reserved.stock).toBe(before.stock - 3);
    await control('/age-order', { orderId: order._id, set: { expiresAt: new Date(Date.now() - 1000) } });
    const expired: any = await query('buyer', ordersApi.endpoints.getOrderById.initiate(order._id, fresh));
    expect(expired.status).toBe('cancelled');
    const restored: any = await query(null, productsApi.endpoints.getProductById.initiate(productId, fresh));
    expect(restored.stock).toBe(before.stock);
  });

  it('webhooks cannot be forged', async () => {
    const order: any = await mutate('buyer', ordersApi.endpoints.createFoodOrder.initiate({
      vertical: 'food', items: [{ product: productId, quantity: 1 }], fulfilment: 'pickup',
    }));
    const pay: any = await mutate('buyer', paymentsApi.endpoints.initializeFiatPayment.initiate({
      orderId: order._id, provider: 'pandascrow', email: 'buyer@e2e.test', returnUrl: 'http://localhost:5199/payment/callback',
    }));
    const payload = { event: 'wallet.deposit.success', data: { reference: pay.reference, amount: pay.amount, currency: 'NGN' }, timestamp: 1 };
    const forged = await fetch(`${env.api}/payments/pandascrow/webhook`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-PANDASCROW-SIGNATURE': 'f'.repeat(64) }, body: JSON.stringify(payload),
    });
    expect(forged.status).toBe(401);
    const unsigned = await fetch(`${env.api}/payments/pandascrow/webhook`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    expect(unsigned.status).toBe(401);
    const status: any = await query('buyer', paymentsApi.endpoints.getPaymentStatus.initiate(pay.reference, fresh));
    expect(status.status).toBe('pending');
  });
});
