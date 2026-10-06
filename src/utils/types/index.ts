import type { FoodDetails, FulfilmentMode } from "../food";

//user
export interface UserProfile {
  milestones: {
    sales: number;
    purchases: number;
  };
  _id: string;
  googleId: string;
  email: string;
  name: string;
  profileImage: File | string;
  isMerchant: boolean;
  /** Set by the backend. Gates UI only - every privileged endpoint re-checks it. */
  role?: "user" | "vendor" | "admin";
  rating: number;
  totalPoints: number;
  availablePoints: number;
  referralCount: number;
  isReferralCodeUsed: boolean;
  referralCode: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
  address?: string;
  dateOfBirth?: string;
  phoneNumber?: string;
  selfVerification: {
    isVerified: boolean;
  };
  hasAcceptedTerms: boolean;
  lastRewardCalculation: string;
  // termsAcceptedDate: string;
}

export interface terms {
  status: "success" | string;
  message: string;
  data: {
    user: {
      id: string;
      hasAcceptedTerms: boolean;
    };
  };
}

// Legal documents served as markdown by GET /terms/current?type=...
export type LegalDocType = "terms_of_use" | "privacy_policy" | "cookie_policy";

export interface LegalDocument {
  _id: string;
  title: string;
  /** Markdown body. */
  content: string;
  version: string;
  isActive: boolean;
  type: LegalDocType;
  createdAt: string;
  updatedAt: string;
}

//product
export interface ProductVariant {
  quantity: number;
  [key: string]: any;
}
export interface Product extends FoodDetails {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  seller: { _id: string; name: string; rating: number; profileImage: string };
  /** Optional - only vendors who also accept crypto have one. */
  sellerWalletAddress?: string;
  /** Price currency. Food listings are NGN; legacy listings are USD. */
  currency?: string;
  images: string[];
  isSponsored: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  stock: number | string;
  type: ProductVariant[];
  logisticsCost: string[];
  paymentToken?: string;
  /** Which rails the vendor accepts. Missing = crypto only (legacy). */
  acceptedPayments?: PaymentRail[];
  logisticsProviders: string[];
  /** Unit weight in kg. Priced as weight × quantity for logistics. */
  weight: number;
  /** Origin the item ships from - the `fromState` for logistics routing. */
  state: string;
  lga: string;
  tradeId?: string;
}
//review
export interface Review {
  _id: string;
  reviewer:
    | {
        _id: string;
        name: string;
        profileImage: string;
      }
    | string;
  reviewed:
    | {
        _id: string;
        name: string;
        profileImage: string;
      }
    | string;
  order:
    | {
        _id: string;
        product: string;
      }
    | string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment: string;
  createdAt: string;
  updatedAt: string;
}

//trade and order

export interface Order {
  _id: string;
  orderId: string;
  product: {
    _id: string;
    name: string;
    price: number;
    images: string[];
    // The order's embedded product is trimmed by the backend; these may be
    // absent, so treat them as optional and fetch the full product when needed.
    tradeId?: string;
    logisticsCost?: string[];
    logisticsProviders?: string[];
    paymentToken?: string;
  };
  buyer:
    | {
        _id: string;
        name: string;
        profileImage: string;
      }
    | string;
  seller:
    | {
        _id: string;
        name: string;
        profileImage: string;
        rating?: number;
      }
    | string;
  amount: number;
  /** Delivery fee in USD (from the selected quote), set by the backend. */
  deliveryFee?: number;
  status: OrderStatus;
  dispute?: {
    raisedBy: string;
    reason: string;
    resolved: boolean;
    createdAt?: string;
    updatedAt?: string;
  };
  sellerWalletAddress?: string;
  createdAt: string;
  quantity: number;
  updatedAt: string;
  logisticsProviderWalletAddress?: string[] | string;
  purchaseId: string;
  /** Rail the buyer paid with. Absent on legacy orders (= crypto). */
  paymentRail?: PaymentRail;
  paymentReference?: string;
  /** "NGN" for fiat/food orders; legacy orders are USD-denominated. */
  currency?: string;
  /** Server-computed totals for fiat/food orders (in `currency`). */
  totals?: OrderTotals;
  /** Line items for multi-item food orders. */
  items?: OrderItem[];
  fulfilment?: FulfilmentMode;
  buyerNote?: string;
  /** Vendor-facing prep estimate, minutes */
  prepTimeMinutes?: number;
  /** Fiat escrow release needs the buyer to enter an OTP sent by the provider. */
  releaseOtpRequired?: boolean;
  /** Set when money is owed back to the buyer. `awaiting_account` = we need their bank details. */
  refund?: { status: "awaiting_account" | "processing" | "sent" | "failed"; amount: number };
  /** The vendor behind a food order (pickup address is only sent once it is being prepared). */
  vendor?: { _id: string; businessName: string; logo?: string; address?: string; phone?: string };
  logisticsStatus?: string;
  /** Full logistics provider profile embedded on the order. */
  logisticsProvider?: {
    _id: string;
    name?: string;
    email?: string;
    phone?: string;
    walletAddress?: string;
  };
  // Shipping fields - populated by the backend as the delivery progresses.
  logisticsAcceptedAt?: string;
  shippedAt?: string;
  shippingNotes?: string;
  expectedDeliveryDate?: string;
  // Legacy/optional - not currently sent by the backend.
  trackingNumber?: string;
  logisticsProviderName?: string;
}

export interface OrderStatusUpdate {
  _id: string;
  product: string;
  buyer: string;
  seller: string;
  amount: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

export interface BuyTradeParams {
  seller: string;
  productCost: string | number;
  logisticsProvider: string;
  logisticsCost: string | number; // Logistics cost to be passed to contract
  useUSDT: boolean;
  orderId: string;
}
export interface CreateTradeParams {
  productCost: number;
  useUSDT: boolean;
  totalQuantity: string;
  tokenAddress?: string; // Add token address for real USDT support
  paymentToken?: string; // Keep for backward compatibility (cUSD, USDT, etc.)
}

export interface TradeResponse {
  status: "success" | "error";
  message: string;
  data: any;
}
export interface LogisticsProvider {
  address: string;
  name: string;
  location: string;
  cost: number; // in USDT
}

export interface Logistics {
  _id: string;
  name: string;
  walletAddress: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Logistics: locations, providers & route pricing ────────────────────
export interface CoverageArea {
  state: string;
  lgas: string[];
  isStatewide: boolean;
}

/** Full provider profile from GET /logistics/providers */
export interface ProviderProfile {
  _id: string;
  userId?: string;
  name: string;
  email?: string;
  phone?: string;
  walletAddress: string;
  coverageAreas: CoverageArea[];
  rating: number;
  totalDeliveries: number;
  verificationStatus: "pending" | "verified" | "rejected" | string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * A provider returned by GET /logistics/available for a specific route + weight.
 * `cost` and `estimatedDays` are normalised client-side from the raw pricing
 * fields (see normalizeAvailable in logisticsApi) so the UI has a stable shape.
 */
export interface AvailableProvider extends Partial<ProviderProfile> {
  _id: string;
  name: string;
  walletAddress: string;
  rating: number;
  /** Total delivery cost for this route + weight. Undefined when the provider
   *  has no pricing rule for the route (the response omits pricing fields). */
  cost?: number;
  estimatedDays?: string; // human label e.g. "2-3 days"
  currency?: string;
  /** Id of the quote created for this provider (POST /logistics/quotes). */
  quoteId?: string;
}

// A logistics quote for a route + weight (POST /logistics/quotes).
export interface CreateQuoteParams {
  deliveryAddressId: string;
  fromState: string;
  fromLga: string;
  toState: string;
  toLga: string;
  weight: number;
}

export interface LogisticsQuote {
  quoteId: string;
  deliveryFee?: number;
  estimatedDays?: string;
  currency?: string;
  expiresAt?: string;
}

// One deliverable provider's quote from POST /logistics/quotes. The endpoint
// returns every provider that serves the route, each with its own quoteId,
// so a single POST replaces the old /logistics/available + per-provider quote.
export interface ProviderQuote {
  quoteId: string;
  providerId: string;
  deliveryFee: number;
  provider: {
    id: string;
    name: string;
    rating: number;
    phone?: string;
    walletAddress: string;
  };
  breakdown?: {
    basePrice: number;
    insuranceFee: number;
    packagingFee: number;
    totalPrice: number;
  };
  estimatedDaysMin?: number;
  estimatedDaysMax?: number;
  expiresAt?: string;
}

export type LogisticsSort = "price" | "days" | "rating";

export interface AvailableProvidersQuery {
  fromState: string;
  fromLga: string;
  toState: string;
  toLga: string;
  weight: number;
  sort?: LogisticsSort;
}

// ── Logistics: provider pricing rules & computed quote ─────────────────
export type DeliveryType = "intra_lga" | "intra_state" | "inter_state";

export interface PricingWeightTier {
  minWeight: number;
  maxWeight: number; // 0 or omitted = unbounded (highest tier)
  price: number;
}

/** A provider's pricing rule from GET /logistics/providers/{id}/pricing-rules */
export interface PricingRule {
  _id?: string;
  deliveryType: DeliveryType | string;
  fromState?: string;
  fromLga?: string;
  toState?: string;
  toLga?: string;
  weightTiers: PricingWeightTier[];
  insuranceFee?: number;
  packagingFee?: number;
  estimatedDaysMin?: number;
  estimatedDaysMax?: number;
  isActive?: boolean;
}

/** Cost computed client-side from a matching PricingRule for a route + weight. */
export interface DeliveryQuote {
  cost: number;
  estimatedDays?: string; // "2-4 days"
  daysMin?: number; // for sorting by speed
  deliveryType: DeliveryType;
  breakdown: { base: number; insuranceFee: number; packagingFee: number };
}

export interface RouteInput {
  fromState: string;
  fromLga: string;
  toState: string;
  toLga: string;
}

// export type NotificationType = "update" | "funds" | "buyer" | "system";

// export interface Notification {
//   id: string;
//   type: NotificationType;
//   message: string;
//   isRead: boolean;
//   timestamp: Date;
//   icon?: string;
//   link?: string;
// }

export type TabType = "1" | "2" | "3" | "4" | "5";
export type TradeTab = "buy" | "sell" | "active" | "completed";

export interface TabOption {
  id: TabType;
  label: string;
}

export interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  options: TabOption[];
}

//referrals

export interface ReferralInfo {
  referralCode: string;
  referralCount: number;
}
export interface RewardItem {
  id: string;
  name: string;
  action?: "from" | "to";
  type: string;
  points: number;
  date: string;
  status?: string;
}

export interface ReferralHistoryProps {
  history: RewardItem[];
  // onInviteFriends: () => void;
}

export interface ReferralData
  extends Omit<ReferralHistoryProps, "onInviteFriends"> {
  activePoints: number;
  usedPoints: number;
  promoCode: string;
}

// watchlist/favourites

export interface WatchlistItem {
  _id: string;
  user: string;
  product: {
    _id: string;
    name: string;
    price: number;
    seller: string;
    images: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface WatchlistCheck {
  isWatchlist: boolean;
}

//rewards

export interface Reward {
  _id: string;
  userId: string;
  actionType: string;
  points: number;
  referenceId: string;
  createdAt: string;
  updatedAt: string;
}

export interface RewardSummary {
  milestones: {
    sales: number;
    purchases: number;
  };
  _id: string;
  totalPoints: number;
  availablePoints: number;
}

//notifications
export interface Notification {
  _id: string;
  recipient: string;
  type: string;
  message: string;
  read: boolean;
  metadata: {
    orderId?: string;
    [key: string]: any;
  };
  createdAt: string;
  updatedAt: string;
}

export interface NotificationCount {
  count: number;
}

export interface MarkReadResponse {
  success: boolean;
  acknowledged: boolean;
  modifiedCount: number;
  upsertedId: null | string;
  upsertedCount: number;
  matchedCount: number;
}

//order and trade
export type TradeStatusType = "cancelled" | "pending" | "release" | "completed";

export type OrderStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "completed"
  | "disputed"
  | "refunded"
  | "delivery_confirmed"
  | "delivered"
  | "shipped"
  // Food lifecycle (set by the backend, never by the browser)
  | "awaiting_payment"
  | "paid"
  | "preparing"
  | "ready"
  | "out_for_delivery"
  | "cancelled";

export interface TradeDetails {
  productName: string;
  productId: string;
  amount: number;
  quantity: number;
  orderTime: string;
  orderNo: string;
  sellerId: string;
  buyerId: string;
  paymentMethod?: string;
  tradeType: "BUY" | "SELL";
}
export interface OrderDetails extends Order {
  formattedDate: string;
  formattedAmount: string;
  tradeValidation?: {
    isValid: boolean;
    error: string | null;
  };
}

export interface TradeTransactionInfo {
  buyerName: string;
  sellerName: string;
  goodRating: number;
  completedOrders: number;
  completionRate: number;
  avgPaymentTime: number;
}

export interface StatusProps {
  status: TradeStatusType;
  tradeDetails?: TradeDetails;
  transactionInfo?: TradeTransactionInfo;
  onContactSeller?: () => void;
  onContactBuyer?: () => void;
  onOrderDispute?: (reason: string) => Promise<void>;
  onReleaseNow?: () => void;
  onConfirmDelivery?: () => void;
  orderId?: string;
}

export interface pendingTransactionProps {
  type: "escrow" | "delivery";
  contractAddress?: string;
  amount?: string;
  tradeId?: string;
}

//chat
export interface Message {
  _id: string;
  sender: string | UserProfile;
  recipient: string | UserProfile;
  content: string;
  read: boolean;
  order?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  user: {
    _id: string;
    name: string;
    profileImage: string;
  };
  lastMessage: Message;
  unreadCount: number;
}

export interface SendMessageParams {
  recipient: string;
  content: string;
  order?: string;
}

export interface MarkReadParams {
  messageIds: string[];
}

// Address object embedded in the POST /orders body. Lets a buyer order to a
// saved OR a one-time address (the full address travels with the order).
export interface OrderAddressInput {
  label?: string;
  fullName: string;
  phone: string;
  country: string;
  state: string;
  lga: string;
  street: string;
  zipCode?: string;
  isDefault?: boolean;
}

// POST /orders body. The quoteId identifies the logistics provider, and the
// full deliveryAddress is sent inline so a one-time address needn't be saved.
export interface CreateOrderParams {
  product: string;
  quantity: number;
  /** Id of the logistics quote the buyer selected (from POST /logistics/quotes). */
  quoteId: string;
  deliveryAddress: OrderAddressInput;
}

// Delivery Address
// Field names mirror the backend schema exactly:
//   fullName (not recipientName), phone (not phoneNumber),
//   street (not address), lga (not city).
export interface DeliveryAddress {
  _id: string;
  user: string;
  label: string; // e.g., "Home", "Office", "Mom's place"
  fullName: string;
  phone: string;
  street: string;
  lga: string; // Local Government Area / city
  state: string;
  country: string;
  zipCode: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDeliveryAddressParams {
  label: string;
  fullName: string;
  phone: string;
  street: string;
  lga: string;
  state: string;
  country: string;
  zipCode: string;
  isDefault?: boolean;
}

export interface UpdateDeliveryAddressParams
  extends Partial<CreateDeliveryAddressParams> {
  _id: string;
}

// Enhanced Logistics Provider with location and delivery details
export interface EnhancedLogisticsProvider {
  _id: string;
  name: string;
  walletAddress: string;
  serviceAreas: string[]; // List of cities/states they serve
  deliverySpeed: "standard" | "express" | "same-day"; // Delivery speed
  estimatedDays: string; // e.g., "2-3 days", "24 hours"
  baseCost: number; // Base delivery cost
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Filtered logistics based on delivery location
export interface FilteredLogisticsProvider {
  provider: EnhancedLogisticsProvider;
  cost: number; // Calculated cost for this specific delivery
  available: boolean; // Whether they serve this location
}

/** Payment rails a buyer can choose from at checkout. */
export type PaymentRail = "crypto" | "korapay" | "pandascrow";

export interface OrderTotals {
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  total: number;
  /** Authoritative token amount when the order can also be paid with crypto. */
  crypto?: { token: string; amount: number };
}

export interface OrderItem {
  product: string;
  name: string;
  image?: string;
  quantity: number;
  unitPrice: number;
  variantLabel?: string;
  note?: string;
}

/** POST /orders body for a food (multi-item, single-vendor) order. */
export interface CreateFoodOrderParams {
  vertical: "food";
  items: { product: string; quantity: number; variantIndex?: number; note?: string }[];
  fulfilment: FulfilmentMode;
  /** Required when fulfilment = "delivery" */
  quoteId?: string;
  deliveryAddress?: OrderAddressInput;
  buyerNote?: string;
  /** ISO time the buyer wants it, omitted = ASAP */
  scheduledFor?: string;
}
