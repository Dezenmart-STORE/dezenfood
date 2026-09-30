/**
 * Generates the static SEO files from brand + category config so they never
 * drift from the app:
 *   public/sitemap.xml            static pages
 *   public/sitemap-categories.xml one URL per food category
 *   public/robots.txt             (Sitemap lines updated in place)
 *
 * Run automatically by `npm run generate-sitemap` (before the product sitemap).
 * Site URL: VITE_SITE_URL, else src/config/brand.defaults.json.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const read = (p) => JSON.parse(fs.readFileSync(path.join(__dirname, p), 'utf8'));

const brand = read('../src/config/brand.defaults.json');
const categories = read('../src/config/categories.json');
const SITE_URL = (process.env.VITE_SITE_URL || brand.siteUrl).replace(/\/$/, '');
const today = new Date().toISOString().split('T')[0];

const urlset = (entries) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries
    .map(
      (e) => `  <url>
    <loc>${SITE_URL}${e.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${e.freq}</changefreq>
    <priority>${e.priority}</priority>
  </url>`,
    )
    .join('\n')}\n</urlset>\n`;

const pages = [
  { path: '/', freq: 'daily', priority: '1.0' },
  { path: '/product', freq: 'daily', priority: '0.9' },
  { path: '/community', freq: 'weekly', priority: '0.7' },
  { path: '/vendor/apply', freq: 'monthly', priority: '0.6' },
  { path: '/referral', freq: 'monthly', priority: '0.5' },
];
const cats = categories.map((c) => ({
  path: `/product/category/${encodeURIComponent(c.name.toLowerCase())}`,
  freq: 'daily',
  priority: '0.8',
}));

const pub = (f) => path.join(__dirname, '../public', f);
fs.writeFileSync(pub('sitemap.xml'), urlset(pages));
fs.writeFileSync(pub('sitemap-categories.xml'), urlset(cats));

let robots = fs.readFileSync(pub('robots.txt'), 'utf8');
robots = robots
  .replace(/^# .*Robots\.txt$/m, `# ${brand.name} - Robots.txt`)
  .replace(/^Sitemap: .*$/gm, '')
  .trimEnd();
robots += `\nSitemap: ${SITE_URL}/sitemap.xml\nSitemap: ${SITE_URL}/sitemap-products.xml\nSitemap: ${SITE_URL}/sitemap-categories.xml\n`;
fs.writeFileSync(pub('robots.txt'), robots);

console.log(`Wrote sitemap.xml, sitemap-categories.xml, robots.txt for ${SITE_URL}`);
