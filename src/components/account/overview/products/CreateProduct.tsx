import {
  useState,
  useRef,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { FiInfo, FiCheck } from "react-icons/fi";
import {
  useCreateProductMutation,
  useGetNigerianStatesQuery,
  useGetStateLgasQuery,
} from "../../../../store/api";
import { FALLBACK_STATES } from "../../../account/address/constants";
import { useSnackbar } from "../../../../context/SnackbarContext";
import { useAccount, useChainId } from "wagmi";
import { useCurrency } from "../../../../context/CurrencyContext";
import { TOKENS, buildTradeParams } from "../../../../config/tokens";
import MediaUpload, { MediaFile } from "./MediaUpload";
import VariantsSection, { ProductVariant } from "./VariantsSection";
import { CATEGORIES, getCategoryByName } from "../../../../utils/categories";
import {
  ALLERGENS,
  DIETARY_TAGS,
  FULFILMENT_MODES,
  SPICE_LEVELS,
  WEEKDAYS,
  formatNaira,
  type FulfilmentMode,
  type Weekday,
} from "../../../../utils/food";
import { FEATURES } from "../../../../config/brand";

interface CreateProductProps {
  onProductCreated?: () => void;
}

interface FormErrors {
  name?: string;
  description?: string;
  category?: string;
  price?: string;
  media?: string;
  stock?: string;
  weight?: string;
  state?: string;
  lga?: string;
  sellerWalletAddress?: string;
  variants?: string;
  prepTime?: string;
  minOrder?: string;
  fulfilment?: string;
  submit?: string;
}

const NAME_MIN = 3;
const DESCRIPTION_MIN = 30;

function ChipToggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
        active ? "bg-brand text-white" : "bg-[#3A3C41] text-gray-300 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

const toggleIn = <T,>(list: T[], item: T): T[] =>
  list.includes(item) ? list.filter((x) => x !== item) : [...list, item];

// ── Reusable field wrapper ─────────────────────────────────────────────
function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1.5">
        {label}
      </label>
      {children}
      {error && (
        <p className="text-red-400 text-xs mt-1.5" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

// ── Input style ────────────────────────────────────────────────────────
const inputCls = (hasError?: boolean) =>
  `w-full bg-[#3A3C41] text-white px-3 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand transition-all placeholder-gray-600 ${
    hasError ? "ring-1 ring-red-500" : ""
  }`;

// ── Select chevron ─────────────────────────────────────────────────────
function Chevron() {
  return (
    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
      <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
        <path fillRule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z" />
      </svg>
    </div>
  );
}

// ── Section card ───────────────────────────────────────────────────────
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#292B30] rounded-2xl p-4 space-y-3">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      {children}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────
const CreateProduct: React.FC<CreateProductProps> = ({ onProductCreated }) => {
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const { selectedToken, convertPrice, tokens: availableTokens, userLocalCurrency } = useCurrency();
  const [createProduct, { isLoading }] = useCreateProductMutation();
  const { showSnackbar } = useSnackbar();
  const nameRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "",
    stock: "",
    weight: "",
    state: "",
    lga: "",
    sellerWalletAddress: "",
    listPrice: "",
    subcategory: "",
    portionSize: "",
    serves: "",
    prepTime: "",
    minOrder: "1",
    spiceLevel: "",
    orderCutoff: "",
    leadTimeHours: "0",
    shelfLifeHours: "",
  });
  const [dietary, setDietary] = useState<string[]>([]);
  const [allergens, setAllergens] = useState<string[]>([]);
  const [days, setDays] = useState<Weekday[]>([...WEEKDAYS]);
  const [fulfilment, setFulfilment] = useState<FulfilmentMode[]>(["delivery"]);
  // Fiat rails are always available; crypto is an opt-in extra for wallet holders.
  const [acceptCrypto, setAcceptCrypto] = useState(false);

  // Origin state/LGA come from the backend; LGAs depend on the selected state.
  const { data: fetchedStates = [] } = useGetNigerianStatesQuery();
  const originStates = fetchedStates.length ? fetchedStates : FALLBACK_STATES;
  const { data: originLgas = [], isFetching: lgasFetching } = useGetStateLgasQuery(
    form.state,
    { skip: !form.state }
  );
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [paymentToken, setPaymentToken] = useState(selectedToken?.symbol ?? "USDT");
  const [variants, setVariants] = useState<ProductVariant[]>([
    { id: `v-${Date.now()}`, properties: [], quantity: 0 },
  ]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Auto-focus name on mount
  useEffect(() => { nameRef.current?.focus(); }, []);

  // Auto-fill wallet from connected address (once, non-destructive)
  useEffect(() => {
    if (address) {
      setForm((prev) =>
        prev.sellerWalletAddress ? prev : { ...prev, sellerWalletAddress: address }
      );
    }
  }, [address]);

  const setField = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // Food is priced in Naira. Only the optional crypto rail needs a USD/token
  // amount, and that conversion is only trustworthy when the local currency is NGN.
  const priceNGN = useMemo(() => {
    const n = parseFloat(form.listPrice);
    return isNaN(n) || n <= 0 ? 0 : n;
  }, [form.listPrice]);
  const cryptoConvertible = userLocalCurrency?.toUpperCase() === "NGN";

  const priceUSD = useMemo(
    () => (priceNGN > 0 && cryptoConvertible ? convertPrice(priceNGN, "FIAT", "USD") : 0),
    [priceNGN, cryptoConvertible, convertPrice]
  );
  const tokenEquivalent = useMemo(
    () => (priceUSD > 0 ? convertPrice(priceUSD, "USD", paymentToken) : 0),
    [priceUSD, paymentToken, convertPrice]
  );

  const handlePriceChange = (value: string) => {
    setForm((prev) => ({ ...prev, listPrice: value }));
    if (errors.price) setErrors((prev) => ({ ...prev, price: undefined }));
  };

  const handleTokenChange = (symbol: string) => setPaymentToken(symbol);

  const handleAddMedia = useCallback((incoming: MediaFile[]) => {
    setMediaFiles((prev) => [...prev, ...incoming].slice(0, 5));
    setErrors((prev) => ({ ...prev, media: undefined }));
  }, []);

  const handleRemoveMedia = useCallback((index: number) => {
    setMediaFiles((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => { mediaFiles.forEach((m) => URL.revokeObjectURL(m.preview)); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalVariantQty = useMemo(
    () => variants.reduce((s, v) => s + (v.quantity || 0), 0),
    [variants]
  );

  const validate = useCallback((): boolean => {
    const e: FormErrors = {};
    const { name, description, category, stock, sellerWalletAddress } = form;

    if (name.trim().length < NAME_MIN) e.name = "Give your item a clear name";
    if (description.trim().length < DESCRIPTION_MIN)
      e.description = `Describe what the buyer gets (at least ${DESCRIPTION_MIN} characters): what's in it, size, flavour`;
    if (!category) e.category = "Category is required";

    if (!form.listPrice.trim()) e.price = "Price is required";
    else if (priceNGN <= 0) e.price = "Enter a valid price greater than zero";

    const stockNum = parseInt(stock, 10);
    if (!stock.trim()) e.stock = "Available quantity is required";
    else if (isNaN(stockNum) || stockNum <= 0) e.stock = "Enter a valid whole number";

    const prep = parseInt(form.prepTime, 10);
    if (!form.prepTime.trim() || isNaN(prep) || prep <= 0)
      e.prepTime = "Enter how long it takes to prepare (minutes)";

    const minOrder = parseInt(form.minOrder, 10);
    if (isNaN(minOrder) || minOrder < 1) e.minOrder = "Minimum order must be at least 1";
    else if (!isNaN(stockNum) && minOrder > stockNum) e.minOrder = "Minimum order can't exceed stock";

    const weightNum = parseFloat(form.weight);
    if (!form.weight.trim()) e.weight = "Weight is required";
    else if (isNaN(weightNum) || weightNum <= 0) e.weight = "Enter a valid weight in kg";

    if (!form.state) e.state = "Kitchen / store state is required";
    if (!form.lga) e.lga = "Kitchen / store city / LGA is required";
    if (fulfilment.length === 0) e.fulfilment = "Choose delivery, pickup or both";

    if (acceptCrypto) {
      if (!cryptoConvertible) {
        e.submit = "Crypto pricing needs an NGN local currency. Turn crypto off or try again on an NGN connection.";
      } else if (!sellerWalletAddress.trim()) {
        e.sellerWalletAddress = "Wallet address is required to accept crypto";
      } else if (!/^0x[a-fA-F0-9]{40}$/.test(sellerWalletAddress)) {
        e.sellerWalletAddress = "Enter a valid Celo / EVM wallet address";
      }
    }

    if (mediaFiles.length === 0) e.media = "At least one photo is required";

    const nonEmpty = variants.filter((v) => v.properties.length > 0);
    if (nonEmpty.length > 0) {
      if (nonEmpty.some((v) => !v.quantity))
        e.variants = "Set a quantity for each option";
      else if (totalVariantQty !== stockNum)
        e.variants = `Option total (${totalVariantQty}) must equal available quantity (${stockNum})`;
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  }, [form, priceNGN, mediaFiles, variants, totalVariantQty, fulfilment, acceptCrypto, cryptoConvertible]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setErrors({});

    try {
      const { name, description, category, stock, sellerWalletAddress } = form;
      const stockQty = parseInt(stock, 10) || 0;
      const tokenSymbol = paymentToken || "USDT";

      const matchedToken = availableTokens.find((t) => t.symbol === tokenSymbol);
      const isStable = matchedToken?.isStableToken ?? true;

      const formData = new FormData();
      formData.append("vertical", "food");
      formData.append("name", name.trim());
      formData.append("description", description.trim());
      formData.append("category", category);
      if (form.subcategory) formData.append("subcategory", form.subcategory);
      // Food is priced in NGN; the backend converts for the crypto rail.
      formData.append("price", priceNGN.toFixed(2));
      formData.append("currency", "NGN");
      formData.append("stock", stock);
      formData.append("weight", form.weight);
      formData.append("state", form.state);
      formData.append("lga", form.lga);

      // Food details
      if (form.portionSize.trim()) formData.append("portionSize", form.portionSize.trim());
      if (form.serves) formData.append("serves", form.serves);
      formData.append("prepTimeMinutes", form.prepTime);
      formData.append("minOrderQty", form.minOrder || "1");
      if (form.spiceLevel) formData.append("spiceLevel", form.spiceLevel);
      formData.append("dietaryTags", JSON.stringify(dietary));
      formData.append("allergens", JSON.stringify(allergens));
      formData.append("availableDays", JSON.stringify(days));
      if (form.orderCutoff) formData.append("orderCutoff", form.orderCutoff);
      formData.append("leadTimeHours", form.leadTimeHours || "0");
      if (form.shelfLifeHours) formData.append("shelfLifeHours", form.shelfLifeHours);
      formData.append("fulfilment", JSON.stringify(fulfilment));

      // Rails: bank transfer (Pandascrow) is the live fiat rail.
      const rails: string[] = [];
      if (FEATURES.fiat) rails.push("pandascrow");
      if (acceptCrypto) rails.push("crypto");
      formData.append("acceptedPayments", JSON.stringify(rails));

      if (acceptCrypto) {
        formData.append("sellerWalletAddress", sellerWalletAddress);
        formData.append("useUSDT", isStable ? "true" : "false");
        formData.append("paymentToken", tokenSymbol);
        if (matchedToken && chainId) {
          const tokenAddress = matchedToken.address[chainId];
          if (tokenAddress) {
            formData.append("tokenAddress", tokenAddress);
            const tradeParams = buildTradeParams(tokenEquivalent || priceUSD, stockQty, tokenSymbol, chainId);
            formData.append("tradeParams", JSON.stringify(tradeParams));
          }
        }
      }

      // Logistics providers are chosen by the buyer at checkout via /logistics/available,
      // so nothing product-specific is sent here anymore.

      // `type` is required by the API - always send it (empty array when no variants).
      const validVariants = variants.filter((v) => v.properties.length > 0);
      const formattedVariants = validVariants.map((v) => {
        const obj: Record<string, string | number> = { quantity: v.quantity || 0 };
        v.properties.forEach((p) => {
          const n = Number(p.value);
          obj[p.name.toLowerCase()] = !isNaN(n) && p.value.trim() !== "" ? n : p.value;
        });
        return obj;
      });
      formData.append("type", JSON.stringify(formattedVariants));

      mediaFiles.forEach((m) => formData.append("images", m.file));

      await createProduct(formData).unwrap();
      setSuccess(true);
      showSnackbar("Item listed successfully!", "success");
      onProductCreated?.();

      setTimeout(() => {
        setForm({
          name: "", description: "", category: "", stock: "", weight: "", state: "", lga: "",
          sellerWalletAddress: address ?? "", listPrice: "", subcategory: "", portionSize: "",
          serves: "", prepTime: "", minOrder: "1", spiceLevel: "", orderCutoff: "",
          leadTimeHours: "0", shelfLifeHours: "",
        });
        setDietary([]);
        setAllergens([]);
        setMediaFiles([]);
        setVariants([{ id: `v-${Date.now()}`, properties: [], quantity: 0 }]);
        setSuccess(false);
      }, 1500);
    } catch {
      setErrors({ submit: "Failed to list item. Please try again." });
      showSnackbar("Failed to list item. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 pb-6">
      {/* Photos */}
      <Section title="Photos & Videos">
        <MediaUpload
          files={mediaFiles}
          onAdd={handleAddMedia}
          onRemove={handleRemoveMedia}
          error={errors.media}
        />
      </Section>

      {/* Basic info */}
      <Section title="What are you selling?">
        <Field label="Name" error={errors.name}>
          <input
            ref={nameRef}
            type="text"
            value={form.name}
            onChange={(e) => setField("name", e.target.value)}
            placeholder="e.g. Party Small Chops Platter (50 pcs)"
            className={inputCls(!!errors.name)}
          />
        </Field>

        <Field label="Description" error={errors.description}>
          <textarea
            value={form.description}
            onChange={(e) => setField("description", e.target.value)}
            rows={4}
            placeholder="Be specific: what is included, quantities per pack, flavours, how it is packaged..."
            className={inputCls(!!errors.description)}
          />
          <p className="text-[11px] text-gray-500 mt-1">
            {form.description.trim().length}/{DESCRIPTION_MIN} characters minimum
          </p>
        </Field>

        <Field label="Category" error={errors.category}>
          <div className="relative">
            <select
              value={form.category}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, category: e.target.value, subcategory: "" }));
                setErrors((prev) => ({ ...prev, category: undefined }));
              }}
              className={`${inputCls(!!errors.category)} appearance-none pr-8`}
            >
              <option value="" disabled>Select a category</option>
              {CATEGORIES.map((c) => (
                <option key={c.name} value={c.name}>{c.emoji} {c.name}</option>
              ))}
            </select>
            <Chevron />
          </div>
          {getCategoryByName(form.category)?.blurb && (
            <p className="text-[11px] text-gray-500 mt-1">{getCategoryByName(form.category)?.blurb}</p>
          )}
        </Field>

        {!!getCategoryByName(form.category)?.subcategories.length && (
          <Field label="Type (optional)">
            <div className="flex flex-wrap gap-2">
              {getCategoryByName(form.category)!.subcategories.map((sc) => (
                <ChipToggle
                  key={sc}
                  active={form.subcategory === sc}
                  onClick={() => setField("subcategory", form.subcategory === sc ? "" : sc)}
                >
                  {sc}
                </ChipToggle>
              ))}
            </div>
          </Field>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Portion / pack size (optional)">
            <input
              type="text"
              value={form.portionSize}
              onChange={(e) => setField("portionSize", e.target.value)}
              placeholder="e.g. 1 pack (10 pieces)"
              className={inputCls()}
            />
          </Field>
          <Field label="Serves (optional)">
            <input
              type="number"
              min="1"
              inputMode="numeric"
              value={form.serves}
              onChange={(e) => setField("serves", e.target.value)}
              placeholder="How many people"
              className={inputCls()}
            />
          </Field>
        </div>
      </Section>

      <Section title="Diet & allergens">
        <Field label="Dietary info">
          <div className="flex flex-wrap gap-2">
            {DIETARY_TAGS.map((t) => (
              <ChipToggle key={t} active={dietary.includes(t)} onClick={() => setDietary((l) => toggleIn(l, t))}>
                {t}
              </ChipToggle>
            ))}
          </div>
        </Field>
        <Field label="Contains (allergens)">
          <div className="flex flex-wrap gap-2">
            {ALLERGENS.map((t) => (
              <ChipToggle key={t} active={allergens.includes(t)} onClick={() => setAllergens((l) => toggleIn(l, t))}>
                {t}
              </ChipToggle>
            ))}
          </div>
        </Field>
        <Field label="Spice level (optional)">
          <div className="relative">
            <select
              value={form.spiceLevel}
              onChange={(e) => setField("spiceLevel", e.target.value)}
              className={`${inputCls()} appearance-none pr-8`}
            >
              <option value="">Not applicable</option>
              {SPICE_LEVELS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
            <Chevron />
          </div>
        </Field>
      </Section>

      {/* Pricing */}
      <Section title="Price">
        <Field label="Price per portion (₦)" error={errors.price}>
          <input
            type="number"
            min="0"
            step="50"
            inputMode="decimal"
            value={form.listPrice}
            onChange={(e) => handlePriceChange(e.target.value)}
            placeholder="e.g. 3500"
            className={inputCls(!!errors.price)}
          />
          {priceNGN > 0 && (
            <p className="text-[11px] text-gray-500 mt-1">Buyers will see {formatNaira(priceNGN)}</p>
          )}
        </Field>
      </Section>

      {/* Inventory */}
      <Section title="Availability">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Quantity available" error={errors.stock}>
            <input
              type="number"
              min="1"
              inputMode="numeric"
              value={form.stock}
              onChange={(e) => setField("stock", e.target.value)}
              placeholder="Portions you can make"
              className={inputCls(!!errors.stock)}
            />
          </Field>
          <Field label="Minimum order" error={errors.minOrder}>
            <input
              type="number"
              min="1"
              inputMode="numeric"
              value={form.minOrder}
              onChange={(e) => setField("minOrder", e.target.value)}
              className={inputCls(!!errors.minOrder)}
            />
          </Field>
          <Field label="Preparation time (minutes)" error={errors.prepTime}>
            <input
              type="number"
              min="1"
              inputMode="numeric"
              value={form.prepTime}
              onChange={(e) => setField("prepTime", e.target.value)}
              placeholder="e.g. 45"
              className={inputCls(!!errors.prepTime)}
            />
          </Field>
          <Field label="Advance notice (hours, 0 = same day)">
            <input
              type="number"
              min="0"
              inputMode="numeric"
              value={form.leadTimeHours}
              onChange={(e) => setField("leadTimeHours", e.target.value)}
              className={inputCls()}
            />
          </Field>
          <Field label="Stop taking orders at (optional)">
            <input
              type="time"
              value={form.orderCutoff}
              onChange={(e) => setField("orderCutoff", e.target.value)}
              className={inputCls()}
            />
          </Field>
          <Field label="Best within (hours, optional)">
            <input
              type="number"
              min="1"
              inputMode="numeric"
              value={form.shelfLifeHours}
              onChange={(e) => setField("shelfLifeHours", e.target.value)}
              placeholder="Shelf life after prep"
              className={inputCls()}
            />
          </Field>
        </div>

        <Field label="Days you can fulfil">
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((d) => (
              <ChipToggle key={d} active={days.includes(d)} onClick={() => setDays((l) => toggleIn(l, d))}>
                {d}
              </ChipToggle>
            ))}
          </div>
        </Field>

        <div className="border-t border-[#3A3C41] pt-3">
          <VariantsSection
            variants={variants}
            totalStock={parseInt(form.stock, 10) || 0}
            onChange={setVariants}
            error={errors.variants}
          />
          <p className="text-[11px] text-gray-500 mt-2">
            Use options for sizes or flavours, e.g. Size: Small / Large, Protein: Chicken / Beef.
          </p>
        </div>
      </Section>

      {/* Delivery - origin + weight drive the buyer's shipping options & cost */}
      <Section title="Delivery & pickup">
        <p className="text-xs text-gray-500 -mt-1">
          Buyers see delivery providers and cost at checkout based on where your
          kitchen or store is and how heavy one portion is.
        </p>

        <Field label="Weight of one portion (kg)" error={errors.weight}>
          <input
            type="number"
            min="0"
            step="0.1"
            inputMode="decimal"
            value={form.weight}
            onChange={(e) => setField("weight", e.target.value)}
            placeholder="e.g. 0.5 (packed food included)"
            className={inputCls(!!errors.weight)}
          />
        </Field>

        <div className="border-t border-[#3A3C41] pt-3">
          <Field label="How can buyers get it?" error={errors.fulfilment}>
            <div className="flex flex-wrap gap-2 mb-3">
              {FULFILMENT_MODES.map((m) => (
                <ChipToggle
                  key={m.id}
                  active={fulfilment.includes(m.id)}
                  onClick={() => {
                    setFulfilment((l) => toggleIn(l, m.id));
                    setErrors((prev) => ({ ...prev, fulfilment: undefined }));
                  }}
                >
                  {m.label}
                </ChipToggle>
              ))}
            </div>
          </Field>
          <p className="text-sm font-medium text-gray-300 mb-2">Kitchen / store location</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="State" error={errors.state}>
              <div className="relative">
                <select
                  value={form.state}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, state: e.target.value, lga: "" }));
                    setErrors((prev) => ({ ...prev, state: undefined, lga: undefined }));
                  }}
                  className={`${inputCls(!!errors.state)} appearance-none pr-8 ${
                    form.state ? "text-white" : "text-gray-600"
                  }`}
                >
                  <option value="" disabled>Select state</option>
                  {originStates.map((s) => (
                    <option key={s} value={s} className="text-white bg-[#3A3C41]">{s}</option>
                  ))}
                </select>
                <Chevron />
              </div>
            </Field>

            <Field label="City / LGA" error={errors.lga}>
              <div className="relative">
                <select
                  value={form.lga}
                  onChange={(e) => setField("lga", e.target.value)}
                  disabled={!form.state}
                  className={`${inputCls(!!errors.lga)} appearance-none pr-8 disabled:opacity-50 ${
                    form.lga ? "text-white" : "text-gray-600"
                  }`}
                >
                  <option value="" disabled>
                    {!form.state ? "Select a state first" : lgasFetching ? "Loading…" : "Select city / LGA"}
                  </option>
                  {originLgas.map((l) => (
                    <option key={l} value={l} className="text-white bg-[#3A3C41]">{l}</option>
                  ))}
                </select>
                <Chevron />
              </div>
            </Field>
          </div>
        </div>
      </Section>

      {/* Payment rails */}
      <Section title="How you get paid">
        {FEATURES.fiat && (
          <p className="text-xs text-gray-400 -mt-1">
            Card, bank transfer and escrow payments are on by default. Your money is released to your
            payout bank account after the buyer confirms delivery.
          </p>
        )}
        {FEATURES.crypto && (
          <>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptCrypto}
                onChange={(e) => setAcceptCrypto(e.target.checked)}
                className="mt-0.5 accent-orange-500"
              />
              <span className="text-sm text-gray-300">
                Also accept crypto (stablecoins)
                <span className="block text-xs text-gray-500">
                  Needs a wallet. Optional - you can list without one.
                </span>
              </span>
            </label>

            {acceptCrypto && (
              <div className="space-y-3">
                {!cryptoConvertible && (
                  <p className="text-xs text-amber-300">
                    Crypto pricing needs your local currency to be NGN, so it is unavailable right now.
                  </p>
                )}
                <Field label="Stablecoin">
                  <div className="relative">
                    <select
                      value={paymentToken}
                      onChange={(e) => handleTokenChange(e.target.value)}
                      className={`${inputCls()} appearance-none pr-8`}
                    >
                      {(availableTokens as typeof TOKENS).map((t) => (
                        <option key={t.symbol} value={t.symbol}>{t.symbol}</option>
                      ))}
                    </select>
                    <Chevron />
                  </div>
                  {tokenEquivalent > 0 && (
                    <p className="text-[11px] text-gray-500 mt-1">
                      ≈ {tokenEquivalent.toFixed(2)} {paymentToken} per portion
                    </p>
                  )}
                </Field>
                <Field label="Wallet Address" error={errors.sellerWalletAddress}>
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      value={form.sellerWalletAddress}
                      onChange={(e) => setField("sellerWalletAddress", e.target.value)}
                      placeholder="0x..."
                      className={`${inputCls(!!errors.sellerWalletAddress)} font-mono text-xs`}
                    />
                    {address && form.sellerWalletAddress !== address && (
                      <button
                        type="button"
                        onClick={() => setField("sellerWalletAddress", address)}
                        className="text-xs text-brand hover:opacity-80 transition-colors"
                      >
                        Use connected wallet ({address.slice(0, 6)}…{address.slice(-4)})
                      </button>
                    )}
                    {address && form.sellerWalletAddress === address && (
                      <p className="text-xs text-green-400 flex items-center gap-1">
                        <FiCheck size={11} /> Using your connected wallet
                      </p>
                    )}
                  </div>
                </Field>
                {!isConnected && (
                  <div className="flex items-start gap-2 bg-amber-900/20 border border-amber-800/40 rounded-xl px-3 py-3">
                    <FiInfo className="text-amber-400 flex-shrink-0 mt-0.5" size={14} />
                    <p className="text-amber-300 text-xs">
                      Connect your wallet so the on-chain trade for this item can be created.
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </Section>

      {/* Submit */}
      <div className="pt-1">
        {errors.submit && (
          <p className="text-red-400 text-sm text-center mb-3" role="alert">
            {errors.submit}
          </p>
        )}

        {success && (
          <p className="text-green-400 text-sm text-center mb-3 flex items-center justify-center gap-2">
            <FiCheck /> Item listed successfully!
          </p>
        )}

        <button
          type="submit"
          disabled={(acceptCrypto && !isConnected) || submitting || isLoading}
          className="w-full bg-brand text-white py-3.5 rounded-xl text-sm font-semibold hover:bg-brand-hover active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting || isLoading
            ? "Listing item…"
            : acceptCrypto && !isConnected
            ? "Connect wallet to list with crypto"
            : "List Item"}
        </button>
      </div>
    </form>
  );
};

export default CreateProduct;
