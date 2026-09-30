import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  HiOutlineGift,
  HiOutlineTruck,
  HiOutlineClock,
  HiOutlineCube,
  HiOutlineCheckCircle,
  HiOutlineClipboardCopy,
  HiOutlineExternalLink,
} from "react-icons/hi";
import Modal from "../common/Modal";
import LoadingSpinner from "../common/LoadingSpinner";
import { useGetOrderByIdQuery } from "../../store/api";
import { useCurrency } from "../../context/CurrencyContext";
import {
  parseOrderCode,
  SELLER_ORDERS_ROUTE,
  type NotificationSheetVariant,
} from "../../utils/notifications";
import type { Notification, Order } from "../../utils/types";

interface Props {
  notification: Notification;
  variant: NotificationSheetVariant;
  onClose: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  accepted: "Accepted",
  paid: "Paid",
  shipped: "Shipped",
  delivered: "Delivered",
  completed: "Completed",
  delivery_confirmed: "Delivered",
  cancelled: "Cancelled",
  rejected: "Cancelled",
  disputed: "Disputed",
  refunded: "Refunded",
};

const statusLabel = (s?: string) => (s ? STATUS_LABELS[s] ?? s : "");

const idOf = (v: Order["buyer"] | Order["seller"] | undefined) =>
  typeof v === "object" && v ? v._id : (v as string | undefined);
const nameOf = (v: Order["buyer"] | Order["seller"] | undefined) =>
  typeof v === "object" && v ? v.name : undefined;

const LOGISTICS_PORTAL_URL = (
  import.meta.env.VITE_LOGISTICS_PORTAL_URL as string | undefined
)?.trim();

/**
 * Detail sheet for notifications whose destination is not a simple route:
 *  - "sale"             a seller's product was bought (ORDER_PLACED)
 *  - "order-status"     a status change that reaches the buyer or the seller
 *  - "logistics-pending" a delivery request for a logistics provider
 */
export default function NotificationActionSheet({ notification, variant, onClose }: Props) {
  const navigate = useNavigate();
  const { formatAmount } = useCurrency();

  const orderId = notification.metadata?.orderId;
  // The provider's job lives on their own dashboard, so we never fetch the
  // order for the logistics-pending sheet (they may not even have access here).
  const skipOrder = variant === "logistics-pending" || !orderId;

  const { data: order, isLoading } = useGetOrderByIdQuery(orderId ?? "", {
    skip: skipOrder,
  });

  const go = (to: string) => {
    onClose();
    navigate(to);
  };

  // The notification is addressed to this user, so the recipient id tells us
  // whether they are the buyer or the seller of the order.
  const isSeller = order ? idOf(order.seller) === notification.recipient : false;

  const orderCode =
    order?.orderId ?? parseOrderCode(notification.message) ?? undefined;
  const productName = order?.product?.name;
  const productImage = order?.product?.images?.[0];
  const tokenSymbol = order?.product?.paymentToken ?? "USDm";

  // ---- Logistics provider: point them at their own dashboard ----
  if (variant === "logistics-pending") {
    const code = parseOrderCode(notification.message);
    return (
      <Sheet title="New delivery request" icon={<HiOutlineClock />} tone="amber" onClose={onClose}>
        <p className="text-sm text-gray-300">
          A new delivery job is available{code ? " for order" : ""}
          {code ? <span className="font-mono text-white"> {code}</span> : ""}.
        </p>
        {code && <CopyRow label="Order reference" value={code} />}
        <p className="mt-3 text-sm text-gray-400">
          To review the pickup and delivery details and accept this job, sign in to
          your logistics provider dashboard. Delivery requests are managed there,
          not on your DezenFoods account.
        </p>

        <div className="mt-5 flex flex-col gap-2">
          {LOGISTICS_PORTAL_URL && (
            <a
              href={LOGISTICS_PORTAL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
            >
              Open provider dashboard <HiOutlineExternalLink className="text-base" />
            </a>
          )}
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-[#292B30] py-3 text-sm font-medium text-gray-200 transition-colors hover:bg-[#333940]"
          >
            Got it
          </button>
        </div>
      </Sheet>
    );
  }

  // ---- Order-linked sheets need the order loaded first ----
  if (isLoading) {
    return (
      <Sheet title="Loading" icon={<HiOutlineCube />} tone="orange" onClose={onClose}>
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      </Sheet>
    );
  }

  // ---- Seller: you made a sale (ORDER_PLACED) ----
  if (variant === "sale") {
    const buyerName = nameOf(order?.buyer);
    return (
      <Sheet title="You made a sale" icon={<HiOutlineGift />} tone="green" onClose={onClose}>
        <OrderSummary
          image={productImage}
          name={productName ?? notification.message.replace(/^New order placed for\s*/i, "")}
          code={orderCode}
          amount={order ? formatAmount(order.amount, tokenSymbol) : undefined}
          rows={[
            buyerName ? { label: "Buyer", value: buyerName } : null,
            order ? { label: "Status", value: statusLabel(order.status) } : null,
          ]}
        />
        <p className="mt-3 text-sm text-gray-400">
          Payment is held safely in escrow. You will be notified as the delivery
          progresses and funds are released.
        </p>

        <div className="mt-5 flex flex-col gap-2">
          <button
            onClick={() => go(SELLER_ORDERS_ROUTE)}
            className="w-full rounded-xl bg-brand py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
          >
            View in Order History
          </button>
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-[#292B30] py-3 text-sm font-medium text-gray-200 transition-colors hover:bg-[#333940]"
          >
            Close
          </button>
        </div>
      </Sheet>
    );
  }

  // ---- Status change: route by role (ORDER_UPDATE) ----
  const delivered = order && ["delivered", "delivery_confirmed", "completed"].includes(order.status);
  return (
    <Sheet
      title="Order update"
      icon={delivered ? <HiOutlineCheckCircle /> : <HiOutlineTruck />}
      tone={delivered ? "green" : "orange"}
      onClose={onClose}
    >
      <OrderSummary
        image={productImage}
        name={productName ?? "Your order"}
        code={orderCode}
        amount={order ? formatAmount(order.amount, tokenSymbol) : undefined}
        rows={[
          order ? { label: "Status", value: statusLabel(order.status) } : null,
          {
            label: isSeller ? "Buyer" : "Seller",
            value:
              (isSeller ? nameOf(order?.buyer) : nameOf(order?.seller)) ?? "Unknown",
          },
        ]}
      />
      <p className="mt-3 text-sm text-gray-400">
        {isSeller
          ? "The status of your sale changed. Manage it from your order history."
          : "The status of your order changed. Open the order for full details and next steps."}
      </p>

      <div className="mt-5 flex flex-col gap-2">
        {isSeller ? (
          <button
            onClick={() => go(SELLER_ORDERS_ROUTE)}
            className="w-full rounded-xl bg-brand py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
          >
            View in Order History
          </button>
        ) : (
          <button
            onClick={() => go(`/orders/${orderId}`)}
            className="w-full rounded-xl bg-brand py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
          >
            View order details
          </button>
        )}
        <button
          onClick={onClose}
          className="w-full rounded-xl bg-[#292B30] py-3 text-sm font-medium text-gray-200 transition-colors hover:bg-[#333940]"
        >
          Close
        </button>
      </div>
    </Sheet>
  );
}

// ---------- Presentational helpers ----------

const TONES: Record<string, string> = {
  green: "bg-green-500/20 text-green-400",
  orange: "bg-orange-500/20 text-orange-400",
  amber: "bg-amber-500/20 text-amber-400",
};

function Sheet({
  title,
  icon,
  tone,
  onClose,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  tone: keyof typeof TONES | string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal isOpen onClose={onClose} showCloseButton={false} maxWidth="md:max-w-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-full text-xl ${TONES[tone] ?? TONES.orange}`}>
          {icon}
        </div>
        <h3 className="text-lg font-bold text-white">{title}</h3>
      </div>
      {children}
    </Modal>
  );
}

function OrderSummary({
  image,
  name,
  code,
  amount,
  rows,
}: {
  image?: string;
  name: string;
  code?: string;
  amount?: string;
  rows: Array<{ label: string; value: string } | null>;
}) {
  return (
    <div className="rounded-2xl bg-[#292B30] p-3">
      <div className="flex items-center gap-3">
        <img
          src={image || "https://placehold.co/80x80?text=%3F"}
          alt=""
          className="h-12 w-12 flex-shrink-0 rounded-lg object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = "https://placehold.co/80x80?text=%3F";
          }}
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{name}</p>
          {code && <p className="truncate font-mono text-xs text-gray-500">{code}</p>}
        </div>
        {amount && <span className="ml-auto whitespace-nowrap text-sm font-semibold text-white">{amount}</span>}
      </div>

      {rows.filter(Boolean).length > 0 && (
        <div className="mt-3 space-y-1.5 border-t border-white/5 pt-3">
          {rows.filter(Boolean).map((r, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-gray-500">{r!.label}</span>
              <span className="font-medium text-gray-200">{r!.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div className="mt-3 flex items-center justify-between rounded-xl bg-[#292B30] px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-gray-500">{label}</p>
        <p className="truncate font-mono text-sm text-white">{value}</p>
      </div>
      <button
        onClick={copy}
        className="ml-2 flex flex-shrink-0 items-center gap-1 text-xs text-gray-400 transition-colors hover:text-white"
      >
        <HiOutlineClipboardCopy className="text-base" />
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
