// Dynamic rendering for bots (SEO-01).
//
// Social scrapers and crawlers don't run the SPA's JS, so they'd otherwise see
// the generic index.html preview on every product/category link. This Edge
// Function detects crawler user-agents on /product* routes and returns a small
// HTML document with the correct <title>, Open Graph/Twitter tags and
// Product JSON-LD. Human visitors are passed straight through to the SPA.
//
// Runs on Netlify's Deno runtime. Not part of the app's TS build.
import type { Context, Config } from "https://edge.netlify.com/";

// Brand values: keep the defaults in sync with src/config/brand.defaults.json
// (a unit test enforces this). Override per deploy with the same VITE_* env
// vars the app build uses.
// deno-lint-ignore no-explicit-any
const envGet = (k: string): string | undefined => (globalThis as any).Netlify?.env?.get(k) || undefined;
const BRAND_NAME = envGet("VITE_BRAND_NAME") || "DezenFoods";
const SITE = (envGet("VITE_SITE_URL") || "https://foods.dezenmart.com").replace(/\/$/, "");
const TWITTER = envGet("VITE_BRAND_TWITTER") || "@Dezenmart";

const BOT_UA =
  /(facebookexternalhit|Facebot|Twitterbot|WhatsApp|LinkedInBot|Slackbot|Slack-ImgProxy|Discordbot|TelegramBot|Pinterest|redditbot|Applebot|Googlebot|Google-InspectionTool|bingbot|DuckDuckBot|Baiduspider|YandexBot|embedly|quora link preview|SkypeUriPreview|vkShare|W3C_Validator|Prerender)/i;

const DEFAULTS = {
  title: `${BRAND_NAME} - Order Food Online | Escrow-Protected Payments`,
  description:
    envGet("VITE_BRAND_DESCRIPTION") ||
    "Order snacks, small chops, groceries, pepper soup, rice meals and more from trusted vendors on DezenFoods. Your payment is held in escrow until your food arrives.",
  image: `${SITE}/images/logo-full.png`,
};

const apiBase = (): string =>
  // deno-lint-ignore no-explicit-any
  (globalThis as any).Netlify?.env?.get("VITE_API_URL") ||
  "https://dezenmart-server.onrender.com/api/v1";

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function truncate(s: string, n = 300): string {
  const t = s.trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}

interface Meta {
  title: string;
  description: string;
  image: string;
  canonical: string;
  jsonLd?: Record<string, unknown>;
}

function page(meta: Meta): Response {
  const jsonLd = meta.jsonLd
    ? `<script type="application/ld+json">${JSON.stringify(meta.jsonLd)}</script>`
    : "";
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(meta.title)}</title>
<meta name="description" content="${esc(meta.description)}" />
<link rel="canonical" href="${esc(meta.canonical)}" />
<meta property="og:type" content="product" />
<meta property="og:site_name" content="${esc(BRAND_NAME)}" />
<meta property="og:title" content="${esc(meta.title)}" />
<meta property="og:description" content="${esc(meta.description)}" />
<meta property="og:image" content="${esc(meta.image)}" />
<meta property="og:url" content="${esc(meta.canonical)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:site" content="${esc(TWITTER)}" />
<meta name="twitter:title" content="${esc(meta.title)}" />
<meta name="twitter:description" content="${esc(meta.description)}" />
<meta name="twitter:image" content="${esc(meta.image)}" />
${jsonLd}
</head>
<body><h1>${esc(meta.title)}</h1><p>${esc(meta.description)}</p></body>
</html>`;
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      // Let CDNs cache the crawler response briefly.
      "cache-control": "public, max-age=0, s-maxage=300",
    },
  });
}

export default async (request: Request, context: Context) => {
  const ua = request.headers.get("user-agent") || "";
  // Humans get the SPA untouched.
  if (!BOT_UA.test(ua)) return;

  const url = new URL(request.url);
  const path = url.pathname;

  try {
    const vendorMatch = path.match(/^\/vendors\/([a-fA-F0-9]{24})\/?$/);
    const productMatch = path.match(/^\/product\/([a-fA-F0-9]{24})\/?$/);
    const categoryMatch = path.match(/^\/product\/category\/([^/]+)\/?$/);

    if (vendorMatch) {
      const res = await fetch(`${apiBase()}/vendors/${vendorMatch[1]}`, {
        headers: { accept: "application/json", "x-vertical": "food" },
      });
      if (res.ok) {
        const body = await res.json();
        const v = body?.data?.vendor ?? body?.data ?? body;
        if (v && v.businessName) {
          const canonical = `${SITE}/vendors/${vendorMatch[1]}`;
          const desc = truncate(v.description || DEFAULTS.description);
          return page({
            title: `${v.businessName} - ${v.lga || ""}${v.state ? `, ${v.state}` : ""} | ${BRAND_NAME}`,
            description: desc,
            image: v.logo || DEFAULTS.image,
            canonical,
            jsonLd: {
              "@context": "https://schema.org",
              "@type": "FoodEstablishment",
              name: v.businessName,
              description: desc,
              url: canonical,
              address: { "@type": "PostalAddress", addressLocality: v.lga, addressRegion: v.state, addressCountry: "NG" },
            },
          });
        }
      }
    } else if (productMatch) {
      const res = await fetch(`${apiBase()}/products/${productMatch[1]}`, {
        headers: { accept: "application/json", "x-vertical": "food" },
      });
      if (res.ok) {
        // /products/:id returns the product object (optionally enveloped).
        const body = await res.json();
        const p = body?.data?.product ?? body?.data ?? body;
        if (p && p.name) {
          const canonical = `${SITE}/product/${productMatch[1]}`;
          const image = Array.isArray(p.images) && p.images[0] ? p.images[0] : DEFAULTS.image;
          const desc = truncate(p.description || DEFAULTS.description);
          const inStock = Number(p.stock) > 0;
          return page({
            title: `${p.name} | ${BRAND_NAME}`,
            description: desc,
            image,
            canonical,
            jsonLd: {
              "@context": "https://schema.org",
              "@type": "Product",
              name: p.name,
              description: desc,
              image,
              category: p.category,
              url: canonical,
              offers: {
                "@type": "Offer",
                price: p.price,
                priceCurrency: p.currency || "NGN",
                availability: inStock
                  ? "https://schema.org/InStock"
                  : "https://schema.org/OutOfStock",
                url: canonical,
              },
            },
          });
        }
      }
    } else if (categoryMatch) {
      const name = decodeURIComponent(categoryMatch[1]);
      const canonical = `${SITE}/product/category/${categoryMatch[1]}`;
      return page({
        title: `${name} - Order online | ${BRAND_NAME}`,
        description: `Order ${name} from trusted vendors on ${BRAND_NAME}. Pay by card, bank transfer or crypto - your money is held in escrow until your food arrives.`,
        image: DEFAULTS.image,
        canonical,
      });
    }
  } catch (_err) {
    // Fall through to defaults on any API/parse error.
  }

  // Product listing or an unresolved product - serve sensible defaults.
  return page({
    title: `Browse Food & Groceries | ${BRAND_NAME}`,
    description: DEFAULTS.description,
    image: DEFAULTS.image,
    canonical: `${SITE}${path}`,
  });
};

export const config: Config = {
  path: ["/product", "/product/*", "/vendors/*"],
};
