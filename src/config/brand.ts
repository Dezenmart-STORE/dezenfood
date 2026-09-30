/**
 * Single source of truth for DezenFoods branding.
 *
 * The founder's final name, tagline, copy, logo and palette drop in here (or via
 * VITE_BRAND_* / VITE_SITE_URL env vars) without touching components. Logo files
 * live in /public/images and are referenced by path only.
 */

import defaults from "./brand.defaults.json";

const env = import.meta.env as Record<string, string | undefined>;

const siteUrl = (env.VITE_SITE_URL || defaults.siteUrl).replace(/\/$/, "");

export const BRAND = {
  name: env.VITE_BRAND_NAME || defaults.name,
  shortName: env.VITE_BRAND_SHORT_NAME || defaults.shortName,
  legalName: env.VITE_BRAND_LEGAL_NAME || defaults.legalName,
  tagline: env.VITE_BRAND_TAGLINE || defaults.tagline,
  description:
    env.VITE_BRAND_DESCRIPTION || defaults.description,
  keywords: [
    "order food online",
    "small chops",
    "snacks",
    "groceries",
    "pepper soup",
    "rice meals",
    "food delivery Nigeria",
    "escrow protected food orders",
    "DezenFoods",
    "DezenMart",
  ],
  siteUrl,
  supportEmail: env.VITE_SUPPORT_EMAIL || defaults.supportEmail,
  social: {
    twitterHandle: env.VITE_BRAND_TWITTER || defaults.twitterHandle,
    twitterUrl: env.VITE_BRAND_TWITTER_URL || defaults.twitterUrl,
    linkedinUrl: env.VITE_BRAND_LINKEDIN_URL || defaults.linkedinUrl,
  },
  /** Assets (paths under /public). Replace the files, not the code. */
  assets: {
    logo: "/images/logo.svg",
    logoFull: "/images/logo-full.png",
    ogImage: `${siteUrl}/images/logo-full.png`,
  },
  /** Mirrors the CSS variables in index.css / tailwind `brand.*` colours. */
  colors: {
    primary: defaults.primary,
    primaryHover: "#ea580c",
    background: defaults.background,
    surface: "#292B30",
    themeColor: defaults.primary,
  },
  /** Backend vertical scope sent with every API request. */
  vertical: "food" as const,
  /** Sibling services in the DezenMart ecosystem (shared identity). */
  ecosystem: {
    market: {
      name: "DezenMart",
      url: env.VITE_DEZENMART_URL || "https://dezenmart.com",
    },
  },
} as const;

export type Brand = typeof BRAND;

/** Feature switches. Crypto and fiat rails coexist; the buyer picks at checkout. */
export const FEATURES = {
  crypto: (env.VITE_CRYPTO_ENABLED ?? "on").trim().toLowerCase() !== "off",
  fiat: (env.VITE_FIAT_ENABLED ?? "on").trim().toLowerCase() !== "off",
} as const;
