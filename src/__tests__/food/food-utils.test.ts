import { describe, it, expect } from 'vitest';
import { formatNaira, formatPrep, isOrderableNow } from '../../utils/food';

// 2026-09-30 is a Wednesday
const wed = (h: number, m = 0) => new Date(2026, 8, 30, h, m);

describe('food utils', () => {
  it('formats Naira', () => {
    expect(formatNaira(3500)).toContain('3,500');
    expect(formatNaira(3500)).toContain('₦');
  });

  it('formats prep time', () => {
    expect(formatPrep(45)).toBe('45 min');
    expect(formatPrep(90)).toBe('1h 30m');
    expect(formatPrep(120)).toBe('2h');
    expect(formatPrep(0)).toBeNull();
    expect(formatPrep(undefined)).toBeNull();
  });

  it('is orderable with no constraints', () => {
    expect(isOrderableNow({}, wed(23))).toBe(true);
  });

  it('respects available days', () => {
    expect(isOrderableNow({ availableDays: ['Wed'] }, wed(10))).toBe(true);
    expect(isOrderableNow({ availableDays: ['Mon', 'Fri'] }, wed(10))).toBe(false);
  });

  it('respects the daily cut-off', () => {
    expect(isOrderableNow({ orderCutoff: '14:00' }, wed(13, 59))).toBe(true);
    expect(isOrderableNow({ orderCutoff: '14:00' }, wed(14, 1))).toBe(false);
    expect(isOrderableNow({ orderCutoff: 'bad' }, wed(23))).toBe(true);
  });
});
