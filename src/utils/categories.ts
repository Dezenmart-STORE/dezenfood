import type { ComponentType } from 'react';
import { makeEmojiIcon } from '../components/common/CategoryIcons';
import categoriesJson from '../config/categories.json';

export interface CategoryDef {
  /** Display name - used for API queries and UI labels */
  name: string;
  /** Emoji shown next to the name and inside the icon */
  emoji: string;
  /** One-line hint shown to vendors and buyers */
  blurb: string;
  /** Suggested sub-options a vendor can pick from (free text is still allowed) */
  subcategories: readonly string[];
  /** Icon component */
  Icon: ComponentType<{ className?: string }>;
  /** Tailwind text-* class for icon tint */
  color: string;
  /** Tailwind bg-* class for icon bubble background */
  bg: string;
  /** Tailwind ring-* class shown when this category is active */
  ring: string;
  /** Hex accent for gradient headers (category page hero) */
  hex: string;
}

type CategorySeed = Omit<CategoryDef, 'Icon'>;

/**
 * DezenFoods segments. This list is the single source of truth (home shelves,
 * category page, filters, vendor listing form). To add a segment, add an entry.
 * The data lives in src/config/categories.json (also read by the sitemap script).
 * Keep `name` in sync with the backend `categories` collection.
 */
const SEEDS = categoriesJson as readonly CategorySeed[];

export const CATEGORIES: readonly CategoryDef[] = SEEDS.map((c) => ({
  ...c,
  Icon: makeEmojiIcon(c.emoji, c.name),
}));

/** Canonical URL for a category page */
export const categoryHref = (name: string): string =>
  `/product/category/${encodeURIComponent(name.toLowerCase())}`;

/** Find category by display name (case-insensitive) */
export const getCategoryByName = (name: string): CategoryDef | undefined =>
  CATEGORIES.find((c) => c.name.toLowerCase() === name.toLowerCase());

/** All category names as a plain string array */
export const CATEGORY_NAMES = CATEGORIES.map((c) => c.name);
