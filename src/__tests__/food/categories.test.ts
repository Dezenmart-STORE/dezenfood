import { describe, it, expect } from 'vitest';
import { CATEGORIES, CATEGORY_NAMES, categoryHref, getCategoryByName } from '../../utils/categories';

describe('food categories', () => {
  it('includes the launch segments from the brief', () => {
    for (const name of ['Snacks', 'Small Chops', 'Groceries', 'Pepper Soup', 'Rice & Rice Meals']) {
      expect(CATEGORY_NAMES).toContain(name);
    }
  });

  it('has unique names and a renderable icon for each', () => {
    expect(new Set(CATEGORY_NAMES).size).toBe(CATEGORY_NAMES.length);
    for (const c of CATEGORIES) {
      expect(c.emoji).toBeTruthy();
      expect(c.Icon).toBeTypeOf('function');
    }
  });

  it('finds a category case-insensitively and builds an encoded href', () => {
    expect(getCategoryByName('small chops')?.name).toBe('Small Chops');
    expect(getCategoryByName('Electronics')).toBeUndefined();
    expect(categoryHref('Rice & Rice Meals')).toBe('/product/category/rice%20%26%20rice%20meals');
  });
});
