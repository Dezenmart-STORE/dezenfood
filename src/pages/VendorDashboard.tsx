import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Container from "../components/common/Container";
import LoadingSpinner from "../components/common/LoadingSpinner";
import {
  useAdvanceFoodOrderMutation,
  useGetMyVendorQuery,
  useGetUserOrdersQuery,
  useUpdateMyVendorMutation,
} from "../store/api";
import type { Order, OrderItem } from "../utils/types";
import { formatNaira } from "../utils/food";
import { vendorActionsFor, type VendorOrderAction } from "../utils/orderFlow";
import { getErrorMessage } from "../utils/errors";
import { useSEO } from "../hooks/useSEO";

type Column = "new" | "preparing" | "ready" | "done";

const COLUMN_OF: Record<string, Column> = {
  paid: "new",
  accepted: "new",
  preparing: "preparing",
  ready: "ready",
  out_for_delivery: "ready",
  shipped: "ready",
  delivered: "done",
  completed: "done",
  delivery_confirmed: "done",
};

const TABS: { id: Column; label: string }[] = [
  { id: "new", label: "New" },
  { id: "preparing", label: "Preparing" },
  { id: "ready", label: "Ready / out" },
  { id: "done", label: "Done" },
];

export default function VendorDashboard() {
  useSEO({ title: "Vendor dashboard", description: "Manage your orders.", noindex: true });
  const { data: vendor, isLoading: vendorLoading } = useGetMyVendorQuery();
  // Sales, refreshed every 20s so new paid orders appear without a reload.
  const { data: orders = [], isLoading } = useGetUserOrdersQuery({ type: "seller" }, { pollingInterval: 20000 });
  const [updateVendor, { isLoading: toggling }] = useUpdateMyVendorMutation();
  const [tab, setTab] = useState<Column>("new");

  const byColumn = useMemo(() => {
    const m: Record<Column, Order[]> = { new: [], preparing: [], ready: [], done: [] };
    for (const o of orders) {
      const c = COLUMN_OF[(o.status ?? "").toLowerCase()];
      if (c) m[c].push(o);
    }
    return m;
  }, [orders]);

  const earnings = useMemo(
    () => byColumn.done.reduce((s, o) => s + (o.totals?.subtotal ?? o.amount ?? 0), 0),
    [byColumn.done],
  );
  const inEscrow = useMemo(
    () => [...byColumn.new, ...byColumn.preparing, ...byColumn.ready].reduce((s, o) => s + (o.totals?.subtotal ?? o.amount ?? 0), 0),
    [byColumn],
  );

  if (vendorLoading || isLoading) {
    return <div className="flex min-h-[50vh] items-center justify-center bg-Dark"><LoadingSpinner size="lg" /></div>;
  }
  if (!vendor || vendor.status !== "approved") {
    return (
      <Container className="py-16 text-center">
        <p className="text-gray-300">You need an approved vendor account to see this page.</p>
        <Link to="/vendor/apply" className="mt-4 inline-block rounded-xl bg-brand px-6 py-3 text-sm font-bold text-white">Apply to sell</Link>
      </Container>
    );
  }

  return (
    <div className="bg-Dark min-h-screen">
      <Container className="max-w-3xl py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-white">{vendor.businessName}</h1>
            <Link to={`/vendors/${vendor._id}`} className="text-xs text-brand hover:underline">View my storefront</Link>
          </div>
          <button
            disabled={toggling}
            onClick={() => updateVendor({ isOpen: !vendor.isOpen })}
            aria-pressed={vendor.isOpen}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${vendor.isOpen ? "bg-green-700 text-white" : "bg-[#3A3C41] text-gray-300"}`}
          >
            {vendor.isOpen ? "● Open for orders" : "○ Closed - not taking orders"}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Stat label="Held in escrow" value={formatNaira(inEscrow)} />
          <Stat label="Completed sales" value={formatNaira(earnings)} />
        </div>

        <div role="tablist" className="mt-6 flex gap-1 rounded-lg bg-[#292B30] p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium sm:text-sm ${tab === t.id ? "bg-[#3A3C41] text-white" : "text-gray-400 hover:text-white"}`}
            >
              {t.label}
              {byColumn[t.id].length > 0 && <span className="ml-1 rounded-full bg-brand px-1.5 text-[10px] text-white">{byColumn[t.id].length}</span>}
            </button>
          ))}
        </div>

        <ul className="mt-4 space-y-3">
          {byColumn[tab].length === 0 && <li className="py-10 text-center text-sm text-gray-500">Nothing here right now.</li>}
          {byColumn[tab].map((o) => <OrderCard key={o._id} order={o} />)}
        </ul>
      </Container>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#292B30] p-4">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="mt-1 text-lg font-bold text-white">{value}</p>
    </div>
  );
}

function OrderCard({ order }: { order: Order }) {
  const [advance, { isLoading }] = useAdvanceFoodOrderMutation();
  const [error, setError] = useState<string | null>(null);
  const [prep, setPrep] = useState("");
  const buyer = typeof order.buyer === "object" ? order.buyer?.name : "Customer";

  const actions = vendorActionsFor(order);
  const run = async (action: VendorOrderAction) => {
    setError(null);
    if (action === "reject" && !window.confirm("Decline this order? The buyer will be refunded.")) return;
    try {
      await advance({
        orderId: order._id,
        action,
        prepTimeMinutes: action === "preparing" && prep ? Number(prep) : undefined,
      }).unwrap();
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  return (
    <li className="rounded-2xl bg-[#292B30] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link to={`/orders/${order._id}`} className="text-sm font-semibold text-white hover:underline">#{order.orderId}</Link>
          <p className="text-xs text-gray-400">{buyer} · {new Date(order.createdAt).toLocaleString()}</p>
        </div>
        <span className="text-sm font-bold text-white">{formatNaira(order.totals?.subtotal ?? order.amount ?? 0)}</span>
      </div>

      <ul className="mt-3 space-y-1 text-sm text-gray-200">
        {(order.items?.length ? order.items : ([{ product: "", name: order.product?.name ?? "Item", quantity: order.quantity ?? 1, unitPrice: 0 }] as OrderItem[])).map((i, idx) => (
          <li key={`${i.product}-${idx}`}>
            {i.quantity} × {i.name}{i.variantLabel ? ` (${i.variantLabel})` : ""}
            {i.note && <span className="block text-xs text-amber-300">Note: {i.note}</span>}
          </li>
        ))}
      </ul>
      {order.buyerNote && <p className="mt-2 rounded-lg bg-[#212428] p-2 text-xs text-amber-300">Buyer note: {order.buyerNote}</p>}
      <p className="mt-2 text-xs text-gray-500">{order.fulfilment === "pickup" ? "Pickup" : "Delivery"}</p>

      {order.status === "paid" && (
        <input
          inputMode="numeric"
          value={prep}
          onChange={(e) => setPrep(e.target.value.replace(/\D/g, "").slice(0, 3))}
          placeholder="Prep time in minutes (optional)"
          aria-label="Preparation time in minutes"
          className="mt-3 w-full rounded-lg border border-[#373A3F] bg-[#1a1c20] px-3 py-2 text-xs text-white placeholder-gray-600 outline-none focus:border-brand"
        />
      )}

      {error && <p className="mt-2 text-xs text-red-400" role="alert">{error}</p>}

      {actions.length > 0 && (
        <div className="mt-3 flex gap-2">
          {actions.map((a) => (
            <button
              key={a.action}
              disabled={isLoading}
              onClick={() => run(a.action)}
              className={`flex-1 rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50 ${a.tone === "primary" ? "bg-brand text-white hover:bg-brand-hover" : "border border-red-900/50 bg-red-900/20 text-red-300"}`}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </li>
  );
}
