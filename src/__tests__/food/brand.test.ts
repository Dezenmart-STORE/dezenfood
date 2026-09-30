// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import defaults from '../../config/brand.defaults.json';
import categories from '../../config/categories.json';
import { BRAND } from '../../config/brand';

const ROOT = join(__dirname, '../../..');

describe('brand config', () => {
  it('BRAND falls back to brand.defaults.json', () => {
    expect(BRAND.name).toBe(defaults.name);
    expect(BRAND.siteUrl).toBe(defaults.siteUrl);
  });

  it('SEO edge function defaults match brand.defaults.json', () => {
    const edge = readFileSync(join(ROOT, 'netlify/edge-functions/seo.ts'), 'utf8');
    expect(edge).toContain(`|| "${defaults.name}"`);
    expect(edge).toContain(defaults.siteUrl);
    expect(edge).toContain(defaults.description);
  });

  it('index.html uses brand tokens, not a hardcoded brand', () => {
    const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
    expect(html).toContain('__BRAND_NAME__');
    expect(html).not.toMatch(/DezenMart|dezenmart\.com/i);
  });

  it('categories.json is non-empty with unique names', () => {
    const names = (categories as { name: string }[]).map((c) => c.name);
    expect(names.length).toBeGreaterThan(4);
    expect(new Set(names).size).toBe(names.length);
  });
});
