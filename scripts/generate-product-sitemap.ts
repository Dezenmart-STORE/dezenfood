/**
 * Dynamic Product Sitemap Generator (TypeScript)
 *
 * This script fetches all food products from the DezenMart API and generates
 * an XML sitemap for search engine indexing.
 *
 * Usage:
 *   npm run generate-sitemap
 *   or
 *   tsx scripts/generate-product-sitemap.ts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES modules workaround for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

// Types
interface Product {
  _id?: string;
  id?: string;
  name: string;
  slug?: string;
  updatedAt?: string;
  createdAt?: string;
  category?: string;
}

interface ApiResponse {
  products?: Product[];
  data?: Product[];
  [key: string]: any;
}

// Configuration
const API_URL = process.env.VITE_API_URL || 'http://localhost:5000/api/v1';
import { readFileSync } from 'fs';
const SITE_URL = (process.env.VITE_SITE_URL || JSON.parse(readFileSync(path.join(__dirname, '../src/config/brand.defaults.json'), 'utf8')).siteUrl).replace(/\/$/, '');
const OUTPUT_PATH = path.join(__dirname, '../public/sitemap-products.xml');
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

/**
 * Sleep utility for retries
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetch all products from the API with retry logic
 */
async function fetchAllProducts(retries = MAX_RETRIES): Promise<Product[]> {
  try {
    console.log('🔍 Fetching products from API...');
    console.log(`📡 API URL: ${API_URL}/products`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    const response = await fetch(`${API_URL}/products`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Vertical': 'food',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data: ApiResponse | Product[] = await response.json();

    // Handle different API response formats
    let products: Product[] = [];
    if (Array.isArray(data)) {
      products = data;
    } else if (data.products) {
      products = data.products;
    } else if (data.data) {
      products = data.data;
    }

    console.log(`✅ Fetched ${products.length} products`);
    return products;
  } catch (error: any) {
    console.error(`❌ Error fetching products (${MAX_RETRIES - retries + 1}/${MAX_RETRIES}):`, error.message);

    if (retries > 0 && error.name !== 'AbortError') {
      console.log(`🔄 Retrying in ${RETRY_DELAY / 1000}s...`);
      await sleep(RETRY_DELAY);
      return fetchAllProducts(retries - 1);
    }

    throw error;
  }
}

/**
 * Generate sitemap XML from products
 */
function generateSitemapXML(products: Product[]): string {
  const today = new Date().toISOString().split('T')[0];

  const urlEntries = products
    .filter(product => product._id || product.id) // Ensure product has an ID
    .map(product => {
      const productId = product._id || product.id;
      const lastMod = product.updatedAt
        ? new Date(product.updatedAt).toISOString().split('T')[0]
        : product.createdAt
        ? new Date(product.createdAt).toISOString().split('T')[0]
        : today;

      // Determine priority based on product freshness
      const createdDate = product.createdAt ? new Date(product.createdAt) : new Date();
      const daysSinceCreation = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
      const priority = daysSinceCreation < 7 ? '0.9' : daysSinceCreation < 30 ? '0.8' : '0.7';

      return `  <url>
    <loc>${SITE_URL}/product/${productId}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>
  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urlEntries}
</urlset>`;
}

/**
 * Save sitemap to file
 */
function saveSitemap(xml: string): void {
  try {
    // Ensure public directory exists
    const publicDir = path.dirname(OUTPUT_PATH);
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    fs.writeFileSync(OUTPUT_PATH, xml, 'utf8');
    console.log(`✅ Sitemap saved to: ${OUTPUT_PATH}`);
    console.log(`📊 File size: ${(xml.length / 1024).toFixed(2)} KB`);

    // Create a backup
    const backupPath = OUTPUT_PATH.replace('.xml', `.backup.${Date.now()}.xml`);
    fs.writeFileSync(backupPath, xml, 'utf8');
    console.log(`💾 Backup saved to: ${backupPath}`);
  } catch (error: any) {
    console.error('❌ Error saving sitemap:', error.message);
    throw error;
  }
}

/**
 * Validate sitemap XML
 */
function validateSitemap(xml: string): boolean {
  try {
    // Basic validation checks
    if (!xml.includes('<?xml version="1.0"')) {
      throw new Error('Missing XML declaration');
    }
    if (!xml.includes('<urlset')) {
      throw new Error('Missing urlset element');
    }
    if (!xml.includes('</urlset>')) {
      throw new Error('Missing closing urlset element');
    }

    // Check sitemap size (max 50MB)
    const sizeMB = xml.length / (1024 * 1024);
    if (sizeMB > 50) {
      throw new Error(`Sitemap too large: ${sizeMB.toFixed(2)}MB (max 50MB)`);
    }

    // Check URL count (max 50,000)
    const urlCount = (xml.match(/<url>/g) || []).length;
    if (urlCount > 50000) {
      throw new Error(`Too many URLs: ${urlCount} (max 50,000)`);
    }

    console.log(`✅ Sitemap validation passed (${urlCount} URLs, ${sizeMB.toFixed(2)}MB)`);
    return true;
  } catch (error: any) {
    console.error('❌ Sitemap validation failed:', error.message);
    return false;
  }
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  console.log('🚀 Starting product sitemap generation...\n');
  console.log(`⚙️  Configuration:`);
  console.log(`   API URL: ${API_URL}`);
  console.log(`   Site URL: ${SITE_URL}`);
  console.log(`   Output: ${OUTPUT_PATH}\n`);

  try {
    // Fetch products from API
    const products = await fetchAllProducts();

    if (products.length === 0) {
      console.warn('⚠️  No products found. Generating empty sitemap.');
    }

    // Generate XML
    console.log('\n📝 Generating sitemap XML...');
    const xml = generateSitemapXML(products);

    // Validate sitemap
    console.log('🔍 Validating sitemap...');
    if (!validateSitemap(xml)) {
      throw new Error('Sitemap validation failed');
    }

    // Save to file
    console.log('💾 Saving sitemap...');
    saveSitemap(xml);

    console.log('\n✨ Product sitemap generation completed successfully!');
    console.log(`🔗 Products indexed: ${products.length}`);
    console.log(`📍 Sitemap URL: ${SITE_URL}/sitemap-products.xml`);
    console.log(`\n💡 Next steps:`);
    console.log(`   1. Submit sitemap to Google Search Console`);
    console.log(`   2. Submit sitemap to Bing Webmaster Tools`);
    console.log(`   3. Update robots.txt if needed\n`);

    process.exit(0);
  } catch (error: any) {
    console.error('\n💥 Sitemap generation failed:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('   • Check if the API is running');
    console.error('   • Verify VITE_API_URL in .env file');
    console.error('   • Check network connectivity');
    console.error('   • Review API endpoint permissions\n');
    process.exit(1);
  }
}

// Run the script
main();
