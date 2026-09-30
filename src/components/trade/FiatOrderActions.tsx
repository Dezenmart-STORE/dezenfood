import { useState } from "react";
import {
  useCancelOrderMutation,
  useConfirmFiatDeliveryMutation,
  useRaiseDisputeMutation,
  useResendReleaseOtpMutation,
} from "../../store/api";
import type { Order } from "../../utils/types";
import type { TradeState } from "./TradeStatus";
import { getErrorMessage } from "../../utils/errors";

interface Props {
  order: Order;
  status: TradeState;
}

const DISPUTE_REASONS = [
  "Order never arrived",
  "Items missing or wrong",
  "Food arrived spoiled or cold",
  "Arrived much later than promised",
  "Other",
];

/**
 * Buyer actions for fiat/escrow-provider orders. Every action is a request to
 * the backend, which decides whether it is allowed and moves the money.
 */
export default function FiatOrderActions({ order, status }: Props) {
  const [confirmDelivery, { isLoading: confirming }] = useConfirmFiatDeliveryMutation();
  const [resendOtp, { isLoading: resending }] = useResendReleaseOtpMutation();
  const [raiseDispute, { isLoading: disputing }] = useRaiseDisputeMutation();
  const [cancelOrder, { isLoading: cancelling }] = useCancelOrderMutation();

  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [showDispute, setShowDispute] = useState(false);
  const [reasonKey, setReasonKey] = useState(DISPUTE_REASONS[0]);
  const [details, setDetails] = useState("");
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const needsOtp = order.releaseOtpRequired ?? order.paymentRail === "pandascrow";
  const canConfirm = status === "delivered";
  const canDispute = ["paid", "preparing", "ready", "out_for_delivery", "shipped", "delivered"].includes(status);
  const canCancel = status === "paid";

  if (!canConfirm && !canDispute && !canCancel) return null;

  const run = async (fn: () => Promise<unknown>, okText: string) => {
    setFeedback(null);
    try {
      await fn();
      setFeedback({ ok: true, text: okText });
      return true;
    } catch (e) {
      setFeedback({ ok: false, text: getErrorMessage(e) });
      return false;
    }
  };

  return (
    <div className="space-y-3">
      {feedback && (
        <div
          role="alert"
          className={`rounded-xl border p-3 text-sm ${
            feedback.ok ? "border-green-800/40 bg-green-900/20 text-green-300" : "border-red-800/40 bg-red-900/20 text-red-300"
          }`}
        >
          {feedback.text}
        </div>
      )}

      {canConfirm && (
        <div className="rounded-2xl border border-[#292B30] bg-[#212428] p-5">
          <h3 className="text-sm font-semibold text-white">Received your order?</h3>
          <p className="mt-1 text-xs text-gray-400">
            Confirming releases your payment to the vendor. Only confirm once you have your food and it's right.
          </p>

          {needsOtp && (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-gray-400">
                {otpSent
                  ? "Enter the one-time code we sent to release payment."
                  : "We'll send a one-time code to confirm you want to release payment."}
              </p>
              {!otpSent ? (
                <button
                  disabled={resending}
                  onClick={async () => {
                    if (await run(() => resendOtp(order._id).unwrap(), "Code sent. Check your email or phone.")) setOtpSent(true);
                  }}
                  className="w-full rounded-xl border border-brand/60 py-2.5 text-sm font-semibold text-brand hover:bg-brand/10 disabled:opacity-50"
                >
                  {resending ? "Sending…" : "Send me a code"}
                </button>
              ) : (
                <div className="flex gap-2">
                  <input
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    aria-label="One-time code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 8))}
                    placeholder="Code"
                    className="min-w-0 flex-1 rounded-xl border border-[#292B30] bg-[#1a1c20] px-3 py-2.5 text-center text-lg tracking-widest text-white outline-none focus:border-brand"
                  />
                  <button
                    onClick={() => run(() => resendOtp(order._id).unwrap(), "New code sent.")}
                    disabled={resending}
                    className="rounded-xl border border-[#292B30] bg-[#292B30] px-3 text-xs text-gray-300 hover:bg-[#373A3F] disabled:opacity-50"
                  >
                    Resend
                  </button>
                </div>
              )}
            </div>
          )}

          {(!needsOtp || otpSent) && (
            <button
              disabled={confirming || (needsOtp && otp.length < 4)}
              onClick={() => run(() => confirmDelivery({ orderId: order._id, otp: needsOtp ? otp : undefined }).unwrap(), "Payment released. Thank you!")}
              className="mt-3 w-full rounded-xl bg-green-700 py-3 text-sm font-bold text-white hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {confirming ? "Confirming…" : "Yes, I received it - release payment"}
            </button>
          )}
        </div>
      )}

      <div className="flex gap-3">
        {canDispute && (
          <button
            onClick={() => setShowDispute((v) => !v)}
            className="flex-1 rounded-xl border border-amber-800/50 bg-amber-900/20 py-3 text-sm font-semibold text-amber-300 hover:bg-amber-900/30"
          >
            Report a problem
          </button>
        )}
        {canCancel && (
          <button
            disabled={cancelling}
            onClick={() => {
              if (window.confirm("Cancel this order? Your payment will be refunded.")) {
                void run(() => cancelOrder({ orderId: order._id }).unwrap(), "Order cancelled. Your refund is on its way.");
              }
            }}
            className="flex-1 rounded-xl border border-[#292B30] bg-[#292B30] py-3 text-sm font-semibold text-gray-300 hover:bg-[#373A3F] disabled:opacity-50"
          >
            {cancelling ? "Cancelling…" : "Cancel order"}
          </button>
        )}
      </div>

      {showDispute && canDispute && (
        <div className="rounded-2xl border border-amber-800/40 bg-amber-900/10 p-5">
          <h3 className="text-sm font-semibold text-white">What went wrong?</h3>
          <p className="mt-1 text-xs text-gray-400">Your money stays in escrow while we review. Please don't confirm delivery.</p>
          <select
            aria-label="Problem"
            value={reasonKey}
            onChange={(e) => setReasonKey(e.target.value)}
            className="mt-3 w-full rounded-xl border border-[#292B30] bg-[#1a1c20] px-3 py-2.5 text-sm text-white outline-none focus:border-brand"
          >
            {DISPUTE_REASONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={3}
            placeholder="Tell us what happened (at least 10 characters)"
            className="mt-2 w-full resize-none rounded-xl border border-[#292B30] bg-[#1a1c20] px-3 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-brand"
          />
          <button
            disabled={disputing || details.trim().length < 10}
            onClick={async () => {
              const ok = await run(
                () => raiseDispute({ orderId: order._id, reason: `${reasonKey}: ${details.trim()}` }).unwrap(),
                "Dispute submitted. Our team will review it.",
              );
              if (ok) setShowDispute(false);
            }}
            className="mt-3 w-full rounded-xl bg-amber-600 py-3 text-sm font-bold text-white hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {disputing ? "Submitting…" : "Submit dispute"}
          </button>
        </div>
      )}
    </div>
  );
}
