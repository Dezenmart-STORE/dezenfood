/**
 * Dynamic Product Sitemap Generator
 *
 * This script fetches all food products from the DezenMart API and generates
 * an XML sitemap for search engine indexing.
 *
 * Usage:
 *   node scripts/generate-product-sitemap.js
 *
 * Environment Variables:
 *   VITE_API_URL - The API base URL (default: from .env)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES modules workaround for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const API_URL = process.env.VITE_API_URL || 'http://localhost:5000/api/v1';
const SITE_URL = (process.env.VITE_SITE_URL || JSON.parse(fs.readFileSync(path.join(__dirname, '../src/config/brand.defaults.json'), 'utf8')).siteUrl).replace(/\/$/, '');
const OUTPUT_PATH = path.join(__dirname, '../public/sitemap-products.xml');

/**
 * Fetch all products from the API
 */
async function fetchAllProducts() {
  try {
    console.log('🔍 Fetching products from API...');
    console.log(`📡 API URL: ${API_URL}/products`);

    const response = await fetch(`${API_URL}/products`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Vertical': 'food',
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Handle different API response formats
    const products = Array.isArray(data) ? data : data.products || data.data || [];

    console.log(`✅ Fetched ${products.length} products`);
    return products;
  } catch (error) {
    console.error('❌ Error fetching products:', error.message);
    throw error;
  }
}

/**
 * Generate sitemap XML from products
 */
function generateSitemapXML(products) {
  const today = new Date().toISOString().split('T')[0];

  const urlEntries = products
    .filter(product => product._id || product.id) // Ensure product has an ID
    .map(product => {
      const productId = product._id || product.id;
      const lastMod = product.updatedAt
        ? new Date(product.updatedAt).toISOString().split('T')[0]
        : today;

      return `  <url>
    <loc>${SITE_URL}/product/${productId}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;
}

/**
 * Save sitemap to file
 */
function saveSitemap(xml) {
  try {
    // Ensure public directory exists
    const publicDir = path.dirname(OUTPUT_PATH);
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    fs.writeFileSync(OUTPUT_PATH, xml, 'utf8');
    console.log(`✅ Sitemap saved to: ${OUTPUT_PATH}`);
    console.log(`📊 File size: ${(xml.length / 1024).toFixed(2)} KB`);
  } catch (error) {
    console.error('❌ Error saving sitemap:', error.message);
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting product sitemap generation...\n');

  try {
    // Fetch products from API
    const products = await fetchAllProducts();

    if (products.length === 0) {
      console.warn('⚠️  No products found. Generating empty sitemap.');
    }

    // Generate XML
    console.log('\n📝 Generating sitemap XML...');
    const xml = generateSitemapXML(products);

    // Save to file
    console.log('💾 Saving sitemap...');
    saveSitemap(xml);

    console.log('\n✨ Product sitemap generation completed successfully!');
    console.log(`🔗 Products indexed: ${products.length}`);
    console.log(`📍 Sitemap URL: ${SITE_URL}/sitemap-products.xml\n`);

    process.exit(0);
  } catch (error) {
    // Never fail the build over a sitemap: a transient API outage shouldn't
    // block a deploy. Warn and keep the last-good committed sitemap.
    console.error('\n💥 Sitemap generation failed:', error.message);
    console.warn('⚠️  Keeping existing sitemap-products.xml and continuing.');
    process.exit(0);
  }
}

// Run the script
main();
