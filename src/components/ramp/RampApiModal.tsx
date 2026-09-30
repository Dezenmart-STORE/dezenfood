/**
 * RampApiModal
 *
 * Full custom modal using direct Quidax REST API calls.
 * Used when integrationMode="api" on <RampProvider>.
 *
 * Flow:
 *   OnRamp:  form → quote (with countdown) → payment-details → processing → success/error
 *   OffRamp: form → quote → bank-input (live verify) → processing → success/error
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRamp } from "./RampContext";
import { useModalPresence } from "../../utils/modalPresence";
import {
  initiateOnRamp,
  refreshOnRamp,
  confirmOnRamp,
  initiateOffRamp,
  refreshOffRamp,
  confirmOffRamp,
  verifyBankAccount,
  generateMerchantRef,
  type InitiateOnRampPayload,
  type InitiateOffRampPayload,
} from "./rampService";

// ─── Icons ───────────────────────────────────────────────────────────────
const ArrowDown = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 3v10M3 8l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const ChevronDown = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const X = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
const Check = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    <circle cx="20" cy="20" r="18" stroke="#22c55e" strokeWidth="2" />
    <path d="M12 20l6 6 10-12" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const AlertCircle = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    <circle cx="20" cy="20" r="18" stroke="#ef4444" strokeWidth="2" />
    <path d="M20 12v10M20 26v2" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);
const RefreshCw = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M12 2.5A6 6 0 1 1 7 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M7 1l2 2-2 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const Copy = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <rect x="4" y="4" width="8" height="8" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
    <path d="M2 10V2h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

// ─── Constants ────────────────────────────────────────────────────────────
const NETWORKS = ["bep20", "trc20", "erc20", "polygon"] as const;
const NIGERIAN_BANKS = [
  { code: "044", name: "Access Bank" },
  { code: "023", name: "Citibank" },
  { code: "050", name: "EcoBank" },
  { code: "011", name: "First Bank" },
  { code: "214", name: "FCMB" },
  { code: "058", name: "GTBank" },
  { code: "030", name: "Heritage Bank" },
  { code: "301", name: "Jaiz Bank" },
  { code: "082", name: "Keystone Bank" },
  { code: "076", name: "Polaris Bank" },
  { code: "101", name: "ProvidusBank" },
  { code: "221", name: "Stanbic IBTC" },
  { code: "068", name: "Standard Chartered" },
  { code: "232", name: "Sterling Bank" },
  { code: "032", name: "Union Bank" },
  { code: "033", name: "UBA" },
  { code: "215", name: "Unity Bank" },
  { code: "035", name: "Wema Bank" },
  { code: "057", name: "Zenith Bank" },
];

type Step = "form" | "quote" | "payment-details" | "bank-input" | "processing" | "success" | "error";

interface QuoteData {
  merchantRef: string;
  fromAmount: string;
  toAmount: string;
  rate: string;
  expiresAt: number;
  paymentDetails?: {
    accountName?: string;
    accountNumber?: string;
    bankName?: string;
    ussdCode?: string;
    walletAddress?: string;
  };
}

// ─── Primitives ───────────────────────────────────────────────────────────
const Spinner = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" className="animate-spin"
    style={{ animation: "spin 0.8s linear infinite" }}>
    <circle cx="10" cy="10" r="7" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5" fill="none" />
    <path d="M10 3a7 7 0 0 1 7 7" stroke="#E23B3B" strokeWidth="2.5" strokeLinecap="round" fill="none" />
  </svg>
);

const CountdownTimer = ({ expiresAt, onExpire }: { expiresAt: number; onExpire: () => void }) => {
  const [remaining, setRemaining] = useState(Math.max(0, expiresAt - Date.now()));
  useEffect(() => {
    const tick = setInterval(() => {
      const r = Math.max(0, expiresAt - Date.now());
      setRemaining(r);
      if (r === 0) { clearInterval(tick); onExpire(); }
    }, 1000);
    return () => clearInterval(tick);
  }, [expiresAt, onExpire]);
  const secs = Math.floor(remaining / 1000);
  const mins = Math.floor(secs / 60);
  const s = secs % 60;
  const pct = Math.min(100, (remaining / 600_000) * 100);
  return (
    <div className="flex items-center gap-2 text-sm">
      <svg width="18" height="18" viewBox="0 0 18 18" className={secs < 60 ? "text-red-400" : "text-yellow-400"}>
        <circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" fill="none" />
        <circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="2" fill="none"
          strokeDasharray={`${2 * Math.PI * 7.5}`}
          strokeDashoffset={`${2 * Math.PI * 7.5 * (1 - pct / 100)}`}
          strokeLinecap="round"
          style={{ transform: "rotate(-90deg)", transformOrigin: "9px 9px" }} />
      </svg>
      <span className={secs < 60 ? "text-red-400" : "text-[#C6C6C8]"}>
        {mins}:{String(s).padStart(2, "0")}
      </span>
    </div>
  );
};

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1 text-xs text-[#E23B3B] hover:text-red-400 transition-colors">
      {copied ? "✓ Copied" : <><Copy /> Copy</>}
    </button>
  );
};

const DetailRow = ({ label, value, copyable }: { label: string; value: string; copyable?: boolean }) => (
  <div className="flex items-center justify-between py-2.5 border-b border-[#2F3136] last:border-0">
    <span className="text-xs text-[#C6C6C8]">{label}</span>
    <div className="flex items-center gap-2">
      <span className="text-sm text-white font-medium max-w-[180px] truncate">{value}</span>
      {copyable && <CopyButton text={value} />}
    </div>
  </div>
);

const Select = ({ label, value, onChange, options }: {
  label?: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) => (
  <div className="flex flex-col gap-1">
    {label && <label className="text-xs text-[#C6C6C8] font-medium">{label}</label>}
    <div className="relative bg-[#212428] rounded-lg border border-transparent focus-within:border-[#E23B3B]">
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent text-white py-3 pl-3 pr-8 text-sm focus:outline-none appearance-none">
        {options.map((o) => <option key={o.value} value={o.value} className="bg-[#212428]">{o.label}</option>)}
      </select>
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#545456] pointer-events-none"><ChevronDown /></span>
    </div>
  </div>
);

// ─── Main ─────────────────────────────────────────────────────────────────
export const RampApiModal = () => {
  const { isOpen, mode, setMode, closeRamp, customer } = useRamp();
  useModalPresence(isOpen);

  const [fromAmount, setFromAmount] = useState("");
  const [network, setNetwork] = useState<typeof NETWORKS[number]>("bep20");
  const [walletAddress, setWalletAddress] = useState("");
  const [bankCode, setBankCode] = useState(NIGERIAN_BANKS[0].code);
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [verifyingBank, setVerifyingBank] = useState(false);
  const [bankError, setBankError] = useState("");

  const [step, setStep] = useState<Step>("form");
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState("");
  const [amountError, setAmountError] = useState("");
  const [walletError, setWalletError] = useState("");

  const merchantRef = useRef(generateMerchantRef());

  useEffect(() => {
    if (isOpen) {
      setStep("form"); setFromAmount(""); setWalletAddress("");
      setAccountNumber(""); setAccountName(""); setQuote(null);
      setError(""); setAmountError(""); setWalletError("");
      merchantRef.current = generateMerchantRef();
    }
  }, [isOpen, mode]);

  useEffect(() => {
    if (mode === "offramp" && accountNumber.length === 10 && bankCode) {
      setVerifyingBank(true); setBankError("");
      verifyBankAccount(bankCode, accountNumber)
        .then((res) => { setAccountName(res.data?.account_name ?? ""); if (!res.data?.account_name) setBankError("Could not verify"); })
        .catch(() => setBankError("Verification failed"))
        .finally(() => setVerifyingBank(false));
    } else { setAccountName(""); setBankError(""); }
  }, [accountNumber, bankCode, mode]);

  const validate = () => {
    let ok = true;
    if (!fromAmount || isNaN(+fromAmount) || +fromAmount <= 0) { setAmountError("Enter a valid amount"); ok = false; } else setAmountError("");
    if (mode === "onramp" && !walletAddress.trim()) { setWalletError("Enter your wallet address"); ok = false; } else setWalletError("");
    return ok;
  };

  const handleGetQuote = async () => {
    if (!validate()) return;
    setLoading(true); setError("");
    try {
      let data: any;
      if (mode === "onramp") {
        data = await initiateOnRamp({
          from_currency: "ngn", to_currency: "usdt", from_amount: fromAmount,
          merchant_reference: merchantRef.current,
          customer: customer ?? { email: "user@dezenmart.io", first_name: "User", last_name: "Name" },
          wallet_address: { address: walletAddress, network },
        } as InitiateOnRampPayload);
      } else {
        data = await initiateOffRamp({
          from_currency: "usdt", to_currency: "ngn", from_amount: fromAmount,
          network, customer: customer ?? { email: "user@dezenmart.io", first_name: "User", last_name: "Name" },
        } as InitiateOffRampPayload);
      }
      const d = data?.data ?? data;
      setQuote({
        merchantRef: d?.merchant_reference ?? merchantRef.current,
        fromAmount: d?.from_amount ?? fromAmount,
        toAmount: d?.to_amount ?? "-",
        rate: d?.rate ?? "-",
        expiresAt: Date.now() + (d?.expires_in_seconds ? d.expires_in_seconds * 1000 : 600_000),
        paymentDetails: {
          accountName: d?.payment_details?.account_name,
          accountNumber: d?.payment_details?.account_number,
          bankName: d?.payment_details?.bank_name,
          ussdCode: d?.payment_details?.ussd_code,
        },
      });
      setStep("quote");
    } catch (e: any) { setError(e.message ?? "Failed to get quote"); }
    finally { setLoading(false); }
  };

  const handleRefreshQuote = async () => {
    if (!quote) return;
    setLoading(true); setError("");
    try {
      let data: any;
      if (mode === "onramp") data = await refreshOnRamp(quote.merchantRef, { from_currency: "ngn", to_currency: "usdt", from_amount: fromAmount });
      else data = await refreshOffRamp(quote.merchantRef, { from_currency: "usdt", to_currency: "ngn", from_amount: fromAmount, network });
      const d = data?.data ?? data;
      setQuote((q) => q ? ({ ...q, toAmount: d?.to_amount ?? q.toAmount, rate: d?.rate ?? q.rate, expiresAt: Date.now() + 600_000 }) : null);
    } catch (e: any) { setError(e.message ?? "Refresh failed"); }
    finally { setLoading(false); }
  };

  const handleConfirm = async () => {
    if (!quote) return;
    setStep("processing"); setLoading(true); setError("");
    try {
      if (mode === "onramp") await confirmOnRamp(quote.merchantRef);
      else await confirmOffRamp(quote.merchantRef);
      setTxHash(quote.merchantRef);
      setStep("success");
    } catch (e: any) { setError(e.message ?? "Transaction failed"); setStep("error"); }
    finally { setLoading(false); }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={closeRamp}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />

          <motion.div initial={{ opacity: 0, scale: 0.94, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 20 }}
            transition={{ type: "spring", damping: 22, stiffness: 280 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-[#1A1C20] w-full max-w-md rounded-2xl shadow-2xl pointer-events-auto overflow-hidden"
              style={{ maxHeight: "90vh", overflowY: "auto" }}
              onClick={(e) => e.stopPropagation()}>

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#2F3136]">
                <div className="flex items-center gap-1 bg-[#212428] p-1 rounded-lg">
                  {(["onramp", "offramp"] as const).map((m) => (
                    <button key={m} onClick={() => setMode(m)}
                      className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${mode === m ? "bg-[#E23B3B] text-white" : "text-[#C6C6C8] hover:text-white"}`}>
                      {m === "onramp" ? "Buy Crypto" : "Sell Crypto"}
                    </button>
                  ))}
                </div>
                <button onClick={closeRamp} className="text-[#545456] hover:text-white transition-colors p-1"><X /></button>
              </div>

              {/* Body */}
              <div className="p-5">
                <AnimatePresence mode="wait">

                  {/* FORM */}
                  {step === "form" && (
                    <motion.div key="form" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="flex flex-col gap-4">
                      <p className="text-[#C6C6C8] text-sm">
                        {mode === "onramp" ? "Convert NGN to crypto instantly." : "Sell your crypto and receive NGN."}
                      </p>
                      <div className="bg-[#292B30] rounded-xl p-4 flex flex-col gap-2">
                        <div className="flex justify-between">
                          <span className="text-xs text-[#C6C6C8]">{mode === "onramp" ? "You pay (NGN)" : "You sell (USDT)"}</span>
                          <span className="text-xs text-[#545456]">{mode === "onramp" ? "NGN" : "USDT"}</span>
                        </div>
                        <input type="number" min="0" value={fromAmount}
                          onChange={(e) => { setFromAmount(e.target.value); setAmountError(""); }}
                          placeholder={mode === "onramp" ? "e.g. 5000" : "e.g. 5"}
                          className="bg-transparent text-white text-2xl font-semibold focus:outline-none w-full placeholder:text-[#3A3C40]" />
                        {amountError && <p className="text-xs text-red-400">{amountError}</p>}
                      </div>
                      <div className="flex justify-center text-[#545456]"><ArrowDown /></div>
                      <div className="bg-[#292B30] rounded-xl p-4">
                        <div className="flex justify-between mb-1">
                          <span className="text-xs text-[#C6C6C8]">{mode === "onramp" ? "You receive (USDT)" : "You receive (NGN)"}</span>
                        </div>
                        <p className="text-2xl font-semibold text-[#3A3C40]">-</p>
                        <p className="text-xs text-[#545456] mt-1">Fetched on next step</p>
                      </div>
                      <Select label="Network" value={network} onChange={(v) => setNetwork(v as typeof NETWORKS[number])}
                        options={NETWORKS.map((n) => ({ value: n, label: n.toUpperCase() }))} />
                      {mode === "onramp" && (
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-[#C6C6C8] font-medium">Wallet Address</label>
                          <input value={walletAddress} onChange={(e) => { setWalletAddress(e.target.value); setWalletError(""); }}
                            placeholder="0x..."
                            className={`bg-[#212428] text-white py-3 px-3 rounded-lg text-sm focus:outline-none border ${walletError ? "border-red-500" : "border-transparent focus:border-[#E23B3B]"}`} />
                          {walletError && <p className="text-xs text-red-400">{walletError}</p>}
                        </div>
                      )}
                      {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">{error}</div>}
                      <button onClick={handleGetQuote} disabled={loading}
                        className="w-full bg-[#E23B3B] hover:bg-brand-hover text-white py-3.5 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                        {loading ? <><Spinner size={18} /> Getting Rate…</> : "Get Rate"}
                      </button>
                    </motion.div>
                  )}

                  {/* QUOTE */}
                  {step === "quote" && quote && (
                    <motion.div key="quote" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-white font-semibold">Your Quote</h3>
                        <CountdownTimer expiresAt={quote.expiresAt} onExpire={handleRefreshQuote} />
                      </div>
                      <div className="bg-[#292B30] rounded-xl overflow-hidden">
                        <div className="p-4 flex justify-between items-center bg-[#E23B3B]/10 border-b border-[#2F3136]">
                          <div>
                            <p className="text-xs text-[#C6C6C8]">{mode === "onramp" ? "You send" : "You sell"}</p>
                            <p className="text-lg font-bold text-white">{mode === "onramp" ? "NGN" : "USDT"} {quote.fromAmount}</p>
                          </div>
                          <ArrowDown />
                          <div className="text-right">
                            <p className="text-xs text-[#C6C6C8]">You receive</p>
                            <p className="text-lg font-bold text-[#E23B3B]">{mode === "onramp" ? "USDT" : "NGN"} {quote.toAmount}</p>
                          </div>
                        </div>
                        <div className="p-4">
                          <DetailRow label="Rate" value={`1 USDT ≈ NGN ${quote.rate}`} />
                          <DetailRow label="Reference" value={quote.merchantRef} copyable />
                          <DetailRow label="Network" value={network.toUpperCase()} />
                        </div>
                      </div>
                      {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">{error}</div>}
                      <div className="flex gap-2">
                        <button onClick={handleRefreshQuote} disabled={loading}
                          className="flex items-center gap-1.5 px-4 py-2.5 bg-[#292B30] text-[#C6C6C8] rounded-xl text-sm hover:text-white transition-colors disabled:opacity-50">
                          <RefreshCw /> Refresh
                        </button>
                        <button onClick={() => setStep(mode === "onramp" ? "payment-details" : "bank-input")} disabled={loading}
                          className="flex-1 bg-[#E23B3B] hover:bg-brand-hover text-white py-2.5 rounded-xl font-semibold text-sm transition-colors disabled:opacity-60">
                          {mode === "onramp" ? "Make Payment →" : "Enter Bank Details →"}
                        </button>
                      </div>
                      <button onClick={() => setStep("form")} className="text-center text-xs text-[#545456] hover:text-white transition-colors">← Back to edit</button>
                    </motion.div>
                  )}

                  {/* PAYMENT DETAILS (onramp) */}
                  {step === "payment-details" && quote && (
                    <motion.div key="payment-details" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="flex flex-col gap-4">
                      <h3 className="text-white font-semibold">Make Payment</h3>
                      <p className="text-sm text-[#C6C6C8]">
                        Transfer exactly <span className="text-white font-semibold">NGN {quote.fromAmount}</span> to receive{" "}
                        <span className="text-[#E23B3B] font-semibold">USDT {quote.toAmount}</span>.
                      </p>
                      <div className="bg-[#292B30] rounded-xl p-4">
                        {quote.paymentDetails?.bankName && <DetailRow label="Bank" value={quote.paymentDetails.bankName} />}
                        {quote.paymentDetails?.accountName && <DetailRow label="Account Name" value={quote.paymentDetails.accountName} />}
                        {quote.paymentDetails?.accountNumber && <DetailRow label="Account Number" value={quote.paymentDetails.accountNumber} copyable />}
                        {quote.paymentDetails?.ussdCode && <DetailRow label="USSD" value={quote.paymentDetails.ussdCode} copyable />}
                        <DetailRow label="Amount" value={`NGN ${quote.fromAmount}`} copyable />
                        <DetailRow label="Reference" value={quote.merchantRef} copyable />
                      </div>
                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 text-xs text-yellow-400">
                        ⚠️ Use the exact reference. Do not close this window until payment is confirmed.
                      </div>
                      <button onClick={handleConfirm} disabled={loading}
                        className="w-full bg-[#E23B3B] hover:bg-brand-hover text-white py-3.5 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                        {loading ? <><Spinner size={18} /> Processing…</> : "I've Made the Payment"}
                      </button>
                      <button onClick={() => setStep("quote")} className="text-center text-xs text-[#545456] hover:text-white transition-colors">← Back</button>
                    </motion.div>
                  )}

                  {/* BANK INPUT (offramp) */}
                  {step === "bank-input" && quote && (
                    <motion.div key="bank-input" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="flex flex-col gap-4">
                      <h3 className="text-white font-semibold">Bank Details</h3>
                      <p className="text-sm text-[#C6C6C8]">
                        Receive <span className="text-[#E23B3B] font-semibold">NGN {quote.toAmount}</span> to your bank account.
                      </p>
                      <Select label="Bank" value={bankCode} onChange={setBankCode}
                        options={NIGERIAN_BANKS.map((b) => ({ value: b.code, label: b.name }))} />
                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-[#C6C6C8] font-medium">Account Number</label>
                        <div className="flex items-center bg-[#212428] rounded-lg border border-transparent focus-within:border-[#E23B3B]">
                          <input type="tel" value={accountNumber}
                            onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                            placeholder="0000000000"
                            className="flex-1 bg-transparent text-white py-3 px-3 text-sm focus:outline-none" />
                          {verifyingBank && <span className="pr-3"><Spinner size={14} /></span>}
                        </div>
                        {accountName && <p className="text-xs text-green-400 mt-1">✓ {accountName}</p>}
                        {bankError && <p className="text-xs text-red-400 mt-1">{bankError}</p>}
                      </div>
                      {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">{error}</div>}
                      <button onClick={handleConfirm} disabled={loading || !accountName || verifyingBank}
                        className="w-full bg-[#E23B3B] hover:bg-brand-hover text-white py-3.5 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                        {loading ? <><Spinner size={18} /> Processing…</> : "Confirm Sale"}
                      </button>
                      <button onClick={() => setStep("quote")} className="text-center text-xs text-[#545456] hover:text-white transition-colors">← Back</button>
                    </motion.div>
                  )}

                  {/* PROCESSING */}
                  {step === "processing" && (
                    <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="flex flex-col items-center gap-6 py-8">
                      <div className="w-16 h-16 rounded-full border-2 border-[#E23B3B]/20 flex items-center justify-center">
                        <Spinner size={32} />
                      </div>
                      <div className="text-center">
                        <h3 className="text-white font-semibold mb-1">Processing</h3>
                        <p className="text-sm text-[#C6C6C8]">Please wait while we confirm your {mode === "onramp" ? "purchase" : "sale"}…</p>
                      </div>
                    </motion.div>
                  )}

                  {/* SUCCESS */}
                  {step === "success" && (
                    <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                      className="flex flex-col items-center gap-4 py-6">
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 12 }}><Check /></motion.div>
                      <div className="text-center">
                        <h3 className="text-white font-bold text-lg mb-1">{mode === "onramp" ? "Purchase Submitted!" : "Sale Confirmed!"}</h3>
                        <p className="text-sm text-[#C6C6C8] mb-4">
                          {mode === "onramp" ? "USDT will be sent to your wallet shortly." : "NGN will be credited to your bank account."}
                        </p>
                      </div>
                      <div className="w-full bg-[#292B30] rounded-xl p-4">
                        <DetailRow label="Reference" value={txHash} copyable />
                        {quote && <>
                          <DetailRow label={mode === "onramp" ? "NGN Sent" : "USDT Sold"} value={`${mode === "onramp" ? "NGN" : "USDT"} ${quote.fromAmount}`} />
                          <DetailRow label={mode === "onramp" ? "USDT to Receive" : "NGN to Receive"} value={`${mode === "onramp" ? "USDT" : "NGN"} ${quote.toAmount}`} />
                        </>}
                      </div>
                      <button onClick={closeRamp} className="w-full bg-[#E23B3B] hover:bg-brand-hover text-white py-3 rounded-xl font-semibold text-sm transition-colors">Done</button>
                    </motion.div>
                  )}

                  {/* ERROR */}
                  {step === "error" && (
                    <motion.div key="error" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                      className="flex flex-col items-center gap-4 py-6">
                      <AlertCircle />
                      <div className="text-center">
                        <h3 className="text-white font-bold text-lg mb-1">Transaction Failed</h3>
                        <p className="text-sm text-red-400">{error}</p>
                      </div>
                      <div className="flex gap-2 w-full">
                        <button onClick={() => setStep("form")} className="flex-1 bg-[#292B30] text-white py-3 rounded-xl text-sm font-medium hover:bg-[#2F3136] transition-colors">Start Over</button>
                        <button onClick={closeRamp} className="flex-1 bg-[#E23B3B] hover:bg-brand-hover text-white py-3 rounded-xl font-semibold text-sm transition-colors">Close</button>
                      </div>
                    </motion.div>
                  )}

                </AnimatePresence>
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-[#2F3136] flex items-center justify-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <rect x="1" y="4" width="10" height="7" rx="1.2" stroke="#545456" strokeWidth="1.2" />
                  <path d="M4 4V3a2 2 0 1 1 4 0v1" stroke="#545456" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                <span className="text-xs text-[#545456]">Secured by Quidax</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
