import { useState } from "react";
import { Navigate } from "react-router-dom";
import Container from "../components/common/Container";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { useAuth } from "../context/AuthContext";
import {
  useGetAdminDisputesQuery,
  useGetAdminOrdersQuery,
  useGetAdminVendorsQuery,
  useResolveDisputeMutation,
  useReviewVendorMutation,
} from "../store/api";
import { formatNaira } from "../utils/food";
import { getErrorMessage } from "../utils/errors";
import type { Order } from "../utils/types";

type Tab = "vendors" | "disputes" | "orders";

/**
 * Minimal back-office. The route is hidden from non-admins as a courtesy; every
 * /admin/* endpoint enforces the admin role on the backend.
 */
export default function Admin() {
  const { user, isLoading } = useAuth();
  const [tab, setTab] = useState<Tab>("vendors");
  if (isLoading) return null;
  if ((user as { role?: string } | null)?.role !== "admin") return <Navigate to="/" replace />;

  return (
    <div className="bg-Dark min-h-screen">
      <Container className="max-w-4xl py-6">
        <h1 className="text-xl font-bold text-white">Admin</h1>
        <div role="tablist" className="mt-4 flex gap-1 rounded-lg bg-[#292B30] p-1">
          {(["vendors", "disputes", "orders"] as Tab[]).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium capitalize ${tab === t ? "bg-[#3A3C41] text-white" : "text-gray-400 hover:text-white"}`}>
              {t}
            </button>
          ))}
        </div>
        <div className="mt-4">
          {tab === "vendors" && <Vendors />}
          {tab === "disputes" && <Disputes />}
          {tab === "orders" && <Orders />}
        </div>
      </Container>
    </div>
  );
}

function Vendors() {
  const { data = [], isLoading } = useGetAdminVendorsQuery({ status: "pending" });
  const [review, { isLoading: busy }] = useReviewVendorMutation();
  const [error, setError] = useState<string | null>(null);
  if (isLoading) return <LoadingSpinner />;
  const act = async (id: string, status: "approved" | "rejected") => {
    setError(null);
    let reason: string | undefined;
    if (status === "rejected") {
      reason = window.prompt("Reason shown to the applicant:") ?? undefined;
      if (!reason) return;
    }
    try { await review({ id, status, reason }).unwrap(); } catch (e) { setError(getErrorMessage(e)); }
  };
  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-red-400" role="alert">{error}</p>}
      {data.length === 0 && <p className="py-10 text-center text-sm text-gray-500">No pending applications.</p>}
      {data.map((v) => (
        <div key={v._id} className="rounded-2xl bg-[#292B30] p-4">
          <p className="font-semibold text-white">{v.businessName}</p>
          <p className="text-xs text-gray-400">{v.lga}, {v.state} · {v.phone}</p>
          <p className="mt-2 text-sm text-gray-300">{v.description}</p>
          <p className="mt-1 text-xs text-gray-500">{v.categories.join(", ")}</p>
          {v.payoutAccount && <p className="mt-1 text-xs text-gray-500">Payout: {v.payoutAccount.bankName} · {v.payoutAccount.accountName} · {v.payoutAccount.accountNumberMasked}</p>}
          <div className="mt-3 flex gap-2">
            <button disabled={busy} onClick={() => act(v._id, "approved")} className="flex-1 rounded-xl bg-green-700 py-2 text-sm font-semibold text-white disabled:opacity-50">Approve</button>
            <button disabled={busy} onClick={() => act(v._id, "rejected")} className="flex-1 rounded-xl border border-red-900/50 bg-red-900/20 py-2 text-sm font-semibold text-red-300 disabled:opacity-50">Reject</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function Disputes() {
  const { data = [], isLoading } = useGetAdminDisputesQuery();
  const [resolve, { isLoading: busy }] = useResolveDisputeMutation();
  const [error, setError] = useState<string | null>(null);
  if (isLoading) return <LoadingSpinner />;
  const act = async (orderId: string, resolution: "release_to_vendor" | "refund_buyer") => {
    const label = resolution === "refund_buyer" ? "Refund the buyer" : "Release payment to the vendor";
    if (!window.confirm(`${label}? This moves money and cannot be undone.`)) return;
    setError(null);
    try { await resolve({ orderId, resolution }).unwrap(); } catch (e) { setError(getErrorMessage(e)); }
  };
  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-red-400" role="alert">{error}</p>}
      {data.length === 0 && <p className="py-10 text-center text-sm text-gray-500">No open disputes.</p>}
      {data.map((o) => (
        <div key={o._id} className="rounded-2xl bg-[#292B30] p-4">
          <div className="flex justify-between">
            <p className="font-semibold text-white">#{o.orderId}</p>
            <p className="text-sm text-white">{formatNaira(o.totals?.total ?? o.amount ?? 0)}</p>
          </div>
          <p className="mt-1 text-xs text-gray-400">via {o.paymentRail ?? "crypto"}</p>
          <p className="mt-2 rounded-lg bg-[#212428] p-2 text-sm text-amber-200">{o.dispute?.reason ?? "No reason given"}</p>
          <div className="mt-3 flex gap-2">
            <button disabled={busy} onClick={() => act(o._id, "release_to_vendor")} className="flex-1 rounded-xl bg-[#3A3C41] py-2 text-sm font-semibold text-white disabled:opacity-50">Release to vendor</button>
            <button disabled={busy} onClick={() => act(o._id, "refund_buyer")} className="flex-1 rounded-xl bg-brand py-2 text-sm font-semibold text-white disabled:opacity-50">Refund buyer</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function Orders() {
  const { data = [], isLoading } = useGetAdminOrdersQuery();
  if (isLoading) return <LoadingSpinner />;
  return (
    <div className="overflow-x-auto rounded-2xl bg-[#292B30]">
      <table className="w-full text-left text-sm">
        <thead className="text-xs uppercase text-gray-500">
          <tr><th className="p-3">Order</th><th className="p-3">Status</th><th className="p-3">Rail</th><th className="p-3 text-right">Total</th></tr>
        </thead>
        <tbody>
          {data.map((o: Order) => (
            <tr key={o._id} className="border-t border-[#373A3F] text-gray-200">
              <td className="p-3">#{o.orderId}</td>
              <td className="p-3">{o.status}</td>
              <td className="p-3">{o.paymentRail ?? "crypto"}</td>
              <td className="p-3 text-right">{formatNaira(o.totals?.total ?? o.amount ?? 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.length === 0 && <p className="py-10 text-center text-sm text-gray-500">No orders.</p>}
    </div>
  );
}
