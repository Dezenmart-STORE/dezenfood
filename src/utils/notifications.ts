import type { Notification } from './types';
import {
  HiOutlineBell,
  HiOutlineCurrencyDollar,
  HiOutlineShoppingBag,
  HiOutlineInformationCircle,
  HiOutlineChatAlt2,
  HiOutlineUsers,
  HiOutlineCube,
  HiOutlineTruck,
  HiOutlineGift,
  HiOutlineCheckCircle,
  HiOutlineClock,
} from 'react-icons/hi';
import type { IconType } from 'react-icons';

// Account overview tab ids (see TAB_OPTIONS in pages/Account.tsx).
const ACCOUNT_TAB_REWARDS = '2';
const ACCOUNT_TAB_ORDER_HISTORY = '3';

// ---------- Click handling ----------
//
// A notification click either navigates straight to a route, or opens a detail
// sheet when the destination depends on who the recipient is (buyer vs seller)
// or the target lives outside this app (a logistics provider's own dashboard).

/** Sheet variants rendered by NotificationActionSheet. */
export type NotificationSheetVariant =
  | 'sale' //            ORDER_PLACED - seller: "someone bought your product"
  | 'order-status' //    ORDER_UPDATE - buyer OR seller; role decided from the order
  | 'logistics-pending'; // LOGISTICS_ORDER_PENDING - for a logistics provider

export type NotificationAction =
  | { kind: 'navigate'; to: string }
  | { kind: 'sheet'; variant: NotificationSheetVariant }
  | { kind: 'none' };

/**
 * Resolve what happens when a notification is clicked.
 *
 * Buyer-facing order-lifecycle events ("Your order ... shipped/delivered",
 * logistics accepted) go straight to the order details page. Events whose
 * destination depends on the recipient's role, or that concern an external
 * logistics dashboard, open a sheet instead - see NotificationActionSheet.
 */
export function resolveNotificationAction(n: Notification): NotificationAction {
  const { metadata } = n;
  const t = (n.type || '').toUpperCase();
  const orderId = metadata?.orderId;

  switch (t) {
    // Buyer-facing lifecycle updates -> order details.
    case 'ORDER_SHIPPED':
    case 'ORDER_DELIVERED':
    case 'DELIVERY_CONFIRMED':
    case 'LOGISTICS_ORDER_ACCEPTED':
      return orderId ? { kind: 'navigate', to: `/orders/${orderId}` } : { kind: 'none' };

    // Seller-facing "you made a sale".
    case 'ORDER_PLACED':
      return { kind: 'sheet', variant: 'sale' };

    // Status change that can reach either the buyer or the seller - the sheet
    // loads the order and routes by role.
    case 'ORDER_UPDATE':
    case 'ORDER':
      return orderId ? { kind: 'sheet', variant: 'order-status' } : { kind: 'none' };

    // Delivery request addressed to a logistics provider (their real work lives
    // on their own provider dashboard, not here).
    case 'LOGISTICS_ORDER_PENDING':
      return { kind: 'sheet', variant: 'logistics-pending' };

    case 'NEW_MESSAGE':
    case 'MESSAGE': {
      const senderId = metadata?.sender ?? metadata?.senderId;
      return { kind: 'navigate', to: senderId ? `/chat/${senderId}` : '/chat' };
    }

    case 'TRADE':
    case 'BUYER':
      if (metadata?.tradeId) return { kind: 'navigate', to: `/trades/viewtrades/${metadata.tradeId}` };
      return orderId ? { kind: 'navigate', to: `/orders/${orderId}` } : { kind: 'none' };

    case 'REFERRAL':
      return { kind: 'navigate', to: `/account?tab=${ACCOUNT_TAB_REWARDS}` };

    case 'FUNDS':
    case 'PAYMENT':
      return { kind: 'navigate', to: `/account?tab=${ACCOUNT_TAB_REWARDS}` };

    case 'PRODUCT':
      return metadata?.productId
        ? { kind: 'navigate', to: `/product/${metadata.productId}` }
        : { kind: 'none' };

    default:
      // Unknown but order-linked notifications still land somewhere useful.
      return orderId ? { kind: 'navigate', to: `/orders/${orderId}` } : { kind: 'none' };
  }
}

/** Where sellers manage their sales (Account -> Order History -> Sales). */
export const SELLER_ORDERS_ROUTE = `/account?tab=${ACCOUNT_TAB_ORDER_HISTORY}&orders=sales`;

/** Pull a human order code like "ORD-20260727-H9HTS3" out of a message. */
export function parseOrderCode(message: string): string | null {
  const m = message?.match(/ORD-[A-Z0-9-]+/i);
  return m ? m[0] : null;
}

// ---------- Time formatting ----------

export function formatRelativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay === 1) return 'Yesterday';

  const date = new Date(iso);
  const nowDate = new Date();

  // Same week → show weekday name
  const startOfWeek = new Date(nowDate);
  startOfWeek.setDate(nowDate.getDate() - nowDate.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  if (date >= startOfWeek) {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  }

  // Same year → "Jan 15"
  if (date.getFullYear() === nowDate.getFullYear()) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ---------- Icon + color mapping ----------

interface NotificationMeta {
  icon: IconType;
  color: string;
  bgColor: string;
  label: string;
}

export function getNotificationMeta(type: string): NotificationMeta {
  const t = type.toUpperCase();

  switch (t) {
    case 'ORDER_PLACED':
      return { icon: HiOutlineGift, color: 'text-green-400', bgColor: 'bg-green-500/20', label: 'New sale' };
    case 'ORDER_SHIPPED':
      return { icon: HiOutlineTruck, color: 'text-sky-400', bgColor: 'bg-sky-500/20', label: 'Shipped' };
    case 'ORDER_DELIVERED':
    case 'DELIVERY_CONFIRMED':
      return { icon: HiOutlineCheckCircle, color: 'text-green-400', bgColor: 'bg-green-500/20', label: 'Delivered' };
    case 'LOGISTICS_ORDER_ACCEPTED':
      return { icon: HiOutlineTruck, color: 'text-blue-400', bgColor: 'bg-blue-500/20', label: 'Logistics' };
    case 'LOGISTICS_ORDER_PENDING':
      return { icon: HiOutlineClock, color: 'text-amber-400', bgColor: 'bg-amber-500/20', label: 'Delivery request' };
    case 'ORDER_UPDATE':
    case 'ORDER':
      return { icon: HiOutlineCube, color: 'text-orange-400', bgColor: 'bg-orange-500/20', label: 'Order' };
    case 'NEW_MESSAGE':
    case 'MESSAGE':
      return { icon: HiOutlineChatAlt2, color: 'text-blue-400', bgColor: 'bg-blue-500/20', label: 'Message' };
    case 'TRADE':
    case 'BUYER':
      return { icon: HiOutlineShoppingBag, color: 'text-purple-400', bgColor: 'bg-purple-500/20', label: 'Trade' };
    case 'FUNDS':
    case 'PAYMENT':
      return { icon: HiOutlineCurrencyDollar, color: 'text-green-400', bgColor: 'bg-green-500/20', label: 'Payment' };
    case 'REFERRAL':
      return { icon: HiOutlineUsers, color: 'text-yellow-400', bgColor: 'bg-yellow-500/20', label: 'Referral' };
    case 'PRODUCT':
      return { icon: HiOutlineCube, color: 'text-indigo-400', bgColor: 'bg-indigo-500/20', label: 'Product' };
    default:
      return { icon: HiOutlineInformationCircle, color: 'text-gray-400', bgColor: 'bg-gray-500/20', label: 'Update' };
  }
}

// ---------- Date grouping ----------

interface NotificationGroup {
  label: string;
  items: Notification[];
}

export function groupByDate(notifications: Notification[]): NotificationGroup[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 7);

  const groups: Record<string, Notification[]> = {
    Today: [],
    Yesterday: [],
    'This week': [],
    Earlier: [],
  };

  for (const n of notifications) {
    const d = new Date(n.createdAt);
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());

    if (dayStart >= today) {
      groups['Today'].push(n);
    } else if (dayStart >= yesterday) {
      groups['Yesterday'].push(n);
    } else if (dayStart >= weekAgo) {
      groups['This week'].push(n);
    } else {
      groups['Earlier'].push(n);
    }
  }

  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }));
}
