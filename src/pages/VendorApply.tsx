import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import Container from "../components/common/Container";
import {
  useApplyAsVendorMutation,
  useGetBanksQuery,
  useGetMyVendorQuery,
  useGetNigerianStatesQuery,
  useGetStateLgasQuery,
  useResolveBankAccountMutation,
} from "../store/api";
import { CATEGORIES } from "../utils/categories";
import { WEEKDAYS, type Weekday } from "../utils/food";
import { FALLBACK_STATES } from "../components/account/address/constants";
import { getErrorMessage } from "../utils/errors";
import { useSEO } from "../hooks/useSEO";
import { BRAND } from "../config/brand";

const input =
  "w-full rounded-xl bg-[#3A3C41] px-3 py-3 text-sm text-white placeholder-gray-600 outline-none focus:ring-2 focus:ring-brand";

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-300">{label}</label>
      {children}
      {error && <p className="mt-1.5 text-xs text-red-400" role="alert">{error}</p>}
    </div>
  );
}

/**
 * Vendor onboarding. Payout account details go straight to the backend, which
 * verifies the account name with the bank; the browser never stores them.
 */
export default function VendorApply() {
  useSEO({ title: "Become a vendor", description: `Sell food on ${BRAND.name}.`, noindex: true });
  const navigate = useNavigate();
  const { data: existing } = useGetMyVendorQuery();
  const [apply, { isLoading }] = useApplyAsVendorMutation();
  const { data: banks = [] } = useGetBanksQuery();
  const [resolve, { isLoading: resolving }] = useResolveBankAccountMutation();
  const { data: fetchedStates = [] } = useGetNigerianStatesQuery();
  const states = fetchedStates.length ? fetchedStates : FALLBACK_STATES;

  const [f, setF] = useState({
    businessName: "", description: "", phone: "", state: "", lga: "", address: "",
    bankCode: "", accountNumber: "", open: "08:00", close: "20:00",
  });
  const [categories, setCategories] = useState<string[]>([]);
  const [days, setDays] = useState<Weekday[]>([...WEEKDAYS]);
  const [accountName, setAccountName] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);

  const { data: lgas = [], isFetching: lgasLoading } = useGetStateLgasQuery(f.state, { skip: !f.state });

  // Prefill when re-applying after a rejection.
  useEffect(() => {
    if (existing && existing.status !== "approved") {
      setF((p) => ({
        ...p,
        businessName: existing.businessName, description: existing.description, phone: existing.phone,
        state: existing.state, lga: existing.lga, address: existing.address,
      }));
      setCategories(existing.categories ?? []);
    }
  }, [existing]);

  // Look the account name up as soon as bank + 10-digit number are complete.
  useEffect(() => {
    setAccountName(null);
    if (f.bankCode && /^\d{10}$/.test(f.accountNumber)) {
      resolve({ bankCode: f.bankCode, accountNumber: f.accountNumber })
        .unwrap()
        .then((r) => setAccountName(r.accountName))
        .catch(() => setErrors((e) => ({ ...e, accountNumber: "We couldn't verify this account. Check the bank and number." })));
    }
  }, [f.bankCode, f.accountNumber, resolve]);

  const set = (k: keyof typeof f, v: string) => {
    setF((p) => ({ ...p, [k]: v, ...(k === "state" ? { lga: "" } : {}) }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (f.businessName.trim().length < 3) e.businessName = "Enter your business or kitchen name";
    if (f.description.trim().length < 30) e.description = "Tell buyers what you sell (at least 30 characters)";
    if (categories.length === 0) e.categories = "Pick at least one category";
    if (!/^(\+?234|0)[789]\d{9}$/.test(f.phone.replace(/\s/g, ""))) e.phone = "Enter a valid Nigerian phone number";
    if (!f.state) e.state = "Select a state";
    if (!f.lga) e.lga = "Select a city / LGA";
    if (f.address.trim().length < 8) e.address = "Enter your kitchen / store address";
    if (!f.bankCode) e.bankCode = "Select your bank";
    if (!/^\d{10}$/.test(f.accountNumber)) e.accountNumber = "Account number must be 10 digits";
    else if (!accountName) e.accountNumber = e.accountNumber || "Wait for the account name to appear, or check the details";
    if (!agreed) e.agreed = "Please accept the vendor terms";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    setSubmitError(null);
    if (!validate()) return;
    try {
      await apply({
        businessName: f.businessName.trim(),
        description: f.description.trim(),
        categories,
        phone: f.phone.replace(/\s/g, ""),
        state: f.state,
        lga: f.lga,
        address: f.address.trim(),
        openingHours: { days, open: f.open, close: f.close },
        payout: { bankCode: f.bankCode, accountNumber: f.accountNumber },
      }).unwrap();
      navigate("/account?tab=5", { replace: true });
    } catch (err) {
      setSubmitError(getErrorMessage(err) || "We couldn't submit your application. Please try again.");
    }
  };

  const toggleCat = (n: string) => {
    setCategories((l) => (l.includes(n) ? l.filter((x) => x !== n) : [...l, n]));
    setErrors((e) => ({ ...e, categories: "" }));
  };

  return (
    <div className="bg-Dark min-h-screen">
      <Container className="max-w-xl py-6">
        <h1 className="text-2xl font-bold text-white">Sell on {BRAND.name}</h1>
        <p className="mt-1 text-sm text-gray-400">Tell us about your kitchen or store. We review every application before you can list.</p>

        <form onSubmit={submit} className="mt-6 space-y-5" noValidate>
          <section className="space-y-3 rounded-2xl bg-[#292B30] p-4">
            <h2 className="text-sm font-semibold text-white">Your business</h2>
            <Field label="Business / kitchen name" error={errors.businessName}>
              <input className={input} value={f.businessName} onChange={(e) => set("businessName", e.target.value)} placeholder="e.g. Mama Put Small Chops" />
            </Field>
            <Field label="What do you sell?" error={errors.description}>
              <textarea className={input} rows={4} value={f.description} onChange={(e) => set("description", e.target.value)} placeholder="Describe your menu, specialities and how you prepare and pack orders." />
            </Field>
            <Field label="Categories" error={errors.categories}>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    type="button"
                    key={c.name}
                    aria-pressed={categories.includes(c.name)}
                    onClick={() => toggleCat(c.name)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium ${categories.includes(c.name) ? "bg-brand text-white" : "bg-[#3A3C41] text-gray-300 hover:text-white"}`}
                  >
                    {c.emoji} {c.name}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Phone number" error={errors.phone}>
              <input className={input} inputMode="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="08012345678" />
            </Field>
          </section>

          <section className="space-y-3 rounded-2xl bg-[#292B30] p-4">
            <h2 className="text-sm font-semibold text-white">Where you operate</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="State" error={errors.state}>
                <select className={input} value={f.state} onChange={(e) => set("state", e.target.value)}>
                  <option value="">Select state</option>
                  {states.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="City / LGA" error={errors.lga}>
                <select className={input} value={f.lga} disabled={!f.state} onChange={(e) => set("lga", e.target.value)}>
                  <option value="">{!f.state ? "Select a state first" : lgasLoading ? "Loading…" : "Select city / LGA"}</option>
                  {lgas.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Street address" error={errors.address}>
              <input className={input} value={f.address} onChange={(e) => set("address", e.target.value)} placeholder="Kitchen / store address" />
            </Field>
            <Field label="Opening hours">
              <div className="flex items-center gap-2">
                <input type="time" className={input} value={f.open} onChange={(e) => set("open", e.target.value)} aria-label="Opens at" />
                <span className="text-gray-500">to</span>
                <input type="time" className={input} value={f.close} onChange={(e) => set("close", e.target.value)} aria-label="Closes at" />
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {WEEKDAYS.map((d) => (
                  <button
                    type="button"
                    key={d}
                    aria-pressed={days.includes(d)}
                    onClick={() => setDays((l) => (l.includes(d) ? l.filter((x) => x !== d) : [...l, d]))}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium ${days.includes(d) ? "bg-brand text-white" : "bg-[#3A3C41] text-gray-300"}`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </Field>
          </section>

          <section className="space-y-3 rounded-2xl bg-[#292B30] p-4">
            <h2 className="text-sm font-semibold text-white">Where we pay you</h2>
            <p className="text-xs text-gray-400">Payments are released here after buyers confirm delivery. The account name must match your business or your own name.</p>
            <Field label="Bank" error={errors.bankCode}>
              <select className={input} value={f.bankCode} onChange={(e) => set("bankCode", e.target.value)}>
                <option value="">Select bank</option>
                {banks.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
              </select>
            </Field>
            <Field label="Account number" error={errors.accountNumber}>
              <input className={input} inputMode="numeric" maxLength={10} value={f.accountNumber} onChange={(e) => set("accountNumber", e.target.value.replace(/\D/g, ""))} placeholder="10-digit account number" autoComplete="off" />
              {resolving && <p className="mt-1.5 text-xs text-gray-400">Checking account…</p>}
              {accountName && <p className="mt-1.5 text-xs text-green-400">✓ {accountName}</p>}
            </Field>
          </section>

          <label className="flex items-start gap-3 text-sm text-gray-300">
            <input type="checkbox" checked={agreed} onChange={(e) => { setAgreed(e.target.checked); setErrors((x) => ({ ...x, agreed: "" })); }} className="mt-0.5 accent-orange-500" />
            <span>
              I agree to the vendor terms, will prepare food safely and hygienically, and understand payments are released after buyers confirm delivery.
              {errors.agreed && <span className="block text-xs text-red-400" role="alert">{errors.agreed}</span>}
            </span>
          </label>

          {submitError && <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400" role="alert">{submitError}</p>}

          <button disabled={isLoading} className="w-full rounded-xl bg-brand py-3.5 text-sm font-bold text-white hover:bg-brand-hover disabled:opacity-50">
            {isLoading ? "Submitting…" : "Submit application"}
          </button>
        </form>
      </Container>
    </div>
  );
}
