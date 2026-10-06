import { describe, expect, it } from 'vitest';
import { canBuyerConfirm, needsRefundAccount, vendorActionsFor } from '../../utils/orderFlow';

const actions = (status: string, fulfilment: 'delivery' | 'pickup' = 'delivery') =>
  vendorActionsFor({ status, fulfilment } as never).map((a) => a.action);

describe('vendorActionsFor', () => {
  it('lets a vendor accept or decline a paid order', () => {
    expect(actions('paid')).toEqual(['preparing', 'reject']);
    expect(actions('accepted')).toEqual(['preparing', 'reject']);
  });

  it('walks a delivery order all the way to delivered', () => {
    expect(actions('preparing')).toEqual(['ready']);
    expect(actions('ready', 'delivery')).toEqual(['out_for_delivery']);
    expect(actions('out_for_delivery', 'delivery')).toEqual(['delivered']);
  });

  it('walks a pickup order to delivered without a delivery step', () => {
    expect(actions('ready', 'pickup')).toEqual(['delivered']);
  });

  it('offers nothing once the order is finished or not yet paid', () => {
    for (const s of ['awaiting_payment', 'delivered', 'completed', 'cancelled', 'rejected', 'disputed', 'refunded']) {
      expect(actions(s)).toEqual([]);
    }
  });

  it('only ever offers actions the backend accepts', () => {
    const accepted = ['accept', 'reject', 'preparing', 'ready', 'out_for_delivery', 'delivered'];
    for (const s of ['paid', 'preparing', 'ready', 'out_for_delivery']) {
      for (const f of ['delivery', 'pickup'] as const) {
        for (const a of actions(s, f)) expect(accepted).toContain(a);
      }
    }
  });
});

describe('canBuyerConfirm', () => {
  it('allows confirmation once the food is with the buyer', () => {
    expect(canBuyerConfirm('delivered')).toBe(true);
    expect(canBuyerConfirm('out_for_delivery')).toBe(true);
    expect(canBuyerConfirm('ready', 'pickup')).toBe(true);
  });
  it('never allows it before then or after completion', () => {
    for (const s of ['awaiting_payment', 'paid', 'preparing', 'completed', 'disputed', 'cancelled']) {
      expect(canBuyerConfirm(s, 'pickup')).toBe(false);
    }
    expect(canBuyerConfirm('ready', 'delivery')).toBe(false);
  });
});

describe('needsRefundAccount', () => {
  it('is true only while a refund is waiting for bank details', () => {
    expect(needsRefundAccount({ refund: { status: 'awaiting_account', amount: 1 } })).toBe(true);
    expect(needsRefundAccount({ refund: { status: 'failed', amount: 1 } })).toBe(true);
    expect(needsRefundAccount({ refund: { status: 'sent', amount: 1 } })).toBe(false);
    expect(needsRefundAccount({ refund: { status: 'processing', amount: 1 } })).toBe(false);
    expect(needsRefundAccount({})).toBe(false);
  });
});
