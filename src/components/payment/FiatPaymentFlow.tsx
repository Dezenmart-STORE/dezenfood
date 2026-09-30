import { useState } from "react";
import { useFiatPayment } from "../../hooks/useFiatPayment";
import type { FiatProvider } from "../../store/api/paymentsApi";
import { formatNaira } from "../../utils/food";

interface Props {
  orderId: string;
  /** Provider the buyer already picked on the method screen */
  provider: FiatProvider;
  /** Server-computed amount due, NGN */
  amount: number;
  defaultEmail?: string;
  productName?: string;
  productImage?: string;
  /** Called once the backend has verified the payment (not before). */
  onPaid?: () => void;
  onClose?: () => void;
}

const PROVIDER_COPY: Record<FiatProvider, { label: string; how: string }> = {
  korapay: {
    label: "Korapay",
    how: "You'll be taken to Korapay's secure page to pay by card, bank transfer or pay-with-bank.",
  },
  pandascrow: {
    label: "Pandascrow Escrow",
    how: "Your money is held by Pandascrow in escrow and released to the vendor only after you confirm delivery.",
  },
};

/**
 * Real fiat checkout. The payment is created and verified by the DezenMart
 * backend; this component only starts it, sends the buyer to the provider (or
 * shows transfer details) and waits for the backend's verified result.
 */
export default function FiatPaymentFlow({
  orderId,
  provider,
  amount,
  defaultEmail,
  productName,
  productImage,
  onPaid,
  onClose,
}: Props) {
  const { state, startFiatPayment, reset } = useFiatPayment();
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [emailError, setEmailError] = useState("");
  const copy = PROVIDER_COPY[provider];

  const handlePay = () => {
    if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError("Enter a valid email to continue.");
      return;
    }
    setEmailError("");
    void startFiatPayment({ orderId, provider, email });
  };

  if (state.step === "idle") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-xl border border-[#292B30] bg-[#292B30] p-3">
          {productImage && <img src={productImage} alt="" className="h-12 w-12 flex-shrink-0 rounded-lg object-cover" />}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{productName ?? "Your order"}</p>
            <p className="text-lg font-bold text-white">{formatNaira(amount)}</p>
          </div>
        </div>

        <div className="rounded-xl border border-[#292B30] bg-[#1a1c20] p-3">
          <p className="text-sm font-semibold text-white">{copy.label}</p>
          <p className="mt-1 text-xs text-gray-400">{copy.how}</p>
        </div>

        <div>
          <label htmlFor="fiat-email" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
            Email for receipt
          </label>
          <input
            id="fiat-email"
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
            placeholder="you@example.com"
            className="w-full rounded-xl border border-[#292B30] bg-[#1a1c20] px-3 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          />
          {emailError && <p className="mt-1.5 text-xs text-red-400" role="alert">{emailError}</p>}
        </div>

        <button
          onClick={handlePay}
          className="w-full rounded-xl bg-brand py-3.5 text-sm font-bold text-white transition-all hover:bg-brand-hover active:scale-[0.98]"
        >
          Pay {formatNaira(amount)}
        </button>
      </div>
    );
  }

  if (state.step === "initializing") return <LoadingState label={`Connecting to ${copy.label}…`} />;
  if (state.step === "redirecting") return <LoadingState label={`Taking you to ${copy.label}…`} />;
  if (state.step === "verifying") return <LoadingState label="Confirming your payment…" />;

  if (state.step === "awaiting-transfer" && state.session?.virtualAccount) {
    const v = state.session.virtualAccount;
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-[#292B30] bg-[#1a1c20] p-5">
          <h3 className="text-base font-semibold text-white">Transfer to complete your order</h3>
          <p className="mt-1 text-sm text-gray-400">
            Send exactly <strong className="text-white">{formatNaira(state.session.amount)}</strong> to this account. We'll confirm automatically.
          </p>
          <dl className="mt-4 space-y-2 text-sm">
            {v.bankName && <Row label="Bank" value={v.bankName} />}
            {v.accountNumber && <Row label="Account number" value={v.accountNumber} mono />}
            {v.accountName && <Row label="Account name" value={v.accountName} />}
            {v.expiresAt && <Row label="Expires" value={new Date(v.expiresAt).toLocaleString()} />}
          </dl>
        </div>
        <LoadingState label="Waiting for your transfer…" compact />
        {onClose && (
          <button onClick={onClose} className="w-full rounded-xl border border-[#292B30] bg-[#292B30] py-3 text-sm font-medium text-gray-400 hover:bg-[#373A3F]">
            I'll pay later
          </button>
        )}
      </div>
    );
  }

  if (state.step === "success") {
    return (
      <div className="flex flex-col items-center py-8">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-green-800/50 bg-green-900/40">
          <svg className="h-8 w-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-white">Payment confirmed</h3>
        <p className="mt-2 text-sm text-gray-400">Your money is held in escrow while the vendor prepares your order.</p>
        <button
          onClick={() => onPaid?.()}
          className="mt-6 w-full rounded-xl bg-[#292B30] py-3 text-sm font-bold text-white hover:bg-[#373A3F]"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center py-8">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-red-800/50 bg-red-900/30">
        <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <h3 className="text-xl font-bold text-white">Payment not completed</h3>
      <p className="mt-2 max-w-xs text-center text-sm text-gray-400" role="alert">{state.error}</p>
      <div className="mt-6 flex w-full gap-3">
        <button onClick={reset} className="flex-1 rounded-xl bg-brand py-3 text-sm font-bold text-white hover:bg-brand-hover">
          Try again
        </button>
        {onClose && (
          <button onClick={onClose} className="flex-1 rounded-xl border border-[#292B30] bg-[#292B30] py-3 text-sm font-bold text-gray-300 hover:bg-[#373A3F]">
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-gray-500">{label}</dt>
      <dd className={`text-right font-medium text-white ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}

function LoadingState({ label, compact }: { label: string; compact?: boolean }) {
  return (
    <div className={`flex flex-col items-center ${compact ? "py-2" : "py-10"}`} role="status" aria-live="polite">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#292B30] border-t-brand" />
      <p className="mt-4 text-sm text-gray-400">{label}</p>
    </div>
  );
}
