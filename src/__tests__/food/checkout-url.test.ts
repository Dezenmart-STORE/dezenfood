import { describe, it, expect } from 'vitest';
import { isSafeCheckoutUrl } from '../../hooks/useFiatPayment';

describe('isSafeCheckoutUrl', () => {
  it('only allows https checkout URLs', () => {
    expect(isSafeCheckoutUrl('https://checkout.korapay.com/x/pay')).toBe(true);
    expect(isSafeCheckoutUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeCheckoutUrl('data:text/html,hi')).toBe(false);
    expect(isSafeCheckoutUrl('mock://checkout')).toBe(false);
    expect(isSafeCheckoutUrl('')).toBe(false);
    expect(isSafeCheckoutUrl(undefined)).toBe(false);
  });
});
