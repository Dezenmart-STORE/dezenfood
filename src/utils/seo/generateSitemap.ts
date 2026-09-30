/**
 * Sitemap Generation Utility
 *
 * This utility generates XML sitemaps for SEO purposes.
 *
 * IMPORTANT: For production deployment:
 * - Run this script as part of your build process
 * - Or set up a serverless function to dynamically generate sitemaps
 * - Or integrate with your backend to generate sitemaps from database
 *
 * Usage:
 * - Run manually: ts-node src/utils/seo/generateSitemap.ts
 * - Add to package.json: "generate-sitemap": "ts-node src/utils/seo/generateSitemap.ts"
 */

import { SEO_CONFIG } from "./seoConfig";

interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
}

/**
 * Generate XML sitemap from URLs array
 */
export const generateSitemapXML = (urls: SitemapUrl[]): string => {
  const urlEntries = urls
    .map(
      (url) => `
  <url>
    <loc>${url.loc}</loc>
    ${url.lastmod ? `<lastmod>${url.lastmod}</lastmod>` : ""}
    ${url.changefreq ? `<changefreq>${url.changefreq}</changefreq>` : ""}
    ${url.priority ? `<priority>${url.priority}</priority>` : ""}
  </url>`
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;
};

/**
 * Generate main sitemap with static pages
 */
export const generateMainSitemap = (): string => {
  const staticUrls: SitemapUrl[] = [
    {
      loc: SEO_CONFIG.siteUrl,
      lastmod: new Date().toISOString().split("T")[0],
      changefreq: "daily",
      priority: 1.0,
    },
    {
      loc: `${SEO_CONFIG.siteUrl}/product`,
      lastmod: new Date().toISOString().split("T")[0],
      changefreq: "daily",
      priority: 0.9,
    },
    {
      loc: `${SEO_CONFIG.siteUrl}/community`,
      lastmod: new Date().toISOString().split("T")[0],
      changefreq: "weekly",
      priority: 0.7,
    },
    {
      loc: `${SEO_CONFIG.siteUrl}/referral`,
      lastmod: new Date().toISOString().split("T")[0],
      changefreq: "monthly",
      priority: 0.6,
    },
  ];

  return generateSitemapXML(staticUrls);
};

/**
 * Generate category sitemap
 */
export const generateCategorySitemap = (): string => {
  const categories = [
    "Electronics",
    "Clothing",
    "Home & Garden",
    "Beauty & Personal Care",
    "Sports & Outdoors",
    "Art Work",
    "Accessories",
  ];

  const categoryUrls: SitemapUrl[] = categories.map((category) => ({
    loc: `${SEO_CONFIG.siteUrl}/product/category/${category.toLowerCase().replace(/\s+/g, "-")}`,
    lastmod: new Date().toISOString().split("T")[0],
    changefreq: "daily",
    priority: 0.8,
  }));

  return generateSitemapXML(categoryUrls);
};

/**
 * Generate product sitemap from product IDs
 *
 * NOTE: In production, fetch product IDs from your API/database
 * This is a placeholder implementation
 */
export const generateProductSitemap = async (
  productIds: string[]
): Promise<string> => {
  const productUrls: SitemapUrl[] = productIds.map((id) => ({
    loc: `${SEO_CONFIG.siteUrl}/product/${id}`,
    lastmod: new Date().toISOString().split("T")[0],
    changefreq: "weekly",
    priority: 0.7,
  }));

  return generateSitemapXML(productUrls);
};

/**
 * Generate sitemap index (for multiple sitemaps)
 */
export const generateSitemapIndex = (): string => {
  const sitemaps = [
    {
      loc: `${SEO_CONFIG.siteUrl}/sitemap.xml`,
      lastmod: new Date().toISOString().split("T")[0],
    },
    {
      loc: `${SEO_CONFIG.siteUrl}/sitemap-categories.xml`,
      lastmod: new Date().toISOString().split("T")[0],
    },
    {
      loc: `${SEO_CONFIG.siteUrl}/sitemap-products.xml`,
      lastmod: new Date().toISOString().split("T")[0],
    },
  ];

  const sitemapEntries = sitemaps
    .map(
      (sitemap) => `
  <sitemap>
    <loc>${sitemap.loc}</loc>
    <lastmod>${sitemap.lastmod}</lastmod>
  </sitemap>`
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries}
</sitemapindex>`;
};

/**
 * Main function to generate all sitemaps
 *
 * PRODUCTION IMPLEMENTATION:
 * 1. Fetch all product IDs from your backend API
 * 2. Generate sitemaps and save to public directory or serve dynamically
 * 3. Update robots.txt with correct sitemap URLs
 */
export const generateAllSitemaps = async () => {
  try {
    // Generate main sitemap
    const mainSitemap = generateMainSitemap();
    console.log("Main Sitemap Generated:");
    console.log(mainSitemap);

    // Generate category sitemap
    const categorySitemap = generateCategorySitemap();
    console.log("\nCategory Sitemap Generated:");
    console.log(categorySitemap);

    // Generate product sitemap (example with placeholder IDs)
    // In production, fetch actual product IDs from API
    const exampleProductIds = ["prod1", "prod2", "prod3"];
    const productSitemap = await generateProductSitemap(exampleProductIds);
    console.log("\nProduct Sitemap Generated:");
    console.log(productSitemap);

    // Generate sitemap index
    const sitemapIndex = generateSitemapIndex();
    console.log("\nSitemap Index Generated:");
    console.log(sitemapIndex);

    return {
      mainSitemap,
      categorySitemap,
      productSitemap,
      sitemapIndex,
    };
  } catch (error) {
    console.error("Error generating sitemaps:", error);
    throw error;
  }
};

// Export for use in build scripts or API routes
export default {
  generateMainSitemap,
  generateCategorySitemap,
  generateProductSitemap,
  generateSitemapIndex,
  generateAllSitemaps,
};
