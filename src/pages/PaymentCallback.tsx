import { useEffect, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PENDING_PAYMENT_KEY, useFiatPayment } from "../hooks/useFiatPayment";
import { useAppDispatch } from "../hooks/redux";
import { clearCart } from "../store/slices/cartSlice";
import { ordersApi } from "../store/api/ordersApi";

/**
 * Where Korapay / Pandascrow send the buyer back to. The URL is NOT trusted:
 * a `?status=success` in the address bar means nothing. We only take the
 * payment reference, then ask the backend for its provider-verified status.
 */
export default function PaymentCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { state, pollUntilSettled } = useFiatPayment();

  const { reference, orderId } = useMemo(() => {
    let stored: { reference?: string; orderId?: string } = {};
    try {
      stored = JSON.parse(sessionStorage.getItem(PENDING_PAYMENT_KEY) ?? "{}");
    } catch { /* ignore */ }
    return {
      reference: params.get("reference") ?? params.get("ref") ?? params.get("trxref") ?? stored.reference ?? "",
      orderId: params.get("orderId") ?? stored.orderId ?? "",
    };
  }, [params]);

  useEffect(() => {
    if (!reference) return;
    pollUntilSettled(reference, (r) => {
      if (r.status === "success") {
        dispatch(clearCart());
        dispatch(ordersApi.util.invalidateTags([{ type: "Orders", id: "LIST" }, { type: "Order", id: r.orderId || orderId }]));
      }
    });
  }, [reference, orderId, pollUntilSettled, dispatch]);

  const orderHref = orderId ? `/orders/${orderId}` : "/account?tab=3";

  return (
    <div className="min-h-[70vh] bg-Dark px-4 py-16">
      <div className="mx-auto max-w-md rounded-2xl border border-[#292B30] bg-[#212428] p-8 text-center">
        {!reference ? (
          <>
            <h1 className="text-lg font-bold text-white">We couldn't find that payment</h1>
            <p className="mt-2 text-sm text-gray-400">Check your orders to see whether it went through.</p>
          </>
        ) : state.step === "success" ? (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-900/40 text-2xl">✓</div>
            <h1 className="text-lg font-bold text-white">Payment confirmed</h1>
            <p className="mt-2 text-sm text-gray-400">Your money is held in escrow. The vendor has been notified.</p>
          </>
        ) : state.step === "error" ? (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-900/30 text-2xl">✕</div>
            <h1 className="text-lg font-bold text-white">Payment not completed</h1>
            <p className="mt-2 text-sm text-gray-400" role="alert">{state.error}</p>
          </>
        ) : (
          <div role="status" aria-live="polite">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[#292B30] border-t-brand" />
            <h1 className="mt-4 text-lg font-bold text-white">Confirming your payment…</h1>
            <p className="mt-2 text-sm text-gray-400">Please don't close this page.</p>
          </div>
        )}

        {(state.step === "success" || state.step === "error" || !reference) && (
          <div className="mt-6 flex flex-col gap-2">
            <button onClick={() => navigate(orderHref, { replace: true })} className="rounded-xl bg-brand py-3 text-sm font-bold text-white hover:bg-brand-hover">
              View order
            </button>
            <Link to="/product" className="text-sm text-gray-400 hover:text-white">Keep browsing</Link>
          </div>
        )}
      </div>
    </div>
  );
}
