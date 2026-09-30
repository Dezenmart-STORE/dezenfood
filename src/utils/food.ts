/** Food-specific listing metadata shared by the vendor form, product cards and detail page. */

export const DIETARY_TAGS = [
  'Halal',
  'Vegetarian',
  'Vegan',
  'Gluten-free',
  'Dairy-free',
  'Sugar-free',
  'Contains alcohol',
] as const;

export const ALLERGENS = [
  'Peanuts',
  'Tree nuts',
  'Milk',
  'Eggs',
  'Fish',
  'Shellfish',
  'Wheat / Gluten',
  'Soy',
  'Sesame',
] as const;

export const SPICE_LEVELS = ['None', 'Mild', 'Medium', 'Hot', 'Extra hot'] as const;
export type SpiceLevel = (typeof SPICE_LEVELS)[number];

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export const FULFILMENT_MODES = [
  { id: 'delivery', label: 'Delivery' },
  { id: 'pickup', label: 'Pickup' },
] as const;
export type FulfilmentMode = (typeof FULFILMENT_MODES)[number]['id'];

/** Fields the backend stores on a food product, on top of the base Product. */
export interface FoodDetails {
  subcategory?: string;
  /** e.g. "1 pack (10 pieces)", "1 bowl" */
  portionSize?: string;
  /** How many people one portion feeds */
  serves?: number;
  prepTimeMinutes?: number;
  minOrderQty?: number;
  spiceLevel?: SpiceLevel;
  dietaryTags?: string[];
  allergens?: string[];
  /** Days the vendor can fulfil this item */
  availableDays?: Weekday[];
  /** "HH:mm" 24h - last time today's orders are accepted */
  orderCutoff?: string;
  /** Hours of advance notice needed (0 = same day) */
  leadTimeHours?: number;
  /** Shelf life in hours after preparation (perishables) */
  shelfLifeHours?: number;
  fulfilment?: FulfilmentMode[];
}

export const formatNaira = (n: number): string =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: n % 1 === 0 ? 0 : 2,
  }).format(n);

export const formatPrep = (mins?: number): string | null => {
  if (!mins || mins <= 0) return null;
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
};

/** Is `now` before the product's cut-off time and on an available day? */
export const isOrderableNow = (
  d: Pick<FoodDetails, 'availableDays' | 'orderCutoff'>,
  now: Date = new Date()
): boolean => {
  if (d.availableDays?.length) {
    const day = WEEKDAYS[(now.getDay() + 6) % 7];
    if (!d.availableDays.includes(day)) return false;
  }
  if (d.orderCutoff && /^\d{2}:\d{2}$/.test(d.orderCutoff)) {
    const [h, m] = d.orderCutoff.split(':').map(Number);
    if (now.getHours() * 60 + now.getMinutes() > h * 60 + m) return false;
  }
  return true;
};
