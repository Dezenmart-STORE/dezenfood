import { useState } from "react";
import { useGetBanksQuery, useResolveBankAccountMutation, useSubmitRefundAccountMutation } from "../../store/api";
import { formatNaira } from "../../utils/food";
import { getErrorMessage } from "../../utils/errors";
import type { Order } from "../../utils/types";

/**
 * Money is owed back to the buyer (declined, cancelled or disputed order) and
 * we need a bank account to send it to. The backend verifies the account and
 * pays it out; the name shown here is the bank's, looked up server-side.
 */
export default function RefundAccountForm({ order }: { order: Order }) {
  const { data: banks = [] } = useGetBanksQuery();
  const [resolve, { isLoading: resolving }] = useResolveBankAccountMutation();
  const [submit, { isLoading: submitting }] = useSubmitRefundAccountMutation();
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const valid = bankCode !== "" && /^\d{10}$/.test(accountNumber);
  const failed = order.refund?.status === "failed";

  const lookup = async () => {
    setError(null);
    setAccountName(null);
    try {
      const r = await resolve({ bankCode, accountNumber }).unwrap();
      setAccountName(r.accountName);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  const send = async () => {
    setError(null);
    try {
      await submit({ orderId: order._id, bankCode, accountNumber }).unwrap();
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  return (
    <div className="rounded-2xl border border-amber-800/40 bg-amber-900/10 p-5">
      <h3 className="text-sm font-semibold text-white">
        {failed ? "Refund didn't go through - try another account" : "Where should we send your refund?"}
      </h3>
      <p className="mt-1 text-xs text-gray-400">
        {formatNaira(order.refund?.amount ?? order.totals?.total ?? order.amount ?? 0)} is waiting for you. Use a bank
        account in your own name.
      </p>

      <label className="mt-3 block text-xs text-gray-400" htmlFor="refund-bank">Bank</label>
      <select
        id="refund-bank"
        value={bankCode}
        onChange={(e) => { setBankCode(e.target.value); setAccountName(null); }}
        className="mt-1 w-full rounded-lg border border-[#373A3F] bg-[#1a1c20] px-3 py-2 text-sm text-white outline-none focus:border-brand"
      >
        <option value="">Select your bank</option>
        {banks.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
      </select>

      <label className="mt-3 block text-xs text-gray-400" htmlFor="refund-account">Account number</label>
      <input
        id="refund-account"
        inputMode="numeric"
        value={accountNumber}
        onChange={(e) => { setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10)); setAccountName(null); }}
        placeholder="10-digit account number"
        className="mt-1 w-full rounded-lg border border-[#373A3F] bg-[#1a1c20] px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-brand"
      />

      {accountName && <p className="mt-2 text-sm font-medium text-green-300">{accountName}</p>}
      {error && <p className="mt-2 text-xs text-red-400" role="alert">{error}</p>}

      {!accountName ? (
        <button
          disabled={!valid || resolving}
          onClick={lookup}
          className="mt-3 w-full rounded-xl border border-brand/60 py-2.5 text-sm font-semibold text-brand hover:bg-brand/10 disabled:opacity-50"
        >
          {resolving ? "Checking…" : "Check account"}
        </button>
      ) : (
        <button
          disabled={submitting}
          onClick={send}
          className="mt-3 w-full rounded-xl bg-brand py-3 text-sm font-bold text-white hover:bg-brand-hover disabled:opacity-50"
        >
          {submitting ? "Sending…" : "Send my refund here"}
        </button>
      )}
    </div>
  );
}
