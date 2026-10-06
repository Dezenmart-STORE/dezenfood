import type { Order } from "./types";

export type VendorOrderAction =
  | "accept"
  | "reject"
  | "preparing"
  | "ready"
  | "out_for_delivery"
  | "delivered";

export interface VendorActionButton {
  action: VendorOrderAction;
  label: string;
  tone: "primary" | "danger";
}

/**
 * What a vendor can do next. The backend enforces the transitions; this only
 * decides which buttons to show so every order can reach "delivered" (the
 * buyer's confirmation, and the vendor's payout, depend on it).
 */
export function vendorActionsFor(order: Pick<Order, "status" | "fulfilment">): VendorActionButton[] {
  switch ((order.status ?? "").toLowerCase()) {
    case "paid":
    case "accepted":
      return [
        { action: "preparing", label: "Accept & start preparing", tone: "primary" },
        { action: "reject", label: "Decline", tone: "danger" },
      ];
    case "preparing":
      return [{ action: "ready", label: "Mark ready", tone: "primary" }];
    case "ready":
      return order.fulfilment === "pickup"
        ? [{ action: "delivered", label: "Handed to customer", tone: "primary" }]
        : [{ action: "out_for_delivery", label: "Out for delivery", tone: "primary" }];
    case "out_for_delivery":
      return [{ action: "delivered", label: "Mark delivered", tone: "primary" }];
    default:
      return [];
  }
}

/** Buyer can confirm receipt once the food is with them (the backend re-checks). */
export function canBuyerConfirm(status: string, fulfilment?: Order["fulfilment"]): boolean {
  if (status === "delivered" || status === "out_for_delivery") return true;
  return status === "ready" && fulfilment === "pickup";
}

/** A refund is owed but the buyer has not told us where to send it. */
export function needsRefundAccount(order: Pick<Order, "refund">): boolean {
  return order.refund?.status === "awaiting_account" || order.refund?.status === "failed";
}
