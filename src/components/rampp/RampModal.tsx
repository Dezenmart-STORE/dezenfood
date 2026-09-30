import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useModalPresence } from "../../utils/modalPresence";
import { motion, AnimatePresence } from "framer-motion";
import { useRamp } from "./RampContext";
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
import { useAuth } from "../../context/AuthContext";

// ─── Icon primitives ──────────────────────────────────────────────────────
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
const NETWORKS = ["BEP20", "trc20", "erc20", "polygon"] as const;
const FIAT_CURRENCIES = ["NGN"];
const CRYPTO_CURRENCIES = ["USDT", "USDC", "BTC", "ETH"];

const NIGERIAN_BANKS = [
  { code: "044", name: "Access Bank" },
  { code: "023", name: "Citibank" },
  { code: "050", name: "EcoBank" },
  { code: "011", name: "First Bank" },
  { code: "214", name: "First City Monument Bank" },
  { code: "058", name: "Guaranty Trust Bank" },
  { code: "030", name: "Heritage Bank" },
  { code: "301", name: "Jaiz Bank" },
  { code: "082", name: "Keystone Bank" },
  { code: "526", name: "Parallex Bank" },
  { code: "076", name: "Polaris Bank" },
  { code: "101", name: "ProvidusBank" },
  { code: "221", name: "Stanbic IBTC Bank" },
  { code: "068", name: "Standard Chartered Bank" },
  { code: "232", name: "Sterling Bank" },
  { code: "100", name: "Suntrust Bank" },
  { code: "032", name: "Union Bank" },
  { code: "033", name: "United Bank For Africa" },
  { code: "215", name: "Unity Bank" },
  { code: "035", name: "Wema Bank" },
  { code: "057", name: "Zenith Bank" },
];

// ─── Types ────────────────────────────────────────────────────────────────
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
  raw?: any;
}

// ─── Spinner ──────────────────────────────────────────────────────────────
const Spinner = ({ size = 20 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 20 20"
    className="animate-spin"
    style={{ animation: "spin 0.8s linear infinite" }}
  >
    <circle cx="10" cy="10" r="7" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5" fill="none" />
    <path d="M10 3a7 7 0 0 1 7 7" stroke="#E23B3B" strokeWidth="2.5" strokeLinecap="round" fill="none" />
  </svg>
);

// ─── CountdownTimer ───────────────────────────────────────────────────────
const CountdownTimer = ({
  expiresAt,
  onExpire,
}: {
  expiresAt: number;
  onExpire: () => void;
}) => {
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
        <circle
          cx="9" cy="9" r="7.5"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          strokeDasharray={`${2 * Math.PI * 7.5}`}
          strokeDashoffset={`${2 * Math.PI * 7.5 * (1 - pct / 100)}`}
          strokeLinecap="round"
          style={{ transform: "rotate(-90deg)", transformOrigin: "9px 9px" }}
        />
      </svg>
      <span className={secs < 60 ? "text-red-400" : "text-[#C6C6C8]"}>
        Rate expires in {mins}:{String(s).padStart(2, "0")}
      </span>
    </div>
  );
};

// ─── Input ────────────────────────────────────────────────────────────────
const Input = ({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  prefix,
  suffix,
  error,
  readOnly,
}: {
  label?: string;
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  type?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  error?: string;
  readOnly?: boolean;
}) => (
  <div className="flex flex-col gap-1">
    {label && <label className="text-xs text-[#C6C6C8] font-medium">{label}</label>}
    <div
      className={`flex items-center bg-[#212428] rounded-lg border transition-colors ${
        error ? "border-red-500" : "border-transparent focus-within:border-[#E23B3B]"
      }`}
    >
      {prefix && <span className="pl-3 text-[#545456]">{prefix}</span>}
      <input
        type={type}
        value={value}
        readOnly={readOnly}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-white py-3 px-3 text-sm focus:outline-none placeholder:text-[#545456]"
      />
      {suffix && <span className="pr-3 text-[#545456]">{suffix}</span>}
    </div>
    {error && <p className="text-xs text-red-400">{error}</p>}
  </div>
);

// ─── Select ───────────────────────────────────────────────────────────────
const Select = ({
  label,
  value,
  onChange,
  options,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) => (
  <div className="flex flex-col gap-1">
    {label && <label className="text-xs text-[#C6C6C8] font-medium">{label}</label>}
    <div className="relative bg-[#212428] rounded-lg border border-transparent focus-within:border-[#E23B3B]">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent text-white py-3 pl-3 pr-8 text-sm focus:outline-none appearance-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-[#212428]">
            {o.label}
          </option>
        ))}
      </select>
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#545456] pointer-events-none">
        <ChevronDown />
      </span>
    </div>
  </div>
);

// ─── CopyButton ───────────────────────────────────────────────────────────
const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1 text-xs text-[#E23B3B] hover:text-red-400 transition-colors"
    >
      {copied ? "Copied!" : <><Copy /> Copy</>}
    </button>
  );
};

// ─── DetailRow ────────────────────────────────────────────────────────────
const DetailRow = ({
  label,
  value,
  copyable,
}: {
  label: string;
  value: string;
  copyable?: boolean;
}) => (
  <div className="flex items-center justify-between py-2.5 border-b border-[#2F3136] last:border-0">
    <span className="text-xs text-[#C6C6C8]">{label}</span>
    <div className="flex items-center gap-2">
      <span className="text-sm text-white font-medium max-w-[180px] truncate">{value}</span>
      {copyable && <CopyButton text={value} />}
    </div>
  </div>
);

// ─── Main Modal ───────────────────────────────────────────────────────────
export const RampModal = () => {
  const { isOpen, mode, setMode, closeRamp, customer } = useRamp();
  useModalPresence(isOpen);

  // Form state
  const [fromAmount, setFromAmount] = useState("");
  const [network, setNetwork] = useState<typeof NETWORKS[number]>("BEP20");
  const [walletAddress, setWalletAddress] = useState("");
  const [bankCode, setBankCode] = useState(NIGERIAN_BANKS[0].code);
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [verifyingBank, setVerifyingBank] = useState(false);
  const [bankError, setBankError] = useState("");

  // Flow state
  const [step, setStep] = useState<Step>("form");
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState("");

  // Validation errors
  const [amountError, setAmountError] = useState("");
  const [walletError, setWalletError] = useState("");

  const merchantRef = useRef(generateMerchantRef());

  // Reset on open/mode change
  useEffect(() => {
    if (isOpen) {
      setStep("form");
      setFromAmount("");
      setWalletAddress("");
      setAccountNumber("");
      setAccountName("");
      setQuote(null);
      setError("");
      setAmountError("");
      setWalletError("");
      merchantRef.current = generateMerchantRef();
    }
  }, [isOpen, mode]);

  // Bank verification
  useEffect(() => {
    if (mode === "offramp" && accountNumber.length === 10 && bankCode) {
      setVerifyingBank(true);
      setBankError("");
      verifyBankAccount(bankCode, accountNumber)
        .then((res) => {
          setAccountName(res.data?.account_name ?? "");
          if (!res.data?.account_name) setBankError("Could not verify account");
        })
        .catch(() => setBankError("Verification failed"))
        .finally(() => setVerifyingBank(false));
    } else {
      setAccountName("");
      setBankError("");
    }
  }, [accountNumber, bankCode, mode]);

  const validate = () => {
    let ok = true;
    const amt = parseFloat(fromAmount);
    if (!fromAmount || isNaN(amt) || amt <= 0) {
      setAmountError("Enter a valid amount");
      ok = false;
    } else {
      setAmountError("");
    }
    if (mode === "onramp" && !walletAddress.trim()) {
      setWalletError("Enter your wallet address");
      ok = false;
    } else {
      setWalletError("");
    }
    return ok;
  };

  const { user: _user } = useAuth();
  console.dir(_user,{depth:7})

  const overideCustomer = useMemo(()=>{

    return customer?? { name:_user?.name??"john",email:_user?.email?? "user@example.com", first_name:_user?.name?? "User", last_name:_user?.name?? "Name" }
  },[_user,customer])
  const handleGetQuote = async () => {
    if (!validate()) return;
    setLoading(true);
    setError("");
    try {
      let data: any;
      if (mode === "onramp") {
        const payload: InitiateOnRampPayload = {
          from_currency: "ngn",
          to_currency: "usdt",
          from_amount: fromAmount,
          merchant_reference: merchantRef.current,
          customer: overideCustomer ??{ email: "user@example.com", first_name: "User", last_name: "Name" } ,
          wallet_address: { address: walletAddress, network, [network]: walletAddress },
        };
        data = await initiateOnRamp(payload);
      } else {
        const payload: InitiateOffRampPayload = {
          from_currency: "usdt",
          to_currency: "ngn",
          from_amount: fromAmount,
          network,
          customer: overideCustomer ?? { email: "user@example.com", first_name: "User", last_name: "Name" },
        };
        data = await initiateOffRamp(payload);
      }

      // Parse response - adapt field names to Quidax actual response shape
      const d = data?.data ?? data;
      const qd = d?.quidaxData??d;
      setQuote({
        merchantRef:d?.merchantReference?? d?.merchantReference  ?? merchantRef.current,
        // merchantRef: d?.merchant_reference ?? merchantRef.current,
        
        fromAmount: d?.from_amount ?? fromAmount,
        toAmount: qd?.to_amount ?? "-",
        rate: qd?.rate ?? "-",
        expiresAt: Date.now() + (qd?.expires_in_seconds ? qd.expires_in_seconds * 1000 : 600_000),
        paymentDetails: {
          accountName: qd?.payment_details?.account_name,
          accountNumber: qd?.payment_details?.account_number,
          bankName: qd?.payment_details?.bank_name,
          ussdCode: qd?.payment_details?.ussd_code,
          walletAddress: qd?.payment_details?.address,
        },
        raw: d,
      });
      setStep("quote");
    } catch (e: any) {
      setError(e.message ?? "Failed to get quote");
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshQuote = async () => {
    if (!quote) return;
    setLoading(true);
    setError("");
    try {
      let data: any;
      if (mode === "onramp") {
        data = await refreshOnRamp(quote.merchantRef, {
          from_currency: "ngn",
          to_currency: "usdt",
          from_amount: fromAmount,
        });
      } else {
        data = await refreshOffRamp(quote.merchantRef, {
          from_currency: "usdt",
          to_currency: "ngn",
          from_amount: fromAmount,
          network,
        });
      }
      const d = data?.data ?? data;
      setQuote((q) => q ? ({
        ...q,
        toAmount: d?.to_amount ?? q.toAmount,
        rate: d?.rate ?? q.rate,
        expiresAt: Date.now() + (d?.expires_in_seconds ? d.expires_in_seconds * 1000 : 600_000),
      }) : null);
    } catch (e: any) {
      setError(e.message ?? "Refresh failed");
    } finally {
      setLoading(false);
    }
  };

  const handleProceed = () => {
    if (mode === "onramp") {
      setStep("payment-details");
    } else {
      setStep("bank-input");
    }
  };

  const handleConfirm = async () => {
    if (!quote) return;
    setStep("processing");
    setLoading(true);
    setError("");
    try {
      if (mode === "onramp") {
        await confirmOnRamp(quote.merchantRef);
      } else {
        await confirmOffRamp(quote.merchantRef);
      }
      setTxHash(quote.merchantRef);
      setStep("success");
    } catch (e: any) {
      setError(e.message ?? "Transaction failed");
      setStep("error");
    } finally {
      setLoading(false);
    }
  };
console.log(isOpen,"isppppp")
  if (!isOpen) return null;

  const cryptoLabel = mode === "onramp" ? "You receive" : "You send";
  const fiatLabel = mode === "onramp" ? "You send" : "You receive";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeRamp}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 20 }}
            transition={{ type: "spring", damping: 22, stiffness: 280 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="bg-[#1A1C20] w-full max-w-md rounded-2xl shadow-2xl pointer-events-auto overflow-hidden"
              style={{ maxHeight: "90vh", overflowY: "auto" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#2F3136]">
                <div className="flex items-center gap-1 bg-[#212428] p-1 rounded-lg">
                  <button
                    onClick={() => setMode("onramp")}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                      mode === "onramp"
                        ? "bg-[#E23B3B] text-white"
                        : "text-[#C6C6C8] hover:text-white"
                    }`}
                  >
                    Buy Crypto
                  </button>
                  <button
                    onClick={() => setMode("offramp")}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                      mode === "offramp"
                        ? "bg-[#E23B3B] text-white"
                        : "text-[#C6C6C8] hover:text-white"
                    }`}
                  >
                    Sell Crypto
                  </button>
                </div>
                <button
                  onClick={closeRamp}
                  className="text-[#545456] hover:text-white transition-colors p-1"
                >
                  <X />
                </button>
              </div>

              {/* Body */}
              <div className="p-5">
                <AnimatePresence mode="wait">
                  {/* ── FORM STEP ─────────────────────────────── */}
                  {step === "form" && (
                    <motion.div
                      key="form"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="flex flex-col gap-4"
                    >
                      <p className="text-[#C6C6C8] text-sm">
                        {mode === "onramp"
                          ? "Convert NGN to crypto instantly and receive it in your wallet."
                          : "Sell your crypto and receive NGN to your bank account."}
                      </p>

                      {/* Amount */}
                      <div className="bg-[#292B30] rounded-xl p-4 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-[#C6C6C8]">
                            {mode === "onramp" ? "You pay (NGN)" : "You sell"}
                          </span>
                          <span className="text-xs text-[#545456]">
                            {mode === "onramp" ? "NGN" : "USDT"}
                          </span>
                        </div>
                        <input
                          type="number"
                          min="0"
                          value={fromAmount}
                          onChange={(e) => { setFromAmount(e.target.value); setAmountError(""); }}
                          placeholder={mode === "onramp" ? "e.g. 5000" : "e.g. 5"}
                          className="bg-transparent text-white text-2xl font-semibold focus:outline-none w-full placeholder:text-[#3A3C40]"
                        />
                        {amountError && <p className="text-xs text-red-400">{amountError}</p>}
                      </div>

                      <div className="flex justify-center text-[#545456]">
                        <ArrowDown />
                      </div>

                      <div className="bg-[#292B30] rounded-xl p-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-[#C6C6C8]">
                            {mode === "onramp" ? "You receive" : "You receive (NGN)"}
                          </span>
                          <span className="text-xs text-[#545456]">
                            {mode === "onramp" ? "USDT" : "NGN"}
                          </span>
                        </div>
                        <p className="text-2xl font-semibold text-[#3A3C40]">-</p>
                        <p className="text-xs text-[#545456] mt-1">Rate fetched on next step</p>
                      </div>

                      {/* Network */}
                      <Select
                        label="Network"
                        value={network}
                        onChange={(v) => setNetwork(v as typeof NETWORKS[number])}
                        options={NETWORKS.map((n) => ({ value: n, label: n.toUpperCase() }))}
                      />

                      {/* Wallet address (onramp only) */}
                      {mode === "onramp" && (
                        <Input
                          label="Wallet Address"
                          value={walletAddress}
                          onChange={(v) => { setWalletAddress(v); setWalletError(""); }}
                          placeholder="0x..."
                          error={walletError}
                        />
                      )}

                      {error && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">
                          {error}
                        </div>
                      )}

                      <button
                        onClick={handleGetQuote}
                        disabled={loading}
                        className="w-full bg-[#E23B3B] hover:bg-brand-hover text-white py-3.5 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                      >
                        {loading ? <><Spinner size={18} /> Getting Rate...</> : "Get Rate"}
                      </button>
                    </motion.div>
                  )}

                  {/* ── QUOTE STEP ────────────────────────────── */}
                  {step === "quote" && quote && (
                    <motion.div
                      key="quote"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="flex flex-col gap-4"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="text-white font-semibold">Your Quote</h3>
                        <CountdownTimer
                          expiresAt={quote.expiresAt}
                          onExpire={handleRefreshQuote}
                        />
                      </div>

                      {/* Quote card */}
                      <div className="bg-[#292B30] rounded-xl overflow-hidden">
                        <div className="p-4 flex justify-between items-center bg-[#E23B3B]/10 border-b border-[#2F3136]">
                          <div>
                            <p className="text-xs text-[#C6C6C8]">
                              {mode === "onramp" ? "You send" : "You sell"}
                            </p>
                            <p className="text-lg font-bold text-white">
                              {mode === "onramp" ? "NGN" : "USDT"} {quote.fromAmount}
                            </p>
                          </div>
                          <ArrowDown />
                          <div className="text-right">
                            <p className="text-xs text-[#C6C6C8]">
                              {mode === "onramp" ? "You receive" : "You receive"}
                            </p>
                            <p className="text-lg font-bold text-[#E23B3B]">
                              {mode === "onramp" ? "USDT" : "NGN"} {quote.toAmount}
                            </p>
                          </div>
                        </div>

                        <div className="p-4">
                          <DetailRow label="Exchange Rate" value={`1 USDT = NGN ${quote.rate}`} />
                          <DetailRow label="Reference" value={quote.merchantRef} copyable />
                          <DetailRow
                            label="Network"
                            value={network.toUpperCase()}
                          />
                        </div>
                      </div>

                      {error && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">
                          {error}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button
                          onClick={handleRefreshQuote}
                          disabled={loading}
                          className="flex items-center gap-1.5 px-4 py-2.5 bg-[#292B30] text-[#C6C6C8] rounded-xl text-sm hover:text-white transition-colors disabled:opacity-50"
                        >
                          <RefreshCw />
                          Refresh
                        </button>
                        <button
                          onClick={handleProceed}
                          disabled={loading}
                          className="flex-1 bg-[#E23B3B] hover:bg-brand-hover text-white py-2.5 rounded-xl font-semibold text-sm transition-colors disabled:opacity-60"
                        >
                          {mode === "onramp" ? "Make Payment →" : "Enter Bank Details →"}
                        </button>
                      </div>

                      <button
                        onClick={() => setStep("form")}
                        className="text-center text-xs text-[#545456] hover:text-white transition-colors"
                      >
                        ← Back to edit
                      </button>
                    </motion.div>
                  )}

                  {/* ── PAYMENT DETAILS (onramp) ──────────────── */}
                  {step === "payment-details" && quote && (
                    <motion.div
                      key="payment-details"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="flex flex-col gap-4"
                    >
                      <h3 className="text-white font-semibold">Make Payment</h3>
                      <p className="text-sm text-[#C6C6C8]">
                        Transfer exactly{" "}
                        <span className="text-white font-semibold">NGN {quote.fromAmount}</span> to
                        the account below to receive{" "}
                        <span className="text-[#E23B3B] font-semibold">
                          USDT {quote.toAmount}
                        </span>
                        .
                      </p>

                      <div className="bg-[#292B30] rounded-xl p-4">
                        {quote.paymentDetails?.bankName && (
                          <DetailRow label="Bank" value={quote.paymentDetails.bankName} />
                        )}
                        {quote.paymentDetails?.accountName && (
                          <DetailRow label="Account Name" value={quote.paymentDetails.accountName} />
                        )}
                        {quote.paymentDetails?.accountNumber && (
                          <DetailRow
                            label="Account Number"
                            value={quote.paymentDetails.accountNumber}
                            copyable
                          />
                        )}
                        {quote.paymentDetails?.ussdCode && (
                          <DetailRow
                            label="USSD Code"
                            value={quote.paymentDetails.ussdCode}
                            copyable
                          />
                        )}
                        <DetailRow label="Amount" value={`NGN ${quote.fromAmount}`} copyable />
                        <DetailRow label="Reference" value={quote.merchantRef} copyable />
                      </div>

                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 text-xs text-yellow-400">
                        ⚠️ Use the exact reference when making the transfer. Do not close this window.
                      </div>

                      <button
                        onClick={handleConfirm}
                        disabled={loading}
                        className="w-full bg-[#E23B3B] hover:bg-brand-hover text-white py-3.5 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                      >
                        {loading ? <><Spinner size={18} /> Processing...</> : "I've Made the Payment"}
                      </button>

                      <button
                        onClick={() => setStep("quote")}
                        className="text-center text-xs text-[#545456] hover:text-white transition-colors"
                      >
                        ← Back
                      </button>
                    </motion.div>
                  )}

                  {/* ── BANK INPUT (offramp) ──────────────────── */}
                  {step === "bank-input" && quote && (
                    <motion.div
                      key="bank-input"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="flex flex-col gap-4"
                    >
                      <h3 className="text-white font-semibold">Bank Details</h3>
                      <p className="text-sm text-[#C6C6C8]">
                        Provide your bank account to receive{" "}
                        <span className="text-[#E23B3B] font-semibold">NGN {quote.toAmount}</span>.
                      </p>

                      <Select
                        label="Bank"
                        value={bankCode}
                        onChange={setBankCode}
                        options={NIGERIAN_BANKS.map((b) => ({ value: b.code, label: b.name }))}
                      />

                      <div>
                        <Input
                          label="Account Number"
                          value={accountNumber}
                          onChange={(v) => setAccountNumber(v.replace(/\D/g, "").slice(0, 10))}
                          placeholder="0000000000"
                          type="tel"
                          suffix={verifyingBank ? <Spinner size={14} /> : undefined}
                          error={bankError}
                        />
                        {accountName && (
                          <p className="text-xs text-green-400 mt-1.5">✓ {accountName}</p>
                        )}
                      </div>

                      {error && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">
                          {error}
                        </div>
                      )}

                      <button
                        onClick={handleConfirm}
                        disabled={loading || !accountName || verifyingBank}
                        className="w-full bg-[#E23B3B] hover:bg-brand-hover text-white py-3.5 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                      >
                        {loading ? <><Spinner size={18} /> Processing...</> : "Confirm Sale"}
                      </button>

                      <button
                        onClick={() => setStep("quote")}
                        className="text-center text-xs text-[#545456] hover:text-white transition-colors"
                      >
                        ← Back
                      </button>
                    </motion.div>
                  )}

                  {/* ── PROCESSING ────────────────────────────── */}
                  {step === "processing" && (
                    <motion.div
                      key="processing"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center gap-6 py-8"
                    >
                      <div className="relative">
                        <div className="w-16 h-16 rounded-full border-2 border-[#E23B3B]/20 flex items-center justify-center">
                          <Spinner size={32} />
                        </div>
                      </div>
                      <div className="text-center">
                        <h3 className="text-white font-semibold mb-1">Processing Transaction</h3>
                        <p className="text-sm text-[#C6C6C8]">
                          Please wait while we process your{" "}
                          {mode === "onramp" ? "purchase" : "sale"}...
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {/* ── SUCCESS ───────────────────────────────── */}
                  {step === "success" && (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center gap-4 py-6"
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", damping: 12 }}
                      >
                        <Check />
                      </motion.div>
                      <div className="text-center">
                        <h3 className="text-white font-bold text-lg mb-1">
                          {mode === "onramp" ? "Purchase Submitted!" : "Sale Confirmed!"}
                        </h3>
                        <p className="text-sm text-[#C6C6C8] mb-4">
                          {mode === "onramp"
                            ? "Your payment has been received. USDT will be sent to your wallet shortly."
                            : "Your crypto has been received. NGN will be sent to your bank account shortly."}
                        </p>
                      </div>

                      <div className="w-full bg-[#292B30] rounded-xl p-4">
                        <DetailRow label="Transaction Ref" value={txHash} copyable />
                        {quote && (
                          <>
                            <DetailRow
                              label={mode === "onramp" ? "Amount Sent" : "Crypto Sold"}
                              value={`${mode === "onramp" ? "NGN" : "USDT"} ${quote.fromAmount}`}
                            />
                            <DetailRow
                              label={mode === "onramp" ? "USDT to Receive" : "NGN to Receive"}
                              value={`${mode === "onramp" ? "USDT" : "NGN"} ${quote.toAmount}`}
                            />
                          </>
                        )}
                      </div>

                      <button
                        onClick={closeRamp}
                        className="w-full bg-[#E23B3B] hover:bg-brand-hover text-white py-3 rounded-xl font-semibold text-sm transition-colors"
                      >
                        Done
                      </button>
                    </motion.div>
                  )}

                  {/* ── ERROR ─────────────────────────────────── */}
                  {step === "error" && (
                    <motion.div
                      key="error"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center gap-4 py-6"
                    >
                      <AlertCircle />
                      <div className="text-center">
                        <h3 className="text-white font-bold text-lg mb-1">Transaction Failed</h3>
                        <p className="text-sm text-red-400">{error}</p>
                      </div>
                      <div className="flex gap-2 w-full">
                        <button
                          onClick={() => setStep("form")}
                          className="flex-1 bg-[#292B30] text-white py-3 rounded-xl text-sm font-medium hover:bg-[#2F3136] transition-colors"
                        >
                          Start Over
                        </button>
                        <button
                          onClick={closeRamp}
                          className="flex-1 bg-[#E23B3B] hover:bg-brand-hover text-white py-3 rounded-xl font-semibold text-sm transition-colors"
                        >
                          Close
                        </button>
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
